
use std::time::Duration;
use std::collections::HashMap;
use std::f32;
use serde_json::Value;

use crate::graph::{Graph, Link, ID};
use crate::algorithms::random_routing::RandomRouting;
use crate::eval_paths::EvalPaths;
use crate::debug_path::DebugPath;
use crate::utils::{get_str, get_u64, print_unknown_key};
use crate::movements::Movements;
use crate::locations::Locations;
use crate::meta::Meta;


// default distance, too small confuses d3.js
const NODE_SPACING : f32 = 50.0;

pub struct GlobalState {
	pub graph: Graph,
	pub locations: Locations,
	pub movements: Movements,
	pub meta: Meta,
	pub algorithm: Box<RoutingAlgorithm>,
	pub test: EvalPaths,
	pub debug_path: DebugPath,
	pub sim_steps: u32,
	pub abort_simulation: bool,
	pub show_progress: bool,
	pub cmd_address: String,
	pub export_path: String
}

impl GlobalState {
	pub fn new(cmd_address: &str) -> Self {
		Self {
			graph: Graph::new(),
			locations: Locations::new(),
			movements: Movements::new(),
			meta: Meta::new(),
			algorithm: Box::new(RandomRouting::new()),
			test: EvalPaths::new(),
			debug_path: DebugPath::new(),
			sim_steps: 0,
			abort_simulation: false,
			show_progress: false,
			export_path: "graph.json".to_string(),
			cmd_address: cmd_address.to_string()
		}
	}

	pub fn remove_node(&mut self, id: ID) {
		self.graph.remove_node(id);
		self.locations.remove_node(id);
		self.movements.remove_node(id);
		self.meta.remove_node(id);
	}

	pub fn clear(&mut self) {
		self.graph.clear();
		self.locations.clear();
		self.movements.clear();
		self.meta.clear();
	}

	pub fn get_mean_link_distance(&self) -> (f32, f32) {
		let mut distances = Vec::new();
		let mut distance_sum = 0.0;

		for link in &self.graph.links {
			if let Some(distance) = self.locations.pos_distance(link.from, link.to) {
				distance_sum += distance;
				distances.push(distance);
			}
		}
		let len = distances.len() as f32;
		let mean = distance_sum / len;

		let mut v = 0.0;
		for distance in distances {
			v += (distance - mean).powi(2);
		}

		let variance = (v / len).sqrt();
		(mean, variance)
	}

	pub fn connect_in_range(&mut self, range: f32) {
		let node_count = self.graph.node_count();

		// remove all links
		self.graph.clear_links();

		for i in 0..node_count as ID {
			for j in 0..node_count as ID {
				if i == j {
					continue;
				}
				if let Some(distance) = self.locations.pos_distance(i, j) {
					if distance <= range {
						self.graph.connect(i, j);
					}
				}
			}
		}
	}

	pub fn add_line(&mut self, count: u32, close: bool) {
		if count < 1 {
			return;
		}

		let offset = self.graph.node_count() as u32;
		self.graph.add_nodes(count);

		for i in 0..count {
			let pos = if close {
				let r = NODE_SPACING * (count as f32) / (2.0 * f32::consts::PI);
				let a = 2.0 * (i as f32) * f32::consts::PI / (count as f32);
				[r * a.sin(), r * a.cos(), 0.0]
			} else {
				[(i as f32) * NODE_SPACING, 1.1 * (i % 2) as f32, 0.0]
			};
			self.locations.insert(offset + i, pos);

			if i > 0 {
				self.graph.connect(offset + i - 1, offset + i);
			}
		}

		if close && (count > 2) {
			self.graph.connect(offset + 0, offset + count - 1);
		}
	}

	pub fn add_tree(&mut self, count: u32, intra: u32) {
		let offset = self.graph.node_count() as u32;
		self.graph.add_nodes(count);

		// Connect random nodes
		for i in 1..count {
			//self.add_node(0.0, 0.0, 0.0);
			//if i > 0 {
				// Connect node with random previous node
				loop {
					let j = rand::random::<ID>() % i;
					if i != j && !self.graph.has_link((offset + i) as ID, (offset + j) as ID) {
						self.graph.connect((offset + i) as ID, (offset + j) as ID);
						break;
					}
				}
			//}
		}

		// hm, move this out. Execution cannot be guaranteed
		if count > 2 {
			for _ in 0..std::cmp::min(intra, (count * (count - 1)) / 2 - (count + 1)) {
				loop {
					let i = rand::random::<ID>() % count;
					let j = rand::random::<ID>() % count;
					if i != j && !self.graph.has_link((offset + i) as ID, (offset + j) as ID) {
						self.graph.connect((offset + i) as ID, (offset + j) as ID);
						break;
					}
				}
			}
		}
/*
		println!("add_tree:");
		for link in &self.graph.links {
			println!("link {} => {} ({})", link.from, link.to, link.quality);
		}
*/
	}

	pub fn add_star(&mut self, count: u32) {
		let offset = self.graph.node_count() as u32;

		if count < 1 {
			return;
		}

		self.graph.add_nodes(count + 1);
		self.locations.insert(offset, [0.0, 0.0, 0.0]);

		for i in 0..count {
			let a = 2.0 * (i as f32) * f32::consts::PI / (count as f32);
			self.locations.insert(offset + i + 1, [
				NODE_SPACING * a.cos(),
				NODE_SPACING * a.sin(),
				0.0
			]);
			self.graph.connect(offset, offset + i + 1);
		}
	}

