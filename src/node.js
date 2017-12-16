/*
* Example Node implementation.
* Every node routes a packet to a random neighbor until it reaches the final destination.
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

  for (var i = 0; i < this.incoming.length; i += 1) {
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

      packet.transmitterAddress = this.mac;
      packet.receiverAddress = nextHop;

      this.outgoing.push(packet);
    }
  }
}

// Name displayed under the node
Node.prototype.getNodeName = function () {
  // Find hostname in meta data, display MAC address as fallback
  return findValue(this.meta, 'hostname', this.mac);
}

// Label on top of the node body
Node.prototype.getNodeLabel = function () {
  // Count unicast packets
  var count = 0;
  for (var i in this.outgoing) {
    count += (this.outgoing[i] !== BROADCAST_MAC);
  }
  return count ? count.toString() : '';
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
  return findValue(this.meta, 'clients', '').toString();
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
