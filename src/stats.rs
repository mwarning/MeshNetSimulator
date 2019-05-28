
use std::time::Instant;
use std::fmt;

use crate::utils::CircularVec;


#[derive(Clone, PartialEq)]
pub struct TestResult {
	pub test_num: u32,
	pub steps: u32,
	pub test_packet_costs: u32,
	pub comm_packet_costs: u32,
	pub deployed_test_packets: u32,
	pub received_test_packets: u32,
}

impl TestResult {
	pub fn new() -> Self {
		Self {
			test_num: 0,
			steps: 0,
			deployed_test_packets: 0,
			received_test_packets: 0,
			test_packet_costs: 0,
			comm_packet_costs: 0,
		}
	}
/*
	pub fn add_costs(&mut self, packet: &Packet, link: &Link) {
		let costs = link.cost() as u32;
		if packet.is_test() {
			self.test_packet_costs += costs;
		} else {
			self.comm_packet_costs += costs;
		}
	}
*/
	pub fn clear(&mut self) {
		*self = TestResult::new();
	}

	pub fn to_json(&self) -> String {
		use std::fmt::Write;
		let mut ret = String::new();

		write!(&mut ret, "{{").unwrap();
		write!(&mut ret, "\"test_num\": {},", self.test_num).unwrap();
		write!(&mut ret, "\"test_packet_costs\": {},", self.test_packet_costs).unwrap();
		write!(&mut ret, "\"comm_packet_costs\": {},", self.comm_packet_costs).unwrap();
		write!(&mut ret, "\"deployed_test_packets\": {},", self.deployed_test_packets).unwrap();
		write!(&mut ret, "\"received_test_packets\": {},", self.received_test_packets).unwrap();
		write!(&mut ret, "}}").unwrap();

		return ret;
	}
}

pub struct Stats {
	duration: u32,
	time: Instant,
	pub cur: TestResult,
	pub steps: u32,
// test configuration
	//pub test_name: String, //replace by pointer to test method
	pub test_results: CircularVec<(u32, f32, f32)>,
	pub end_at_step: u32,
	pub restore: bool, // restore state after test is done?
}

impl Stats {
	pub fn new() -> Stats {
		Stats {
			duration: 0,
			time: Instant::now(),
			cur: TestResult::new(),
			steps: 0, // => total_steps
// test configuration
			//test_name: String::new(),
			test_results: CircularVec::<(u32, f32, f32)>::new(),
			end_at_step: 0, // setting for the test
			restore: false
		}
	}

	pub fn start(&mut self) {
		self.time = Instant::now();
	}

	pub fn stop(&mut self) {
		//self.duration += (Instant::now() - self.time).as_millis() as u32;
	}

	pub fn reset(&mut self) {
		*self = Stats::new();
	}

	pub fn push_state(&mut self) {
		self.cur.clear();
		//self.end_time = Instant::now();
	}

	pub fn to_json(&self) -> String
	{
		use std::fmt::Write;
		let mut ret = String::new();

		write!(&mut ret, "{{").unwrap();

		write!(&mut ret, "\"steps\": {},", self.steps).unwrap();
		write!(&mut ret, "\"duration\": {},", self.duration).unwrap();

		let results : Vec<_> = self.test_results.iter().filter(
			|e| !e.1.is_nan() && !e.2.is_nan()
			).map(
			|e| format!("{{\"i\": {}, \"v\": {:.2}, \"e\": {:.2}}}", e.0, e.1, e.2)
		).collect();

		write!(&mut ret, "\"results\": [{}]", results.join(",")).unwrap();
		write!(&mut ret, "}}").unwrap();
		return ret;
	}
}

impl fmt::Display for Stats {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		let range_start : Option<usize> = None;

		write!(f, "steps: {}\n", self.steps).unwrap();

		Ok(())
	}
}
