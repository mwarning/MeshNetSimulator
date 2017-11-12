/*
* Example Node implementation.
* Every node routes a packet to a random neighbor until it reaches the final destination.
*/

function Node(mac, meta = {}) {
/* Required fields */

  // Basic data
  this.mac = mac;
  this.meta = meta;
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  // Record next hop neighbors
  this.neighbors = {};
}

/*
* The simple routing algorithm here learns of its neigbhors
* once and sends incoming packets to a random neighbor.
*/
Node.prototype.step = function () {
  // Send a broadcast to direct neighbors
  if (isEmpty(this.neighbors)) {
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

    // Catch broadcast packets and record neighbor
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

      this.outgoing.push(packet);
    }
  }
}

// Name displayed under the node
Node.prototype.getNodeName = function () {
  return ('nodeinfo' in this.meta) ? this.meta.nodeinfo.hostname : this.mac;
}

// Label on top of the node body
Node.prototype.getNodeLabel = function () {
  function countUnicastPackets(packets) {
    return packets.reduce(function(acc, val) {
      return acc + (val.receiverAddress !== BROADCAST_MAC);
    }, 0);
  }
  var packetCount = countUnicastPackets(this.incoming) + countUnicastPackets(this.outgoing);
  return packetCount ? packetCount.toString() : '';
}

// Color of the ring around the node body
Node.prototype.getRingColor = function () {
  return isEmpty(this.neighbors) ? '' : '#008000';
}

// Color of the round node body
Node.prototype.getBodyColor = function () {
  return '#fff';
}

// Number of small red circles around the node
// body indicating the number of connected clients
Node.prototype.getClientCount = function () {
  return ('statistics' in this.meta) ? this.meta.statistics.clients : 0;
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.neighbors = {};
}

// For the transition to new implementations
Node.prototype.copyFromOldImplementation = function (oldNode) {
  copyExistingFields(oldNode, this);
};
