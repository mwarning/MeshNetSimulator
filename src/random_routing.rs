
use std::usize;
use crate::graph::*;
use crate::utils::*;
use crate::sim::{Io, RoutingAlgorithm, TestPacket};


#[derive(Clone)]
struct Neighbor {
	id: ID,
	last_updated: u32
}

impl Neighbor {
	fn new(id: ID, last_updated: u32) -> Self {
		Self {id: id, last_updated: last_updated}
	}
}

impl PartialEq for Neighbor {
    fn eq(&self, other: &Neighbor) -> bool {
        self.id == other.id
    }
}

#[derive(Clone)]
struct Node {
	neighbors: Vec<Neighbor>,
}

impl Node {
	fn new() -> Self {
		Self {
			neighbors: vec![],
		}
	}

	fn step(&mut self, time: u32) {
		vec_filter(&mut self.neighbors, |ref e| (e.last_updated + 5) >= time);
	}

	fn update(&mut self, from_id: ID, time: u32) {
		vec_add_entry(&mut self.neighbors,
			&Neighbor {
				id: from_id,
				last_updated: time
			}
		);
	}
}

pub struct RandomRouting {
	nodes: Vec<Node>,
	time: u32,
}

impl RandomRouting {
	pub fn new() -> Self {
		Self {
			nodes: vec![Node::new(); 42],
			time: 0
		}
	}
}

impl RoutingAlgorithm for RandomRouting
{
	fn get(&self, key: &str, out: &mut std::fmt::Write) {
		match key {
			"name" => {
				write!(out, "Random Routing");
			},
			"description" => {
				write!(out, "Forward traffic to a random neighbor.");
			},
			_ => {
				print_unknown_key(key);
			}
		}
	}

	fn reset(&mut self, len: usize) {
		self.nodes = vec![Node::new(); len];
		self.time = 0;
	}

	fn step(&mut self, io: &mut Io) {
		self.time += 1;

		// fade out old entries
		for node in &mut self.nodes {
			node.step(self.time);
		}

		// simulate broadcast traffic
		for (from, to) in io.link_iter() {
			self.nodes[to as usize].update(from, self.time);
		}
	}

	fn route(&self, packet: &TestPacket) -> Option<ID> {
		let from = packet.receiver;
		let neighbors = &self.nodes[from as usize].neighbors;
		let rnd = rand::random::<usize>();
		let len = neighbors.len();

		if len > 0 {
			Some(neighbors[rnd % len].id)
		} else {
			None
		}
	}
}
