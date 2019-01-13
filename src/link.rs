
use graph::ID;
use std::cmp::Ordering;
use std::fmt;


#[derive(Clone)]
pub struct Link
{
	pub from: ID,
	pub to: ID,
	pub quality: u16,
	//bandwidth: u16,
	//channel: u8
	cost: u16,
	pub meta: String,
}

impl Link {
	pub fn new(from: ID, to: ID, quality: u16) -> Self {
		Self {from, to, quality, cost: 1, meta: String::new()}
	}

	pub fn default(from: ID, to: ID) -> Self {
		Self {from, to, quality: 1, cost: 1, meta: String::new()}
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
/*
	pub fn do_transmit(&self, _packet: &Packet) -> bool {
		true
	}
*/
	pub fn cmp(&self, from: ID, to: ID) -> Ordering {
		if self.from > from {
			Ordering::Greater
		} else if self.from < from {
			Ordering::Less
		} else if self.to > to {
			Ordering::Greater
		} else if self.to < to {
			Ordering::Less
		} else {
			Ordering::Equal
		}
	}
}

impl fmt::Debug for Link {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{{{} => {}}}", self.from, self.to)
    }
}
