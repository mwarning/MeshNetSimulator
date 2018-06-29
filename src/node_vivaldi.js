/*
* Implementation of vivaldi coordinates from
* "Virtual Localization for Robust Geographic Routing in Wireless Sensor Networks".
* Originally used to select a nearest node on the Internet, e.g. for fallback server selection.
*
* Coordinate drift might happen if no small gravity towards 0 is added. Vivaldi is based
* on Euclidean distance model, which requires the predicted distances to obey the
* triangle inequality. However, there are triangle inequality violations (TIVs)
* on the Internet, but even more on a mesh network.
* Vivaldi coordinates also use a height element in the coordiantes, which is not implemented here.
*/

function Node(mac, meta = null) {
/* Required fields */

  // Basic data
  this.mac = mac;
  this.meta = meta;
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */
  this.last_change_magnitude = NaN;
  this.pos = random_pos(1000, DIM);
  this.error = 1;
  this.timer = 0;
  this.neighbors = {};
}

// Dimension of the 
var DIM = 3;


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
    console.log(" mac: " + mac + ", pos: " + packet.pos + ", error: " + e.error + ", received: " + e.received);
  }

  console.log("incoming:");
  for (var i in this.incoming) {
    var p = this.incoming[i];
    console.log(" " + p.transmitterAddress + " => " + p.receiverAddress);
  }

  console.log("outgoing:");
  for (var i in this.outgoing) {
    var p = this.outgoing[i];
    console.log(" " + p.transmitterAddress + " => " + p.receiverAddress);
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

function vec_unit(v) {
  return vec_scalar_mul(1 / vec_length(v), v);
}

function vec_direction(v1, v2) {
  return vec_unit(vec_sub(v1, v2));
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

function vec_dup(v) {
  return [v[0], v[1], v[2]];
}

function vec_mean(neighbors) {
  var pos = vec_null(DIM);
  for (var i in neighbors) {
    pos = vec_add(pos, neighbors[i].pos);
  }
  return vec_scalar_mul(1 / Object.keys(neighbors).length, pos);
}

function vec_square(v) {
  var pos = vec_null(DIM);
  for (var i = 0; i < DIM; i++) {
    pos[i] = Math.pow(v[i], 2);
  }
}

function localError(pos, neighbors)
{
  if (Object.keys(neighbors).length == 0) {
    return 0;
  }

  var mean = vec_mean(neighbors);
  var variance = 0;
  for (var i = 0; i < DIM; i++) {
    variance += Math.pow(mean[i] - pos[i], 2);
  }
  return Math.sqrt(variance);
}

Node.prototype.vivaldi = function (remotePos, remoteError) {
  var rtt = 1.5;
  var ce = 0.25;
  var cc = 0.25;

  // w = e_i / (e_i + e_j)
  var w = this.error / (this.error + remoteError);

  // x_i - x_j
  var ab = vec_sub(this.pos, remotePos);

  // rtt - |x_i - x_j|
  var re = rtt - vec_length(ab);

  // e_s = ||x_i - x_j| - rtt| / rtt
  var es = Math.abs(re) / rtt;

  // e_i = e_s * c_e * w + e_i * (1 - c_e * w)
  this.error = es * ce * w + this.error * (1 - ce * w);

  // ∂ = c_c * w
  var d = cc * w;

  // x_i = x_i + ∂ * (rtt - |x_i - x_j|) * u(x_i - x_j)
  this.pos = vec_add(this.pos, vec_scalar_mul(d * re, vec_unit(ab)));
}

Node.prototype.updatePosition = function () {
  var prev_pos = vec_dup(this.pos);

  for (var i in this.neighbors) {
    var e = this.neighbors[i];
    this.vivaldi(e.pos, e.error);
  }

  this.last_change_magnitude = vec_distance(this.pos, prev_pos);
}

Node.prototype.step = function () {
  this.timer += 1;

  // Send a broadcast to direct neighbors
  var p = new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC);
  p.pos = this.pos;
  p.error = localError(this.pos, this.neighbors);
  this.outgoing.push(p);

  // rocess incoming packets
  for (var i = 0; i < this.incoming.length; i += 1) {
    var packet = this.incoming[i];

    // Packet arrived at the destination
    if (packet.destinationAddress == this.mac) {
      console.log('packet arrived at the destination');
      continue;
    }

    // Catch broadcast packets and record neighbor
    if (packet.receiverAddress == BROADCAST_MAC) {
      var mac = packet.sourceAddress;
      if (mac == this.mac) {
        continue;
      }

      this.neighbors[mac] = {
        mac: mac, pos: packet.pos, error: packet.error, received: this.timer
      };
    } else {
      if (!packet.pos) {
        /*
         * Routing by MAC address is not the point of this routing implementation.
         * So we cheat a bit and set the target coordinate by means of global knowledge.
         */
        var mac = packet.destinationAddress;
        var node = graph.getIntNodes().find(function(e) { return e.o.mac === mac; });
        if (node) {
          packet.pos = vec_dup(node.o.pos);
        } else {
          alert("Node " + mac + " not found. Should not happen.");
        }
      }

      // Find neighbor that is nearest to the location
      //and nearer to the next position..
      var d_next = Infinity;
      var n_next = null;
      for (var k in this.neighbors) {
        var e = this.neighbors[k];
        var d = vec_distance(e.pos, packet.pos);
        if (d < d_next) {
          d_next = d;
          n_next = e.mac;
        }
      }

      if (n_next) {
        packet.transmitterAddress = this.mac;
        packet.receiverAddress = n_next;
        this.outgoing.push(packet);
      } else {
        console.log("No next node found => drop packet");
      }
    }
  }

  // Timeout old entries
  filterObject(this.neighbors, e => (this.timer - e.received) > 3);

  this.updatePosition();
}

// Name displayed under the node
Node.prototype.getNodeName = function () {
  return vec_str(this.pos);
}

// Label on top of the node body
Node.prototype.getNodeLabel = function () {
  // Count unicast packets
  var reducer = (sum, node) => sum + (node.receiverAddress != BROADCAST_MAC);
  return this.outgoing.reduce(reducer, 0) + this.incoming.reduce(reducer, 0);
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.last_change_magnitude = NaN;
  this.pos = random_pos(1000, DIM);
  this.error = 1;
  this.timer = 0;
  this.neighbors = {};
}
