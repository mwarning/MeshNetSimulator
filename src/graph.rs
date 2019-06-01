
use std::f32;
use std::u16;

use serde_json::Value;
use crate::node::Node;
use crate::link::Link;
use crate::utils::*;


pub type ID = u32;

// default distance, too small confuses d3.js
const NODE_SPACING : f32 = 50.0;

/*
 * This graph is designed for fast iteration and access.
*/
#[derive(Clone)]
pub struct Graph {
	pub nodes: Vec<Node>,
	pub links: Vec<Link>, // sorted link list
	id: u64, //history_id
}

impl Graph {
	pub fn new() -> Self {
		Self {
			nodes: vec![],
			links: vec![],
			id: 0
		}
	}
/*
	pub fn id(&self) -> u64 {
		self.id
	}
*/
	pub fn clear(&mut self) {
		self.nodes.clear();
		self.links.clear();
	}

	fn connect(&mut self, a: ID, b: ID) {
		self.add_link(a, b, std::u16::MAX);
		self.add_link(b, a, std::u16::MAX);
	}

	pub fn move_nodes(&mut self, pos: Vec3) {
		for node in &mut self.nodes {
			node.gpos += pos;
		}
	}

	pub fn move_node(&mut self, id: ID, pos: Vec3) {
		self.nodes[id as usize].gpos += pos;
	}

	pub fn add_nodes(&mut self, count: u32) {
		for _ in 0..count {
			self.nodes.push(Node::new());
		}
	}

	pub fn graph_center(&self) -> Vec3 {
		let mut center = Vec3::new0();
		for node in &self.nodes {
			center += node.gpos;
		}
		if self.nodes.len() == 0 {
			Vec3::new0()
		} else {
			center / (self.nodes.len() as f32)
		}
	}

	pub fn randomize_positions_2d(&mut self, center: Vec3, range: f32) {
		for node in &mut self.nodes {
			node.gpos = center + Vec3::random_in_area(range).as_2d();
		}
	}

	pub fn connect_in_range(&mut self, range: f32) {
		let len = self.nodes.len();

		// remove all links
		self.links.clear();

		for i in 0..len {
			for j in 0..len {
				if i == j {
					continue;
				}
				let distance = self.nodes[i].gpos.distance(&self.nodes[j].gpos);
				if distance <= range {
					self.connect(i as ID, j as ID);
				}
			}
		}
	}

	pub fn add_graph(&mut self, graph: Graph) {
		let nlen = self.nodes.len() as ID;
		let llen = self.links.len();

		self.nodes.extend(graph.nodes);
		self.links.extend(graph.links);

		for link in &mut self.links[llen..] {
			link.from += nlen;
			link.to += nlen;
		}

		self.links.sort_unstable_by(|a, b| a.cmp(b.from, b.to));
	}

	pub fn disconnect_nodes(&mut self, ids: &Vec<ID>) {
		for a in ids {
			for b in ids {
				self.del_link(*a, *b);
			}
		}
	}

	pub fn connect_nodes(&mut self, ids: &Vec<ID>) {
		for a in ids {
			for b in ids {
				self.connect(*a, *b);
			}
		}
	}

	// Check if all nodes have the same degree
	pub fn is_regular(&self, r: usize) -> bool {
		let mut from = 0;
		let mut n = 0;
		let mut prev_n = 0;
		for (i, link) in self.links.iter().enumerate() {
			if from != link.from {
				from = link.from;
				if i > 0 && prev_n != n {
					return false;
				}
				prev_n = n;
			}
			n += 1;
		}
		true
	}

/*
//https://www.youtube.com/watch?v=YbCn8d4Enos
//rename node => vertex and link to edge?


	// maximum of the minimal distances from id to any other node
	pub fn get_node_eccentricity(&self, id: ID) -> f32 {
		
	}

	// minimum eccentricity of all vertices
	pub fn get_radius(&self) -> f32 {

	}

	// maximum eccentricity of all vertices
	pub fn get_diameter(&self) -> f32 {

	}

	pub fn get_peripheral_nodes(&self) -> Vec<ID> {
	
	}

	pub fn get_central_nodes(&self) -> Vec<ID> {
	
	}
*/
	pub fn get_mean_link_distance(&self) -> (f32, f32) {
		let mut d = 0.0;
		for link in &self.links {
			let p1 = self.nodes[link.from as usize].gpos;
			let p2 = self.nodes[link.to as usize].gpos;
			d += p1.distance(&p2);
		}
		let mean = d / self.links.len() as f32;

		let mut v = 0.0;
		for link in &self.links {
			let p1 = self.nodes[link.from as usize].gpos;
			let p2 = self.nodes[link.to as usize].gpos;
			v += (p1.distance(&p2) - mean).powi(2);
		}

		let variance = ((v as f32) / (self.links.len() as f32)).sqrt();
		(mean, variance)
	}

