
use serde_json::Value;

use std::fmt;
use std::usize;
use std::u32;
use std::f32;
use std::fs::File;
use std::io::prelude::*;
use std::ops::{AddAssign, DivAssign, Index, Add, Mul, Div, Sub, Deref};
use std::time::Duration;
use std::default::Default;
use rand;


pub const RAD2DEG : f32 = 360.0 / (2.0 * f32::consts::PI);


pub fn print_unknown_key(key: &str) {
	println!("unknown key: {}", key);
}

pub fn get_f64(value: &Value, key: &str) -> Option<f64> {
	value.get(key).and_then(Value::as_f64)
}

pub fn get_array<'a>(value: &'a Value, key: &str) -> Option<&'a Vec<Value>> {
	value.get(key).and_then(Value::as_array)
}

pub fn get_str<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
	value.get(key).and_then(Value::as_str)
}

pub fn get_u64(value: &Value, key: &str) -> Option<u64> {
	value.get(key).and_then(Value::as_u64)
}

pub fn read_file(path: &str) -> Option<Vec<u8>> {
	if let Ok(mut file) = File::open(path) {
		let mut data = Vec::new();
		if let Ok(_) = file.read_to_end(&mut data) {
			return Some(data);
		}
	}
	None
}

pub fn fmt_duration(d: Duration) -> String {
	let mss = d.subsec_millis() as u64;
	let secs = d.as_secs();

	// round up
	fn round_div(x: u64, y: u64) -> u64 {
		let d = x / y;
		let remainder = x - d * y;
		if (2 * remainder) >= y {
			d + 1
		} else {
			d
		}
	}

	let years = round_div(secs, 356 * 24 * 60 * 60);
	let days = round_div(secs, 24 * 60 * 60)
				- (years * 356);
	let hours = round_div(secs, 60 * 60)
				- (days * 24)
				- (years * 356 * 24);
	let mins = round_div(secs, 60)
				- (hours * 60)
				- (days * 24 * 60)
				- (years * 356 * 24 * 60);
	let secs = secs % 60;

	if years > 0 {
		format!("{}y {}d", years, days)
	} else if days > 0 {
		format!("{}d {}h", days, hours)
	} else if hours > 0 {
		format!("{}h {}m", hours, mins)
	} else if mins > 0 {
		format!("{}m {}s", mins, secs)
	} else if secs > 0 {
		format!("{}s", secs)
	} else {
		format!("{}ms", mss)
	}
}

pub fn get_mimetype(filename: &str) -> &'static str {
	const MIMETYPES: &[[&str; 2]] = &[
		[ ".txt", "text/plain" ],
		[ ".log", "text/plain" ],
		[ ".js", "text/javascript" ],
		[ ".css", "text/css" ],
		[ ".html", "text/html; charset=utf-8" ],
		[ ".gif", "image/gif" ],
		[ ".png", "image/png" ],
		[ ".jpg", "image/jpeg" ],
		[ ".jpeg", "image/jpeg" ],
		[ ".svg", "image/svg+xml" ],
		[ ".json", "application/json" ],
		[ ".zip", "application/zip" ],
		[ ".xml", "application/xml" ],
		[ ".sh", "application/x-shellscript" ],
		[ ".tar.gz", "application/x-compressed-tar" ],
		[ ".tgz", "application/x-compressed-tar" ],
		[ ".gz", "application/x-gzip" ],
		[ ".tar.bz2", "application/x-bzip-compressed-tar" ],
		[ ".tbz", "application/x-bzip-compressed-tar" ],
		[ ".bz2", "application/x-bzip" ],
		[ ".tar", "application/x-tar" ],
		[ ".rar", "application/x-rar-compressed" ]
	];

	for e in MIMETYPES {
		if filename.ends_with(e[0]) {
			return e[1];
		}
	}

	return "text/plain";
}

pub fn index_two_mut<T>(vec: &mut Vec<T>, n: usize, m: usize) -> (&mut T, &mut T) {
	let len = vec.len();
	let ptr = vec.as_mut_ptr();

	unsafe {
		assert!(n != m);
		assert!(n < len);
		assert!(m < len);

		(&mut *ptr.add(n), &mut *ptr.add(m))
	}
}

#[derive(Clone, Copy, PartialEq)]
pub struct Vec3 {
	data: [f32; 3]
}

impl Vec3 {
	pub fn new(x: f32, y: f32, z: f32) -> Self {
		Self {data: [x, y, z]}
	}

