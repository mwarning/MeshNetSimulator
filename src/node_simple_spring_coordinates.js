/*
 * This routing scheme assign a random 3D coordinate each node.
 * Each nodes updates it's coordinate based on the neighbors coordinate.
 * This basicly simulates relaxing springs between massless nodes.
 *
 * Pros:
 *  - simple
 *  - scalable
 * Cons:
 *  - routing loop might occur
 *  - coordinate flapping might occur
 */

// Coordiante dimension
var DIM = 3;

function Node(mac, meta = null) {
/* Required fields */

  // Basic data
  this.mac = mac;
  this.meta = meta;
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  // Record next hop neighbors
  this.pos = random_pos(1000, DIM);
  this.timer = 0;
  this.neighbors = {};
}

function filterObject(obj, filter) {
  var remove = [];

  for (var i in obj) {
    if (filter(obj[i])) {
      remove.push(i);
    }
  }

  if (remove.length) {
    for (var i in remove) {
      delete obj[remove[i]];
    }
  }
}

Node.prototype.executeCommand = function (cmd) {
  console.log("mac: " + this.mac);
  console.log("timer: " + this.timer);
  console.log("neighbors: " + Object.keys(this.neighbors).length);
  for (var mac in this.neighbors) {
    var e = this.neighbors[mac];
    console.log(" mac: " + mac + ", counter: " + e.counter + ", last updated: " + (this.timer - e.received));
  }
}

function vec_str(v) {
  var ret = "(";
  for (var i = 0; i < v.length; i++) {
    if (i > 0) ret += ", "
    ret += v[i].toFixed(0);
  }
  ret += ")";
  return ret;
}

function vec_scalar_mul(s, v1) {
  var v = [];
  for (var i = 0; i < v1.length; i++)
    v.push(s * v1[i]);
  return v;
}

function vec_add(v1, v2) {
  var v = [];
  for (var i = 0; i < v1.length; i++)
    v.push(v1[i] + v2[i]);
  return v;
}

function vec_sub(v1, v2) {
  var v = [];
  for (var i = 0; i < v1.length; i++)
    v.push(v1[i] - v2[i]);
  return v;
}

function vec_direction(v1, v2) {
  var v = vec_sub(v1, v2);
  return vec_scalar_mul(1 / vec_length(v), v);
}

function vec_distance(v1, v2) {
  return vec_length(vec_sub(v1, v2));
}

function vec_length(v) {
  var n = 0;
  for (var i = 0; i < v.length; i++)
    n += v[i] * v[i];
  return Math.sqrt(n);
}

function random_pos(n, dim) {
  function rnd() {
    return Math.floor(n * 2 * (Math.random() - 0.5));
  }
  var v = [];
  for (var i = 0; i < dim; i++) {
    v.push(rnd());
  }
  return v;
}

function vec_null(dim) {
  var v = [];
  for (var i = 0; i < dim; i++)
    v.push(0);
  return v;
}

// Add a little pull towards center coordiante (0, 0, 0, ...)
function centerGravity(pos) {
  var v = vec_null(DIM);
  var d = vec_distance(v, pos);
  var rho = 1024;

  return vec_add(pos, vec_scalar_mul(Mat.pow(d / rho, 2), vec_direction(v, d)));
}

Node.prototype.updatePosition = function () {
  // dist is the wish distance of the virtual coordinates
  function update(dist, local, remote) {
    var sensitivity = 0.25;
    var err = dist - vec_distance(local, remote);
    var direction_of_err = vec_direction(local, remote);
    var scaled_direction = vec_scalar_mul(err, direction_of_err);
    return vec_add(local, vec_scalar_mul(sensitivity, scaled_direction));
  }

  var pos = vec_null(DIM);
  for (var i in this.neighbors) {
    var e = this.neighbors[i];
    pos = vec_add(pos, update(1.5, this.pos, e.pos));
  }

  this.pos = vec_scalar_mul(1 / Object.keys(this.neighbors).length, pos);

  // Add gravity
  this.pos = centerGravity(this.pos);
}

Node.prototype.step = function () {
  this.timer += 1;

  // Send a broadcast to direct neighbors
  var p = new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC);
  p.pos = this.pos;
  this.outgoing.push(p);

  // process incoming packets
  for (var i = 0; i < this.incoming.length; i += 1) {
    var packet = this.incoming[i];

    // Packet arrived at the destination
    if (packet.destinationAddress === this.mac) {
      console.log('packet arrived at the destination');
      continue;
    }

    // Catch broadcast packets and record neighbor
    if (packet.receiverAddress === BROADCAST_MAC) {
      var mac = packet.sourceAddress;
      if (mac == this.mac) {
        continue;
      }

      this.neighbors[mac] = {
        mac: mac, pos: packet.pos, received: this.timer
      };
    } else {
      // Find neighbor that is nearest to the location
      var d_next = Infinity;
      var n_next = null;
      for (var i in this.neighbors) {
        var e = this.neighbors[i];
        var d = vec_distance(e.pos, packet.pos);
        if (d < d_next) {
          d_next = d;
          n_next = e.mac;
        }
      }

      // We found a neighbor that is not the node the packet just came from
      if (n_next && n_next != packet.transmitterAddress) {
        packet.transmitterAddress = n_next;
        this.outgoing.push(packet);
      }
    }
  }

  // Timeout old entries
  filterObject(this.neighbors, e => (this.timer - e.received) > 3);

  if (Object.keys(this.neighbors).length > 0) {
    this.updatePosition();
  }
}

// Name displayed under the node
Node.prototype.getNodeName = function () {
  return vec_str(this.pos);
}

// Label on top of the node body
Node.prototype.getNodeLabel = function () {
  return Object.keys(this.neighbors).length;
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.neighbors = {};
  this.pos = random_pos(100, DIM);
}
