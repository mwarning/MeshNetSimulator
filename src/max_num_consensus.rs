
use std::usize;
use std::fmt::Write;
use rand::Rng;

use crate::graph::ID;
use crate::utils::*;
use crate::sim::{Io, RoutingAlgorithm};


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
	fn get_node(&self, id: ID, key: &str, out: &mut std::fmt::Write) {
		match key {
			"name" => {
				let node = &self.nodes[id as usize];
				write!(out, "{} ({})", id, node.num);
			},
			_ => {
				print_unknown_key(key);
			}
		}
	}

	fn get(&self, key: &str, out: &mut std::fmt::Write) {
		match key {
			"name" => {
				write!(out, "Maximum Number Consensus");
			},
			_ => {
				print_unknown_key(key);
			}
		}
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
