use std::f32;
use std::u32;

use crate::utils::*;
use crate::graph::*;
use crate::sim::{Io, RoutingAlgorithm, TestPacket};


#[derive(Clone)]
struct Neighbor {
	id: ID,
	pos: Vec3,
	last_updated: u32
}

// TODO: remove
impl PartialEq for Neighbor {
	fn eq(&self, other: &Neighbor) -> bool {
		self.id == other.id
	}
}

#[derive(Clone)]
struct Node {
	pos: Vec3,
	pos_old: Vec3,
	neighbors: Vec<Neighbor>
}

impl Node {
	fn new() -> Self {
		Self {
			pos: Vec3::new0(),
			pos_old: Vec3::new0(),
			neighbors: vec![]
		}
	}

	fn timeout_entries(&mut self, time: u32) {
		vec_filter(&mut self.neighbors, |ref e| (e.last_updated + 5) >= time);
	}

	fn route(&self, packet: &TestPacket, dst_pos: &Vec3) -> Option<ID> {
		let mut d_next = f32::INFINITY;
		let mut n_next = None;

		for v in &self.neighbors {
			let d = v.pos.distance(dst_pos);
			if d < d_next {
				d_next = d;
				n_next = Some(v.id);
			}
		}

		n_next
	}

	fn update(&mut self, from_id: ID, from_pos: Vec3, time: u32) {
		/*
		fn center(ns: &Vec<Neighbor>) -> Vec3 {
			let mut pos = Vec3::new0();
			for n in ns {
				pos += n.pos;
			}
			pos / ns.len() as f32
		}

		//let mid = center(&self.neighbors);
		*/

		vec_add_entry(&mut self.neighbors,
			&Neighbor {
				id: from_id,
				pos: from_pos,
				last_updated: time
			}
		);

		fn update(dist: f32, local: Vec3, remote: Vec3) -> Vec3 {
			let sensitivity = 0.25;
			let err = dist - local.distance(&remote);
			//let direction_of_err = local.direction(&remote);
			let direction_of_err = if local == remote {
				Vec3::random_unit()
			} else {
				local.direction(&remote)
			};
			let scaled_direction = direction_of_err * err;
			return local + (scaled_direction * sensitivity);
		}

		// normally called every step when all neigbors packets have arrived
		// all nodes also are randomized 0..1000
		let mut pos = Vec3::new(0.0, 0.0, 0.0);
		for e in &self.neighbors {
			pos += update(1.5, self.pos, e.pos);
		}

		self.pos = pos * (1.0 / self.neighbors.len() as f32);
	}
}

pub struct SpringRouting {
	nodes: Vec<Node>,
	time: u32
}

impl SpringRouting {
	pub fn new() -> Self {
		Self {
			nodes: vec![],
			time: 0
		}
	}
}

impl RoutingAlgorithm for SpringRouting
{
		fn get_node(&self, id: ID, key: &str, out: &mut std::fmt::Write) {
		match key {
			"name" => {
				let pos = &self.nodes[id as usize].pos;
				write!(out, "{:.1}/{:.1}/{:.1}", pos.x(), pos.y(), pos.z()).unwrap();
			},
			_ => {
				print_unknown_key(key);
			}
		}
	}

	fn get(&self, key: &str, out: &mut std::fmt::Write) {
		match key {
			"description" => {
				write!(out, "{}", concat!(
					"Greedy Routing on virtual coordinates generated ",
					"by applying spring forces to links."
				));
			},
			"name" => {
				write!(out, "Spring Routing");
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
/*
		// bad idea.. but at least no crash
		if self.nodes.len() != io.nodes_count() {
			self.reset(io.nodes_count());
		}
*/
		// fade out old entries
		for node in &mut self.nodes {
			node.pos_old = node.pos;
			node.timeout_entries(self.time);
		}

		// simulate broadcast traffic
		for (from, to) in io.link_iter() {
			let pos = self.nodes[from as usize].pos_old;
			self.nodes[to as usize].update(from, pos, self.time);
		}
	}

	fn route(&self, packet: &TestPacket) -> Option<ID> {
		// we pretend to know the destination locator instead of the id/MAC
		let dst_pos = &self.nodes[packet.destination as usize].pos;
		self.nodes[packet.receiver as usize].route(packet, dst_pos)
	}
}
