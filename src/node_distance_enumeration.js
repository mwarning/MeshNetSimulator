/*
* The nodes agree on a specific but random node (highest num) and evaluate their distance from the choosen node.
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
  this.enum = 0;
}

Node.prototype.step = function () {

  for (var i = 0; i < this.incoming.length; i++) {
    var packet = this.incoming[i];

    if (packet.num > this.num) {
      this.num = packet.num;
      this.enum = packet.enum + 1;
    }
  }

  // Send own num to all direct neighbors
  var packet = new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC);
  packet.num = this.num;
  packet.enum = this.enum;
  this.outgoing.push(packet);
}

Node.prototype.getNodeName = function () {
  return this.enum;
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.num = Math.floor(Math.random() * 1000);
  this.enum = 0;
}
