
use std::usize;
use std::fmt::Write;
use rand::Rng;

use graph::ID;
use utils::*;
use sim::{Io, NodeMeta, RoutingAlgorithm};


#[derive(Clone)]
struct Node {
	num: u32,
}

impl Node {
	fn new() -> Self {
		Self {
			num: 0,
		}
	}

	fn update(&mut self, num: u32) {
		if num > self.num {
			self.num = num;
		}
	}
}

pub struct MaxNumConsensus {
	nodes: Vec<Node>
}

impl MaxNumConsensus {
	pub fn new() -> Self {
		Self {
			nodes: Vec::new()
		}
	}
}

impl RoutingAlgorithm for MaxNumConsensus
{
	fn name(&self) -> &'static str {
		"Maximum Number Consensus"
	}

	fn get_node_meta(&self, id: ID, meta: &mut NodeMeta) {
		let node = &self.nodes[id as usize];
		write!(&mut meta.name, "{} ({})", id, node.num).unwrap();
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
			nodes[to as usize].update(num);
		}
		self.nodes = nodes;
	}
}
