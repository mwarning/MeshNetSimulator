
function Node(mac, meta = {}) {
  this.mac = mac;
  this.name = mac;
  this.meta = meta;

  this.clientCount = 0;
  this.nodeColor = '#fff';

  this.incoming = [];
  this.outgoing = [];

  this.step = function step() {
    // Process packet from incoming and place new packets into outgoing
  }

  this.reset = function () {
    this.incoming = [];
    this.outgoing = [];
  }
}
