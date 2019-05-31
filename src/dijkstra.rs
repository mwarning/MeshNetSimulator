use crate::graph::*;

use std::collections::HashMap;
use std::f32;
use std::usize;


/*
* Find the shortest path on a graph based on the Dijkstra algorithm.
* Needs to be recreated if the graph changes.
*/

pub struct Dijkstra {
	dists_cache: HashMap<ID, Vec<f32>>,
	prevs_cache: HashMap<ID, Vec<ID>>
}

impl Dijkstra {
	pub fn new() -> Dijkstra {
		Dijkstra {
			dists_cache: HashMap::new(),
			prevs_cache: HashMap::new()
		}
	}

	pub fn clear(self: &mut Dijkstra) {
		self.dists_cache.clear();
		self.prevs_cache.clear();
	}

	pub fn find_shortest_distance(self: &mut Dijkstra, graph: &Graph, source: ID, target: ID) -> f32 {
		// try cache
		if let Some(dists) = self.dists_cache.get(&source) {
			return dists[target as usize];
		}

		// calculate
		self.calculate_shortest_paths(graph, source);

		// try again
		if let Some(dists) = self.dists_cache.get(&source) {
			return dists[target as usize];
		} else {
			panic!("Dijkstra: Cannot compute path - should not happen.");
		}
	}

	fn get_shortest_path(self: &Dijkstra, source: ID, target: ID) -> Option<Vec<ID>> {
		if let Some(prevs) = self.prevs_cache.get(&source) {
			let mut path = vec![];
			let mut next = target;
			loop {
				let prev = prevs[next as usize];
				if prev != ID::max_value() {
					next = prev;
					path.push(next);
				} else {
					break;
				}
			}
			return Some(path);
		}
		None
	}

	pub fn calculate_shortest_paths(self: &mut Dijkstra, graph: &Graph, source: ID) {
		let len = graph.node_count();
		let mut dists = vec![f32::INFINITY; len];
		let mut prevs = vec![ID::max_value(); len];
		let mut q = vec![true; len];

		dists[source as usize] = 0.0;

		fn get_smallest(q: &Vec<bool>, dists: &Vec<f32>) -> usize {
			let mut dist = f32::INFINITY;
			let mut node = usize::MAX; //HM: may cause segfault

			for i in 0..q.len() {
				if q[i] {
					let d = dists[i];
					if d < dist {
						node = i;
						dist = d;
					}
				}
			}
			node
		};

		for _ in 0..len {
			let u = get_smallest(&q, &dists);
			q[u] = false;
			let links = graph.get_neighbors(u as ID);

			for link in links {
				let v = link.to as usize;
				if q[v] {
					// distance update
					let alt = dists[u] + link.cost() as f32;
					if alt < dists[v] {
						dists[v] = alt;
						prevs[v] = u as ID;
					}
				}
			}
		}

		// Set cache
		self.dists_cache.insert(source, dists);
		self.prevs_cache.insert(source, prevs);
	}
}
