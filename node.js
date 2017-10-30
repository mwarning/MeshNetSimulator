
function Node(mac, meta = {}) {
/* Required fields */

  // Basic data
  this.mac = mac;
  this.name = mac;
  this.meta = meta;
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  this.timer = 0;
  this.neighbors = {};
}

/*
* The simple routing algorithm here learns of its neigbhors once
* and sends incoming packets to a random neighbor.
*/
Node.prototype.step = function() {
  // Send a broadcast to direct neighbors
  if (this.timer === 0) {
    this.outgoing.push(
      new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC)
    );
  }

  for (var i = 0; i < this.incoming.length; i++) {
    var packet = this.incoming[i];

    // Packet arrived at the destination
    if (packet.destinationAddress === this.mac) {
      console.log('packet arrived at the destination');
      continue;
    }

    // Drop packet when counter reached 0
    if (packet.ttl <= 0) {
      console.log(this.mac + ' drops packet: ttl <= 0');
      continue;
    }

    // Catch broadcast packets an record neighbor
    if (packet.receiverAddress === BROADCAST_MAC) {
      this.neighbors[packet.transmitterAddress] = true;
      continue;
    }

    // Select random destination
    var others = Object.keys(this.neighbors);
    if (others.length) {
      var nextHop = others[Math.floor(Math.random() * others.length)];
      // Lower probability of sending the packet back to the same node
      if (nextHop === packet.transmitterAddress) {
        nextHop = others[Math.floor(Math.random() * others.length)];
      }

      packet.transmitterAddress = this.mac;
      packet.receiverAddress = nextHop;
      packet.ttl -= 1;

      this.outgoing.push(packet);
    }
  }

  this.incoming = [];
  this.timer += 1;
}

Node.prototype.getNodeLabel = function () {
  function countUnicastPackets(packets) {
    return packets.reduce(function(acc, val) {
      return acc + (val.receiverAddress !== BROADCAST_MAC);
    }, 0);
  }
  var packets = countUnicastPackets(this.incoming) + countUnicastPackets(this.outgoing);
  return packets ? packets.toString() : '';
}

Node.prototype.getRingColor = function () {
  return isEmpty(this.neighbors) ? '' : '#008000';
}

Node.prototype.getBodyColor = function () {
  return '#fff';
}

Node.prototype.getClientCount = function () {
  return ('statistics' in this.meta) ? this.meta.statistics.clients : 0;
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.neighbors = {};
  this.timer = 0;
}

// For changing the implementation during simulation
Node.prototype.copyFromOldImplementation = function copyFromOldImplementation(oldNode) {
  copyExistingFields(oldNode, this);
};
