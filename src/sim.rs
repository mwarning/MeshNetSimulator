
use std::sync::Arc;
use std::sync::Mutex;
use std::time;
use std::time::Duration;
use std::thread;
use std::fmt::Write;
use *;

use link::Link;
use passive_routing_test::PassiveRoutingTest;
use graph::{Graph, ID, BROADCAST_ID};


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

	pub fn new_broadcast(source: ID) -> Self {
		Self::new(source, BROADCAST_ID, BROADCAST_ID, BROADCAST_ID)
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

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum SimState {
	Waiting,
	Running,
	Exit
}

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum SimAction {
	None,
	Start,
	Stop,
	Exit
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

// move to sim.rs..
pub fn sim_loop(sim: Arc<Mutex<GlobalState>>) {
	//let mut steps_per_mutex_check = 1;
	let mut init = true;
	let mut done = false;

	loop {
		let sim_state = sim.lock().unwrap().sim_state;

		match sim_state {
			SimState::Waiting => {
				// Check every 250ms if there is simulation to start
				thread::sleep(time::Duration::from_millis(250));
			},
			SimState::Running => {
				let mut sim = &mut *sim.lock().unwrap();
				let now = time::Instant::now();

				if init {
					//steps_per_mutex_check = 1;
					init = false;
					done = false;
					sim.stats.start();
				}

				loop {
					let mut io = Io::new(&sim.graph); //include stats here
					sim.algorithm.step(&mut io);

					sim.stats.test_results.push(
						(0, 0.0, 0.0)
					);
					sim.stats.steps += 1;
					done = sim.stats.steps >= sim.sim_steps;

					if done {
						break;
					}

					if !is_smaller(&now.elapsed(), 0, 250) {
						break;
					}
				}
				/*
				// Adjust iterations to keep thread responsive
				let duration = now.elapsed();
				if is_smaller(&duration, 0, 250) {
					steps_per_mutex_check += 1;
				} else if steps_per_mutex_check > 1 {
					steps_per_mutex_check -= 1;
				}*/

				if done {
					// Simulation done or aborted
					//sim.speed = steps / duration;
					let mut test = PassiveRoutingTest::new();
					test.run_all(&sim.graph, |p| sim.algorithm.route(p));

					println!("Results:");
					for r in test.get_results() {
						println!("{}: {:.2}", r.0, r.1);
					}

					println!("nodes: {}, links: {}", //, packets: {}",
						sim.graph.node_count(), sim.graph.link_count()//, sim.packets.count()
					);

					sim.stats.stop();
					sim.sim_state = SimState::Waiting;
					init = true;
					println!("simulation done");
				}
				//sim.sim_stateid += 1;
			},
			SimState::Exit => {
				return;
			}
		}
	}
}

pub struct Io<'a> {
	graph: &'a Graph,
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
/*
	pub fn links(&self) -> &[Link] {
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
