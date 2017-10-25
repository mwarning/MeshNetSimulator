
var BROADCAST_MAC = "00:00:00:00:00:00";

function Packet(srcMAC, dstMAC, sourceMAC, destinationMAC, step = 0) {
  // One hop source and target
  this.srcMAC = srcMAC;
  this.dstMAC = dstMAC;

  // Multi-hop source and target
  this.sourceMAC = sourceMAC;
  this.destinationMAC = destinationMAC;

  this.step = step; // rename to time
  this.ttl = 10;
}
