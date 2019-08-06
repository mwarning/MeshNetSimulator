
use crate::sim::TestPacket;
use crate::graph::*;
use crate::utils::MyError;


pub struct DebugPath {
	costs: u32,
	packet: TestPacket,
	initialized: bool,
	debug_running: bool,
	step: u32
}

impl DebugPath {
	pub fn new() -> Self {
		Self {
			costs: 0,
			packet: TestPacket::new(0, 0, 0, 0),
			initialized: false,
			debug_running: false,
			step: 0
		}
	}

	pub fn init(&mut self, source: u32, target: u32) {
		self.packet = TestPacket::new(source, source, source, target);
		self.costs = 0;
		self.initialized = true;
		self.debug_running = true;
		self.step = 0;
	}

	pub fn step(&mut self, out: &mut std::fmt::Write, graph: &Graph, mut route: impl FnMut(&TestPacket) -> Option<u32>) -> Result<(), MyError> {
		if !self.initialized {
			return Err(MyError::new("Not initialized.".to_string()));
		}

		if !self.debug_running {
			writeln!(out, "Debug ended.")?;
			return Ok(());
		}

		self.step += 1;
		write!(out, "step {}, path: {} => {}, cost: {}, current: {}, ", self.step, self.packet.source, self.packet.destination, self.costs, self.packet.receiver)?;

		if let Some(next) = route(&self.packet) {
			// Check if link really exists
			if let Some(link) = graph.get_link(self.packet.receiver, next) {
				self.costs += link.cost() as u32;
				self.packet.transmitter = self.packet.receiver;
				self.packet.receiver = next;

				if self.packet.receiver == self.packet.destination {
					writeln!(out, "Packet arrived")?;
					self.debug_running = false;
				} else {
					writeln!(out, "Forward to {}", next)?;
				}
			} else {
				writeln!(out, "Packet Lost - Invalid next hop: {}", next)?;
				self.debug_running = false;
			}
		} else {
			writeln!(out, "Packet Lost - No next hop.")?;
			self.debug_running = false;
		}

		Ok(())
	}
}
