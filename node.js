
function Node(id, p) {
  this.id = id;
  this.name = id;
  this.clientCount = 0;
  this.packetCount = 0;

  this.p = p;

  this.step = function () {
    console.log('step for node ' + this.id);
  }

  this.reset = function () {
  }
}
