/*
* Implementation of "Virtual Localization for Robust Geographic Routing in Wireless Sensor Networks"
* Source: http://titania.ctie.monash.edu.au/papers/WiSARN2014_001.pdf
*
* Creates a virtual (3d) coordiante system based on spring based
* interaction to 1. and 2. hop neigbors.
*
* For actual routing, the packet must have an position field.
*/

function Node(mac, meta = null) {
/* Required fields */

  // Basic data
  this.mac = mac;
  this.meta = meta;
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  // Record next hop neighbors
  this.pos = random_pos(1000);
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
    console.log(" mac: " + mac + ", hops: " + e.hops
      + ", counter: " + e.counter + ", last updated: " + (this.timer - e.received));
  }
}

function vec_str(v) {
  return "(" + v[0].toFixed(0) + ", " + v[1].toFixed(0) + ", " + v[2].toFixed(0) + ")";
}

function vec_eq(v1, v2) {
  return (v1[0] == v2[0]) && (v1[1] == v2[1]) && (v1[2] == v2[2]);
}

function vec_add(v1, v2) {
  return [(v1[0] + v2[0]), (v1[1] + v2[1]), (v1[2] + v2[2])];
}

function vec_sub(v1, v2) {
  return [(v1[0] - v2[0]), (v1[1] - v2[1]), (v1[2] - v2[2])];
}

function norm_squared(v) {
  return (v[0] * v[0]) + (v[1] * v[1]) + (v[2] * v[2]);
}

function energy(pos, N1, N2) {
  var ka = 1;
  var kr = 8 * 10^6;
  var e = 0;

  for (var i in N1) {
    e += ka * norm_squared(vec_sub(pos, N1[i]));
  }

  for (var i in N2) {
    e += kr / (1 + norm_squared(vec_sub(pos, N2[i])));
  }

  return e;
}

function random_pos(n) {
  function rnd() {
    return Math.floor(n * 2 * (Math.random() - 0.5));
  }

  return [rnd(), rnd(), rnd()];
}

function new_pos(pos, N1, N2) {
  var n = 100;
  for (var i = 0; i < n; i++) {
    var tmp = vec_add(pos, random_pos(10));
    if (energy(tmp, N1, N2) < energy(pos, N1, N2)) {
      pos = tmp;
    }
  }
  return pos;
}

Node.prototype.updatePosition = function () {
  var N1 = [];
  var N2 = [];

  for (var i in this.neighbors) {
    var e = this.neighbors[i];

    if (e.hops == 1) {
      N1.push(e.pos);
    }

    if (e.hops == 2) {
      N2.push(e.pos);
    }
  }

  this.pos = new_pos(this.pos, N1, N2);
}

Node.prototype.step = function () {
  this.timer += 1;

  // Send a broadcast to direct neighbors
  var p = new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC);
  p.hops = 1;
  p.counter = this.timer;
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
      if (packet.hops > 2) {
        continue;
      }

      if (packet.sourceAddress == this.mac) {
        continue;
      }

      var mac = packet.sourceAddress;
      if (mac in this.neighbors) {
        var e = this.neighbors[mac];
        if (packet.hops <= e.hops && packet.counter >= e.counter) {
          e.hops = packet.hops;
          e.counter = packet.counter;
          e.received = this.timer;
          e.pos = packet.pos;
        }
      } else {
        this.neighbors[mac] = {
          hops: packet.hops, counter: packet.counter, received: this.timer, pos: packet.pos
        };
      }

      // forward packet
      if (packet.hops == 1) {
        packet.hops = 2;
        packet.transmitterAddress = this.mac;
        this.outgoing.push(packet);
      }
    } else {
      // Find next neighbor that is nearest to the location
      var d_next = Infinity;
      var n_next = null;
      for (var i in this.neighbors) {
        var e = this.neighbors[i];  
        if (e.hops == 1) {
          // Destination is neighbor 
          if (e.mac == packet.destinationAddress) {
            d_next = 0;
            n_next = n;
            break;
          }

          var d = vec_distance(e.pos, packet.pos);
          if (d < d_next) {
            d_next = d;
            n_next = e.mac;
          }
        }
      }

      if (n_next) {
        packet.transmitterAddress = n_next;
        this.outgoing.push(packet);
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
  return '' + Object.keys(this.neighbors).length;
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.neighbors = {};
  this.pos = random_pos(100);
}