	pub fn new0() -> Vec3 {
		Vec3::new(0.0, 0.0, 0.0)
	}

	pub fn new1(x: f32) -> Vec3 {
		Vec3::new(x, 0.0, 0.0)
	}

	pub fn new2(x: f32, y: f32) -> Vec3 {
		Vec3::new(x, y, 0.0)
	}

	pub fn new3(x: f32, y: f32, z: f32) -> Vec3 {
		Vec3::new(x, y, z)
	}

	#[inline(always)]
	pub fn x(&self) -> f32 {
		self.data[0]
	}

	#[inline(always)]
	pub fn y(&self) -> f32 {
		self.data[1]
	}

	#[inline(always)]
	pub fn z(&self) -> f32 {
		self.data[2]
	}

	pub fn random_unit() -> Vec3 {
		Vec3::random_in_area(1.0).unit()
	}

	// random around in the box of (0, 0, 0)
	pub fn random_in_area(r: f32) -> Vec3 {
		Vec3::new(
			(2.0 * rand::random::<f32>() - 1.0) * r,
			(2.0 * rand::random::<f32>() - 1.0) * r,
			(2.0 * rand::random::<f32>() - 1.0) * r,
		)
	}

	pub fn as_2d(&self) -> Vec3 {
		Vec3::new(self.x(), self.y(), 0.0)
	}

	pub fn vec_sub(&self, v: &Vec3) -> Vec3 {
		Vec3::new(self.x() - v.x(), self.y() - v.y(), self.z() - v.z())
	}

	pub fn vec_add(&self, v: &Vec3) -> Vec3 {
		Vec3::new(self.x() + v.x(), self.y() + v.y(), self.z() + v.z())
	}

	pub fn length(&self) -> f32 {
		(self.x() * self.x() + self.y() * self.y() + self.z() * self.z()).sqrt()
	}

	pub fn angle(&self, v: &Vec3) -> f32 {
		(self.unit() * v.unit()).acos()
	}

	pub fn vec_mul(&self, v: &Vec3) -> f32 {
		self.x() * v.x() + self.y() * v.y() + self.z() * v.z()
	}

	pub fn scalar_mul(&self, s: f32) -> Vec3 {
		Vec3::new(s * self.x(), s * self.y(), s * self.z())
	}

	pub fn scalar_div(&self, s: f32) -> Vec3 {
		self.scalar_mul(1.0 / s)
	}

	pub fn unit(&self) -> Vec3 {
		self.scalar_mul(1.0 / self.length())
	}

	pub fn distance(&self, v: &Vec3) -> f32 {
		self.vec_sub(v).length()
	}

	pub fn direction(&self, v: &Vec3) -> Vec3 {
		self.vec_sub(v).unit()
	}

	pub fn is_near_null(&self, eta: f32) -> bool {
		(self.x() < eta && self.x() > -eta) &&
		(self.y() < eta && self.y() > -eta) &&
		(self.z() < eta && self.z() > -eta)
	}

	pub fn is_finite(&self) -> bool {
		self.x().is_finite() &&
		self.y().is_finite() &&
		self.z().is_finite()
	}

	pub fn to_slice(&self) -> [f32; 3] {
		self.data
	}
}

impl Add<Vec3> for Vec3 {
	type Output = Vec3;

	fn add(self, v: Vec3) -> Vec3 {
		Vec3::new(self.x() + v.x(), self.y() + v.y(), self.z() + v.z())
	}
}

impl AddAssign<Vec3> for Vec3 {
	fn add_assign(&mut self, v: Vec3) {
		*self = *self + v;
	}
}

impl DivAssign<f32> for Vec3 {
	fn div_assign(&mut self, s: f32) {
		*self = *self / s;
	}
}

impl Sub<Vec3> for Vec3 {
	type Output = Vec3;

	fn sub(self, rhs: Vec3) -> Vec3 {
		self.vec_sub(&rhs)
	}
}

impl Mul<Vec3> for Vec3 {
	type Output = f32;

	fn mul(self, rhs: Vec3) -> f32 {
		self.vec_mul(&rhs)
	}
}

impl Mul<f32> for Vec3 {
	type Output = Vec3;

	fn mul(self, rhs: f32) -> Vec3 {
		self.scalar_mul(rhs)
	}
}

impl Div<f32> for Vec3 {
	type Output = Vec3;

	fn div(self, rhs: f32) -> Vec3 {
		self.scalar_div(rhs)
	}
}

impl fmt::Display for Vec3 {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		write!(f, "{:.2} {:.2} {:.2}", self.x(), self.y(), self.z())
	}
}