	pub fn get_node_degree(&self, id: ID) -> u32 {
		self.get_neighbors(id).len() as u32
	}

	pub fn get_avg_node_degree(&self) -> f32 {
		let mut n = 0;
		for id in 0..self.nodes.len() {
			n += self.get_node_degree(id as u32);
		}
		(n as f32) / (self.nodes.len() as f32)
	}

	pub fn get_mean_clustering_coefficient(&self) -> f32 {
		let mut cc = 0.0f32;
		for id in 0..self.nodes.len() {
			cc += self.get_local_clustering_coefficient(id as u32);
		}
		cc / (self.nodes.len() as f32)
	}

	// Get neighbor count mean and variance
	pub fn get_mean_link_count(&self) -> (f32, f32) {
		let mut degrees = Vec::new();
		let mut v = 0.0;
		let mut c = 0;
		let len = self.nodes.len() as u32;

		// calculate mean
		for id in 0..len {
			let degree = self.get_node_degree(id);
			c += degree;
			degrees.push(degree);
		}
		// calculate variance
		let mean = c as f32 / len as f32;

		for degree in degrees {
			v += (degree as f32 - mean).powi(2);
		}

		let variance = ((v as f32) / (len as f32)).sqrt();
		(mean, variance)
	}

	pub fn has_link(&self, from: ID, to: ID) -> bool {
		if let Some(_) = self.link_idx(from, to) {
			true
		} else {
			false
		}
	}

	fn has_any_link(&self, from: ID, to: ID) -> bool {
		self.has_link(from, to) || self.has_link(to, from)
	}

	/*
	* Calcualte connections between neighbors of a given node
	* divided by maximim possible connections between those neihgbors.
	* Method by Watts and Strogatz.
	*/
	pub fn get_local_clustering_coefficient(&self, id: ID) -> f32 {
		//TODO: also count the connections from neighbors to node?
		let ns = self.get_neighbors(id);

		if ns.len() <= 1 {
			0.0
		} else {
			// count number of connections between neighbors
			let mut k = 0;
			for a in ns {
				for b in ns {
					if a.to != b.to {
						k += self.has_link(a.to, b.to) as u32;
					}
				}
			}
			(k as f32) / (ns.len() * (ns.len() - 1)) as f32
		}
	}

	fn link_index(&self, from: ID, to: ID) -> Option<usize> {
		match self.links.binary_search_by(|link| link.cmp(from, to)) {
			Ok(idx) => {
				Some(idx)
			},
			Err(_) => {
				None
			}
		}
	}

	fn del_link(&mut self, a: ID, b: ID) {
		self.del_links(&vec![a, b]);
	}

	pub fn del_links(&mut self, links: &Vec<ID>) {
		if (links.len() % 2) != 0 {
			panic!("del_links: Uneven elements for link list");
		}

		fn any(link: &Link, a: ID, b: ID) -> bool {
			(link.from == a && link.to == b) || (link.from == b || link.to == a)
		}

		self.links.retain(|link| {
			for s in links.chunks(2) {
				if any(&link, s[0], s[1]) {
					return false;
				}
			}
			true
		});
	}

	fn is_bidirectional(&self) -> bool {
		for link in &self.links {
			if !self.has_link(link.to, link.from) {
				return false;
			}
		}
		true
	}

	fn is_valid(&self) -> bool {
		let len = self.nodes.len() as ID;
		for (i, link) in self.links.iter().enumerate() {
			if link.to >= len || link.from >= len {
				return false;
			}
			if i > 0 {
				let prev = &self.links[i-1];
				// check for order and duplicate links
				if !(link.from > prev.from || (link.from == prev.from && link.to > prev.to)) {
					return false;
				}
			}
		}

		true
	}

