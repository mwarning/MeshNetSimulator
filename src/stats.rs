
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