pub fn vec_add_entry<T: PartialEq + Clone>(vec: &mut Vec<T>, entry: &T)
{
	let mut i = 0;
	while i < vec.len() {
		if vec[i] == *entry {
			break;
		}
		i += 1;
	}

	if i < vec.len() {
		vec[i] = entry.clone();
	} else {
		vec.push(entry.clone());
	}
}

// removes all matching entries
pub fn vec_del_entry<T: PartialEq + Clone>(vec: &mut Vec<T>, entry: &T)
{
	let mut i = 0;
	while i != vec.len() {
		if vec[i] == *entry {
			vec.swap_remove(i);
		} else {
			i += 1;
		}
	}
}

pub fn vec_resize_with<T, F>(vec: &mut Vec<T>, new_len: usize, f: F)
    where F: Fn(usize) -> T
{
	let len = vec.len();
	if new_len > len {
		vec.reserve(new_len - len);
		for i in len..new_len {
			let tmp = f(i);
			vec.push(tmp);
		}
	} else {
		vec.truncate(new_len);
	}
}

pub fn vec_filter<T: PartialEq + Clone, F: Fn(&T) -> bool>(vec: &mut Vec<T>, filter: F)
{
	let mut i = 0;
	while i != vec.len() {
		if filter(&vec[i]) {
			i += 1;
		} else {
			vec.swap_remove(i);
		}
	}
}

pub struct CircularVec<T : Default + Copy> {
	len: usize,
	idx: usize,
	data: [T; 20],
}

impl<T : Default + Copy> CircularVec<T> {
	pub fn new() -> Self {
		Self {
			len: 0,
			idx: 0,
			data: [T::default(); 20]
		}
	}

	pub fn push(&mut self, item: T) {
		if self.data.len() > 0 {
			self.data[self.idx] = item;
			if self.len < self.data.len() {
				self.len += 1;
			}
			self.idx = (self.idx + 1) % self.data.len();
		}
	}

	pub fn len(&self) -> usize {
		self.len
	}
}

impl<T : Default + Copy> Index<usize> for CircularVec<T> {
	type Output = T;

	fn index(&self, i: usize) -> &T {
		&self.data[i]
	}
}

impl<T : Default + Copy> Deref for CircularVec<T> {
    type Target = [T];

    fn deref<'a>(&'a self) -> &'a [T] { &self.data[0..self.len] }
}

/*
impl<T : Default + Copy> IntoIterator for CircularVec<T> {
	type Item = T;
	type IntoIter = CircularVecIterator<T>;

	fn into_iter(self) -> Self::IntoIter {
		CircularVecIterator::<T>{ list: self, index: 0 } //, index: self.idx }
	}
}

pub struct CircularVecIterator<T : Default + Copy> {
	list: CircularVec<T>,
	index: usize,
}

impl<T : Default + Copy> Iterator for CircularVecIterator<T> {
	type Item = T;
	fn next(&mut self) -> Option<T> {
		if self.index < self.list.len {
			let i = self.list.idx + self.index;
			self.index += 1;
			Some(self.list.data[i % self.list.len])
		} else {
			None
		}
	}
}
*/

/*
#[derive(Hash, PartialEq, Eq, Debug, Clone, Copy)]
pub struct ID {
	//octets: [u8; 6]
	idx: usize
}

impl ID {
	pub fn new(idx: usize) -> ID {
		//let mut octets: [u8; 6] = ZERO_MAC;
		//thread_rng().fill(&mut octets);
		//ID{octets: octets}
		ID{idx: idx}
	}

	pub fn is_broadcast(self: &ID) -> bool {
		//self.octets == BROADCAST_MAC
		self.idx == usize::consts::MAX;
	}
}

impl fmt::Display for ID {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		write!(f, "{}", self.idx)
		//write!(f, "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
		//	self.octets[0], self.octets[1], self.octets[2],
		//	self.octets[3], self.octets[4], self.octets[5])
	}
}
*/

/*
use std::fs;
use std::ffi::OsStr;
use std::error::Error;

fn all_files() {
	let ext = OsStr::new("json");
	match fs::read_dir("./") {
	Ok(entries) => {
		for entry in entries {
			if let Ok(entry) = entry {
				if let Ok(meta) = entry.metadata() {
					if meta.is_file()
						&& entry.path().extension() == Some(ext) {
							println!("{:?}", entry);
					}
				}
			}
		}
	},
	Err(err) => {
			println!("error: {}", err);
		}
	}
}
*/
