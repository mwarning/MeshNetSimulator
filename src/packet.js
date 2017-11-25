
var BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

function Packet(transmitterAddress, receiverAddress, sourceAddress, destinationAddress) {
/* Required fields */

  // One hop transmitter and receiver address
  this.transmitterAddress = transmitterAddress;
  this.receiverAddress = receiverAddress;

  // Multi-hop source and destination address
  this.sourceAddress = sourceAddress;
  this.destinationAddress = destinationAddress;
}

// For changing the implementation during simulation
Packet.prototype.copyFromOldImplementation = function (oldPacket) {
  copyExistingFields(oldPacket, this);
};