	pub fn remove_node(&mut self, id: ID) {
		self.nodes.remove(id as usize);

		for link in &mut self.links {
			if link.to > id {
				link.to -= 1;
			}
			if link.from > id {
				link.from -= 1;
			}
		}
	}

	pub fn remove_nodes(&mut self, nodes: &Vec<ID>) {
		for id in nodes {
			self.remove_node(*id);
		}
	}

	fn link_idx(&self, from: ID, to: ID) -> Option<usize> {
		match self.links.binary_search_by(|link| link.cmp(from, to)) {
			Ok(idx) => {
				Some(idx)
			},
			Err(_) => {
				None
			}
		}
	}

	pub fn get_link(&self, from: ID, to: ID) -> Option<Link> {
		if let Some(idx) = self.link_idx(from, to) {
			Some(self.links[idx].clone())
		} else {
			None
		}
	}

	pub fn add_link(&mut self, from: ID, to: ID, tq: u16) {
		match self.links.binary_search_by(|link| link.cmp(from, to)) {
			Ok(idx) => {
				self.links[idx].quality = tq;
			},
			Err(idx) => {
				self.links.insert(idx, Link::new(from, to, tq));
			}
		}
	}

	pub fn get_neighbors(&self, id: ID) -> &[Link] {
		match self.links.binary_search_by(|link| link.from.cmp(&id)) {
			Ok(idx) => {
				let mut start = idx;
				let mut end = idx;
				for i in (0..idx).rev() {
					if self.links[i].from == id {
						start = i;
					}
				}
				for i in idx..self.links.len() {
					if self.links[i].from == id {
						end = i;
					}
				}
				&self.links[start..end+1]
			},
			Err(idx) => {
				&self.links[0..0]
			}
		}
	}

	fn push_node(&mut self, node: Node) {
		self.nodes.push(node)
	}

	pub fn add_node(&mut self, x: f32, y: f32, z: f32) {
		self.nodes.push(Node::new3(x, y, z));
	}

	pub fn add_node_with_meta(&mut self, x: f32, y: f32, z: f32, meta: String) {
		self.nodes.push(Node::new4(x, y, z, meta));
	}

	pub fn add_line(&mut self, count: u32, close: bool) {
		if count < 1 {
			return;
		}

		let offset = self.nodes.len() as u32;

		for i in 0..count {
			if close {
				let r = NODE_SPACING * (count as f32) / (2.0 * f32::consts::PI);
				let a = 2.0 * (i as f32) * f32::consts::PI / (count as f32);
				self.add_node(r * a.sin(), r * a.cos(), 0.0);
			} else {
				self.add_node(
					(i as f32) * NODE_SPACING,
					1.1 * (i % 2) as f32,
					0.0
				);
			}

			if i > 0 {
				self.connect(offset + i - 1, offset + i);
			}
		}

		if close && (count > 2) {
			self.connect(offset + 0, offset + count - 1);
		}
	}

	pub fn add_tree(&mut self, count: u32, intra: u32) {
		let offset = self.nodes.len() as u32;

		// Connect random nodes
		for i in 0..count {
			self.add_node(0.0, 0.0, 0.0);
			if i > 0 {
				// Connect node with random previous node
				loop {
					let j = rand::random::<ID>() % i;
					if !self.has_link((offset + i) as ID, (offset + j) as ID) {
						self.connect((offset + i) as ID, (offset + j) as ID);
						break;
					}
				}
			}
		}

		// Interconnect part of the tree with additional connections
		// Also limit maximum number of possible bidirectional links
		for _ in 0..intra { //cmp::min(intra, (intra * (intra - 1)) / 2) {
			loop {
				let i = rand::random::<ID>() % count;
				let j = rand::random::<ID>() % count;
				if !self.has_link((offset + i) as ID, (offset + j) as ID) {
					self.connect((offset + i) as ID, (offset + j) as ID);
					break;
				}
			}
		}
	}

	pub fn add_star(&mut self, count: u32) {
		let offset = self.nodes.len() as u32;

		if count < 1 {
			return;
		}

		self.add_node(0.0, 0.0, 0.0);
		for i in 0..count {
			let a = 2.0 * (i as f32) * f32::consts::PI / (count as f32);
			self.add_node(
				NODE_SPACING * a.cos(),
				NODE_SPACING * a.sin(),
				0.0
			);
			self.connect(offset as ID, (offset + 1 + i) as ID);
		}
	}

