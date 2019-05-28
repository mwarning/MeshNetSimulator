
use std::sync::Arc;
use std::sync::Mutex;
use std::fs::File;
use std::io::prelude::*;
use std::io;
use std::str::SplitWhitespace;
use std::error::Error;
use std::time::{Instant, Duration};
use std::io::{BufRead, BufReader};

use crate::passive_routing_test::PassiveRoutingTest;
use crate::graph::Graph;
use crate::progress::Progress;
use crate::sim::{Io, TestPacket, GlobalState, RoutingAlgorithm};
use crate::vivaldi_routing::VivaldiRouting;
use crate::random_routing::RandomRouting;
use crate::spring_routing::SpringRouting;
use crate::genetic_routing::GeneticRouting;
use crate::importer::import_file;
use crate::exporter::export_file;
use crate::utils::fmt_duration;


static CMD_SOCKET_ADDRESS : &'static str = "127.0.0.1:8011";

#[derive(PartialEq)]
enum AllowRecursiveCall {
	No,
	Yes
}

pub fn send_to_socket(args: &[String]) {
	use std::io::Read;
	use std::io::Write;
	use std::time::{Instant, Duration};
	use std::net::{TcpListener, TcpStream};
	use std::net::{ToSocketAddrs, SocketAddr};
	let mut buf = vec![0; 1024];

	match TcpStream::connect(CMD_SOCKET_ADDRESS) {
		Ok(mut stream) => {
			stream.set_read_timeout(Some(Duration::from_millis(100)));
			stream.write(args.join(" ").as_bytes());
			let mut i = 0;
			loop {
				if let Ok(n) = stream.read(&mut buf) {
					if n > 0 {
						if let Ok(s) = std::str::from_utf8(&buf[0..n]) {
							//println!("received {} byte: '{}'", n, s);
							print!("{}", s);
							i += 1;
						}
					} else {
						break;
					}
				} else {
					break;
				}
			}
		},
		Err(e) => {
			eprintln!("{}", e);
		}
	}
}

pub fn ext_loop(sim: Arc<Mutex<GlobalState>>) {
	use std::io::Read;
	use std::io::Write;
	use std::net::{TcpListener, TcpStream};

	let listener = TcpListener::bind(CMD_SOCKET_ADDRESS).unwrap();
	println!("Listen for commands on {}", CMD_SOCKET_ADDRESS);
	//let mut input =  vec![0u8; 512];
	let mut output = String::new();

	loop {
		//input.clear();
		output.clear();
		if let Ok((mut stream, addr)) = listener.accept() {
			let mut buf = [0; 512];
			if let Ok(n) = stream.read(&mut buf) {
				if let Ok(s) = std::str::from_utf8(&buf[0..n]) {
					if let Ok(mut sim) = sim.lock() {
						if let Err(e) = cmd_handler(&mut output, &mut sim, s, AllowRecursiveCall::Yes) {
							stream.write(e.to_string().as_bytes());
						} else {
							stream.write(&output.as_bytes());
						}
						//println!("{}", output);
					}
				}
			}
		}
	}
}

