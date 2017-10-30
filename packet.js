
var BROADCAST_MAC = "ff:ff:ff:ff:ff:ff";

function Packet(transmitterAddress, receiverAddress, sourceAddress, destinationAddress, deployedAtStep = 0) {
/* Required fields */

  // One hop receiver and transmitter address
  this.transmitterAddress  = transmitterAddress ;
  this.receiverAddress = receiverAddress;

  // Multi-hop source and destination address
  this.sourceAddress = sourceAddress;
  this.destinationAddress = destinationAddress;

  // Creation time of the packet
  this.deployedAtStep = deployedAtStep;

/* Additional fields */

  this.ttl = 10;
}

// For changing the implementation during simulation
Packet.prototype.copyFromOldImplementation = function copyFromOldImplementation(oldPacket) {
  copyExistingFields(oldPacket, this);
};
