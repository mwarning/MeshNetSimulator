
use std::f32;
use std::u16;
use std::fmt;

use std::cmp::Ordering;

use crate::utils::vec_filter;

//TODO: rename to Links and GraphState to Graph


pub type ID = u32;

#[derive(Clone, PartialEq)]
pub struct Link
{
	pub from: ID,
	pub to: ID,
	pub quality: u16,
	//bandwidth: u16,
	//channel: u8
	cost: u16,
}

impl Link {
	pub fn new(from: ID, to: ID, quality: u16) -> Self {
		Self {from, to, quality, cost: 1}
	}

	pub fn cost(&self) -> u16 {
		self.cost
	}

	pub fn bandwidth(&self) -> u16 {
		1
	}

	pub fn quality(&self) -> u16 {
		self.quality
	}

	fn cmp(&self, from: ID, to: ID) -> Ordering {
		let i = ((self.from as u64) << 32) + (self.to as u64);
		let j = ((from as u64) << 32) + (to as u64);
		i.cmp(&j)
	}
}

impl fmt::Debug for Link {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		write!(f, "{{{} => {}}}", self.from, self.to)
	}
}

/*
 * This graph is designed for fast iteration and access of neighbors.
*/
#[derive(Clone)]
pub struct Graph {
	pub links: Vec<Link>, // sorted link list
	pub node_count: usize,
}

impl Graph {
	pub fn new() -> Self {
		Self {
			links: vec![],
			node_count: 0,
		}
	}

	pub fn clear(&mut self) {
		self.links.clear();
		self.node_count = 0;
	}

	pub fn connect(&mut self, a: ID, b: ID) {
		self.add_link(a, b, std::u16::MAX);
		self.add_link(b, a, std::u16::MAX);
	}

	pub fn add_nodes(&mut self, count: u32) {
		self.node_count += count as usize;
	}

