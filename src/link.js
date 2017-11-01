
function Link(sourceNode, targetNode, quality = 100, bandwidth = 50) {
/* Required fields */
  this.sourceNode = sourceNode;
  this.targetNode = targetNode;
  this.quality = quality;
  this.bandwidth = bandwidth;
  this.channel = 0;
}

Link.prototype.transmit = function (packet, fromMAC, packetCount) {
  function isTransmissionSuccessful(link, packetCount) {
    var n = 100 * (Math.min(packetCount, link.bandwidth) / link.bandwidth);
    return ((link.quality / 100) * Math.pow(0.999, n)) > Math.random();
  }

  // All links are bidirectional 
  function getOtherNode(link, mac) {
    return (mac === link.targetNode.mac) ? link.sourceNode : link.targetNode;
  }

  function clonePacket(packet) {
    return JSON.parse(JSON.stringify(packet));
  }

  var otherNode = getOtherNode(this, fromMAC);

  if ((packet.receiverAddress === BROADCAST_MAC) || (packet.receiverAddress === otherNode.mac)) {
    if (packet.receiverAddress === BROADCAST_MAC) {
      // Necessary for broadcast
      packet = clonePacket(packet);
    }

    if (isTransmissionSuccessful(this, packetCount)) {
      otherNode.incoming.push(packet);
      return true;
    }
  }

  return false;
};

// For changing the implementation during simulation
Link.prototype.copyFromOldImplementation = function (oldNode) {
  copyExistingFields(oldNode, this);
};
