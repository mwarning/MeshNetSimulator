use std::f32;
use std::u32;

use crate::utils::*;
use crate::graph::*;
use crate::sim::{Io, TestPacket, RoutingAlgorithm};
use std::ops::{AddAssign, DivAssign, Index, Add, Mul, Div, Sub, Deref};


#[derive(Clone, Copy, PartialEq)]
struct VVec {
	data: [f32; 8]
}

impl VVec {
	pub fn new() -> Self {
		Self { data: [0.0; 8] }
	}

	pub fn new_nan() -> Self {
		Self { data: [f32::NAN; 8] }
	}

	pub fn vec_sub(&self, v: &VVec) -> VVec {
		let mut ret = VVec::new();
		for i in 0..self.data.len() {
			ret.data[i] = self.data[i] - v.data[i];
		}
		ret
	}

	pub fn vec_add(&self, v: &VVec) -> VVec {
		let mut ret = VVec::new();
		for i in 0..self.data.len() {
			ret.data[i] = self.data[i] + v.data[i];
		}
		ret
	}

	pub fn length(&self) -> f32 {
		let mut ret = 0.0;
		for i in 0..self.data.len() {
			ret += self.data[i] * self.data[i];
		}
		ret.sqrt()
	}

	pub fn unit(&self) -> VVec {
		self.scalar_mul(1.0 / self.length())
	}

	pub fn angle(&self, v: &VVec) -> f32 {
		(self.unit() * v.unit()).acos()
	}

	pub fn vec_mul(&self, v: &VVec) -> f32 {
		let mut ret = 0.0;
		for i in 0..self.data.len() {
			ret += self.data[i] * v.data[i];
		}
		ret
	}

	pub fn scalar_mul(&self, s: f32) -> VVec {
		let mut ret = self.clone();
		for i in 0..ret.data.len() {
			ret.data[i] *= s
		}
		ret
	}

	pub fn scalar_div(&self, s: f32) -> VVec {
		self.scalar_mul(1.0 / s)
	}

	pub fn distance(&self, v: &VVec) -> f32 {
		self.vec_sub(v).length()
	}

	pub fn direction(&self, v: &VVec) -> VVec {
		self.vec_sub(v).unit()
	}

	pub fn is_near_null(&self, eta: f32) -> bool {
		for n in &self.data {
			if (*n >= eta) && (*n <= -eta) {
				return false;
			}
		}
		true
	}

	pub fn is_finite(&self) -> bool {
		for n in &self.data {
			if !n.is_finite() {
				return false;
			}
		}
		true
	}

	pub fn to_finite(&self) -> Self {
		let mut ret = Self::new_nan();
		let mut i = 0;
		for n in &self.data {
			if n.is_finite() {
				ret.data[i] = *n;
				i += 1;
			}
		}
		ret
	}

	pub fn as_slice(&self) -> &[f32; 8] {
		&self.data
	}

	pub fn random_unit() -> VVec {
		VVec::random_in_area(1.0).unit()
	}

	// random around in the box of (0, 0, 0)
	pub fn random_in_area(r: f32) -> VVec {
		let mut ret = VVec::new();
		for i in 0..ret.data.len() {
			ret.data[i] = (2.0 * rand::random::<f32>() - 1.0) * r;
		}
		ret
	}
}

impl Index<usize> for VVec {
    type Output = f32;

    fn index(&self, idx: usize) -> &Self::Output {
        &self.data[idx]
    }
}

impl AddAssign<VVec> for VVec {
	fn add_assign(&mut self, v: VVec) {
		*self = *self + v;
	}
}

impl DivAssign<f32> for VVec {
	fn div_assign(&mut self, s: f32) {
		*self = *self / s;
	}
}

impl Add<VVec> for VVec {
	type Output = VVec;

	fn add(self, v: VVec) -> VVec {
		self.vec_add(&v)
	}
}

impl Sub<VVec> for VVec {
	type Output = VVec;

	fn sub(self, rhs: VVec) -> VVec {
		self.vec_sub(&rhs)
	}
}

impl Mul<VVec> for VVec {
	type Output = f32;

	fn mul(self, rhs: VVec) -> f32 {
		self.vec_mul(&rhs)
	}
}

impl Mul<f32> for VVec {
	type Output = VVec;

	fn mul(self, rhs: f32) -> VVec {
		self.scalar_mul(rhs)
	}
}

impl Div<f32> for VVec {
	type Output = VVec;

	fn div(self, rhs: f32) -> VVec {
		self.scalar_div(rhs)
	}
}

#[derive(Clone)]
struct Neighbor {
	id: ID,
	pos: VVec,
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
	pos: VVec,
	error: f32,
	pos_old: VVec,
	neighbors: Vec<Neighbor>,
}

impl Node {
	fn new() -> Self {
		Self {
			pos: VVec::new(),
			error: 0.0,
			pos_old: VVec::new(),
			neighbors: vec![],
		}
	}

	fn reset(&mut self) {
		self.pos = VVec::new();
		self.error = 0.0;
		self.pos_old = VVec::new();
		self.neighbors.clear();
	}

	fn timeout_entries(&mut self, time: u32) {
		vec_filter(&mut self.neighbors, |ref e| (e.last_updated + 5) >= time);
	}

	fn route(&self, packet: &TestPacket, dst_pos: &VVec) -> Option<ID> {
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

	fn update(&mut self, from_id: ID, from_pos: VVec, from_error: f32, time: u32, rtt: f32) {
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

	fn cut_old_pos(&mut self) {
		let n = std::cmp::min(std::cmp::max(self.neighbors.len(), 1), 8);
		println!("n: {}, neigh: {}", n, self.neighbors.len());
		for i in n..8 {
			self.pos_old.data[i] = 0.0;
		}
		/*
		for i in 0..n {
			if !self.pos_old[i].is_finite() {
				self.pos_old.data[i] = 0.0;
			}
		}
		for i in n..8 {
			self.pos_old.data[i] = f32::NAN;
		}*/
	}

	// Vivaldi algorithm
	fn vivaldi_update(&mut self, pos: &VVec, error: f32, rtt: f32) {
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
			VVec::random_unit()
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

	fn get_node(&self, id: ID, key: &str, out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		match key {
			"name" => {
				let pos = self.nodes[id as usize].pos;
				write!(out, "{:.1}/{:.1}/{:.1}", pos[0], pos[1], pos[2])?;
			},
			_ => {}
		}
		Ok(())
	}

	fn get(&self, key: &str, out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		match key {
			"rtt" => {
				write!(out, "{}", self.rtt)?;
			},
			"name" => {
				write!(out, "Vivaldi")?;
			},
			"description" => {
				write!(out, "Use Vivaldi coordinates to allow routing.")?;
			},
			"convergence" => {
				write!(out, "{}", self.get_convergence())?;
			},
			_ => {}
		}
		Ok(())
	}

	fn set(&mut self, key: &str, value: &str) -> Result<(), std::fmt::Error> {
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
		Ok(())
	}

	fn step(&mut self, io: &mut Io) {
		self.time += 1;

		// fade out old entries
		for node in &mut self.nodes {
			node.pos_old = node.pos;
			node.timeout_entries(self.time);
			node.cut_old_pos();
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
