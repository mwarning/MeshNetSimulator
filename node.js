
function Node(name, p = {}) {
  // Mandatory fields
  this.name = name;
  this.clientCount = 0;
  this.packetCount = 0;
  this.color = '#fff';
  this.p = p; // Extra information from import file

  this.step = function () {
    console.log('step for node ' + this.name);
  }

  this.reset = function () {
  }
}
