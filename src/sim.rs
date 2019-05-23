
use std::sync::Arc;
use std::sync::Mutex;
use std::time;
use std::time::Duration;
use std::thread;
use std::fmt::Write;
use *;

use link::Link;
use passive_routing_test::PassiveRoutingTest;
use graph::{Graph, ID};


pub struct TestPacket {
	// One hop transmitter and receiver address
	pub transmitter: ID,
	pub receiver: ID,

	// Multi-hop source and destination address
	pub source: ID,
	pub destination: ID,
}

impl TestPacket {
	pub fn new(transmitter: ID, receiver: ID, source: ID, destination: ID) -> Self {
		Self { transmitter, receiver, source, destination }
	}
}

pub struct AlgorithmMeta {
	pub name: &'static str,
	pub description: &'static str,
}

impl AlgorithmMeta {
	fn new() -> Self {
		Self {
			name: "",
			description: "",
		}
	}

	fn clear(&mut self) {
		*self = Self::new();
	}
}

pub struct NodeMeta {
	pub name: String,
	pub label: String,
}

impl NodeMeta {
	pub fn new() -> Self {
		Self { name: String::new(), label: String::new() }
	}

	pub fn clear(&mut self) {
		self.name.clear();
		self.label.clear();
	}
}

pub trait RoutingAlgorithm : Send {
	fn get_meta(&self, meta: &mut AlgorithmMeta) {
	}

	// Get name and label of all nodes
	fn get_node_meta(&self, id: ID, meta: &mut NodeMeta) {
	}

	fn name(&self) -> &'static str {
		let mut meta = AlgorithmMeta::new();
		self.get_meta(&mut meta);
		meta.name
	}

	fn description(&self) -> &'static str {
		let mut meta = AlgorithmMeta::new();
		self.get_meta(&mut meta);
		meta.description
	}

	// Called to initialize the states or
	// when the number of nodes changes
	fn reset(&mut self, len: usize);

	// Exchange maintenance traffic for each
	// link how to combine links with stats?
	fn step(&mut self, io: &mut Io);

	// Get next hop for test packet
	fn route(&self, packet: &TestPacket) -> Option<ID> {
		None
	}
}

fn is_smaller(d: &Duration, secs: u64, millis: u32) -> bool {
	let d_secs = d.as_secs();

	if d_secs < secs {
 		true
 	} else if d_secs > secs {
 		false
	} else {
		d.subsec_millis() < millis
	}
}

pub struct Io<'a> {
	graph: &'a Graph,
	//time?
}

impl<'a> Io<'a> {
	pub fn new(graph: &'a Graph) -> Self {
		Io {
			graph: graph
		}
	}

	pub fn link_iter(&self) -> IoIterator {
		IoIterator::new(&self)
	}

	pub fn nodes_count(&self) -> usize {
		self.graph.node_count()
	}

	pub fn node_links(&self, id: ID) -> &[Link] {
		self.graph.get_neighbors(id)
	}

/*
	pub fn all_links(&self) -> &[Link] {
		self.graph.links.as_slice()
	}
*/
}

pub struct IoIterator<'a> {
	io : &'a Io<'a>,
	idx: usize,
}

impl<'a> IoIterator<'a> {
	fn new(io: &'a Io) -> Self { 
		Self {
			io: io,
			idx: 0,
		}
	}
}

// TODO: use linkiterator
impl<'a> Iterator for IoIterator<'a> {
	type Item = (ID, ID);

	// iterate over all links
	fn next(&mut self) -> Option<Self::Item> {
		let graph = &self.io.graph;
		if self.idx < graph.link_count() {
			let link = &graph.links[self.idx];
			self.idx += 1;
			Some((link.from, link.to))
		} else {
			None
		}
	}
}
