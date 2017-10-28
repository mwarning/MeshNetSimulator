
var BROADCAST_MAC = "ff:ff:ff:ff:ff:ff";

function Packet(receiverAddress, transmitterAddress , sourceAddress, destinationAddress, step = 0) {
/* Required fields */

  // One hop source and target
  this.receiverAddress = receiverAddress;
  this.transmitterAddress  = transmitterAddress ;

  // Multi-hop source and target
  this.sourceAddress = sourceAddress;
  this.destinationAddress = destinationAddress;

  this.step = step; // rename to time

/* Additional fields */

  this.ttl = 10;
}

Packet.prototype.copyFromOldImplementation = function copyFromOldImplementation(oldPacket) {
  copyExistingFields(oldPacket, this);
};
