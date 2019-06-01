use std::f32;
use std::u32;

use crate::utils::*;
use crate::graph::*;
use crate::sim::{Io, TestPacket, RoutingAlgorithm};

/*
fn get_local_error(pos: Vec3, neighbors: &Vec<Neighbor>) -> f32 {
	/*
	let mut mean = Vec3::new0();
	for v in neighbors {
		mean += v.pos;
	}

	pos.distance(&mean)
	*/
	1.0
}*/

#[derive(Clone)]
struct Neighbor {
	id: ID,
	pos: Vec3,
	error: f32,
	last_updated: u32
}

impl PartialEq for Neighbor {
	fn eq(&self, other: &Neighbor) -> bool {
		self.id == other.id
	}
}

#[derive(Clone)]
struct Node {
	pos: Vec3,
	error: f32,
	pos_old: Vec3,
	neighbors: Vec<Neighbor>,
}

impl Node {
	fn new() -> Self {
		Self {
			pos: Vec3::new0(),
			error: 0.0,
			pos_old: Vec3::new0(),
			neighbors: vec![],
		}
	}

	fn reset(&mut self) {
		self.pos = Vec3::new0();
		self.error = 0.0;
		self.pos_old = Vec3::new0();
		self.neighbors.clear();
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

	fn update(&mut self, from_id: ID, from_pos: Vec3, from_error: f32, time: u32, rtt: f32) {
		vec_add_entry(&mut self.neighbors,
			&Neighbor {
				id: from_id,
				pos: from_pos,
				error: from_error,
				last_updated: time
			}
		);

		self.vivaldi_update(&from_pos, from_error, rtt);
	}

	// Vivaldi algorithm
	fn vivaldi_update(&mut self, pos: &Vec3, error: f32, rtt: f32) {
		//let rtt = self.rtt;
		let ce = 0.25;
		let cc = 0.25;

		// w = e_i / (e_i + e_j)
		let w = if (self.error > 0.0) && (error > 0.0) {
			self.error / (self.error + error)
		} else {
			1.0
		};

		// x_i - x_j
		let ab = self.pos - *pos;

		// rtt - |x_i - x_j|
		let re = rtt - ab.length();

		// e_s = ||x_i - x_j| - rtt| / rtt
		let es = re.abs() / rtt;

		// e_i = e_s * c_e * w + e_i * (1 - c_e * w)
		self.error = es * ce * w + self.error * (1.0 - ce * w);

		// ∂ = c_c * w
		let d = cc * w;

		// Choose random direction if both positions are identical
		let direction = if ab.is_near_null(0.01) {
			//println!("random direction");
			Vec3::random_unit()
		} else {
			ab
		};

		//println!("old pos: {}, {} {} {}", self.pos, direction, w, re);

		// x_i = x_i + ∂ * (rtt - |x_i - x_j|) * u(x_i - x_j)
		self.pos = self.pos + direction * (d * re);
		//println!("new pos: {}", self.pos);
	}
}

pub struct VivaldiRouting {
	nodes: Vec<Node>,
	time: u32,
	rtt: f32
}

//https://pdos.csail.mit.edu/papers/vivaldi:sigcomm/paper.pdf
impl VivaldiRouting {
	pub fn new() -> Self {
		Self {
			nodes: vec![],
			time: 0,
			rtt: 1.5
		}
	}

	// get median distance change
	pub fn get_convergence(&self) -> f32 {
		let mut d = 0.0;
		let mut c = 0.0;
		for node in &self.nodes {
			d += node.pos_old.distance(&node.pos);
			c += 1.0;
		}
		d / c
	}

}

impl RoutingAlgorithm for VivaldiRouting
{
	fn reset(&mut self, len: usize) {
		self.nodes = vec![Node::new(); len];
		self.time = 0;
	}

	fn get_node(&self, id: ID, key: &str, out: &mut std::fmt::Write) {
		match key {
			"name" => {
				let pos = self.nodes[id as usize].pos;
				write!(out, "{:.1}/{:.1}/{:.1}", pos.x(), pos.y(), pos.z()).unwrap();
			},
			"label" => {
				write!(out, "");
			},
			_ => {}
		}
	}

	fn get(&self, key: &str, out: &mut std::fmt::Write) {
		match key {
			"rtt" => {
				write!(out, "{}", self.rtt);
			},
			"name" => {
				write!(out, "Vivaldi");
			},
			"description" => {
				write!(out, "Use Vivaldi coordinates to allow routing.");
			},
			_ => {}
		}
	}

	fn set(&mut self, key: &str, value: &str) {
		match key {
			"rtt" => {
				if let Ok(rtt) = value.parse() {
					self.rtt = rtt;
				} else {
					println!("invalid rtt value");
				}
			},
			_ => {}
		}
	}

	fn step(&mut self, io: &mut Io) {
		self.time += 1;

		// fade out old entries
		for node in &mut self.nodes {
			node.pos_old = node.pos;
			node.timeout_entries(self.time);
		}

		// simulate broadcast traffic
		for (from, to) in io.link_iter() {
			let pos_old = self.nodes[from as usize].pos_old;
			self.nodes[to as usize].update(from, pos_old, 1.0, self.time, self.rtt);
		}
	}

	fn route(&self, packet: &TestPacket) -> Option<ID> {
		// we pretend to know the destination locator instead of the id
		let dst_pos = &self.nodes[packet.destination as usize].pos;
		self.nodes[packet.receiver as usize].route(packet, dst_pos)
	}
}
