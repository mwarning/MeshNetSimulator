
use std::time::Duration;

use crate::utils::*;
use crate::graph::{Graph, Link, ID};
use crate::graph_state::GraphState;
use crate::algorithms::random_routing::RandomRouting;
use crate::eval_paths::EvalPaths;
use crate::debug_path::DebugPath;


pub struct GlobalState {
	pub gstate: GraphState,
	pub algorithm: Box<RoutingAlgorithm>,
	pub test: EvalPaths,
	pub debug_path: DebugPath,
	pub sim_steps: u32,
	pub abort_simulation: bool,
	pub show_progress: bool,
	pub cmd_address: String,
	pub export_path: String
}

impl GlobalState {
	pub fn new(cmd_address: &str) -> Self {
		Self {
			gstate: GraphState::new(),
			algorithm: Box::new(RandomRouting::new()),
			test: EvalPaths::new(),
			debug_path: DebugPath::new(),
			sim_steps: 0,
			abort_simulation: false,
			show_progress: false,
			export_path: "graph.json".to_string(),
			cmd_address: cmd_address.to_string()
		}
	}
}

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

pub trait RoutingAlgorithm : Send {
	fn get_node(&self, _id: ID, _key: &str, _out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		Ok(())
	}

	fn get(&self, key: &str, _out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
		print_unknown_key(key);
		Ok(())
	}

	fn set(&mut self, key: &str, _value: &str) -> Result<(), std::fmt::Error> {
		print_unknown_key(key);
		Ok(())
	}

	fn remove_node(&mut self, id: ID) {
		println!("not implemented");
	}

	// Called to initialize the states or
	// when the number of nodes changes
	fn reset(&mut self, len: usize);

	// Exchange maintenance traffic for each
	// link how to combine links with stats?
	fn step(&mut self, io: &mut Io);

	// Get next hop for test packet
	fn route(&self, _packet: &TestPacket) -> Option<ID> {
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
