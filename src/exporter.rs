
use std::fs::File;
use std::u16;
use std::fmt::Write;

use crate::sim::RoutingAlgorithm;
use crate::graph_state::{Location};
use crate::graph::{Graph, ID};
use crate::utils::*;


pub fn export_file(graph: &Graph, loc: Option<&Location>,
	algo: Option<&RoutingAlgorithm>, mark_links: Option<&Graph>, path: &str) {
	use std::io::Write;
	if let Ok(mut file) = File::create(path) {
		let content = export_json(&graph, loc, algo, mark_links);
		file.write_all(content.as_bytes()).unwrap();
		//println!("Wrote {}", path);
	} else {
		println!("Failed to create: {}", path);
	}
}

pub fn export_json(graph: &Graph, loc: Option<&Location>, algo: Option<&RoutingAlgorithm>, mark_links: Option<&Graph>) -> String {
	let mut ret = String::new();
	let mut name = String::new();
	let mut label = String::new();

	write!(&mut ret, "{{").unwrap();
	write!(&mut ret, "\"nodes\": [").unwrap();

	let mut comma1 = false;
	for id in 0..graph.node_count() as ID {
		if comma1 {
			write!(&mut ret, ",").unwrap();
		}
		comma1 = true;

		if let Some(algo) = algo {
			name.clear();
			label.clear();
			algo.get_node(id, "name", &mut name);
			algo.get_node(id, "label", &mut label);
		}

		write!(&mut ret, "{{\"id\": \"{}\", ", id).unwrap();
		if let Some(loc) = loc {
			if let Some(pos) = loc.get_position(id) {
				write!(&mut ret, "\"x\": {}, \"y\": {}, ", pos[0] / DEG2KM, pos[1] / DEG2KM).unwrap();
			}
		}

		write!(&mut ret, "\"name\": \"{}\", \"label\": \"{}\"}}", name, label).unwrap();
	}

	write!(&mut ret, "], \"links\": [").unwrap();
	let mut comma2 = false;
	for link in &graph.links {
		if link.from > link.to {
			continue;
		}

		if comma2 {
			write!(&mut ret, ",").unwrap();
		}
		comma2 = true;

		// how to remember
		let source_id = link.from;
		let source_tq = (link.quality() as f32) / (u16::MAX as f32);
		let target_id = link.to;
		let target_tq = if let Some(link) = graph.get_link(target_id, source_id) {
			//println!("found reverse link: {}", link.quality());
			(link.quality() as f32) / (u16::MAX as f32)
		} else {
			0.0
		};

		write!(&mut ret, "{{\"source\": \"{}\", \"target\": \"{}\", \"source_tq\": {}, \"target_tq\": {}",
			source_id, target_id, source_tq, target_tq
		).unwrap();

		// mark link with color
		if let Some(mark) = mark_links {
			if mark.has_link(source_id, target_id) {
				write!(&mut ret, "\"color\": \"#FF00FF\"").unwrap();
			}
		}

		write!(&mut ret, "}}").unwrap();
	}

	write!(&mut ret, "]}}").unwrap();

	ret
}

/*
pub fn export_netjson(graph: &Graph) -> String {
	let mut ret = String::new();

	write!(&mut ret, "{{\"type\": \"NetworkGraph\", \"protocol\": \"\", \"version\": \"\", \"metric\": \"tq\", \"directed\": false, \"multigraph\": false,").unwrap();
	//write!(&mut ret, "\"timestamp\": \"{:?}\", ", chrono::Utc::now()).unwrap();

	write!(&mut ret, "\"nodes\": [").unwrap();
	let mut comma1 = false;
	for (id, node) in graph.nodes.iter().enumerate() {
		if comma1 {
			write!(&mut ret, ",").unwrap();
		}
		comma1 = true;
		write!(&mut ret, "{{\"id\": \"{}\"}}", id).unwrap();
	}

	write!(&mut ret, "], \"links\": [").unwrap();
	let mut comma2 = false;
	for (id, node) in graph.nodes.iter().enumerate() {
		for link in &node.links {
			if comma2 {
				write!(&mut ret, ",").unwrap();
			}
			comma2 = true;
			if link.to < (id as ID) {
				// how to remember
				let source_id = id as ID;
				let source_tq = link.quality;
				let target_id = link.to;
				let target_tq = if let Some(link) = graph.nodes[link.to as usize].find_link(source_id) {
					link.quality
				} else {
					0.0
				};
				write!(&mut ret, "{{\"source\": \"{}\", \"target\": \"{}\", \"source_tq\": {}, \"target_tq\": {}}}",
					source_id, target_id, source_tq, target_tq
				).unwrap();
			}
		}
	}

	write!(&mut ret, "]}}").unwrap();

	ret
}
*/
