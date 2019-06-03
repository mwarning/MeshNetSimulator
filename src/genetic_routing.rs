use std::f32;
use std::u32;

use crate::utils::*;
use crate::graph::*;
use crate::sim::{Io, RoutingAlgorithm, TestPacket};


const NOP : u32 = 0;
const VAR_ONES : u32 = 1;
const VAR_TWOS : u32 = 2;
const VAR_INPUT : u32 = 3;
const VAR_OWN : u32 = 4;
const VAR_MEAN : u32 = 5;
const VAR_NEIGHS : u32 = 6;
const PLUS : u32 = 7;
const EXP : u32 = 8;
const MINUS : u32 = 9;
const VMUL : u32 = 10;
const MUL : u32 = 11;
const DIV : u32 = 12;
const GT : u32 = 13;
const MAX : u32 = 14;

pub const MAX_SYMBOLS : u32 = 15;

pub struct Vars {
	pub input: [f32; 3],
	pub own: [f32; 3],
	pub mean: [f32; 3],
	pub neighs: [f32; 3]
}

// A virtual machine to run small programs with the availability of some environment varibles
pub fn run_program(prog: &[u32], vars: &Vars) -> Option<[f32; 3]> {
	let mut st = [[0.0, 0.0, 0.0]; 32];
	let mut ip = 0;
	let mut sp = 0;

	for ip in 0..prog.len() {
		match prog[ip] {
			NOP => {
			},
			VAR_ONES => {
				st[sp] = [1.0, 1.0, 1.0];
				sp += 1;
			},
			VAR_TWOS => {
				st[sp] = [2.0, 2.0, 2.0];
				sp += 1;
			},
			VAR_INPUT => {
				st[sp] = vars.input;
				sp += 1;
			},
			VAR_OWN => {
				st[sp] = vars.own;
				sp += 1;
			},
			VAR_MEAN => {
				st[sp] = vars.mean;
				sp += 1;
			},
			VAR_NEIGHS => {
				st[sp] = vars.neighs;
				sp += 1;
			},
			PLUS => {
				if sp < 2 {
					return None;
				}
				sp -= 1;
				for i in 0..3 {
					st[sp - 1][i] = st[sp - 1][i] + st[sp][i];
				}
			},
			EXP => {
				if sp < 2 {
					return None;
				}
				sp -= 1;
				for i in 0..3 {
					st[sp - 1][i] = st[sp - 1][i].powf(st[sp][i]);
				}
			},
			MINUS => {
				if sp < 2 {
					return None;
				}
				sp -= 1;
				for i in 0..3 {
					st[sp - 1][i] = st[sp - 1][i] - st[sp][i];
				}
			},
			VMUL => {
				if sp < 2 {
					return None;
				}
				sp -= 1;
				let mut r = 0.0;
				for i in 0..3 {
					r += st[sp - 1][i] * st[sp][i];
				}
				st[sp - 1][0] = r;
				st[sp - 1][1] = 0.0;
				st[sp - 1][2] = 0.0;
			},
			MUL => {
				if sp < 2 {
					return None;
				}
				sp -= 1;
				for i in 0..3 {
					st[sp - 1][i] = st[sp - 1][i] * st[sp][i];
				}
			},
			DIV => {
				if sp < 2 {
					return None;
				}
				for i in 0..3 {
					st[sp - 2][i] = st[sp - 2][i] / st[sp - 1][i];
				}
				sp -= 1;
			},
			GT => {
				if sp < 2 {
					return None;
				}
				sp -= 1;
				for i in 0..3 {
					st[sp - 1][i] = ((st[sp - 1][i] > st[sp][i]) as u32) as f32;
				}
			},
			MAX => {
				if sp < 2 {
					return None;
				}
				sp -= 1;
				for i in 0..3 {
					let a = st[sp][i];
					let b = st[sp - 1][i];
					st[sp - 1][i] = if a >= b { a } else { b };
				}
			},
			_ => {
				panic!("Unknown command");
			}
		};

		if sp == 0 {
			break;
		}
	}

	// Check for valid result
	if sp > 0 {
		Some(st[0])
	} else {
		None
	}
}

#[derive(Clone)]
struct Neighbor {
	pos: Vec3,
	id: ID,
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
			neighbors: Vec::with_capacity(8),
		}
	}

	fn calculate_mean(&self) -> [f32; 3] {
		let mut mean = Vec3::new0();
		for neighbor in &self.neighbors {
			mean += neighbor.pos;
		}
		mean /= self.neighbors.len() as f32;
		mean.to_slice()
	}

	fn run(&mut self, program: &[u32], pos: Vec3) {
		let vars = Vars {
			input: pos.to_slice(),
			own: self.pos.to_slice(),
			mean: self.calculate_mean(),
			neighs: [self.neighbors.len() as f32, 0.0, 0.0],
		};

		if let Some(pos) = run_program(program, &vars) {
			self.pos = Vec3::new(pos[0], pos[1], pos[2]);
		} else {
			// Do anything or ignore?
		}
	}
}

pub struct GeneticRouting {
	nodes: Vec<Node>,
	program: Vec<u32>,
	time: u32
}

impl GeneticRouting {
	pub fn new() -> Self {
		Self {
			nodes: vec![],
			program: vec![],
			time: 0
		}
	}

	pub fn set_program(&mut self, program: &[u32]) {
		self.program = program.to_vec();
	}
}

impl RoutingAlgorithm for GeneticRouting
{
	fn get_node(&self, id: ID, key: &str, out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		match key {
			"name" => {
				let pos = self.nodes[id as usize].pos;
				write!(out, "{:.1}/{:.1}/{:.1}", pos.x(), pos.y(), pos.z())?;
			},
			_ => {}
		}
		Ok(())
	}

	fn get(&self, key: &str, out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		match key {
			"description" => {
				write!(out, "{}", concat!(
					"Greedy Routing on virtual coordinates generated ",
					"by applying spring forces to links."
				))?;
			},
			"name" => {
				write!(out, "Sprint Routing")?;
			},
			_ => {}
		}
		Ok(())
	}

	fn reset(&mut self, len: usize) {
		self.nodes = vec![Node::new(); len];
		for node in &mut self.nodes {
			node.pos = Vec3::random_unit();
		}
		self.time = 0;
	}

	fn step(&mut self, io: &mut Io) {
		self.time += 1;

		// clear neighbor table and backup pos
		for node in &mut self.nodes {
			node.pos_old = node.pos;
			node.neighbors.clear();
		}

/*
		for node in &mut self.nodes {
			node.calculate_mean()
		}
*/
		// rebuild neighbor table
		for (from, to) in io.link_iter() {
			let to_node = &mut self.nodes[to as usize];
			to_node.neighbors.push(Neighbor{id: from, pos: to_node.pos_old});
		}

		// simulate broadcast traffic
		for (from, to) in io.link_iter() {
			let pos = self.nodes[from as usize].pos_old;
			self.nodes[to as usize].run(&self.program, pos);
		}
	}

	fn route(&self, packet: &TestPacket) -> Option<ID> {
		let node = &self.nodes[packet.receiver as usize];
		let dst = self.nodes[packet.destination as usize].pos;

		let mut d_next = f32::INFINITY;
		let mut n_next = None;

		for neighbor in &node.neighbors {
			let d = neighbor.pos.distance(&dst);
			if d < d_next {
				d_next = d;
				n_next = Some(neighbor.id);
			}
		}

		n_next
	}
}