	pub fn add_graph(&mut self, graph: Graph) {
		let nlen = self.node_count as ID;
		let llen = self.links.len();

		self.node_count += graph.node_count;
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
	pub fn is_regular(&self) -> bool {
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

	fn pos_distance(a: &[f32; 3], b: &[f32; 3]) -> f32 {
		((a[0] - b[0]).powi(2)
			+ (a[1] - b[2]).powi(2)
			+ (a[2] - b[2]).powi(2)).sqrt()
	}

	pub fn get_mean_link_distance(&self) -> (f32, f32) {
		let mut d = 0.0;
		for link in &self.links {
			let p1 = self.nodes[link.from as usize].pos;
			let p2 = self.nodes[link.to as usize].pos;
			d += Self::pos_distance(&p1, &p2);
		}
		let mean = d / self.links.len() as f32;

		let mut v = 0.0;
		for link in &self.links {
			let p1 = self.nodes[link.from as usize].pos;
			let p2 = self.nodes[link.to as usize].pos;
			v += (Self::pos_distance(&p1, &p2) - mean).powi(2);
		}

		let variance = ((v as f32) / (self.links.len() as f32)).sqrt();
		(mean, variance)
	}
*/
	pub fn get_node_degree(&self, id: ID) -> u32 {
		self.get_neighbors(id).len() as u32
	}

	pub fn get_avg_node_degree(&self) -> f32 {
		let mut n = 0;
		for id in 0..self.node_count {
			n += self.get_node_degree(id as u32);
		}
		(n as f32) / (self.node_count as f32)
	}

	pub fn get_mean_clustering_coefficient(&self) -> f32 {
		let mut cc = 0.0f32;
		for id in 0..self.node_count {
			cc += self.get_local_clustering_coefficient(id as u32);
		}
		cc / (self.node_count as f32)
	}

	// Get neighbor count mean and variance
	pub fn get_mean_link_count(&self) -> (f32, f32) {
		let mut degrees = Vec::new();
		let mut v = 0.0;
		let mut c = 0;
		let len = self.node_count as u32;

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
/*
	pub fn link_distances(&self) -> (f32, f32, f32) {
		let mut d2_min = infinity;
		let mut d2_max = -infinity;
		let mut d2_sum = 0.0;
		for link in &self.links {
			let to = self.nodes[link.to].gpos;
			let from = self.nodes[link.from].gpos;
			let d2 = from * to;
			if d2 < d2_min {
				d2_min = d2;
			}
			if d2 > d2_max {
				d2_max = d2;
			}
			d2_sum += d2;
		}
		(d2_min.sqrt(), d2_mean.sqrt(), d2_max.sqrt())
	}

//linear mapping
	pub fn adjust_link_quality(&mut self, min: f32, max: f32) {
		for link in &mut self.links {
			let from = self.nodes[link.from as usize].pos;
			let to = self.nodes[link.to as usize].pos;
			let distance = Self::pos_distance(&from, &to);
			if distance <= min {
				link.quality = u16::MIN;
			} else if distance >= max {
				link.quality = u16::MAX;
			} else {
				link.quality = (u16::MAX as f32 * (distance - min) / (max - min)) as u16;
			}
		}
	}
*/

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

	pub fn is_bidirectional(&self) -> bool {
		for link in &self.links {
			if !self.has_link(link.to, link.from) {
				return false;
			}
		}
		true
	}

	pub fn is_valid(&self) -> bool {
		let len = self.node_count as ID;
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
		if self.node_count == 0 {
			return;
		}

		self.node_count -= 1;

		// adjust index
		for link in &mut self.links {
			if link.to > id {
				link.to -= 1;
			}
			if link.from > id {
				link.from -= 1;
			}
		}

		// remove links
		vec_filter(&mut self.links, |ref link| link.from != id && link.to != id);

		// sort
		self.links.sort_unstable_by(|a, b| a.cmp(b.from, b.to));
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
		if from != to {
			match self.links.binary_search_by(|link| link.cmp(from, to)) {
				Ok(idx) => {
					self.links[idx].quality = tq;
				},
				Err(idx) => {
					self.links.insert(idx, Link::new(from, to, tq));
				}
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

	pub fn clear_links(&mut self) {
		self.links.clear();
	}

	pub fn is_directed(&self) -> bool {
		for link in &self.links {
			if self.link_idx(link.to, link.from).is_none() {
				return false;
			}
		}
		true
	}

	pub fn remove_unconnected_nodes(&mut self) {
		let mut remove = Vec::new();
		for id in 0..self.node_count as ID {
			if self.get_node_degree(id) == 0 {
				remove.push(id);
			}
		}
		self.remove_nodes(&remove);
	}

	pub fn node_count(&self) -> usize {
		self.node_count
	}

	pub fn link_count(&self) -> usize {
		self.links.len()
	}

	pub fn link_cost_sum(&self) -> f32 {
		self.links.iter().fold(0.0, |acc, link| acc + link.cost() as f32)
	}

	pub fn spanning_tree(&self) -> Graph {
		Self::minimum_spanning_tree_impl(&self.links, self.node_count)
	}

	pub fn minimum_spanning_tree(&self) -> Graph {
		// sort links by cost
		let links = {
			let mut links = self.links.clone();
			links.sort_unstable_by(|a, b| a.cost().cmp(&b.cost()));
			links
		};

		Self::minimum_spanning_tree_impl(&links, self.node_count)
	}

	// Implementation of the Kruskal minimum spanning tree algorithm
	fn minimum_spanning_tree_impl(links: &[Link], node_count: usize) -> Graph {
		let mut roots = Vec::with_capacity(node_count);
		let mut mst = Vec::new();

		// initial root of every node is itself
		for i in 0..node_count {
			roots.push(i as ID);
		}

		// find root of node
		fn root(roots: &mut [ID], i: ID) -> usize {
			let mut i = i as usize;
			while roots[i] != i as ID {
				// Path halving optimization
				let tmp = roots[roots[i] as usize];
				roots[i] = tmp;
				i = tmp as usize;
			}
			i
		}

		for link in links {
			let x = root(&mut roots, link.from);
			let y = root(&mut roots, link.to);
			if x != y {
				mst.push(link.clone());
				roots[x] = roots[y];
			}
		}

		// count roots of all minimum spanning trees
		let roots_count = roots.iter().enumerate().fold(0,
			|acc, (i, j)| acc + ((i as u32) == *j) as usize
		);

		Graph{ node_count: (mst.len() + roots_count), links: mst }
	}
}
