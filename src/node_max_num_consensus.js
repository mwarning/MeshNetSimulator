/*
* Example node implementation for simple consensus that works on arbitrary topologies.
* Every node generates an random number. Then everybody wants to find out the highest number.
*
* How to use: Replace node.js with this file.
*/

function Node(mac, meta = {}) {
/* Required fields */

  // Basic data
  this.mac = mac;
  this.meta = meta;
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  this.num = Math.floor(Math.random() * 1000);
}

Node.prototype.step = function () {

  for (var i = 0; i < this.incoming.length; i++) {
    var packet = this.incoming[i];

    if (packet.num > this.num) {
      // Set higher num
      this.num = packet.num;
    }
  }

  // Send own num to all direct neighbors
  var packet = new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC);
  packet.num = this.num;
  this.outgoing.push(packet);
}

Node.prototype.getNodeName = function () {
  return this.num.toString();
}

Node.prototype.getNodeLabel = function () {
  return '';
}

Node.prototype.getRingColor = function () {
  return '';
}

Node.prototype.getBodyColor = function () {
  return '#fff';
}

Node.prototype.getClientCount = function () {
  return 0;
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.num = Math.floor(Math.random() * 1000);
}
