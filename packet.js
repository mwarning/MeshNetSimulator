
var BROADCAST_MAC = "ff:ff:ff:ff:ff:ff";

function Packet(srcMAC, dstMAC, sourceMAC, destinationMAC, step = 0) {
/* Required fields */

  // One hop source and target
  this.srcMAC = srcMAC;
  this.dstMAC = dstMAC;

  // Multi-hop source and target
  this.sourceMAC = sourceMAC;
  this.destinationMAC = destinationMAC;

  this.step = step; // rename to time

/* Additional fields */

  this.ttl = 10;
}
