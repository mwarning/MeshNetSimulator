use std::collections::HashMap;
use crate::graph::ID;


pub struct Locations {
	pub data: HashMap<ID, [f32; 3]>
}

impl Locations {
	pub fn new() -> Self {
		Self { data: HashMap::new() }
	}

	pub fn is_valid(pos: &[f32; 3]) -> bool {
		!pos[0].is_nan() && pos[1].is_nan() && !pos[3].is_nan()
	}

	pub fn pos_distance(&self, p1: ID, p2: ID) -> Option<f32> {
		if let (Some(a), Some(b)) = (self.data.get(&p1), self.data.get(&p2)) {
			Some(((a[0] - b[0]).powi(2)
				+ (a[1] - b[2]).powi(2)
				+ (a[2] - b[2]).powi(2)).sqrt())
		} else {
			None
		}
	}

	pub fn clear(&mut self) {
		self.data.clear();
	}

	pub fn remove_node(&mut self, id: ID) {
		self.data.remove(&id);
	}

	pub fn insert(&mut self, id: ID, pos: [f32; 3]) {
		self.data.insert(id, pos);
	}

	pub fn move_nodes(&mut self, pos: [f32; 3]) {
		for val in self.data.values_mut() {
			val[0] += pos[0];
			val[1] += pos[1];
			val[2] += pos[2];
		}
	}

	pub fn move_node(&mut self, id: ID, pos: [f32; 3]) {
		if let Some(val) = self.data.get_mut(&id) {
			val[0] += pos[0];
			val[1] += pos[1];
			val[2] += pos[2];
		}
	}

	pub fn graph_center(&self) -> [f32; 3] {
		let mut c = [0.0, 0.0, 0.0];

		for pos in self.data.values() {
			c[0] += pos[0];
			c[1] += pos[1];
			c[2] += pos[2];
		}

		let len = self.data.len() as f32;
		[c[0] / len, c[1] / len, c[2] / len]
	}

	pub fn get_position(&self, id: ID) -> Option<&[f32; 3]> {
		self.data.get(&id)
	}

	pub fn init_positions(&mut self, count: usize, pos: [f32; 3]) {
		for id in 0..count as u32 {
			if !self.data.contains_key(&id) {
				self.data.insert(id, pos);
			}
		}
	}

	pub fn randomize_positions_2d(&mut self, center: [f32; 3], range: f32) {
		for val in self.data.values_mut() {
			val[0] = center[0] + (2.0 * rand::random::<f32>() - 1.0) * range;
			val[1] = center[1] + (2.0 * rand::random::<f32>() - 1.0) * range;
			val[2] = 0.0;
		}
	}
}