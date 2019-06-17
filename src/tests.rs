use rand::Rng;

use crate::sim::{Io, RoutingAlgorithm};
use crate::passive_routing_test::PassiveRoutingTest;
use crate::graph::*;
use crate::utils::*;
use crate::exporter::export_file;
use crate::progress::Progress;
use crate::graph_state::GraphState;

/*
fn create_hg(n: usize) -> Graph {
	let mut graph = Graph::new();
	if let Ok((nodes, links)) = hyperbolic_graph_generator::hg_graph_generator(n, 10.0, 2.0, 0.0, 1.0, 1) {
		for node in &nodes {
			graph.add_node(node.r as f32, node.theta as f32, 0.0);
		}
		for link in &links {
			graph.add_link(link.id as u32, link.other_id as u32, std::u16::MAX);
		}
	}
	graph
}
*/

pub fn run_test1() {
	let mut state = GraphState::new();
	let mut test = PassiveRoutingTest::new();
	let mut algorithm = crate::algorithms::spring_routing::SpringRouting::new();
	let mut progress = Progress::new();

	let n = 3;
	state.add_lattice4(n as u32, n as u32);
	algorithm.reset(state.graph.node_count());
/*
	fn print<T: RoutingAlgorithm>(algo: &T, len: usize) {
		let mut meta = NodeMeta::new();
		for id in 0..len {
			meta.clear();
			algo.get_node_meta(id as ID, &mut meta);
			println!("{}: {}", id, meta.name);
		}
	}
*/
	let steps = 4 * n;
	let mut io = Io::new(&state.graph);
	for step in 1..=steps {
		println!("step: {}", step);
		//print(&algorithm, graph.node_count());
		progress.update(steps, step);
		algorithm.step(&mut io);
	}
	test.run_samples(&state.graph, |p| algorithm.route(&p), 100);

	println!("Nodes:");

	println!("nodes: {}, links: {}, arrived: {:.0}%, stretch: {:.2}, step_duration: {}, test_duration: {}",
		state.graph.node_count(), state.graph.link_count(), test.arrived(), test.stretch(),
		fmt_duration(progress.duration()), fmt_duration(test.duration())
	);

	export_file(&state.graph, None, Some(&algorithm), None, "graph.json");
}

pub fn run_test2() {
	let mut state = GraphState::new();
	let mut test = PassiveRoutingTest::new();
	let mut algorithm = crate::algorithms::spring_routing::SpringRouting::new();
	let mut progress = Progress::new();

	for size in 2..50 {
		state.clear();
		state.add_lattice4(size, size);
		algorithm.reset(state.graph.node_count());

		let mut io = Io::new(&state.graph);

		// make sure every node information had the change to propagate
		let steps = (4 * size) as usize;
		progress.start(steps, 0);
		for step in 1..=steps {
			algorithm.step(&mut io);
			progress.update(steps, step);
		}

		//test.run_all(&graph, &algorithm, &mut dijkstra);
		test.clear();
		test.run_samples(&state.graph, |p| algorithm.route(&p), 100);

		println!(concat!(
			"{}:\t",
			"nodes: {}\tlinks: {}\t arrived: {:.0}%\t",
			"stretch: {:.2}\tsteps: {}\tduration: {}\t",
			"connectivity: {}%"),
			size, state.graph.node_count(), state.graph.link_count(),
			test.arrived(), test.stretch(),
			steps, fmt_duration(test.duration()),
			test.connectivity()
		);
	}

	println!("done");
}

