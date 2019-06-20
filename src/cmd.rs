
use std::f32;
use std::sync::Arc;
use std::sync::Mutex;
use std::fs::File;
use std::time::{Duration, Instant};
use std::io::{BufRead, BufReader};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

use crate::passive_routing_test::PassiveRoutingTest;
use crate::graph::Graph;
use crate::progress::Progress;
use crate::sim::{Io, GlobalState, RoutingAlgorithm};
use crate::algorithms::vivaldi_routing::VivaldiRouting;
use crate::algorithms::random_routing::RandomRouting;
use crate::algorithms::spring_routing::SpringRouting;
use crate::algorithms::genetic_routing::GeneticRouting;
use crate::importer::import_file;
use crate::exporter::export_file;
use crate::utils::{fmt_duration, DEG2KM};


#[derive(PartialEq)]
enum AllowRecursiveCall {
	No,
	Yes
}

// trigger blocking read to exit loop
fn send_dummy_to_socket(address: &str) {
	match TcpStream::connect(address) {
		Ok(mut stream) => {
			let _ = stream.set_read_timeout(Some(Duration::from_millis(100)));
			let _ = stream.write("".as_bytes());
		},
		Err(e) => {
			eprintln!("{}", e);
		}
	}
}

fn send_dummy_to_stdin() {
	let _ = std::io::stdout().write("".as_bytes());
}

pub fn ext_loop(sim: Arc<Mutex<GlobalState>>, address: &str) {
	match TcpListener::bind(address) {
		Err(err) => {
			println!("{}", err);
		},
		Ok(listener) => {
			println!("Listen for commands on {}", address);
			//let mut input =  vec![0u8; 512];
			let mut output = String::new();

			loop {
				//input.clear();
				output.clear();
				if let Ok((mut stream, _addr)) = listener.accept() {
					let mut buf = [0; 512];
					if let Ok(n) = stream.read(&mut buf) {
						if let (Ok(s), Ok(mut sim)) = (std::str::from_utf8(&buf[0..n]), sim.lock()) {
							if sim.abort_simulation {
								// abort loop
								break;
							} else if let Err(e) = cmd_handler(&mut output, &mut sim, s, AllowRecursiveCall::Yes) {
								let _ = stream.write(e.to_string().as_bytes());
							} else {
								let _ = stream.write(&output.as_bytes());
							}
						}
					}
				}
			}
		}
	}
}

