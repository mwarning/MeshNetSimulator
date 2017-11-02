
function Link(quality = 100, bandwidth = 50) {
/* Required fields */

  // Packet loss in percent
  this.quality = quality;
  // Number of packets allowed to be transmitted in one simulation step
  this.bandwidth = bandwidth;
  // Transmission medium (0 is always distinct, >0 is shared)
  this.channel = 0;
}

// Move a packet to a target node
Link.prototype.transmit = function (packet, packetCount) {
  // Calculate packet transmission probability
  // The formula needs improvments!
  var n = 100 * (Math.min(packetCount, this.bandwidth) / this.bandwidth);
  var probability = (this.quality / 100) * Math.pow(0.999, n);
  return probability > Math.random();
};

// For changing the implementation during simulation
Link.prototype.copyFromOldImplementation = function (oldNode) {
  copyExistingFields(oldNode, this);
};
