
use std::fs::File;
use std::io::Read;
use std::collections::HashMap;
use std::borrow::BorrowMut;

use serde_json::Value;
use crate::graph_state::{Meta, Location};
use crate::graph::{Graph, ID};
use crate::utils::*;


pub fn import_file(graph: &mut Graph, loc: Option<&mut Location>, meta: Option<&mut Meta>, path: &str) {
	match File::open(path) {
		Ok(mut file) => {
			let mut data = String::new();
			match file.read_to_string(&mut data) {
				Ok(_) => { parse_netjson(graph, loc, meta, &data); },
				Err(e) => { println!("file error: {}", e); }
			}
		},
		Err(e) => {
			println!("file error: {}", e);
		}
	}
}

fn extract_location(node: &Value) -> (f32, f32) {
	if let (Some(lat), Some(lon)) = (
		node.pointer("location/latitude").and_then(Value::as_f64),
		node.pointer("location/longitude").and_then(Value::as_f64)) {
			(lat as f32, lon as f32)
	} else {
		(0.0, 0.0)
	}
}

// parse the meshviewer data
fn parse_netjson(graph: &mut Graph, mut loc: Option<&mut Location>, mut meta: Option<&mut Meta>, data: &str) {
	if let Ok(v) = serde_json::from_str::<Value>(data) {
		if let (Some(nodes), Some(links)) = (get_array(&v, "nodes"), get_array(&v, "links")) {
			// map target/source field to node id in graph.nodes
			let mut map = HashMap::<&str, usize>::new();
			let mut id = graph.node_count();

			for node in nodes {
				if let Some(node_id) = get_str(&node, "node_id") {
					let (x, y) = extract_location(node);
					let meta_data = serde_json::to_string(&node).unwrap_or(String::new());
					// TODO: move to Node::new() ctor
					//state.graph.add_node_with_meta(x, y, 0.0, meta);
					//add("".to_string(), [x, y, 0.0]);

					if let Some(loc) = loc.borrow_mut() {
						loc.data.insert(id as ID, [x, y, 0.0]);
					}

					if let Some(meta) = meta.borrow_mut() {
						meta.data.insert(id as ID, meta_data);
					}

					// remember node id
					map.insert(&node_id, id);
					id += 1;
				}
			}

			for link in links {
				if let (Some(source), Some(source_tq), Some(target), Some(target_tq)) =
						(get_str(link, "source"), get_f64(link, "source_tq"),
						get_str(link, "target"), get_f64(link, "target_tq")) {
					if let (Some(source_id), Some(target_id)) = (map.get(source), map.get(target)) {
						graph.add_link(*source_id as ID, *target_id as ID, (source_tq * std::u16::MAX as f64) as u16);
						graph.add_link(*target_id as ID, *source_id as ID, (target_tq * std::u16::MAX as f64) as u16);
					}
				}
			}
		}
	} else {
		println!("JSON was not well-formatted");
	}
}

/*
fn parse_tsv(graph: &mut Graph, data: &str) {
    macro_rules! g {
        ($x:expr) => (get_from::<f64>(&mut $x));
    }
    if let Ok(file) = File::open("foo.txt") {
        for line in std::io::BufReader::new(file).lines() {
            if let Ok(line) = line { 
                if !line.starts_with('#') {
                    let mut it = line.split_whitespace();
                    if let (Some(id), Some(other_id), tq) = (g!(it), g!(it), g!(it)) {
                        println!("link {} {} {}", id, other_id, tq.unwrap_or(0.0));
                    }
                }
            } else {
                break;
            }
        }
        Some(graph)
    } else {
        None
    }
   // Ok(graph)
}*/
