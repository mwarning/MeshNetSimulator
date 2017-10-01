
function Node(name, p = {}) {
  // Mandatory fields
  this.name = name;
  this.clientCount = 0;
  this.packetCount = 0;
  this.color = '#fff';
  this.incoming = [];
  this.outgoing = [];
  this.p = p; // Extra information from import file


  this.preStep = function preStep() {
    // Everything has been send
    incoming = [];
  }

  this.step = function step(neigh) {
    console.log('step for node ' + this.name);
  }

  this.postStep = function postStep() {
    // Everything has been send
    outgoing = [];
    packetCount = incoming.length;
  }

  this.reset = function () {
    incoming = [];
    outgoing = [];
  }
}
