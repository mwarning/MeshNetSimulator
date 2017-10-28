
function Node(mac, meta = {}) {
/* Required fields */

  this.mac = mac;
  this.name = mac;
  this.meta = meta;

  // Array of incoming/outgoing packets
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  this.timer = 0;
  this.neighbors = {};
}

// Process packets and transfer packets from incoming to outgoing array.
// This is where the routing algorithm needs to be implemented.
Node.prototype.step = function() {
  function power_of_2(n) {
    return n && (n & (n - 1)) === 0;
  }

  // Send a broadcast to direct neighbors
  if (power_of_2(this.timer)) {
    /*
    this.outgoing.push(
      new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC)
    );
    */
    this.timer += 1;
  }

  for (var i = 0; i < this.incoming.length; i++) {
    var packet = this.incoming[i];

    // Packet arrived at the destination
    if (packet.destinationMAC == this.mac) {
      console.log('packet arrived at the destination');
      continue;
    }

    // Drop packet when counter reached 0
    if (packet.ttl <= 0) {
      console.log(this.mac + ' drops packet: ttl <= 0');
      continue;
    }

    if (packet.receiverAddress == BROADCAST_MAC) {
      if (packet.transmitterAddress in this.neighbors) {
        this.neighbors[packet.transmitterAddress] += 1;
      } else {
        this.neighbors[packet.transmitterAddress] = 1;
      }
      console.log(this.mac + ' drops packet: broadcast');
      continue;
    }

    // Select destination
    var others = Object.keys(this.neighbors);
    var transmitterAddress = packet.transmitterAddress;
    if (others.length > 1) {
      while (transmitterAddress == packet.transmitterAddress) {
        transmitterAddress = others[Math.floor(Math.random() * others.length)];
      }
    } else {
      console.log(this.mac + ' drop packet: no neighbors known');
      continue;
    }

    packet.transmitterAddress = this.mac;
    packet.receiverAddress = transmitterAddress;
    packet.ttl -= 1;

    this.outgoing.push(packet);
  }

  this.incoming = [];
  this.timer += 1;
}

Node.prototype.getNodeLabel = function () {
  return (this.incoming.length + this.outgoing.length);
}

Node.prototype.getClientCount = function () {
  // Get info from meta info when meshviewer data is used
  return ('statistics' in this.meta) ? this.meta.statistics.clients : 0;
}

Node.prototype.getNodeColor = function () {
  return '#fff';
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
