
use std::sync::Arc;
use std::sync::Mutex;
use std::fs::File;
use std::io::prelude::*;
use std::io;
use std::str::SplitWhitespace;

use sim::{Io, TestPacket, NodeMeta, RoutingAlgorithm};
use vivaldi_routing::VivaldiRouting;
use random_routing::RandomRouting;
use spring_routing::SpringRouting;
use genetic_routing::GeneticRouting;
use importer::import_file;
use exporter::export_json;
use utils::fmt_duration;
use *; //import from crate root


pub fn cmd_loop(sim: Arc<Mutex<GlobalState>>) {
	let mut input = String::new();
	loop {
		if let Ok(_) = io::stdin().read_line(&mut input) {
			let mut iter = input.split_whitespace();
			if let Some(cmd) = iter.next() {
				if let Ok(mut sim) = sim.lock() {
					cmd_handler(&mut sim, cmd, &mut iter);
				}
			} else {
				println!("Please enter commands");
			}
		}
		input.clear();
	}
}

macro_rules! scan {
    ( $iter:expr, $( $x:ty ),+ ) => {{
        ($($iter.next().and_then(|word| word.parse::<$x>().ok()),)*)
    }}
}

fn export_graph(graph: &Graph, algo: &RoutingAlgorithm, path: &String) {
	if let Ok(mut file) = File::create("graph.json") {
		let content = export_json(&graph, Some(algo));
		file.write_all(content.as_bytes()).unwrap();
		println!("Wrote {}", path);
	} else {
		println!("Failed to create: {}", path);
	}
}

fn cmd_handler(sim: &mut GlobalState, cmd: &str, iter: &mut SplitWhitespace) {
	fn invalid_arguments() {
		println!("invalid arguments");
	}

	fn check_state(sim: &mut GlobalState) {
		// Make sure the state of the algorithm impl is initialized
		if sim.graph_state != sim.algorithm_state {
			println!("reset algorithm state");
			sim.algorithm.reset(sim.graph.node_count());
			sim.algorithm_state = sim.graph_state;
		}

		if sim.graph_state != sim.test_state {
			println!("reset test state");
			sim.test.clear();
			sim.test_state = sim.graph_state;
		}
	}

	//let old_graph_state = sim.graph_state;
	//let old_sim_state = sim.sim_state;

	match cmd {
		"state" => {
			println!(" algo: {}", sim.algorithm.name());
			println!(" graph: nodes: {}, links: {}",
				sim.graph.node_count(), sim.graph.link_count());
			// show progress bar
			// show simulation progress?
			//println!("{:?}", );
		},
		"clear" => {
			sim.graph.clear();
			sim.graph_state += 1;
			println!("done");
		},
		"reset" => {
			sim.reset();
			println!("done");
		},
		"step" => {
			//check_state(sim);
			if sim.graph.node_count() > 0 {
				let mut io = Io::new(&sim.graph);
				if let (Some(count),) = scan!(iter, u32) {
					for step in 0..count {
						sim.algorithm.step(&mut io);
						sim.sim_steps += 1;
					}
				} else {
					sim.algorithm.step(&mut io);
					sim.sim_steps += 1;
				}
				println!("done");
			} else {
				println!("Graph is empty - no point in running simulation steps");
			}
		},
		"test" => {
			//check_state(sim);
			fn run_test(test: &mut PassiveRoutingTest, graph: &Graph, algo: &Box<RoutingAlgorithm>) {
				test.clear();
				test.run_samples(graph, |p| algo.route(&p), 1000);
				println!("{} samples:\n  arrived: {}, stretch: {}, duration: {}",
					1000,
					test.arrived(), test.stretch(),
					fmt_duration(test.duration())
				);
			}
			run_test(&mut sim.test, &sim.graph, &sim.algorithm);
		}
		"import" => {
			if let (Some(path),) = scan!(iter, String) {
				import_file(&mut sim.graph, &path);
				sim.graph_state += 1;
				println!("done");
			} else {
				invalid_arguments();
			}
		},
		"export" => {
			if let Ok(mut file) = File::create("graph.json") {
				let mut ret = String::new();
				if let Ok(_) = file.write(ret.as_bytes()) {
					println!("done");
				}
			} else {
				invalid_arguments();
			}
		},
		"add_line" => {
			if let (Some(count), Some(close)) = scan!(iter, u32, bool) {
				sim.graph.add_line(count, close);
				sim.graph_state += 1;
				println!("done");
			} else {
				invalid_arguments();
			}
		},
		"add_tree" => {
			if let (Some(count), Some(intra)) = scan!(iter, u32, u32) {
				sim.graph.add_tree(count, intra);
				sim.graph_state += 1;
				println!("done");
			} else {
				invalid_arguments();
			}
		},
		"add_lattice4" => {
			if let (Some(x_count), Some(y_count)) = scan!(iter, u32, u32) {
				sim.graph.add_lattice4(x_count, y_count);
				sim.graph_state += 1;
				println!("done");
			} else {
				invalid_arguments();
			}
		},
		"add_lattice8" => {
			if let (Some(x_count), Some(y_count)) = scan!(iter, u32, u32) {
				sim.graph.add_lattice8(x_count, y_count);
				sim.graph_state += 1;
				println!("done");
			} else {
				invalid_arguments();
			}
		},
		"connect_in_range" => {
			if let (Some(range),) = scan!(iter, f32) {
				sim.graph.connect_in_range(range);
				sim.graph_state += 1;
				println!("done");
			} else {
				invalid_arguments();
			}
		},
		"set_algorithm" => {
			if let (Some(algo),) = scan!(iter, String) {
				match algo.as_str() {
					"random" => {
						sim.algorithm = Box::new(RandomRouting::new());
					},
					"vivaldi" => {
						sim.algorithm = Box::new(VivaldiRouting::new());
					},
					_ => {
						println!("Unknown algorithm: {}", algo);
					} 
				}
			} else {
				invalid_arguments();
			}
		},
		"remove_unconnected" => {
			sim.graph.remove_unconnected_nodes();
			sim.graph_state += 1;
		},
		"start" => {
			sim.action(SimAction::Start);
		},
		"stop" => {
			sim.action(SimAction::Stop);
		},
		"exit" => {
			sim.action(SimAction::Exit);
		},
		_ => {
			println!("Unknown command: {}", cmd);
		}
	}

	check_state(sim);

	export_graph(&sim.graph, &*sim.algorithm, &"graph.json".to_string());
}
