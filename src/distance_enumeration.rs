
use std::usize;
use std::fmt::Write;
use rand::Rng;

use utils::*;
use graph::ID;
use sim::{Io, NodeMeta, RoutingAlgorithm};


#[derive(Clone)]
struct Node {
	num: u32,
	hops: u32,
}

impl Node {
	fn new() -> Self {
		Self {
			num: 0,
			hops: 0,
		}
	}

	fn update(&mut self, num: u32, hops: u32) {
		if num > self.num {
			self.num = num;
			self.hops = hops;
		}
	}
}

pub struct DistanceEnumeration {
	nodes: Vec<Node>
}

impl DistanceEnumeration {
	pub fn new() -> Self {
		Self {
			nodes: Vec::new()
		}
	}
}

impl RoutingAlgorithm for DistanceEnumeration
{
	fn name(&self) -> &'static str {
		"Distance Enumeration"
	}

	fn description(&self) -> &'static str {
		concat!("Every node selects a random number.",
			"Every node tries to find the distance to,",
			" the node with the highes number.")
	}

	fn get_node_meta(&self, id: ID, meta: &mut NodeMeta) {
		let node = &self.nodes[id as usize];
		write!(&mut meta.name, "{}", node.num).unwrap();
		write!(&mut meta.label, "{}", node.hops).unwrap();
	}

	fn reset(&mut self, len: usize) {
		self.nodes = vec![Node::new(); len];

		// Assign random numbers
		for i in 0..len {
			self.nodes[i].num = rand::random::<u32>();
		}
	}

	fn step(&mut self, io: &mut Io) {
		let mut nodes = self.nodes.clone();
		for (from, to) in io.link_iter() {
			let num = self.nodes[from as usize].num;
			let hops = self.nodes[from as usize].hops;
			nodes[to as usize].update(num, hops + 1);
		}
		self.nodes = nodes;
	}
}