	// Add lattice with horizontal and vertical neighbors
	pub fn add_lattice4(&mut self, x_count: u32, y_count: u32) {
		self.add_lattice(x_count, y_count, false);
	}

	// Add lattice with horizontal, vertical and diagonal neighbors
	pub fn add_lattice8(&mut self, x_count: u32, y_count: u32) {
		self.add_lattice(x_count, y_count, true);
	}

	fn add_lattice(&mut self, x_count: u32, y_count: u32, diag: bool) {
		if x_count < 1 || y_count < 1 {
			return;
		}

		let offset = self.nodes.len() as u32;

		for x in 0..x_count {
			for y in 0..y_count {
				self.add_node(
					(x as f32) * NODE_SPACING,
					(y as f32) * NODE_SPACING,
					0.0
				);
			}
		}

		let mut connect = |x1 : u32, y1: u32, x2: u32, y2: u32| {
			// Validate coordinates
			if (x2 < x_count) && (y2 < y_count) {
				let a = offset + x1 * y_count + y1;
				let b = offset + x2 * y_count + y2;
				self.connect(a as ID, b as ID);
			}
		};

		for x in 0..x_count {
			for y in 0..y_count {
				if diag {
					connect(x, y, x + 1, y + 1);
					if y > 0 {
						connect(x, y, x + 1, y - 1);
					}
				}
				connect(x, y, x, y + 1);
				connect(x, y, x + 1, y);
			}
		}
	}

	/*
		create radnom network with connections
		- when in range
		- power-law distribution
	
	fn add_random(&mut self, x_count: usize, y_count: usize) {
		let offset = self.nodes.len();
		let range = 10.0;
		let count = x_count * y_count;

		for x in 0..x_count {
			for y in 0..y_count {
				self.add_node();
				let node = self.nodes.last_mut().unwrap();
				node.gpos[0] = (x as f32) * NODE_SPACING;
				node.gpos[1] = (y as f32) * NODE_SPACING;
			}
		}

		self.connect_range(range);
	}*/

	pub fn geo_center(&self) -> Vec3 {
		let mut v = Vec3::new0();

		for node in &self.nodes {
			v += node.gpos;
		}

		v / (self.nodes.len() as f32)
	}

	pub fn is_directed(&self) -> bool {
		for link in &self.links {
			if self.link_index(link.to, link.from).is_none() {
				return false;
			}
		}
		true
	}

	pub fn remove_unconnected_nodes(&mut self) {
		let mut remove = Vec::new();
		for id in 0..self.nodes.len() as ID {
			if self.get_node_degree(id) == 0 {
				remove.push(id);
			}
		}
		self.remove_nodes(&remove);
	}

	pub fn print_stats(&self) {
		println!("Nodes: {}, Links: {}", self.nodes.len(), self.links.len());
	}

	pub fn node_count(&self) -> usize {
		self.nodes.len()
	}

	pub fn link_count(&self) -> usize {
		self.links.len()
	}
}

// move out
pub fn graph_to_json(graph: &Graph, ret: &mut String) {
	use std::fmt::Write;

	write!(ret, "{{\"nodes\": [").unwrap();
	let mut comma = false;
	for (id, node) in graph.nodes.iter().enumerate() {
		let meta = if node.meta.is_empty() {
			"{}"
		} else {
			node.meta.as_str()
		};

		if let Ok(v) = serde_json::from_str::<Value>(meta) {
			let node_name = if let Some(hostname) = get_str(&v, "hostname") {
				hostname.to_string()
			} else {
				id.to_string()
			};

			let client_count = if let Some(clients) = get_u64(&v, "clients") {
				clients
			} else {
				0
			};

			if comma {
				write!(ret, ",").unwrap();
			}

			comma = true;
			write!(ret, "{{").unwrap();
			write!(ret, "\"id\": {},", id).unwrap();
			write!(ret, "\"label\": \"\",").unwrap();
			write!(ret, "\"name\": \"{}\",", node_name).unwrap();
			write!(ret, "\"clients\": \"{}\"", client_count).unwrap();
			write!(ret, "}}").unwrap();
		}
	}
	write!(ret, "]}}").unwrap();
}
