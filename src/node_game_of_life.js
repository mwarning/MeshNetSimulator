/*
* Example of a Game Of Life implementation.
* The rules were modified to be applicable to mesh networks.
* This makes this an asynchronous cellular automaton.
*/

function Node(mac, meta = null) {
/* Required fields */

  // Basic data
  this.mac = mac;
  this.meta = meta;
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  this.state = (Math.random() < 0.5) ? 'alive' : 'dead';
}

/*
* The simple routing algorithm here learns of its neigbhors
* once and sends incoming packets to a random neighbor.
*/
Node.prototype.step = function () {
  if (this.incoming.length) {
    var neighbors_alive = this.incoming.reduce(function(acc, p) {
      return acc + (p.state === 'alive');
    }, 0);

    // Ratio of neighbors that are alive
    var alive = neighbors_alive / this.incoming.length;
    var old_state = this.state;

    // Rules
    if (this.state === 'alive') {
      if (alive < 0.3) {
        this.state = 'dead';
      } else if (alive >= 0.3 && alive < 0.6) {
        this.state = 'alive';
      } else {
        this.state = 'dead';
      }
    } else {
      if (alive > 0 && alive < 0.3) {
        this.state = 'alive';
      }
    }
    //console.log('alive: ' + alive + ' (' + old_state + ' => ' + this.state + ')');
  }

  // Send own state to all neighbors
  var p = new Packet(this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC);
  p.state = this.state;
  this.outgoing.push(p);
}

// Name displayed under the node
Node.prototype.getNodeName = function () {
  return '';
}

// Label on top of the node body
Node.prototype.getNodeLabel = function () {
  return '';
}

// Color of the ring around the node body
Node.prototype.getRingColor = function () {
  return '';
}

// Color of the round node body
Node.prototype.getBodyColor = function () {
  return (this.state === 'alive') ? '#00ea00' : '#ea0000';
}

// Number of small red circles around the node
// body indicating the number of connected clients
Node.prototype.getClientCount = function () {
  return 0;
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.state = (Math.random() < 0.5) ? 'alive' : 'dead';
}
