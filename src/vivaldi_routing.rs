use std::fmt::Write;
use std::f32;
use std::u32;

use utils::*;
use graph::*;
use sim::{Io, NodeMeta, AlgorithmMeta, TestPacket, RoutingAlgorithm};

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
	neighbors: Vec<Neighbor>
}

impl Node {
	fn new() -> Self {
		Self {
			pos: Vec3::new0(),
			error: 0.0,
			pos_old: Vec3::new0(),
			neighbors: vec![]
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
		let mut n_next = BROADCAST_ID;

		for v in &self.neighbors {
			let d = v.pos.distance(dst_pos);
			if d < d_next {
				d_next = d;
				n_next = v.id;
			}
		}

		if n_next == BROADCAST_ID {
			None
		} else {
			Some(n_next)
		}
	}

	fn update(&mut self, from_id: ID, from_pos: Vec3, from_error: f32, time: u32) {
		vec_add_entry(&mut self.neighbors,
			&Neighbor {
				id: from_id,
				pos: from_pos,
				error: from_error,
				last_updated: time
			}
		);

		self.vivaldi_update(&from_pos, from_error);
	}

	// Vivaldi algorithm
	fn vivaldi_update(&mut self, pos: &Vec3, error: f32)
	{
		let rtt = 1.5;
		let ce = 0.25;
		let cc = 0.25;

		// w = e_i / (e_i + e_j)
		let w = if (self.error + error) > 0.0 {
			self.error / (self.error + self.error)
		} else {
			1.0
		};
	//println!("w: {}", w);
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
			println!("random direction");
			Vec3::random_unit()
		} else {
			ab
		};

		println!("old pos: {}", self.pos);

		// x_i = x_i + ∂ * (rtt - |x_i - x_j|) * u(x_i - x_j)
		self.pos = self.pos + direction * (d * re);
		println!("new pos: {}", self.pos);
	}
}

pub struct VivaldiRouting {
	nodes: Vec<Node>,
	time: u32
}

//https://pdos.csail.mit.edu/papers/vivaldi:sigcomm/paper.pdf
impl VivaldiRouting {
	pub fn new() -> Self {
		Self {
			nodes: vec![],
			time: 0
		}
	}
}

impl RoutingAlgorithm for VivaldiRouting
{
	fn name(&self) -> &'static str {
		"Vivaldi Algorithm"
	}

	fn reset(&mut self, len: usize) {
		self.nodes = vec![Node::new(); len];
		self.time = 0;
	}

	fn get_node_meta(&self, id: ID, meta: &mut NodeMeta) {
		let pos = self.nodes[id as usize].pos;
		write!(&mut meta.name, "{:.1}/{:.1}/{:.1}", pos.x(), pos.y(), pos.z()).unwrap();
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
			self.nodes[to as usize].update(from, pos_old, 1.0, self.time);
		}
	}

	fn route(&self, packet: &TestPacket) -> Option<ID> {
		// we pretend to know the destination locator instead of the id
		let dst_pos = &self.nodes[packet.destination as usize].pos;
		self.nodes[packet.receiver as usize].route(packet, dst_pos)
	}
}

/*
	// calculate coordinate convergence
	TODO: get convergence in percent
	- every coordiante should differ from neighbor
	- every coordiante should be unique

	- maximize angle between neighbors //pos.angle(p)
	*/
	/*
	fn get_convergence(&self) -> (u32, f32, f32) {
		let mut all = Vec::new();
		let mut sum = 0f32;
		let mut count = 0f32;

		if self.nodes.len() == 0 {
			return (self.time, f32::NAN, f32::NAN);
		}

		for node in &self.nodes {
			let l1 = node.pos_old.length();
			let l2 = node.pos.length();
			if l1 != 0.0 || l2 != 0.0 {
				let d = node.pos_old.distance(&node.pos) / l1.max(l2);
				sum += d;
				count += 1.0;
				all.push(d);
			}
		}

		let med = sum / count;
		let mut var = 0f32;

		for d in &all {
			var += (d - med).powi(2) / count;
		}

		return (self.time, med, var);
	}
*/
/*
		// get min/max angle
		fn angles(s: &Node) -> String {
			let mut min = f32::INFINITY;
			let mut max = f32::NEG_INFINITY;

			for n in &s.neighbors {
				let a = s.pos.angle(&n.pos) * RAD2DEG;
				if a > max {
					max = a;
				}
				if a < min {
					min = a;
				}
			}

			if s.neighbors.len() == 0 {
				"".to_string()
			} else {
				format!("{:.0}-{:.0}", min, max)
			}
		}
*/