pub fn cmd_loop(sim: Arc<Mutex<GlobalState>>) {
	let mut input = String::new();
	loop {
		if let Ok(_) = io::stdin().read_line(&mut input) {
			if let Ok(mut sim) = sim.lock() {
				let mut output = String::new();
				if let Err(e) = cmd_handler(&mut output, &mut sim, &input, AllowRecursiveCall::Yes) {
					io::stdout().write(e.to_string().as_bytes());
				} else {
					io::stdout().write(output.as_bytes());
				}
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

#[derive(Clone)]
enum Command {
	Error(String),
	Ignore,
	Help,
	Clear,
	State,
	Reset,
	Test,
	Get(String),
	Set(String, String),
	ConnectInRange(f32),
	RandomizePositions(f32),
	RemoveUnconnected,
	Algorithm(String),
	AddLine(u32, bool),
	AddTree(u32, u32),
	AddLattice4(u32, u32),
	AddLattice8(u32, u32),
	RemoveNodes(Vec<u32>),
	ConnectNodes(Vec<u32>),
	DisconnectNodes(Vec<u32>),
	Step(u32),
	Execute(String),
	Import(String),
	Export(String)
}

pub struct SimState {
	algorithm: Box<RoutingAlgorithm>,
	graph: Graph,
	test: PassiveRoutingTest,
	sim_steps: u32
}

impl SimState {
	pub fn new() -> Self {
		Self {
			algorithm: Box::new(RandomRouting::new()),
			graph: Graph::new(),
			test: PassiveRoutingTest::new(),
			sim_steps: 0
		}
	}
}

/*
struct CommandEntry {
    name: &'static str,
    description: &'static str,
}

impl CommandEntry {
	const fn new(name: &'static str, description: &'static str) -> Self {
		Self { name, description }
	}
}

const COMMANDS: &'static [CommandEntry] = &[
	CommandEntry::new("yay!", "as")
];
*/

fn parse_command(input: &str) -> Command {
	let mut tokens = Vec::new();
	for tok in input.split_whitespace() {
		tokens.push(tok.trim_matches(|c: char| (c == '\'') || (c == '"')));
	}

	let mut iter = tokens.iter().skip(1);
	let cmd = tokens.get(0).unwrap_or(&"");

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

	//println!("input: {}", input);

	let error = Command::Error("Missing Arguments".to_string());

	match *cmd {
		"" => Command::Ignore,
		"help" => Command::Help,
		"state" => Command::State,
		"clear" => Command::Clear,
		"reset" => Command::Reset,
		"test" => Command::Test,
		"get" => { if let (Some(key),) = scan!(iter, String) {
				Command::Get(key)
			} else {
				error
			}
		},
		"set" => { if let (Some(key),Some(value)) = scan!(iter, String, String) {
				Command::Set(key, value)
			} else {
				error
			}
		},
		"step" => {
			Command::Step(if let (Some(count),) = scan!(iter, u32) {
				count
			} else {
				1
			})
		},
		"execute" => {
			if let (Some(path),) = scan!(iter, String) {
				Command::Execute(path)
			} else {
				error
			}
		},
		"import" => {
			if let (Some(path),) = scan!(iter, String) {
				Command::Import(path)
			} else {
				error
			}
		},
		"export" => {
			if let (Some(path),) = scan!(iter, String) {
				Command::Export(path)
			} else {
				error
			}
		},
		"add_line" => {
			if let (Some(count), Some(close)) = scan!(iter, u32, bool) {
				Command::AddLine(count, close)
			} else {
				error
			}
		},
		"add_tree" => {
			if let (Some(count), Some(intra)) = scan!(iter, u32, u32) {
				Command::AddTree(count, intra)
			} else {
				error
			}
		},
		"add_lattice4" => {
			if let (Some(x_count), Some(y_count)) = scan!(iter, u32, u32) {
				Command::AddLattice4(x_count, y_count)
			} else {
				error
			}
		},
		"add_lattice8" => {
			if let (Some(x_count), Some(y_count)) = scan!(iter, u32, u32) {
				Command::AddLattice8(x_count, y_count)
			} else {
				error
			}
		},
		"connect_in_range" => {
			if let (Some(range),) = scan!(iter, f32) {
				Command::ConnectInRange(range)
			} else {
				error
			}
		},
		"randomize_position" => {
			if let (Some(range),) = scan!(iter, f32) {
				Command::RandomizePositions(range)
			} else {
				error
			}
		},
		"algorithm" => {
			if let (Some(algo),) = scan!(iter, String) {
				Command::Algorithm(algo)
			} else {
				Command::Algorithm("".to_string())
			}
		},
		"remove_nodes" => {
			if let Ok(ids) = parse_list(tokens.get(1)) {
				Command::RemoveNodes(ids)
			} else {
				error
			}
		}
		"connect_nodes" => {
			if let Ok(ids) = parse_list(tokens.get(1)) {
				Command::ConnectNodes(ids)
			} else {
				error
			}
		},
		"disconnect_nodes" => {
			if let Ok(ids) = parse_list(tokens.get(1)) {
				Command::DisconnectNodes(ids)
			} else {
				error
			}
		},
		"remove_unconnected" => {
			Command::RemoveUnconnected
		},
		_ => {
			if cmd.starts_with("#") {
				Command::Ignore
			} else {
				Command::Error(format!("Unknown Command: {}", cmd))
			}
		}
	}
}

fn cmd_handler(out: &mut std::fmt::Write, sim: &mut GlobalState, input: &str, call: AllowRecursiveCall) -> Result<(), std::fmt::Error> {
	let state = &mut sim.sim_state;
	let mut do_init = false;

	//println!("command: '{}'", input);

	let mut command = parse_command(input);

	match command {
		Command::Ignore => {
			// nothing to do
		},
		Command::Error(msg) => {
			writeln!(out, "{}", msg)?;
		},
		Command::Help => {
			writeln!(out, "help text...")?;
		},
		Command::Get(key) => {
			let mut buf = String::new();
			state.algorithm.get(&key, &mut buf);
			writeln!(out, "{}", buf)?;
		},
		Command::Set(key, value) => {
			state.algorithm.set(&key, &value);
		},
		Command::State => {
			writeln!(out, " graph: nodes: {}, links: {}", state.graph.node_count(), state.graph.link_count())?;
			write!(out, " algo: ")?;
			state.algorithm.get("name", out);

			writeln!(out, "\n steps: {}", state.sim_steps)?;
		},
		Command::Clear => {
			state.graph.clear();
			do_init = true;
			writeln!(out, "done")?;
		},
		Command::Reset => {
			state.test.clear();
			//state.graph.clear();
			state.sim_steps = 0;
			do_init = true;
		},
		Command::Step(count) => {
			let mut progress = Progress::new();
			let now = Instant::now();
			let mut io = Io::new(&state.graph);
			for step in 0..count {
				state.algorithm.step(&mut io);
				state.sim_steps += 1;
				progress.update((count + 1) as usize, step as usize);
			}

			let duration = now.elapsed();

			writeln!(out, "{} steps, duration: {}", count, fmt_duration(duration))?;
		},
		Command::Test => {
			fn run_test(out: &mut std::fmt::Write, test: &mut PassiveRoutingTest, graph: &Graph, algo: &Box<RoutingAlgorithm>)
				-> Result<(), std::fmt::Error>
			{
				let samples = 1000;
				test.clear();
				test.run_samples(graph, |p| algo.route(&p), samples);
				writeln!(out, "samples: {},  arrived: {:.1}, stretch: {}, duration: {}",
					samples,
					test.arrived(), test.stretch(),
					fmt_duration(test.duration())
				)
			}
			state.test.setShowProgress(true);
			run_test(out, &mut state.test, &state.graph, &state.algorithm);
		},
		Command::Import(ref path) => {
			import_file(&mut state.graph, path.as_str());
			do_init = true;
			writeln!(out, "read {}", path)?;
		},
		Command::Export(ref path) => {
			export_file(&state.graph, Some(&*state.algorithm), path.as_str());
			writeln!(out, "wrote {}", path)?;
		},
		Command::AddLine(count, close) => {
			state.graph.add_line(count, close);
			do_init = true;
		},
		Command::AddTree(count, intra) => {
			state.graph.add_tree(count, intra);
			do_init = true;
		},
		Command::AddLattice4(x_count, y_count) => {
			state.graph.add_lattice4(x_count, y_count);
			do_init = true;
		},
		Command::AddLattice8(x_count, y_count) => {
			state.graph.add_lattice8(x_count, y_count);
			do_init = true;
		},
		Command::RandomizePositions(range) => {
			state.graph.randomize_positions_2d(range);
		},
		Command::ConnectInRange(range) => {
			state.graph.connect_in_range(range);
		},
		Command::Algorithm(ref algo) => {
			match algo.as_str() {
				"" => {
					//writeln!(out, "algorithm: {}", state.algorithm.name())?;
					write!(out, "algorithm: ")?;
					state.algorithm.get("name", out);
					write!(out, "\n")?;
				},
				"random" => {
					state.algorithm = Box::new(RandomRouting::new());
					do_init = true;
				},
				"vivaldi" => {
					state.algorithm = Box::new(VivaldiRouting::new());
					do_init = true;
				},
				_ => {
					writeln!(out, "Unknown algorithm: {}", algo)?;
				} 
			}
		},
		Command::Execute(path) => {
			if call == AllowRecursiveCall::Yes {
				if let Ok(file) = File::open(&path) {
					for (index, line) in BufReader::new(file).lines().enumerate() {
						let line = line.unwrap();
						if let Err(err) = cmd_handler(out, sim, &line, AllowRecursiveCall::No) {
							println!("Error in {}:{}", path, index);
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
			state.graph.remove_unconnected_nodes();
			do_init = true;
		},
		Command::RemoveNodes(ids) => {
			state.graph.remove_nodes(&ids);
		},
		Command::ConnectNodes(ids) => {
			state.graph.connect_nodes(&ids);
		},
		Command::DisconnectNodes(ids) => {
			state.graph.disconnect_nodes(&ids);
		}
	};

	let state = &mut sim.sim_state;

	if do_init {
		//writeln!(out, "init {} nodes", state.graph.node_count())?;
		state.algorithm.reset(state.graph.node_count());
		state.test.clear();
	}

	export_file(&state.graph, Some(&*state.algorithm), "graph.json");

	Ok(())
}
