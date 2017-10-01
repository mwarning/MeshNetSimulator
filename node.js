
function Node(mac, p = {}) {
  this.mac = mac;
  this.name = mac;

  this.clientCount = 0;
  this.packetCount = 0;
  this.nodeColor = '#fff';

  this.incoming = [];
  this.outgoing = [];
  this.p = p; // Extra information from import file

  this.step = function step(neigh) {
    // console.log('step for node ' + this.name);
    this.packetCount = this.incoming.length + this.outgoing.length;
  }

  this.addNewPacket = function addNewPacket(targetMAC, payload) {
    this.outgoing.push(new Packet(mac, targetMAC, payload));
    this.packetCount += 1;
  }

  this.reset = function () {
    this.incoming = [];
    this.outgoing = [];
  }
}
