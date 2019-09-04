
mod graph;
mod dijkstra;
mod utils;
mod stats;
mod algorithms;
mod eval_paths;
mod debug_path;
mod importer;
mod exporter;
mod movements;
mod locations;
mod meta;
mod sim;
mod cmd;
mod progress;

extern crate rand;

use std::thread;
use std::sync::Arc;
use std::sync::Mutex;
use std::vec::Vec;
use std::env;

use crate::cmd::cmd_loop;
use crate::cmd::ext_loop;
use crate::graph::Graph;
use crate::sim::GlobalState;


pub const VERSION : &'static str = "0.8";
pub const CMD_SOCKET_ADDRESS : &'static str = "127.0.0.1:8011";


const HELP_TEXT: &'static str = concat!(
	"--help|-h         Display this help.\n",
	"--version|-v      Display version.\n",
	"--run <file>      Run commands from file.\n",
	"--bind <address>  Bind command socket to address. (Default: 127.0.0.1:8011)\n"
);


fn main() {
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
