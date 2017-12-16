/*
* Node implementation of an distance vector protocol. A simple distance metric is used.
* Every node floods the network with hello packets.
* Every node maintains a table of entries about from which neigbor it received a hello message from.
* Hello packets are dropped when we heard from that originator....
*/

function Node(mac, meta = {}) {
/* Required fields */

  // Basic data
  this.mac = mac;
  this.meta = meta;
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  // Record source nodes and the next hop neighbors we can use to reach that node
  this.originators = {};

  // Record broadcasts we already have received and discard them if known
  this.timer = Math.floor((Math.random() * 100));
  this.packetCounter = 0;
}

function randomEntry(obj) {
  var keys = Object.keys(obj);
  return obj[keys[keys.length * Math.random() << 0]];
};

function Entry(nextMAC, stepCounter, packetCounter, timer) {
  // Next hop node the broadcast packet came from
  this.nextMAC = nextMAC;
  // The number of steps the originator is away, used to prefer a route over another.
  this.stepCounter = stepCounter;
  // Unique packet id of the originator
  this.packetCounter = packetCounter;
  // When the packet was received, used for timing out old entries
  this.timer = timer;
}

/*
* The simple routing algorithm here learns of its neigbhors
* once and sends incoming packets to a random neighbor.
*/
Node.prototype.step = function () {

  // Flood the network with broadcast packets on every fourth step
  if ((this.timer % 4) === 0) {
    this.packetCounter += 1;

    // All our broadcast packet are hello packets
    var packet = new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC);
    // Increased on every hop
    packet.stepCounter = 1;
    // Packet enumerate to be able to filter duplicates
    packet.packetCounter = this.packetCounter;

    this.outgoing.push(packet);
  }

  for (var i = 0; i < this.incoming.length; i += 1) {
    var packet = this.incoming[i];

    // Packet arrived at the destination
    if (packet.destinationAddress === this.mac) {
      console.log('Packet arrived at the final destination');
      // Unicast packet arrived at the destination => drop packet
    }

    // Process and forward broadcast packets
    else if (packet.receiverAddress === BROADCAST_MAC) {
      var entry = this.originators[packet.sourceAddress];
      if (!entry || (packet.stepCounter <= entry.stepCounter)) {
        var e = new Entry(packet.transmitterAddress, packet.stepCounter, packet.packetCounter, this.timer);
        this.originators[packet.sourceAddress] = e;
      }

      // Forward new broadcast packets
      if (!entry || (packet.packetCounter > entry.packetCounter)) {
        // The new one hop sender is this node
        packet.transmitterAddress = this.mac;
        packet.stepCounter += 1;

        // Forward packet
        this.outgoing.push(packet);
      } else {
        // Old packet, drop broadcast packet
      }
    }

    // Forward unicast packet
    else if (Object.keys(this.originators).length > 0) {
      var entry = this.originators[packet.destinationAddress];

      if (!entry) {
        // No idea where to forward the packet
        // Use a random entry
        entry = randomEntry(this.originators);
      }

      packet.transmitterAddress = this.mac;
      packet.receiverAddress = entry.nextMAC;

      this.outgoing.push(packet);
    } else {
      // No neighbors known, drop unicast packet
    }
  }
/*
  // Remove old entries (after 8 rounds)
  // Otherwise our table might never forget vanished nodes
  for (var srcMAC in this.originators) {
    var entry = this.originators[srcMAC];
    if ((entry.timer + 8) < this.timer) {
      delete this.originators[srcMAC];
    }
  }
*/
  this.timer += 1;
}

// Name displayed under the node
Node.prototype.getNodeName = function () {
  return this.mac;
}

// Label on top of the node body
Node.prototype.getNodeLabel = function () {
  function countUnicastPackets(packets) {
    var count = 0;
    for (var i = 0; i < packets.length; i += 1) {
      count += (packets[i].receiverAddress !== BROADCAST_MAC);
    }
    return count;
  }
  var packetCount = countUnicastPackets(this.incoming) + countUnicastPackets(this.outgoing);
  return packetCount ? packetCount.toString() : '';
}

// Color of the ring around the node body
Node.prototype.getRingColor = function () {
  return '';
}

// Color of the round node body
Node.prototype.getBodyColor = function () {
  return '#fff';
}

// Number of small red circles around the node
// body indicating the number of connected clients
Node.prototype.getClientCount = function () {
  return 0;
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];

  this.originators = {};
  this.timer = Math.floor((Math.random() * 100));
  this.packetCounter = 0;
}
