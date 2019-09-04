use std::collections::HashMap;

use crate::locations::Locations;
use crate::graph::{Graph, ID};


#[derive(Clone)]
struct Movement {

}

impl Movement {
	fn new() -> Self {
		Self {}
	}

	fn move_step(&self, pos: &mut [f32; 3]) {
		pos[0] += 0.01;
	}
}

pub struct Movements {
	data: HashMap<u32, Movement>
}

impl Movements {
	pub fn new() -> Self {
		Self { data: HashMap::new() }
	}

	pub fn clear(&mut self) {
		self.data.clear();
	}

	pub fn remove_node(&mut self, id: ID) {
		self.data.remove(&id);
	}

	pub fn step(&self, locations: &mut Locations) {
		for (id, movement) in self.data.iter() {
			if let Some(location) = locations.data.get_mut(id) {
				movement.move_step(location);
			}
		}
	}
}
