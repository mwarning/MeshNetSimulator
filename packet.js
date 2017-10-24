
var BROADCAST_MAC = "00:00:00:00:00:00";

function Packet(srcMAC, dstMAC, originatorMAC, destinationMAC, step = 0) {
  // One hop source and target
  this.srcMAC = srcMAC; //srcMAC1
  this.dstMAC = dstMAC; //dstMAC1

  // Multi-hop source and target
  this.originatorMAC = originatorMAC; // srcMAC2
  this.destinationMAC = destinationMAC; //dstMAC2

  this.step = step; // rename to time
  this.ttl = 10;
}
