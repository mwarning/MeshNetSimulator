
function Link(quality = 100, bandwidth = 50) {
  /* Required fields */
  this.quality = quality;
  this.bandwidth = bandwidth;
  this.channel = 0;
}

// Move a packet to a target node
Link.prototype.transmit = function (packet, targetNode, packetCount) {
  // Calculate packet transmission probability
  // The formula needs improvments!
  function getProbability(link, packetCount) {
    var n = 100 * (Math.min(packetCount, link.bandwidth) / link.bandwidth);
    return (link.quality / 100) * Math.pow(0.999, n);
  }

  if (getProbability(this, packetCount) > Math.random()) {
    targetNode.incoming.push(packet);
    return true;
  }

  return false;
};

// For changing the implementation during simulation
Link.prototype.copyFromOldImplementation = function (oldNode) {
  copyExistingFields(oldNode, this);
};
