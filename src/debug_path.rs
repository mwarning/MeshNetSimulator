
use crate::sim::TestPacket;
use crate::graph::*;


pub struct DebugPath {
	costs: u32,
	packet: TestPacket,
	initialized: bool,
}

impl DebugPath {
	pub fn new() -> Self {
		Self {
			costs: 0,
			packet: TestPacket::new(0, 0, 0, 0),
			initialized: false
		}
	}

	pub fn init(&mut self, source: u32, target: u32) {
		self.packet = TestPacket::new(source, source, source, target);
		self.costs = 0;
		self.initialized = true;
	}

	pub fn step(&mut self, out: &mut std::fmt::Write, graph: &Graph, mut route: impl FnMut(&TestPacket) -> Option<u32>) -> Result<(), std::fmt::Error> {
		if self.initialized {
			write!(out, "(path: {} => {}, cost: {}, current: {}): ", self.packet.source, self.packet.destination, self.costs, self.packet.receiver)?;
			if let Some(next) = route(&self.packet) {
				// Check if link really exists
				if let Some(link) = graph.get_link(self.packet.receiver, next) {
					self.costs += link.cost() as u32;
					self.packet.transmitter = self.packet.receiver;
					self.packet.receiver = next;

					if next == self.packet.destination {
						writeln!(out, "Packet Arrived")?;
						self.initialized = false;
					} else {
						writeln!(out, "Forward to {}", next)?;
					}
				} else {
					writeln!(out, "Packet Lost - Invalid next hop: {}", next)?;
					self.initialized = false;
				}
			} else {
				writeln!(out, "Packet Lost - No next hop.")?;
				self.initialized = false;
			}
		} else {
			writeln!(out, "Not initialized.")?;
		}

		Ok(())
	}
}