pub fn run_test3() {
	fn test_program(program: &[u32], graph: &Graph, test: &mut PassiveRoutingTest, algorithm: &mut crate::algorithms::genetic_routing::GeneticRouting) -> f32 {
		algorithm.reset(graph.node_count());
		let mut io = Io::new(&graph);

		let mut sum_arrived = 0.0;
		let n = graph.node_count();

		for step in 1..=n {
			//println!("step: {}", step);
			//print(&algorithm, graph.node_count());
			algorithm.step(&mut io);

			if step > 2 {
				test.run_all(&graph, |p| algorithm.route(&p));
				if test.arrived() == 0.0 {
					return 0.0;
				} else {
					sum_arrived += test.arrived();
				}
			}
		}

		return sum_arrived / (n as f32);
	}

	fn next_program(program: &mut [u32], max: u32) {
		for i in 0..program.len() {
			program[i] += 1;
			if program[i] == max {
				if i == program.len() {
					break;
				}
				program[i] = 0;
			} else {
				break;
			}
		}
	}

	fn random_program(program: &mut [u32], max: u32) {
		for i in 0..program.len() {
			program[i] = rand::thread_rng().gen_range(0, max);
		}
	}

	fn is_valid_program(program: &[u32]) -> bool {
		// Dummy input
		let vars = crate::algorithms::genetic_routing::Vars {
			input: [0.0f32, 0.0, 0.0],
			own: [1.0f32, 1.0, 1.0],
			mean: [0.0f32, 0.0, 0.0],
			neighs: [0.0f32, 0.0, 0.0],
		};

		if let Some(v) = crate::algorithms::genetic_routing::run_program(&program, &vars) {
			v[0].is_finite() && v[1].is_finite() && v[2].is_finite()
		} else {
			false
		}
	}

	let mut test = PassiveRoutingTest::new();
	let mut algorithm = crate::algorithms::genetic_routing::GeneticRouting::new();
	let mut state = GraphState::new();
	let mut program = [0u32; 8];
	let max_symbols = crate::algorithms::genetic_routing::MAX_SYMBOLS;
	let max_possible_programs = program.len().pow(max_symbols as u32);
	let max_programs = 3000000000;
	let mut progress = Progress::new();

	// creat a 3x3 lattice
	state.add_lattice4(3, 3);

	let mut valid = 0;
	let mut found = 0;
	let mut fitness_max = 0.0;

	for iter in 1..=max_programs {
		//next_program(&mut program, max_symbols);
		random_program(&mut program, max_symbols);

		if is_valid_program(&mut program) {
			valid += 1;

			// test fitness
			algorithm.set_program(&program);
			algorithm.reset(state.graph.node_count());
			let fitness = test_program(&program, &state.graph, &mut test, &mut algorithm);
			if fitness > 0.0 {
				// yay
				found += 1;
				if fitness > fitness_max {
					fitness_max = fitness;
				}
			}
		}

		progress.update(max_programs, iter);
	}

	println!("");
	println!("max fitness: {:.1}%", fitness_max);
	println!("found: {} ({:.1}% of valid)", found, 100.0 * (found as f64) / (valid as f64));
	println!("valid: {} ({:.1}% of tested)", valid, 100.0 * (valid as f64) / (max_programs as f64));
	println!("tested {} ({}% of all possible)", max_programs, 100.0 * (max_programs as f64) / (max_possible_programs as f64));
}


struct Test4 {
	vivaldi: crate::algorithms::vivaldi_routing::VivaldiRouting,
	graph: Graph,
	init: bool
}

/*
impl Test4 {
	fn new() -> Self {
		Self {
			vivaldi: VivaldiRouting::new(),
			graph: Graph::new(),
			init: true
		}
	}

	fn step(&mut self) {
		if (self.init) {
			self.graph.add_tree(30, 3);
			self.vivaldi.reset(self.graph.node_count());
		}

		let mut io = Io::new(&self.graph);
		self.vivaldi.step(&mut io);
		println!("convergence: {:.4}", self.vivaldi.get_convergence());
		export_file(&self.graph, Some(&self.vivaldi), "graph.json");
	}
}*/

pub fn run_test4() {
	let mut state = GraphState::new();
	let mut vivaldi = crate::algorithms::vivaldi_routing::VivaldiRouting::new();

	// creat a 3x3 lattice
	state.add_tree(30, 3);
	vivaldi.reset(state.graph.node_count());

	let mut io = Io::new(&state.graph);
	for _ in 1..10 {
		vivaldi.step(&mut io);
	}

	println!("convergence: {}", vivaldi.get_convergence());
	export_file(&state.graph, None, Some(&vivaldi), None, "graph.json");
}
