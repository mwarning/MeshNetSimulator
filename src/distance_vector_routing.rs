use std::f32;
use std::fmt::Write;

use utils::*;
use graph::*;
use sim::{Io, NodeMeta, AlgorithmMeta, RoutingAlgorithm, TestPacket};


// management packet
struct Packet {
	from: ID,
	to: ID,
	origin: ID,
	hops: u32
}

impl Packet {
	fn new(from: ID, to: ID, origin: ID, hops: u32) -> Self {
		Self { from, to, origin, hops }
	}
}

#[derive(Clone)]
struct Entry {
	id: ID, // destination id
	next: ID, // next hop id
	hops: u32,
	last_updated: u32
}

// for vec_filter
impl PartialEq for Entry {
	fn eq(&self, other: &Self) -> bool {
		self.id == other.id
	}
}

#[derive(Clone)]
struct Node {
	entries: Vec<Entry>
}

impl Node {
	fn new() -> Self {
		Self { entries: vec![] }
	}

	fn timeout_entries(&mut self, time: u32) {
		// remove old entries
		vec_filter(&mut self.entries, |ref e| (e.last_updated + 5) >= time);
	}

	fn route(&self, packet: &TestPacket) -> Option<ID> {
		let id = packet.destination;
		for neighbor in &self.entries {
			if neighbor.id == id {
				return Some(neighbor.next);
			}
		}
		None
	}

	fn update_table(&mut self, packet: &Packet, time: u32) {
		// dismiss info about own node
		if packet.origin == packet.to {
			return;
		}

		// update exiting entry
		for neighbor in &mut self.entries {
			if neighbor.id == packet.origin {
				if packet.hops <= neighbor.hops {
					neighbor.next = packet.from;
					neighbor.last_updated = time;
				}
				return;
			}
		}

		// add new entry
		self.entries.push(Entry {
			id: packet.origin,
			hops: packet.hops,
			next: packet.from,
			last_updated: time
		});
	}
}

pub struct DistanceVectorRouting {
	nodes: Vec<Node>,
	time: u32
}

impl DistanceVectorRouting {
	pub fn new() -> Self {
		Self {
			nodes: vec![],
			time: 0
		}
	}
}

impl RoutingAlgorithm for DistanceVectorRouting
{
	fn name(&self) -> &'static str {
		"Distance Vector Algorithm"
	}

	fn reset(&mut self, len: usize) {
		self.nodes = vec![Node::new(); len];
		self.time = 0;
	}

	fn get_node_meta(&self, id: ID, meta: &mut NodeMeta) {
		let node = &self.nodes[id as usize];
		write!(&mut meta.name, "{} ({})", id, node.entries.len()).unwrap();
	}

	fn step(&mut self, io: &mut Io) {
		self.time += 1;

		// fade out old entries
		for node in &mut self.nodes {
			node.timeout_entries(self.time);
		}

		// For each link...
		let mut nodes = self.nodes.clone();
		for (from, to) in io.link_iter() {
			let src = &self.nodes[from as usize];
			let dst = &mut nodes[to as usize];
			// way faster approach, but mixes old and new states!!
			//let (src, dst) = index_two_mut(&mut self.nodes, from as usize, to as usize);

			// Send own info to neighbor
			dst.update_table(&Packet::new(from, to, from, 1), self.time);

			// Forward new information to neighbor
			for entry in &src.entries {
				if entry.last_updated + 1 == self.time {
					dst.update_table(&Packet::new(from, to, entry.id, entry.hops + 1), self.time);
				}
			}
		}

		// update nodes states
		self.nodes = nodes;
	}

	fn route(&self, packet: &TestPacket) -> Option<ID> {
		self.nodes[packet.receiver as usize].route(packet)
	}
}
