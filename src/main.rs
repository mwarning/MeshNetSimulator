
mod graph;
mod dijkstra;
mod utils;
mod stats;
mod graph_state;
mod algorithms;
mod passive_routing_test;
mod importer;
mod exporter;
mod sim;
mod cmd;
mod progress;
mod tests;

extern crate rand;

use std::thread;
use std::sync::Arc;
use std::sync::Mutex;
use std::vec::Vec;
use std::env;

use crate::cmd::cmd_loop;
use crate::cmd::ext_loop;
use crate::graph::Graph;
use crate::tests::*;
use crate::sim::GlobalState;


pub const VERSION : &'static str = "1.0";
pub const CMD_SOCKET_ADDRESS : &'static str = "127.0.0.1:8011";


const HELP_TEXT: &'static str = concat!(
	"--help|-h         Display this help.\n",
	"--version|-v      Display version.\n",
	"--run <file>      Run commands from file.\n",
	"--bind <address>  Bind command socket to address. (Default: 127.0.0.1:8011)\n"
);

struct TZ {
	k: usize,
	graph: Graph,
	//a: Vec<Vec<u32>>
}

/*
impl TZ {
	fn new(k: usize) -> Self {
		Self {
			k: k,
			graph: Graph::new()
			//a: Vec::with_capacity(k)
		}
	}

	// return elements a - b
	fn intersect(a : &Vec<u32>, b: &Vec<u32>) -> Vec<u32> {
		let mut ret = Vec::new();
		for i in 0..a.len() {
			if let Err(_) = b.binary_search(&a[i]) {
				ret.push(a[i]);
			}
		}
		ret
	}

	fn dist(&self, source: u32, target: u32) -> f32 {
		let mut dijkstra = Dijkstra::new();
		dijkstra.find_shortest_distance(&self.graph, source, target)
	}

	fn nearest(&self, a: &Vec<u32>, v: u32) -> u32 {
		let mut v_dist = 10000.0;
		let mut v_min = 0;
		for e in a {
			let d = self.dist(*e, v);
			if d < v_dist {
				v_min = v;
				v_dist = d;
			}
		}
		//if v_dist > 0.0 {
			v_min
		//} else {
		//	0 //hm...
		//}
	}

	fn nearer(&self, a: &Vec<u32>, v: u32, d_max: f32) -> Vec<u32> {
		let mut ret = Vec::new();
		for e in a {
			let d = self.dist(*e, v);
			if d < d_max {
				ret.push(*e);
			}
		}
		ret
	}

	fn init(&mut self) {
		let mut a = Vec::new();
		let k = self.k;

//		let mut graph = Graph::new();
		self.graph.add_lattice4(3, 3);
		let vs : Vec<u32> = (0..self.graph.node_count() as u32).collect();

		use rand::seq::SliceRandom;

		// create A_i
		a.push(vs.clone());
		for i in 1..k {
			let len = a[i-1].len() as f32;
			let n = len.powf(1.0 - 1.0 / k as f32) as usize;
			// TODO: preserve order
			let mut next : Vec<u32> = a[i-1].as_slice().choose_multiple(&mut rand::thread_rng(), n).cloned().collect();
			next.sort_unstable();
			a.push(next);
		}

		for i in 0..a.len() {
			println!("i: {}, n: {}, {:?}", i, a[i].len(), a[i]);
		}

		for v in vs {
			let mut bv : Vec<u32> = Vec::new();
			for i in 0..(k-1) {
				// find nearest in next set
				let n = self.nearest(&a[i+1], v);
				let diff = Self::intersect(&a[i], &a[i+1]);

for i in 0..a[i].len() {
			if let Err(_) = a[i+1].binary_search(&a[i]) {
				if self.dist(v, n)
				diff.push(a[i]);
			}
		}

println!("diff.len(): {}, n: {}", diff.len(), n);
				let mut w = self.nearer(&diff, v, self.dist(v, n));
				bv.append(&mut w);
			}
			break;
		}
	}
}
*/

/*
fn get_p(tz: &TZ, i: usize, v: u32) {
}

fn zwick_dist(u: mut u32, v: mut u32) {
	let mut i = 0;
	let mut w = u;

	while get_b(v) {
		(u, v) = (v, u);
		w = get_p(i, u);
	}

	return delta(w, u) + delta(w, v);
}

fn zwick_prepro() {
	let mut graph = Graph::new();
	graph.add_lattice4(3, 3);
	let k = 3;
	let n = graph.nodes.len();
	let sets = Vector<Vector<u32>>::with_capacity(k);
	sets[0] = (0..n).collect();

	let dijkstra = Dijkstra::new();
	//let min = dijkstra.find_shortest_distance(&graph, source as ID, target as ID);

	// get element from set
	//fn smallest_dist(Vector<u32> &set, u32 v) -> u32 

	//let mut dists = Vector<u32>::new();

	let prob = (n as f32).exp(-1.0 / k as f32);

	//let v = (0..n).collect();
	for v in 1..k {
		for i in 0..k {
			let delta = smallest_dist(sets[i], v); 
		}
	}

	let bs = Vector<u32>::new();
	for i in 0..(k-1) {
		let v = sets[0][i]; // == V
		let smallest = smallest_dist(sets[i+1], v);
		for w in intersect(sets[i], sets[i+1]) {
			let d = distance(w, v);
			if d < smallest {
				bs.add(w);
			}
		}
	}
}*/

fn main() {
	/*
	let mut tz = TZ::new(4);
	tz.init();
	return;
	*/
	/*
	println!("Node: {}, Link: {}, Packet: {}, Value: {}, Vec<usize>: {}",
		size_of::<node::Node>(), size_of::<link::Link>(), size_of::<sim::Packet>(),
		size_of::<serde_json::Value>(), size_of::<Vec<usize>>()
	);*/

	let mut cmd_address = CMD_SOCKET_ADDRESS.to_string();
	let args: Vec<String> = env::args().skip(1).collect();
	let mut run_script = String::new();

	if let Some((cmd, args)) = args.split_first() {
		match cmd.as_ref() {
			"-h" | "--help" => {
				println!("{}", HELP_TEXT);
				std::process::exit(0);
			},
			"-v" | "--version" => {
				println!("{}", VERSION);
				std::process::exit(0);
			},
			"--bind" => {
				if args.len() == 1 {
					cmd_address = args[0].clone();
				} else if args.len() == 0 {
					println!("Address missing for \"--bind\".");
					std::process::exit(1);
				} else {
					println!("Too many arguments for \"--bind\".");
					std::process::exit(1);
				}
			},
			"--run" => {
				run_script = format!("run {}", args.join(" "));
			},
			// some hard coded scenarios - need to be removed
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
			"run4" => {
				run_test4();
				std::process::exit(0);
			},
			_ => {
				println!("Unknown argument: {}", cmd);
				std::process::exit(1);
			}
		}
	}

	let sim = Arc::new(Mutex::new(GlobalState::new(&cmd_address)));

	// console
	let cmd_handle = sim.clone();
	let cmd_thread = thread::spawn(move || {
		cmd_loop(cmd_handle, &run_script);
	});

	// unix socket
	let ext_handle = sim.clone();
	let ext_thread = thread::spawn(move || {
		ext_loop(ext_handle, &cmd_address);
	});

	cmd_thread.join().unwrap();
	ext_thread.join().unwrap();

	// exit with error code
	if let Ok(sim) = sim.clone().lock() {
		if sim.abort_simulation {
			std::process::exit(1);
		}
	}
}
