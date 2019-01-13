use std::io::Write;
use std::time::{Instant, Duration};
use utils::fmt_duration;

fn duration_to_f64(d: Duration) -> f64 {
	d.as_secs() as f64 + d.subsec_nanos() as f64 * 1e-9_f64
}

pub struct Progress {
	label: &'static str,
	clear_on_finish: bool,
	next_check: usize,
	start_instant: Instant,
	last_instant: Instant,
	min_interval: Duration,
}

impl Progress {
	pub fn new() -> Self {
		Self {
			label: "",
			clear_on_finish: true,
			next_check: 0,
			start_instant: Instant::now(),
			last_instant: Instant::now(),
			min_interval: Duration::from_millis(250),
		}
	}

	pub fn set_label(&mut self, label: &'static str) {
		self.label = label;
	}

	pub fn start(&mut self, total: usize, count: usize) {
		self.start_instant = Instant::now();
		self.last_instant = Instant::now();
		self.update(total, count);
	}

	pub fn duration(&self) -> Duration {
		self.last_instant - self.start_instant
	}

	pub fn update(&mut self, total: usize, count: usize) {
		fn clear_line() {
			print!("\r");
			for _ in 0..12 {
				print!("				");
			}
			print!("\r");
		}

		if count >= self.next_check {
			print_meter(&self.label, 15, count, total, self.start_instant.elapsed());

			let passed_time = duration_to_f64(self.start_instant.elapsed());
			let iters_per_sec = count as f64 / passed_time;
			let next_check = count + (iters_per_sec * duration_to_f64(self.min_interval)) as usize;

			// clear progress line on finish
			if next_check >= total && self.clear_on_finish {
				clear_line();
			}

			std::io::stdout().flush().unwrap();
			self.next_check = next_check.min(total);
			self.last_instant = Instant::now();
		}
	}
}

fn print_meter(label: &str, length: u8, count: usize, total: usize, passed: Duration) {
	let ratio = count as f32 / total as f32;
	let filled_length = f32::round(ratio * length as f32) as u8;

	print!("\r{0}{1:5.1}% [", label, ratio * 100.0);
	for i in 0u8..length {
		if i < filled_length {
			print!("#");
		} else {
			print!("-");
		}
	}
	print!("]  {0}/{1}  ", count, total);

	let passed_time = duration_to_f64(passed);
	let iters_per_sec = count as f64 / passed_time;
	let left_time = (total - count) as f64 / iters_per_sec;
	let left = Duration::from_millis((left_time * 1000.0) as u64);

	print!("[elapsed: {}, left: {}, {:.2} iter/s]",
		   fmt_duration(passed),
		   fmt_duration(left),
		   iters_per_sec);
}
