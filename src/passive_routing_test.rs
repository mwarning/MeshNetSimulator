use std::time::{Instant, Duration};
use rand::Rng;

use crate::progress::Progress;
use crate::sim::TestPacket;
use crate::dijkstra::Dijkstra;
use crate::graph::*;

/*
 * Test if all paths allow for routing.
 * This test does not allow the state of the routing algorithm to change.
 */
pub struct PassiveRoutingTest {
	show_progress: bool,
	is_done: bool,
	packets_send: u32,
	packets_lost: u32,
	packets_arrived: u32,
	route_costs_sum: u32,
	route_costs_min_sum: u32,
	nodes_connected: usize,
	nodes_disconnected: usize,
	run_time: Duration,
	dijkstra: Dijkstra
}

impl PassiveRoutingTest {
	pub fn new() -> Self {
		Self {
			show_progress: false,
			is_done: false,
			packets_send: 0,
			packets_lost: 0,
			packets_arrived: 0,
			route_costs_sum: 0,
			route_costs_min_sum: 0,
			nodes_connected: 0,
			nodes_disconnected: 0,
			run_time: Duration::new(0, 0),
			dijkstra: Dijkstra::new(),
		}
	}

	pub fn clear_stats(&mut self) {
		self.is_done =false;
		self.packets_send = 0;
		self.packets_lost = 0;
		self.packets_arrived = 0;
		self.route_costs_sum = 0;
		self.route_costs_min_sum = 0;
		self.nodes_connected = 0;
		self.nodes_disconnected = 0;
		self.run_time = Duration::new(0, 0);
	}

	pub fn clear(&mut self) {
		self.dijkstra.clear();
		self.clear_stats();
	}

	pub fn setShowProgress(&mut self, show_progress: bool) {
		self.show_progress = true;
	}

	fn test_path(&mut self, graph: &Graph, mut route: impl FnMut(&TestPacket) -> Option<u32>,
			source: ID, target: ID, costs_min: u32) {
		// maximum stretch we record
		let max_stretch = 2;
		let mut packet = TestPacket::new(source, source, source, target);
		let mut costs = 0u32;

		self.packets_send += 1;

		// max steps to try until we give up
		let max_steps = costs_min * max_stretch;

		for i in 0..max_steps {
			if let Some(next) = route(&packet) {
				// Check if link really exists
				if let Some(link) = graph.get_link(packet.receiver, next) {
					costs += link.cost() as u32;
					if next == packet.destination {
						// packet arrived
						self.packets_arrived += 1;
						self.route_costs_sum += costs;
						self.route_costs_min_sum += costs_min;
						break;
					} else {
						// forward packet
						packet.transmitter = packet.receiver;
						packet.receiver = next;
					}
				} else {
					self.packets_lost += 1;
					break;
				}
			} else {
				self.packets_lost += 1;
				break;
			}
		}
	}

	pub fn run_samples(&mut self, graph: &Graph, mut route: impl FnMut(&TestPacket) -> Option<u32>,
			samples: usize) {
		self.clear();

		let node_count = graph.node_count();
		if node_count < 2 {
			return;
		}

		let now = Instant::now();
		let mut progress = Progress::new();
		let mut sample = 0;

		if self.show_progress {
			progress.start(samples, 0);
		}

		for _ in 0..samples {
			let source = rand::thread_rng().gen_range(0, node_count);
			let target = rand::thread_rng().gen_range(0, node_count);

			if source == target {
				// we do not test those paths
				continue;
			}

			let min = self.dijkstra.find_shortest_distance(graph, source as ID, target as ID);
			if !min.is_finite() {
				// no path from target to source => ignore
				self.nodes_disconnected += 1;
				continue;
			} else {
				self.nodes_connected += 1;
			}

			self.test_path(&graph, &mut route, source as ID, target as ID, min as u32);

			sample += 1;

			if self.show_progress {
				progress.update(samples, sample);
			}
		}

		if self.show_progress {
			progress.update(samples, samples);
		}

		self.run_time = now.elapsed();
		self.is_done = true;
	}

	pub fn run_all(&mut self, graph: &Graph, mut route: impl FnMut(&TestPacket) -> Option<u32>) {
		self.clear();

		let node_count = graph.node_count();
		if node_count < 2 {
			return;
		}

		let now = Instant::now();
		let tests = (node_count as usize).pow(2);
		//let mut progress = Progress::new("test: ");
		let mut test = 0;

		//progress.start(tests, 0);
		for source in 0..node_count {
			for target in 0..node_count {
				if source == target {
					continue;
				}

				let min = self.dijkstra.find_shortest_distance(graph, source as ID, target as ID);
				if !min.is_finite() {
					// no path from target to source => ignore
					self.nodes_disconnected += 1;
					continue;
				} else {
					self.nodes_connected += 1;
				}

				self.test_path(&graph, &mut route, source as ID, target as ID, min as u32);

				test += 1;
				//progress.update(tests, test);
			}
		}

		self.run_time = now.elapsed();

		//clear progress line
		//progress.clear_line();
	}

	pub fn duration(&self) -> Duration {
		self.run_time
	}

	pub fn stretch(&self) -> f32 {
		(self.route_costs_sum as f32) / (self.route_costs_min_sum as f32)
	}

	pub fn arrived(&self) -> f32 {
		100.0 * (self.packets_arrived as f32) / (self.packets_send as f32)
	}

	pub fn connectivity(&self) -> f32 {
		100.0 * (self.nodes_connected as f32) / (self.nodes_connected + self.nodes_disconnected) as f32
	}

	pub fn get_results(&self) -> Vec<(&'static str, f32)> {
		vec![
			("arrived", self.arrived()),
			("connectivity", self.connectivity()),
			("stretch", self.stretch())
		]
	}
}