	// Add lattice with horizontal and vertical neighbors
	pub fn add_lattice4(&mut self, x_count: u32, y_count: u32) {
		self.add_lattice(x_count, y_count, false);
	}

	// Add lattice with horizontal, vertical and diagonal neighbors
	pub fn add_lattice8(&mut self, x_count: u32, y_count: u32) {
		self.add_lattice(x_count, y_count, true);
	}

	fn add_lattice(&mut self, x_count: u32, y_count: u32, diag: bool) {
		if x_count < 1 || y_count < 1 {
			return;
		}

		let offset = self.graph.node_count() as u32;
		self.graph.add_nodes(x_count * y_count);

		let mut i = 0;
		for x in 0..x_count {
			for y in 0..y_count {
				self.locations.insert(offset + i, [
					(x as f32) * NODE_SPACING,
					(y as f32) * NODE_SPACING,
					0.0
				]);
				i += 1;
			}
		}

		let mut connect = |x1 : u32, y1: u32, x2: u32, y2: u32| {
			// Validate coordinates
			if (x2 < x_count) && (y2 < y_count) {
				let a = offset + x1 * y_count + y1;
				let b = offset + x2 * y_count + y2;
				self.graph.connect(a as ID, b as ID);
			}
		};

		for x in 0..x_count {
			for y in 0..y_count {
				if diag {
					connect(x, y, x + 1, y + 1);
					if y > 0 {
						connect(x, y, x + 1, y - 1);
					}
				}
				connect(x, y, x, y + 1);
				connect(x, y, x + 1, y);
			}
		}
	}

	// move out
	pub fn graph_to_json(&self, graph: &Graph, ret: &mut String) -> Result<(), std::fmt::Error>
	{
		use std::fmt::Write;

		write!(ret, "{{\"nodes\": [")?;
		let mut comma = false;
		for id in 0..self.graph.node_count() as u32 {
			let meta_data = if let Some(data) = self.meta.data.get(&id) {
				data.as_str()
			} else {
				"{}"
			};

			if let Ok(v) = serde_json::from_str::<Value>(meta_data) {
				let node_name = if let Some(hostname) = get_str(&v, "hostname") {
					hostname.to_string()
				} else {
					id.to_string()
				};

				let client_count = if let Some(clients) = get_u64(&v, "clients") {
					clients
				} else {
					0
				};

				if comma {
					write!(ret, ",")?;
				}

				comma = true;
				write!(ret, "{{\"id\": {},\"label\": \"\",\"name\": \"{}\",\"clients\": \"{}\"}}", id, node_name, client_count)?;
			}
		}
		write!(ret, "]}}")
	}
}

pub struct TestPacket {
	// One hop transmitter and receiver address
	pub transmitter: ID,
	pub receiver: ID,

	// Multi-hop source and destination address
	pub source: ID,
	pub destination: ID,
}

impl TestPacket {
	pub fn new(transmitter: ID, receiver: ID, source: ID, destination: ID) -> Self {
		Self { transmitter, receiver, source, destination }
	}
}

pub trait RoutingAlgorithm : Send {
	fn get_node(&self, _id: ID, _key: &str, _out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		Ok(())
	}

	fn get(&self, key: &str, _out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		print_unknown_key(key);
		Ok(())
	}

	fn set(&mut self, key: &str, _value: &str) -> Result<(), std::fmt::Error> {
		print_unknown_key(key);
		Ok(())
	}

	fn remove_node(&mut self, id: ID) {
		println!("not implemented");
	}

	// Called to initialize the states or
	// when the number of nodes changes
	fn reset(&mut self, len: usize);

	// Exchange maintenance traffic for each
	// link how to combine links with stats?
	fn step(&mut self, io: &mut Io);

	// Get next hop for test packet
	fn route(&self, _packet: &TestPacket) -> Option<ID> {
		None
	}
}

fn is_smaller(d: &Duration, secs: u64, millis: u32) -> bool {
	let d_secs = d.as_secs();

	if d_secs < secs {
 		true
 	} else if d_secs > secs {
 		false
	} else {
		d.subsec_millis() < millis
	}
}

pub struct Io<'a> {
	graph: &'a Graph,
	//time?
}

impl<'a> Io<'a> {
	pub fn new(graph: &'a Graph) -> Self {
		Io {
			graph: graph
		}
	}

	pub fn link_iter(&self) -> IoIterator {
		IoIterator::new(&self)
	}

	pub fn nodes_count(&self) -> usize {
		self.graph.node_count()
	}

	pub fn node_links(&self, id: ID) -> &[Link] {
		self.graph.get_neighbors(id)
	}

/*
	pub fn all_links(&self) -> &[Link] {
		self.graph.links.as_slice()
	}
*/
}

pub struct IoIterator<'a> {
	io : &'a Io<'a>,
	idx: usize,
}

impl<'a> IoIterator<'a> {
	fn new(io: &'a Io) -> Self { 
		Self {
			io: io,
			idx: 0,
		}
	}
}

// TODO: use linkiterator
impl<'a> Iterator for IoIterator<'a> {
	type Item = (ID, ID);

	// iterate over all links
	fn next(&mut self) -> Option<Self::Item> {
		let graph = &self.io.graph;
		if self.idx < graph.link_count() {
			let link = &graph.links[self.idx];
			self.idx += 1;
			Some((link.from, link.to))
		} else {
			None
		}
	}
}
