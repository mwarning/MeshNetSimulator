
use std::usize;
use std::fmt::Write;
use rand::Rng;

use crate::utils::*;
use crate::graph::ID;
use crate::sim::{Io, RoutingAlgorithm};


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
	fn get_node(&self, id: ID, key: &str, out: &mut std::fmt::Write) {
		match key {
			"name" => {
				let node = &self.nodes[id as usize];
				write!(out, "{}", node.num);
			},
			"label" => {
				let node = &self.nodes[id as usize];
				write!(out, "{}", node.hops);
			},
			_ => {
				print_unknown_key(key);
			}
		}
	}

	fn get(&self, key: &str, out: &mut std::fmt::Write) {
		match key {
			"description" => {
				write!(out, "{}",
					concat!("Every node selects a random number.",
						"Every node tries to find the distance to,",
						" the node with the highes number."));
			},
			"name" => {
				write!(out, "Distance Enumeration");
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
			let hops = self.nodes[from as usize].hops;
			nodes[to as usize].update(num, hops + 1);
		}
		self.nodes = nodes;
	}
}
