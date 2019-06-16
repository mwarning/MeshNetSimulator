use std::collections::HashMap;
use std::f32;
use serde_json::Value;

use crate::graph::{Graph, ID};
use crate::utils::{get_str, get_u64};


// default distance, too small confuses d3.js
const NODE_SPACING : f32 = 50.0;


pub struct Location {
	pub data: HashMap<ID, [f32; 3]>
}

impl Location {
	fn new() -> Self {
		Self { data: HashMap::new() }
	}

	pub fn is_valid(pos: &[f32; 3]) -> bool {
		!pos[0].is_nan() && pos[1].is_nan() && !pos[3].is_nan()
	}

	pub fn pos_distance(&self, p1: ID, p2: ID) -> Option<f32> {
		if let (Some(a), Some(b)) = (self.data.get(&p1), self.data.get(&p2)) {
			Some(((a[0] - b[0]).powi(2)
				+ (a[1] - b[2]).powi(2)
				+ (a[2] - b[2]).powi(2)).sqrt())
		} else {
			None
		}
	}

	pub fn clear(&mut self) {
		self.data.clear();
	}

	pub fn remove_node(&mut self, id: ID) {
		self.data.remove(&id);
	}

	pub fn insert(&mut self, id: ID, pos: [f32; 3]) {
		self.data.insert(id, pos);
	}

	pub fn move_nodes(&mut self, pos: [f32; 3]) {
		for val in self.data.values_mut() {
			val[0] += pos[0];
			val[1] += pos[1];
			val[2] += pos[2];
		}
	}

	pub fn move_node(&mut self, id: ID, pos: [f32; 3]) {
		if let Some(val) = self.data.get_mut(&id) {
			val[0] += pos[0];
			val[1] += pos[1];
			val[2] += pos[2];
		}
	}

	pub fn graph_center(&self) -> [f32; 3] {
		let mut c = [0.0, 0.0, 0.0];

		for pos in self.data.values() {
			c[0] += pos[0];
			c[1] += pos[1];
			c[2] += pos[2];
		}

		let len = self.data.len() as f32;
		[c[0] / len, c[1] / len, c[2] / len]
	}

	pub fn get_position(&self, id: ID) -> Option<&[f32; 3]> {
		self.data.get(&id)
	}

	pub fn init_positions(&mut self, count: usize, pos: [f32; 3]) {
		for id in 0..count as u32 {
			if !self.data.contains_key(&id) {
				self.data.insert(id, pos);
			}
		}
	}

	pub fn randomize_positions_2d(&mut self, center: [f32; 3], range: f32) {
		for val in self.data.values_mut() {
			val[0] = center[0] + (2.0 * rand::random::<f32>() - 1.0) * range;
			val[1] = center[1] + (2.0 * rand::random::<f32>() - 1.0) * range;
			val[2] = 0.0;
		}
	}
}

pub struct Meta {
	pub data: HashMap<ID, String>
}

impl Meta {
	fn new() -> Self {
		Self { data: HashMap::new() }
	}

	pub fn clear(&mut self) {
		self.data.clear();
	}

	fn remove_node(&mut self, id: ID) {
		self.data.remove(&id);
	}

	fn insert(&mut self, id: ID, data: String) {
		self.data.insert(id, data);
	}
}

pub struct GraphState {
	pub graph: Graph,
	pub location: Location,
	pub meta: Meta,
}

impl GraphState {
	pub fn new() -> Self {
		Self {
			graph: Graph::new(),
			location: Location::new(),
			meta: Meta::new()
		}
	}

	pub fn remove_node(&mut self, id: ID) {
		self.graph.remove_node(id);
		self.location.remove_node(id);
		self.meta.remove_node(id);
	}

	pub fn clear(&mut self) {
		self.graph.clear();
		self.location.clear();
		self.meta.clear();
	}

	pub fn get_mean_link_distance(&self) -> (f32, f32) {
		let mut distances = Vec::new();
		let mut distance_sum = 0.0;

		for link in &self.graph.links {
			if let Some(distance) = self.location.pos_distance(link.from, link.to) {
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
				if let Some(distance) = self.location.pos_distance(i, j) {
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
			self.location.insert(offset + i, pos);

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

		// Interconnect part of the tree with additional connections
		// Also limit maximum number of possible bidirectional links
		for _ in 0..intra { //cmp::min(intra, (intra * (intra - 1)) / 2) {
			loop {
				let i = rand::random::<ID>() % count;
				let j = rand::random::<ID>() % count;
				if i != j && !self.graph.has_link((offset + i) as ID, (offset + j) as ID) {
					self.graph.connect((offset + i) as ID, (offset + j) as ID);
					break;
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

		self.graph.add_nodes(count);

		//self.add_node(0.0, 0.0, 0.0);
		for i in 0..count {
			let a = 2.0 * (i as f32) * f32::consts::PI / (count as f32);
			self.location.insert(offset + i, [
				NODE_SPACING * a.cos(),
				NODE_SPACING * a.sin(),
				0.0
			]);
			self.graph.connect(offset as ID, (offset + 1 + i) as ID);
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
				self.location.insert(offset + i, [
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
