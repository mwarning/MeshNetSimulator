
function Node(mac, p = {}) {
  // Mandatory fields
  this.mac = mac;
  this.name = mac;
  this.clientCount = 0;
  this.packetCount = 0;
  this.color = '#fff';
  this.incoming = [];
  this.outgoing = [];
  this.p = p; // Extra information from import file

  this.step = function step(neigh) {
    // console.log('step for node ' + this.name);
    packetCount = incoming.length + outgoing.length;
  }

  this.step = function step(neigh) {
    console.log('step for node ' + this.name);
  }

  this.getProps = function getProps() {
    return {mac: mac, clientCount: clientCount, packetCount: packetCount};
  }

  this.setProps = function setProps(props) {
  }

  this.reset = function () {
    incoming = [];
    outgoing = [];
  }
}
