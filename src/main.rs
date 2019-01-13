
mod node;
mod link;
mod graph;
mod dijkstra;
mod utils;
mod stats;
mod passive_routing_test;
mod vivaldi_routing;
mod spring_routing;
mod random_routing;
mod distance_vector_routing;
mod max_num_consensus;
mod distance_enumeration;
mod genetic_routing;
mod importer;
mod exporter;
mod sim;
mod cmd;
mod progress;
mod tests;

extern crate rand;

#[macro_use]
extern crate serde_json;

use std::thread;
use std::sync::Arc;
use std::sync::Mutex;
use std::f32;
use std::env;
use std::mem::size_of;

use sim::RoutingAlgorithm;
use sim::SimState;
use sim::SimAction;
use passive_routing_test::PassiveRoutingTest;
use cmd::cmd_loop;
use sim::sim_loop;
use graph::Graph;
use vivaldi_routing::*;
use spring_routing::*;
use random_routing::*;
use genetic_routing::*;
use stats::Stats;
use tests::*;


pub struct GlobalState {
	stats: Stats,
	graph: Graph,
	graph_state: u32,
	test: PassiveRoutingTest,
	test_state: u32,
	algorithm: Box<RoutingAlgorithm>,
	algorithm_state: u32,
	sim_state: SimState,
	sim_action: SimAction,
	sim_steps: u32,
}

impl GlobalState {
	fn new() -> Self {
		Self {
			stats: Stats::new(),
			graph: Graph::new(),
			graph_state: 0,
			test: PassiveRoutingTest::new(),
			test_state: 0,
			algorithm: Box::new(SpringRouting::new()),
			algorithm_state: 0,
			sim_state: SimState::Waiting,
			sim_action: SimAction::None,
			sim_steps: 0,
		}
	}

	fn reset(&mut self) {
		self.stats.reset();
		//self.packets.clear();
		self.test.clear();
		self.test_state = 0;
		self.algorithm.reset(self.graph.node_count());
		self.algorithm_state = 0;
		//self.graph.clear();
		self.sim_state = SimState::Waiting;
		self.sim_action = SimAction::None;
		self.sim_steps = 0;
		self.graph_state = 0;
		self.algorithm_state = 0;
	}

	fn is_running(&self) -> bool {
		self.sim_state != SimState::Waiting
	}

	fn action(&mut self, sim_action: SimAction) {
		match (self.sim_state, sim_action) {
			(SimState::Waiting, SimAction::Start) => { self.sim_state = SimState::Running; },
			(SimState::Waiting, SimAction::None) |
			(SimState::Waiting, SimAction::Stop) |
			(SimState::Running, SimAction::None) |
			(SimState::Running, SimAction::Start) |
			(SimState::Exit, _ ) => { /* Nothing to do */ },
			(SimState::Running, SimAction::Stop) => { self.sim_state = SimState::Waiting; }, //Stopping?
			(_, SimAction::Exit) => { self.sim_state = SimState::Exit; }
		};
	}
}

fn main() {
	/*
	println!("Node: {}, Link: {}, Packet: {}, Value: {}, Vec<usize>: {}",
		size_of::<node::Node>(), size_of::<link::Link>(), size_of::<sim::Packet>(),
		size_of::<serde_json::Value>(), size_of::<Vec<usize>>()
	);*/

	let args : Vec<String> = env::args().skip(1).collect();

	//let mut i = 0;
	for arg in &args {
		match arg.as_ref() {
			"-h" => {
				println!("help text");
				std::process::exit(0);
			},
			"run1" => {
				run_test1();
				std::process::exit(0);
			},
			"run2" => {
				run_test2();
				std::process::exit(0);
			},
			"run3" => {
				run_test3();
				std::process::exit(0);
			},

			/*
			"-n" => {
				if i + 1 <= args.len() {
					eprintln!("error: argument missing for -n");
					std::process::exit(1);
				}

				if let Ok(n) = args[i+1].parse() {
					num = n;
				} else {
					eprintln!("error: second argument not an integer: -n {}", args[i+1]);
				}
			},*/
			_ => {
				println!("Unknown argument: {}", arg);
				std::process::exit(1);
			}
		}
		//i += 1;
	}

	let sim = Arc::new(Mutex::new(GlobalState::new()));

	let sim_handle = sim.clone();
	let sim_thread = thread::spawn(move || {
		sim_loop(sim_handle);
	});

	let cmd_handle = sim.clone();
	let cmd_thread = thread::spawn(move || {
		cmd_loop(cmd_handle);
	});

	sim_thread.join().unwrap();
	cmd_thread.join().unwrap();
}
