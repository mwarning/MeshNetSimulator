use std::collections::HashMap;
use crate::graph::ID;


pub struct Meta {
	pub data: HashMap<ID, String>
}

impl Meta {
	pub fn new() -> Self {
		Self { data: HashMap::new() }
	}

	pub fn clear(&mut self) {
		self.data.clear();
	}

	pub fn remove_node(&mut self, id: ID) {
		self.data.remove(&id);
	}

	pub fn insert(&mut self, id: ID, data: String) {
		self.data.insert(id, data);
	}
}