pub fn cmd_loop(sim: Arc<Mutex<GlobalState>>, run: &str) {
	let mut input = run.to_owned();
	let mut output = String::new();

	loop {
		if input.len() == 0 {
			let _ = std::io::stdin().read_line(&mut input);
		}
		if let Ok(mut sim) = sim.lock() {
			output.clear();
			if let Err(e) = cmd_handler(&mut output, &mut sim, &input, AllowRecursiveCall::Yes) {
				let _ = std::io::stderr().write(e.to_string().as_bytes());
			} else {
				let _ = std::io::stdout().write(output.as_bytes());
			}
			if sim.abort_simulation {
				// abort loop
				break;
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

enum Command {
	Error(String),
	Ignore,
	Help,
	Clear,
	GraphState,
	SimState,
	Reset,
	Exit,
	Progress(Option<bool>),
	ShowMinimumSpanningTree,
	CropMinimumSpanningTree,
	Test(u32),
	Get(String),
	Set(String, String),
	ConnectInRange(f32),
	RandomizePositions(f32),
	RemoveUnconnected,
	Algorithm(Option<String>),
	AddLine(u32, bool),
	AddTree(u32, u32),
	AddStar(u32),
	AddLattice4(u32, u32),
	AddLattice8(u32, u32),
	Positions(bool),
	RemoveNodes(Vec<u32>),
	ConnectNodes(Vec<u32>),
	DisconnectNodes(Vec<u32>),
	Step(u32),
	Run(String),
	Import(String),
	ExportPath(Option<String>),
	MoveNode(u32, f32, f32, f32),
	MoveNodes(f32, f32, f32),
	MoveTo(f32, f32, f32),
}

#[derive(Clone, Copy, PartialEq)]
enum Cid {
	Error,
	Help,
	Clear,
	GraphState,
	SimState,
	Reset,
	Exit,
	Progress,
	ShowMinimumSpanningTree,
	CropMinimumSpanningTree,
	Test,
	Get,
	Set,
	ConnectInRange,
	RandomizePositions,
	RemoveUnconnected,
	Algorithm,
	AddLine,
	AddTree,
	AddStar,
	AddLattice4,
	AddLattice8,
	Positions,
	RemoveNodes,
	ConnectNodes,
	DisconnectNodes,
	Step,
	Run,
	Import,
	ExportPath,
	MoveNode,
	MoveNodes,
	MoveTo
}

const COMMANDS: &'static [(&'static str, Cid)] = &[
	("clear                              Clear graph state", Cid::Clear),
	("graph_state                        Show Graph state", Cid::GraphState),
	("sim_state                          Show Simulator state.", Cid::SimState),
	("reset                              Reset node state.", Cid::Reset),
	("test [<samples>]                   Test routing algorithm with (test packets arrived, path stretch).", Cid::Test),
	("get <key>                          Get node property.", Cid::Get),
	("set <key> <value>                  Set node property.", Cid::Set),
	("connect_in_range <range>           Connect all nodes in range of less then range (in km).", Cid::ConnectInRange),
	("positions <true|false>             Enable geo positions.", Cid::Positions),
	("progress [<true|false>]            Show simulation progress.", Cid::Progress),
	("rnd_pos <range>                    Randomize node positions in an area with width (in km) around node center.", Cid::RandomizePositions),
	("remove_unconnected                 Remove nodes without any connections.", Cid::RemoveUnconnected),
	("algo [<algorithm>]                 Get or set given algorithm.", Cid::Algorithm),
	("line <node_count> <create_loop>    Add a line of nodes. Connect ends to create a loop.", Cid::AddLine),
	("star <edge_count>                  Add star structure of nodes.", Cid::AddStar),
	("tree <node_count> [<inter_count>]  Add a tree structure of nodes with interconnections", Cid::AddTree),
	("lattice4 <x_xount> <y_count>       Create a lattice structure of squares.", Cid::AddLattice4),
	("lattice8 <x_xount> <y_count>       Create a lattice structure of squares and diagonal connections.", Cid::AddLattice8),
	("remove_nodes <node_list>           Remove nodes. Node list is a comma separated list of node ids.", Cid::RemoveNodes),
	("connect_nodes <node_list>          Connect nodes. Node list is a comma separated list of node ids.", Cid::ConnectNodes),
	("disconnect_nodes <node_list>       Disconnect nodes. Node list is a comma separated list of node ids.", Cid::DisconnectNodes),
	("step [<steps>]                     Run simulation steps. Default is 1.", Cid::Step),
	("run <file>                         Run commands from a script.", Cid::Run),
	("import <file>                      Import a graph as JSON file.", Cid::Import),
	("export [<file>]                    Get or set graph export file.", Cid::ExportPath),
	("move_node <node_id> <x> <y> <z>    Move a node by x/y/z (in km).", Cid::MoveNode),
	("move_nodes <x> <y> <z>             Move all nodes by x/y/z (in km).", Cid::MoveNodes),
	("move_to <x> <y> <z>                Move all nodes to x/y/z (in degrees).", Cid::MoveTo),
	("show_mst                           Mark the minimum spanning tree.", Cid::ShowMinimumSpanningTree),
	("crop_mst                           Only leave the minimum spanning tree.", Cid::CropMinimumSpanningTree),
	("exit                               Exit simulator.", Cid::Exit),
	("help                               Show this help.", Cid::Help),
];

fn parse_command(input: &str) -> Command {
	let mut tokens = Vec::new();
	for tok in input.split_whitespace() {
		// trim ' " characters
		tokens.push(tok.trim_matches(|c: char| (c == '\'') || (c == '"')));
	}

	let mut iter = tokens.iter().skip(1);
	let cmd = tokens.get(0).unwrap_or(&"");

	fn is_first_token(string: &str, tok: &str) -> bool {
		string.starts_with(tok)
			&& (string.len() > tok.len())
			&& (string.as_bytes()[tok.len()] == ' ' as u8)
	}

	fn lookup_cmd(cmd: &str) -> Cid {
		for item in COMMANDS {
			if is_first_token(item.0, cmd) {
				return item.1;
			}
		}
		Cid::Error
	}

	// parse number separated list of numbers
	fn parse_list(numbers: Option<&&str>) -> Result<Vec<u32>, ()> {
		let mut v = Vec::<u32>::new();
		for num in numbers.unwrap_or(&"").split(",") {
			if let Ok(n) = num.parse::<u32>() {
				v.push(n);
			} else {
				return Err(());
			}
		}
		Ok(v)
	}

	let error = Command::Error("Missing Arguments".to_string());

	match lookup_cmd(cmd) {
		Cid::Help => Command::Help,
		Cid::SimState => Command::SimState,
		Cid::GraphState => Command::GraphState,
		Cid::Clear => Command::Clear,
		Cid::Reset => Command::Reset,
		Cid::Exit => Command::Exit,
		Cid::Progress => {
			if let (Some(progress),) = scan!(iter, bool) {
				Command::Progress(Some(progress))
			} else {
				Command::Progress(None)
			}
		},
		Cid::ShowMinimumSpanningTree => Command::ShowMinimumSpanningTree,
		Cid::CropMinimumSpanningTree => Command::CropMinimumSpanningTree,
		Cid::Test => {
			if let (Some(samples),) = scan!(iter, u32) {
				Command::Test(samples)
			} else {
				Command::Test(1000)
			}
		}
		Cid::Get => { if let (Some(key),) = scan!(iter, String) {
				Command::Get(key)
			} else {
				error
			}
		},
		Cid::Set => { if let (Some(key),Some(value)) = scan!(iter, String, String) {
				Command::Set(key, value)
			} else {
				error
			}
		},
		Cid::Step => {
			Command::Step(if let (Some(count),) = scan!(iter, u32) {
				count
			} else {
				1
			})
		},
		Cid::Run => {
			if let (Some(path),) = scan!(iter, String) {
				Command::Run(path)
			} else {
				error
			}
		},
		Cid::Import => {
			if let (Some(path),) = scan!(iter, String) {
				Command::Import(path)
			} else {
				error
			}
		},
		Cid::ExportPath => {
			if let (Some(path),) = scan!(iter, String) {
				Command::ExportPath(Some(path))
			} else {
				Command::ExportPath(None)
			}
		},
		Cid::MoveNodes => {
			if let (Some(x), Some(y), Some(z)) = scan!(iter, f32, f32, f32) {
				Command::MoveNodes(x, y, z)
			} else {
				error
			}
		},
		Cid::MoveNode => {
			if let (Some(id), Some(x), Some(y), Some(z)) = scan!(iter, u32, f32, f32, f32) {
				Command::MoveNode(id, x, y, z)
			} else {
				error
			}
		},
		Cid::AddLine => {
			if let (Some(count), Some(close)) = scan!(iter, u32, bool) {
				Command::AddLine(count, close)
			} else {
				error
			}
		},
		Cid::AddTree => {
			if let (Some(count), Some(intra)) = scan!(iter.clone(), u32, u32) {
				Command::AddTree(count, intra)
			} else if let (Some(count),) = scan!(iter, u32) {
				Command::AddTree(count, 0)
			} else {
				error
			}
		},
		Cid::AddStar => {
			if let (Some(count),) = scan!(iter, u32) {
				Command::AddStar(count)
			} else {
				error
			}
		},
		Cid::AddLattice4 => {
			if let (Some(x_count), Some(y_count)) = scan!(iter, u32, u32) {
				Command::AddLattice4(x_count, y_count)
			} else {
				error
			}
		},
		Cid::AddLattice8 => {
			if let (Some(x_count), Some(y_count)) = scan!(iter, u32, u32) {
				Command::AddLattice8(x_count, y_count)
			} else {
				error
			}
		},
		Cid::Positions => {
			if let (Some(enable),) = scan!(iter, bool) {
				Command::Positions(enable)
			} else {
				error
			}
		},
		Cid::ConnectInRange => {
			if let (Some(range),) = scan!(iter, f32) {
				Command::ConnectInRange(range)
			} else {
				error
			}
		},
		Cid::RandomizePositions => {
			if let (Some(range),) = scan!(iter, f32) {
				Command::RandomizePositions(range)
			} else {
				error
			}
		},
		Cid::Algorithm => {
			if let (Some(algo),) = scan!(iter, String) {
				Command::Algorithm(Some(algo))
			} else {
				Command::Algorithm(None)
			}
		},
		Cid::RemoveNodes => {
			if let Ok(ids) = parse_list(tokens.get(1)) {
				Command::RemoveNodes(ids)
			} else {
				error
			}
		},
		Cid::ConnectNodes => {
			if let Ok(ids) = parse_list(tokens.get(1)) {
				Command::ConnectNodes(ids)
			} else {
				error
			}
		},
		Cid::DisconnectNodes => {
			if let Ok(ids) = parse_list(tokens.get(1)) {
				Command::DisconnectNodes(ids)
			} else {
				error
			}
		},
		Cid::RemoveUnconnected => {
			Command::RemoveUnconnected
		},
		Cid::MoveTo => {
			if let (Some(x), Some(y), Some(z)) = scan!(iter, f32, f32, f32) {
				Command::MoveTo(x, y, z)
			} else {
				error
			}
		},
		Cid::Error => {
			if cmd.is_empty() {
				Command::Ignore
			} else if cmd.trim_start().starts_with("#") {
				Command::Ignore
			} else {
				Command::Error(format!("Unknown Command: {}", cmd))
			}
		}
	}
}

fn print_help(out: &mut std::fmt::Write) -> Result<(), std::fmt::Error> {
	for item in COMMANDS {
		if item.1 != Cid::Error {
			writeln!(out, "{}", item.0)?;
		}
	}
	Ok(())
}

fn cmd_handler(out: &mut std::fmt::Write, sim: &mut GlobalState, input: &str, call: AllowRecursiveCall) -> Result<(), std::fmt::Error> {
	let mut mark_links : Option<Graph> = None;
	let mut do_init = false;

	//println!("command: '{}'", input);

	let command = parse_command(input);

	match command {
		Command::Ignore => {
			// nothing to do
		},
		Command::Progress(show) => {
			if let Some(show) = show {
				sim.show_progress = show;
			}

			writeln!(out, "show progress: {}", if sim.show_progress {
				"enabled"
			} else {
				"disabled"
			})?;
		},
		Command::Exit => {
			sim.abort_simulation = true;
			send_dummy_to_socket(&sim.cmd_address);
			send_dummy_to_stdin();
		},
		Command::ShowMinimumSpanningTree => {
			let mst = sim.gstate.graph.minimum_spanning_tree();
			if mst.node_count() > 0 {
				mark_links = Some(mst);
			}
		},
		Command::CropMinimumSpanningTree => {
			// mst is only a uni-directional graph...!!
			let mst = sim.gstate.graph.minimum_spanning_tree();
			if mst.node_count() > 0 {
				sim.gstate.graph = mst;
			}
		},
		Command::Error(msg) => {
			//TODO: return Result error
			writeln!(out, "{}", msg)?;
		},
		Command::Help => {
			print_help(out)?;
		},
		Command::Get(key) => {
			let mut buf = String::new();
			sim.algorithm.get(&key, &mut buf)?;
			writeln!(out, "{}", buf)?;
		},
		Command::Set(key, value) => {
			sim.algorithm.set(&key, &value)?;
		},
		Command::GraphState => {
			let state = &mut sim.gstate;
			let node_count = state.graph.node_count();
			let link_count = state.graph.link_count();
			let avg_node_degree = state.graph.get_avg_node_degree();
			let mean_clustering_coefficient = state.graph.get_mean_clustering_coefficient();
			let mean_link_count = state.graph.get_mean_link_count();
			let mean_link_distance = state.get_mean_link_distance();

			writeln!(out, "nodes: {}, links: {}", node_count, link_count)?;
			writeln!(out, "locations: {}, metadata: {}", state.location.data.len(), state.meta.data.len())?;
			writeln!(out, "average node degree: {}", avg_node_degree)?;
			writeln!(out, "mean clustering coefficient: {}", mean_clustering_coefficient)?;
			writeln!(out, "mean link count: {} ({} variance)", mean_link_count.0, mean_link_count.1)?;
			writeln!(out, "mean link distance: {} ({} variance)", mean_link_distance.0, mean_link_distance.1)?;
		},
		Command::SimState => {
			write!(out, " algo: ")?;
			sim.algorithm.get("name", out)?;

			writeln!(out, "\n steps: {}", sim.sim_steps)?;
		},
		Command::Clear => {
			sim.gstate.graph.clear();
			do_init = true;
			writeln!(out, "done")?;
		},
		Command::Reset => {
			sim.test.clear();
			//state.graph.clear();
			sim.sim_steps = 0;
			do_init = true;
			writeln!(out, "done")?;
		},
		Command::Step(count) => {
			let mut progress = Progress::new();
			let now = Instant::now();
			let mut io = Io::new(&sim.gstate.graph);
			for step in 0..count {
				if sim.abort_simulation {
					break;
				}

				sim.algorithm.step(&mut io);
				sim.sim_steps += 1;

				if sim.show_progress {
					progress.update((count + 1) as usize, step as usize);
				}
			}

			let duration = now.elapsed();

			writeln!(out, "\n{} steps, duration: {}", count, fmt_duration(duration))?;
		},
		Command::Test(samples) => {
			fn run_test(out: &mut std::fmt::Write, test: &mut PassiveRoutingTest, graph: &Graph, algo: &Box<RoutingAlgorithm>, samples: u32)
				-> Result<(), std::fmt::Error>
			{
				test.clear();
				test.run_samples(graph, |p| algo.route(&p), samples as usize);
				writeln!(out, "samples: {},  arrived: {:.1}, stretch: {}, duration: {}",
					samples,
					test.arrived(), test.stretch(),
					fmt_duration(test.duration())
				)
			}
			sim.test.show_progress(sim.show_progress);
			run_test(out, &mut sim.test, &sim.gstate.graph, &sim.algorithm, samples)?;
		},
		Command::Import(ref path) => {
			import_file(&mut sim.gstate.graph, Some(&mut sim.gstate.location), Some(&mut sim.gstate.meta), path.as_str());
			do_init = true;
			writeln!(out, "read {}", path)?;
		},
		Command::ExportPath(path) => {
			if let Some(path) = path {
				sim.export_path = path;
			}

			writeln!(out, "Export path: {}", sim.export_path)?;
		},
		Command::AddLine(count, close) => {
			sim.gstate.add_line(count, close);
			do_init = true;
		},
		Command::MoveNodes(x, y, z) => {
			sim.gstate.location.move_nodes([x, y, z]);
		},
		Command::MoveNode(id, x, y, z) => {
			sim.gstate.location.move_node(id, [x, y, z]);
		},
		Command::AddTree(count, intra) => {
			sim.gstate.add_tree(count, intra);
			do_init = true;
		},
		Command::AddStar(count) => {
			sim.gstate.add_star(count);
			do_init = true;
		},
		Command::AddLattice4(x_count, y_count) => {
			sim.gstate.add_lattice4(x_count, y_count);
			do_init = true;
		},
		Command::AddLattice8(x_count, y_count) => {
			sim.gstate.add_lattice8(x_count, y_count);
			do_init = true;
		},
		Command::Positions(enable) => {
			if enable {
				// add positions to node that have none
				let node_count = sim.gstate.graph.node_count();
				sim.gstate.location.init_positions(node_count, [0.0, 0.0, 0.0]);
			} else {
				sim.gstate.location.clear();
			}

			writeln!(out, "positions: {}", if enable {
				"enabled"
			} else {
				"disabled"
			})?;
		}
		Command::RandomizePositions(range) => {
			let center = sim.gstate.location.graph_center();
			sim.gstate.location.randomize_positions_2d(center, range);
		},
		Command::ConnectInRange(range) => {
			sim.gstate.connect_in_range(range);
		},
		Command::Algorithm(algo) => {
			if let Some(algo) = algo {
				match algo.as_str() {
					"random" => {
						sim.algorithm = Box::new(RandomRouting::new());
						do_init = true;
					},
					"vivaldi" => {
						sim.algorithm = Box::new(VivaldiRouting::new());
						do_init = true;
					},
					"spring" => {
						sim.algorithm = Box::new(SpringRouting::new());
						do_init = true;
					},
					"genetic" => {
						sim.algorithm = Box::new(GeneticRouting::new());
						do_init = true;
					},
					_ => {
						writeln!(out, "Unknown algorithm: {}", algo)?;
					}
				}
			} else {
				write!(out, "selected: ")?;
				sim.algorithm.get("name", out)?;
				write!(out, "\n")?;
				write!(out, "available: random, vivaldi, spring, genetic\n")?;
			}
		},
		Command::Run(path) => {
			if call == AllowRecursiveCall::Yes {
				if let Ok(file) = File::open(&path) {
					for (index, line) in BufReader::new(file).lines().enumerate() {
						let line = line.unwrap();
						if let Err(err) = cmd_handler(out, sim, &line, AllowRecursiveCall::No) {
							writeln!(out, "Error in {}:{}: {}", path, index, err)?;
							sim.abort_simulation = true;
							break;
						}
					}
				} else {
					writeln!(out, "File not found: {}", &path)?;
				}
			} else {
				writeln!(out, "Recursive call not allowed: {}", &path)?;
			}
		},
		Command::RemoveUnconnected => {
			sim.gstate.graph.remove_unconnected_nodes();
			do_init = true;
		},
		Command::RemoveNodes(ids) => {
			sim.gstate.graph.remove_nodes(&ids);
		},
		Command::ConnectNodes(ids) => {
			sim.gstate.graph.connect_nodes(&ids);
		},
		Command::DisconnectNodes(ids) => {
			sim.gstate.graph.disconnect_nodes(&ids);
		},
		Command::MoveTo(x, y, z) => {
			let center = sim.gstate.location.graph_center();
			sim.gstate.location.move_nodes([center[0] + x * DEG2KM, center[1] + y * DEG2KM, center[2] + z * DEG2KM]);
		}
	};

	if do_init {
		sim.algorithm.reset(sim.gstate.graph.node_count());
		sim.test.clear();
	}

	export_file(
		&sim.gstate.graph,
		Some(&sim.gstate.location),
		Some(&*sim.algorithm),
		mark_links.as_ref(),
		sim.export_path.as_ref()
	);

	Ok(())
}
