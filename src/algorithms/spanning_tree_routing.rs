
use std::usize;

use crate::graph::ID;
use crate::sim::{Io, TestPacket, RoutingAlgorithm};
use crate::utils::vec_filter;

/*
* Routing on top of an Spanning Tree.
*/

#[derive(Clone, PartialEq, Debug)]
struct Path {
	id: u32, // todo: remove
	path: Vec<u32>,
}

impl Path {
	fn new() -> Self {
		Self {id: 0, path: Vec::new()}
	}

	fn with(id: u32) -> Self {
		Self {id: id, path: vec![id]}
	}

	fn len(&self) -> usize {
		self.path.len()
	}

	fn push(&mut self, id: u32) {
		self.path.push(id);
	}
}

#[derive(Clone)]
struct Packet {
	sender_id: u32,
	path: Path,
}

impl Packet {
	fn new() -> Self {
		Packet {
			sender_id: 0,
			path: Path::new(),
		}
	}
}

#[derive(Clone, PartialEq)]
struct Neighbor {
	id: u32,
	//n: u8,
	last_updated: u32,
}


#[derive(Clone)]
struct Node {
	id: u32,
	path: Path,
	time: u32,

	// the entry with the smallest id is the root
	neighbors: Vec<Neighbor>
}

fn has_duplicates(path: &Vec<u32>) -> bool {
	let len = path.len();
	for i in 0..len {
		for j in 0..len {
			if i != j && path[i] == path[j] {
				return true;
			}
		}
	}
	false
}

impl Node {
	fn new() -> Self {
		Self {
			id: 0,
			path: Path::new(),
			time: 0,
			neighbors: Vec::new(),
		}
	}

	fn init(&mut self, id: u32, time: u32) {
		self.id = id;
		self.path = Path::with(id);
		self.time = time;
		self.neighbors.clear();
	}

	fn is_better(p1: &Path, p2: &Path) -> bool {
		(p1.id < p2.id) || (p1.id == p2.id && p1.len() < p2.len())
	}

	fn tick(&mut self) -> Packet {
		self.time += 1;

		// timeout old entries
		let time = self.time;
		vec_filter(&mut self.neighbors, |ref e| (e.last_updated + 5) >= time);

		Packet {
			sender_id: self.id,
			path: self.path.clone()
		}
	}

	fn update(&mut self, packet: &Packet) {
		fn update_neighbor(neighbors: &mut Vec<Neighbor>, packet: &Packet, time: u32) {
			for neighbor in neighbors.iter_mut() {
				if neighbor.id == packet.sender_id {
					neighbor.last_updated = time;
					return;
				}
			}

			neighbors.push(Neighbor{id: packet.sender_id, last_updated: time});
		}

		fn is_loop(path: &[u32], id: u32) -> bool {
			for pid in path {
				if *pid == id {
					return true;
				}
			}
			false
		}

		if Self::is_better(&packet.path, &self.path) {
			self.path = packet.path.clone();
			self.path.path.push(self.id);
		}

		update_neighbor(&mut self.neighbors, packet, self.time);
	}

	fn route(&self, dpath: &Path, destination: ID) -> Option<ID> {
		println!("self.id: {}, path: {:?}, dpath: {:?}", self.id, self.path, dpath);

		fn get_common_len(p1: &Path, p2: &Path) -> usize {
			let len = usize::min(p1.len(), p2.len());
			for i in 0..len {
				if p1.path[i] != p2.path[i] {
					return i;
				}
			}
			len
		}

		// destination is this node
		if destination == self.id {
			println!("destination reached");
			return None;
		}

		// desination is a direct neighbor
		for neighbor in &self.neighbors {
			if neighbor.id == destination {
				println!("direct neighbor found");
				return Some(destination);
			}
		}

		// different tree!
		if dpath.id != self.path.id {
			println!("different root! {} {}", dpath.id, self.path.id);
			return None;
		}

		let common_len = get_common_len(&self.path, &dpath);

		if common_len == 0 {
			println!("common_len is zero");
			return None;
		} else if common_len < self.path.len() {
			// move up the tree
			let next = self.path.path[self.path.len() - 2];
			println!("up the tree: {}", next);
			return Some(next);
		} else {
			// move down the tree
			let neighbor_id = dpath.path[common_len];
			println!("down the tree: {}", neighbor_id);

			for neighbor in &self.neighbors {
				if neighbor.id == neighbor_id {
					println!("down the tree: {}", neighbor_id);
					return Some(neighbor_id);
				}
			}

			println!("no neighbor found");
			return None;
		}
	}
}

pub struct SpanningTreeRouting {
	nodes: Vec<Node>,
	packets: Vec<Packet> // store packet that a node will send to it's neighbors separately, this will avoid cloning the nodes array on every step
}

impl SpanningTreeRouting {
	pub fn new() -> Self {
		Self {
			nodes: Vec::new(),
			packets: Vec::new()
		}
	}
}

impl RoutingAlgorithm for SpanningTreeRouting {
	fn get_node(&self, id: ID, key: &str, out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		let node = &self.nodes[id as usize];
		match key {
			"name" => {
				write!(out, "{}", node.id)?;
			},
			"label" => {
				write!(out, "{},{}", node.neighbors.len(), node.path.len())?;
			},
			/*
			"color" => {
				write!(out, "#{:0x}", node.root.root_id)?;
			},*/
			_ => {}
		}
		Ok(())
	}

	fn get(&self, key: &str, out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		match key {
			"description" => {
				write!(out, "{}",
					concat!("Create a spanning tree. Every node is assigned a random (unique) identifier and shares with the neighbors the lowest known identifier, called root.",
						"The lowest identifier is propagated along with the path the identifier takes."))?;
			},
			"name" => {
				write!(out, "Spanning Tree Routing")?;
			},
			_ => {}
		}
		Ok(())
	}

	fn reset(&mut self, len: usize) {
		self.nodes = vec![Node::new(); len];
		self.packets = vec![Packet::new(); len];

		fn contains(nodes: &Vec<Node>, id: u32) -> bool {
			for i in 0..nodes.len() {
				if nodes[i].id == id {
					return true;
				}
			}
			false
		}

		fn unique_rnd_id(nodes: &Vec<Node>) -> u32 {
			loop {
				let id = rand::random::<u32>() % (nodes.len() as u32 * 2);
				if !contains(&nodes, id) {
					return id;
				}
			}
		}

		// Assign random numbers.
		// Avoid edges case for now when the ids are not unique
		for i in 0..len {
			//let id = unique_rnd_id(&self.nodes);
			let time = rand::random::<u16>() as u32;
			self.nodes[i].init(i as u32, time);
		}
	}

	fn step(&mut self, io: &mut Io) {
		// keep state
		for i in 0..self.nodes.len() {
			self.packets[i] = self.nodes[i].tick();
		}

		for (from, to) in io.link_iter() {
			let packet = &self.packets[from as usize];
			self.nodes[to as usize].update(&packet);
		}
	}

/*
pub fn new(transmitter: ID, receiver: ID, source: ID, destination: ID) -> Self {
		Self { transmitter, receiver, source, destination }
	}
*/

	fn route(&self, packet: &TestPacket) -> Option<ID> {
		let dpath = &self.nodes[packet.destination as usize].path;
		self.nodes[packet.receiver as usize].route(dpath, packet.destination)
	}

}
