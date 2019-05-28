
use crate::utils::Vec3;


#[derive(Clone)]
pub struct Node {
	/* Geographic location */
	pub gpos: Vec3, //TODO: use [f32; 3]
	pub meta: String,
}

impl Node {
	pub fn new() -> Self {
		Node::new4(0.0, 0.0, 0.0, String::new())
	}

	pub fn new3(x: f32, y: f32, z: f32) -> Self {
		Node::new4(x, y, z, String::new())
	}

	pub fn new4(x: f32, y: f32, z: f32, meta: String) -> Self {
		Self {
			gpos: Vec3::new3(x, y, z),
			meta: meta
		}
	}
}
