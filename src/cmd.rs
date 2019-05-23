
use std::sync::Arc;
use std::sync::Mutex;
use std::fs::File;
use std::io::prelude::*;
use std::io;
use std::str::SplitWhitespace;
use std::error::Error;

use sim::{Io, TestPacket, NodeMeta, RoutingAlgorithm};
use vivaldi_routing::VivaldiRouting;
use random_routing::RandomRouting;
use spring_routing::SpringRouting;
use genetic_routing::GeneticRouting;
use importer::import_file;
use exporter::export_file;

use utils::fmt_duration;
use *; //import from crate root


static CMD_SOCKET_ADDRESS : &'static str = "127.0.0.1:8011";

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
	let mut output = Vec::<u8>::new();

	loop {
		//input.clear();
		output.clear();
		if let Ok((mut stream, addr)) = listener.accept() {
			let mut buf = [0; 512];
			if let Ok(n) = stream.read(&mut buf) {
				if let Ok(s) = std::str::from_utf8(&buf[0..n]) {
					if let Ok(mut sim) = sim.lock() {
						cmd_handler(&mut output, &mut sim, s);
						stream.write(&output);
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
				cmd_handler(&mut io::stdout(), &mut sim, &input);
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
	Help,
	Clear,
	State,
	Reset,
	Test,
	ConnectInRange(f32),
	RemoveUnconnected,
	SetAlgorithm(String),
	AddLine(u32, bool),
	AddTree(u32, u32),
	AddLattice4(u32, u32),
	AddLattice8(u32, u32),
	RemoveNodes(Vec<u32>),
	ConnectNodes(Vec<u32>),
	DisconnectNodes(Vec<u32>),
	Step(u32),
	Import(String),
	Export(String)
}

pub struct SimState {
	algorithm: Box<RoutingAlgorithm>,
	graph: Graph,
	test: PassiveRoutingTest,
	sim_steps: u32,
	do_init: bool
}

impl SimState {
	pub fn new() -> Self {
		Self {
			algorithm: Box::new(RandomRouting::new()),
			graph: Graph::new(),
			test: PassiveRoutingTest::new(),
			sim_steps: 0,
			do_init: true
		}
	}
}

fn parse_command(input: &str) -> Command {
	//let mut iter = input.split_whitespace().skip(1);
	//let tokens = input.split_whitespace().collect::<Vec<&str>>();

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
		"" => Command::Step(1),
		"help" => Command::Help,
		"state" => Command::State,
		"clear" => Command::Clear,
		"reset" => Command::Reset,
		"step" => {
			Command::Step(if let (Some(count),) = scan!(iter, u32) {
				count
			} else {
				1
			})
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
		"set_algorithm" => {
			if let (Some(algo),) = scan!(iter, String) {
				Command::SetAlgorithm(algo)
			} else {
				error
			}
		},
		"remove_" => {
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
			Command::Error(format!("Unknown Command: {}", cmd))
		}
	}
}

fn cmd_handler(out: &mut Write, sim: &mut GlobalState, input: &str) -> Result<(), std::io::Error> {
	let state = &mut sim.sim_state2;
	let mut init = false;

	println!("command: '{}'", input);

	let mut command = parse_command(input);

	match command {
		Command::Error(msg) => {
			writeln!(out, "{}", msg)?;
		},
		Command::Help => {
			writeln!(out, "help text...")?;
		},
		Command::State => {
			writeln!(out, " graph: nodes: {}, links: {}", state.graph.node_count(), state.graph.link_count())?;
			writeln!(out, " algo: {}", state.algorithm.name())?;

			writeln!(out, " steps: {}", state.sim_steps)?;
		},
		Command::Clear => {
			state.graph.clear();
			state.do_init = true;
			writeln!(out, "done")?;
		},
		Command::Reset => {
			state.test.clear();
			//state.graph.clear();
			state.sim_steps = 0;
			state.do_init = true;
		},
		Command::Step(count) => {
			let mut io = Io::new(&state.graph);
			for step in 0..count {
				state.algorithm.step(&mut io);
				state.sim_steps += 1;
			}

			writeln!(out, "done {} steps", count)?;
		},
		Command::Test => {
			//check_state(sim);
			fn run_test(out: &mut Write, test: &mut PassiveRoutingTest, graph: &Graph, algo: &Box<RoutingAlgorithm>) {
				test.clear();
				test.run_samples(graph, |p| algo.route(&p), 1000);
				writeln!(out, "{} samples:\n  arrived: {}, stretch: {}, duration: {}",
					1000,
					test.arrived(), test.stretch(),
					fmt_duration(test.duration())
				);
			}
			run_test(out, &mut state.test, &state.graph, &state.algorithm);
		},
		Command::Import(ref path) => {
			import_file(&mut state.graph, path.as_str());
			state.do_init = true;
			writeln!(out, "read {}", path)?;
		},
		Command::Export(ref path) => {
			export_file(&state.graph, Some(&*state.algorithm), path.as_str());
			writeln!(out, "wrote {}", path)?;
		},
		Command::AddLine(count, close) => {
			state.graph.add_line(count, close);
			state.do_init = true;
		},
		Command::AddTree(count, intra) => {
			state.graph.add_tree(count, intra);
			state.do_init = true;
		},
		Command::AddLattice4(x_count, y_count) => {
			state.graph.add_lattice4(x_count, y_count);
			state.do_init = true;
		},
		Command::AddLattice8(x_count, y_count) => {
			state.graph.add_lattice8(x_count, y_count);
			state.do_init = true;
		},
		Command::ConnectInRange(range) => {
			state.graph.connect_in_range(range);
			state.do_init = true;
		},
		Command::SetAlgorithm(ref algo) => {
			match algo.as_str() {
				"random" => {
					state.algorithm = Box::new(RandomRouting::new());
					state.do_init = true;
				},
				"vivaldi" => {
					state.algorithm = Box::new(VivaldiRouting::new());
					state.do_init = true;
				},
				_ => {
					writeln!(out, "Unknown algorithm: {}", algo)?;
				} 
			}
		},
		Command::RemoveUnconnected => {
			state.graph.remove_unconnected_nodes();
			state.do_init = true;
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

	//state.last_command = command;

	//check_state(sim);

	if state.do_init {
		writeln!(out, "init {} nodes", state.graph.node_count())?;
		state.algorithm.reset(state.graph.node_count());
		state.test.clear();
	}

	export_file(&state.graph, Some(&*state.algorithm), "graph.json");

	Ok(())
}
