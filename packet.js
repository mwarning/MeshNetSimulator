
var BROADCAST_MAC = "ff:ff:ff:ff:ff:ff";

function Packet(receiverAddress, transmitterAddress, sourceAddress, destinationAddress, step = 0) {
/* Required fields */

  // One hop receiver and transmitter address
  this.receiverAddress = receiverAddress;
  this.transmitterAddress  = transmitterAddress ;

  // Multi-hop source and destination address
  this.sourceAddress = sourceAddress;
  this.destinationAddress = destinationAddress;

  // Creation time of the packet
  this.step = step;

/* Additional fields */

  this.ttl = 10;
}

// For changing the implementation during simulation
Packet.prototype.copyFromOldImplementation = function copyFromOldImplementation(oldPacket) {
  copyExistingFields(oldPacket, this);
};
