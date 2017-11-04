
function Link(quality = 100, bandwidth = 50) {
/* Required fields */

  /*
  [0..100] Link quality in percent
  The quality is 100% minus expected packet loss.
  A wireless link usually has a medium packet loss of 25%. A wired link maybe 2%.
  */
  this.quality = quality;
  /*
  [0..] Number of packets
  The bandwidth is the number of packets that can be transmitted in one simulation step
  How this value is applied is decided in the transmit() method.
  */
  this.bandwidth = bandwidth;
  /*
  [0..] Transmission medium
  Channel 0 represents a link over its own medium. The link does not influence any other links.
  Influence means that the packetCount for the transmit() method is not cumulated over multiple links.
  With channels >0 link can be grouped together, e.g. as to simulate multiple (e.g. wireless) interfaces.
  */
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
Link.prototype.copyFromOldImplementation = function (oldLink) {
  copyExistingFields(oldLink, this);
};
