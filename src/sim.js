
function createSim(graph, chart) {
  var self = {};

  // Number of steps the simulation has run
  self.simStep = 0;

  // Duration of the last simulation run
  self.simDuration = 0;

  // Keep track of setTimeout id
  self.timerId = null;

  // Simulation state
  self.running = false;

  self.sendCount = 0;
  self.lostOnLink = 0;

  self.receivedPackets = [];

  self.deployOnAllNodes = function () {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();
    var dijkstra = createDijkstra(intNodes, intLinks);
    var min_distance = 1;

    for (var i = 0; i < intNodes.length; i++) {
      for (var j = 0; j < intNodes.length; j++) {
        if (i == j) {
          continue;
        }

        var sourceIntNode = intNodes[i];
        var targetIntNode = intNodes[j];
        var shortestDistance = dijkstra.getShortestDistance(sourceIntNode, targetIntNode);

        if (shortestDistance == Infinity) {
          // Do not deploy on impossible routes
          continue;
        }

        if (shortestDistance < min_distance) {
          // Do not deploy on impossible routes
          continue;
        }

        // deploy packet
        var src = sourceIntNode.o.mac;
        var dst = targetIntNode.o.mac;
        var packet = new Packet(src, src, src, dst);
        // For route efficiency calculation
        packet.deployedAtStep = self.simStep;
        packet.receivedAtStep = NaN;
        sourceIntNode.o.incoming.push(packet);
        self.sendCount += 1;
      }
    }

    updateSimStatistics();

    graph.redraw();
  }

  function shuffleArray(a) {
    for (let i = a.length; i; i--) {
      let j = Math.floor(Math.random() * i);
      [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
  }
/*
  self.resetNodes = function () {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    for (var i = 0; i < intLinks.length; i++) {
      intLinks[i].o.reset();
    }

    for (var i = 0; i < intNodes.length; i++) {
      intNodes[i].o.incoming = [];
      intNodes[i].o.outgoing = [];
    }
  }
*/
  self.reset = function reset() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    for (var i = 0; i < intLinks.length; i++) {
      intLinks[i].o.reset();
    }

    for (var i = 0; i < intNodes.length; i++) {
      intNodes[i].o.reset();
    }

    self.simStep = 0;
    self.simDuration = 0;
    self.sendCount = 0;
    self.lostOnLink = 0;
    self.receivedPackets = [];

    updateSimStatistics();
    chart.reset();

    graph.redraw();
  }

  function num(v, suffix = '') {
    if (isNaN(v)) return '-';
    if (v === 100) return "100%";
    return (v.toFixed(1) + suffix);
  }

  function updateSimStatistics() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();
    var dijkstra = createDijkstra(intNodes, intLinks);

    var packetReceivedCount = self.receivedPackets.length;
    var packets_unicast = 0;
    var packets_broadcast = 0;
    var packetTransitCount = 0;

    function countPackets(node, packets) {
      for (var i = 0; i < packets.length; i += 1) {
        var packet = packets[i];
        var isBroadcast = (packet.receiverAddress === BROADCAST_MAC);
        packets_unicast += !isBroadcast;
        packets_broadcast += isBroadcast;

        if ('deployedAtStep' in packet) {
          packetTransitCount += 1;
        }
      }
    }

    var intNodes = graph.getIntNodes();
    for (var i = 0; i < intNodes.length; i += 1) {
      var node = intNodes[i].o;
      countPackets(node, node.incoming);
      countPackets(node, node.outgoing);
    }

    var nodeMap = {};
    intNodes.forEach(function(e) {
      nodeMap[e.o.mac] = e;
    });

    var receivedStepCount = 0;
    var receivedBestStepCount = 0;
    for (var i = 0; i < self.receivedPackets.length; i++) {
      var packet = self.receivedPackets[i];
      var shortestDistance = dijkstra.getShortestDistance(
        nodeMap[packet.sourceAddress], nodeMap[packet.destinationAddress]
      );
      receivedStepCount += (packet.receivedAtStep - packet.deployedAtStep);
      receivedBestStepCount += shortestDistance;
    }
    var receivedEfficiency = (receivedBestStepCount / receivedStepCount);
    var packetLostCount = self.sendCount - packetTransitCount - packetReceivedCount;

    function withPercent(val, all) {
      if (isNaN(all) || isNaN(val)) {
        return '-';
      }
      var ret = '' + val;
      if (all !== 0) {
        ret += ' (' + (100 * val / all).toFixed(1) + '%)';
      }
      return ret;
    };

    $$('sim_steps_total').nodeValue = self.simStep;
    $$('sim_duration').nodeValue = self.simDuration + ' ms';

    $$('sim_routing_efficiency').nodeValue = num(100 * receivedEfficiency, '%');
    $$('sim_packets_send').nodeValue = self.sendCount;
    $$('sim_packets_transit').nodeValue = withPercent(packetTransitCount, self.sendCount);
    $$('sim_packets_lost').nodeValue = withPercent(packetLostCount, self.sendCount);
    $$('sim_packets_received').nodeValue = withPercent(packetReceivedCount, self.sendCount);

    $$('packets_broadcast').nodeValue = packets_broadcast;
    $$('packets_unicast').nodeValue = packets_unicast;
    $$('packets_per_node').nodeValue = num((packets_broadcast + packets_unicast) / intNodes.length);
  }

  self.deployPackets = function() {
    var intNodes = graph.getSelectedIntNodes();
    if (intNodes.length < 2) {
      alert('Select source and target nodes. The first selected node will be the source.');
      return;
    }

    var src = intNodes[0].o.mac;
    for (var i = 1; i < intNodes.length; i += 1) {
      var dst = intNodes[i].o.mac;
      var packet = new Packet(src, src, src, dst);
      // Needed for route efficiency calculation
      packet.deployedAtStep = self.simStep;
      packet.receivedAtStep = NaN;
      intNodes[0].o.incoming.push(packet);
      self.sendCount += 1;
    }

    updateSimStatistics();

    graph.redraw();
  }

  self.start = function start(steps, delay) {
    function trigger(steps, delay) {
      if (steps > 0) {
        self.run(1);
        self.timerId = setTimeout(trigger, delay, steps - 1, delay);
      } else {
        self.timerId = null;
      }
    }

    if (self.timerId) {
      clearTimeout(self.timerId);
      self.timerId = null;
      return;
    }

    if (!this.running) {
      if (delay > 0) {
        trigger(steps, delay);
      } else {
        self.run(steps);
      }
    } else {
      alert('Simulation is still running.');
    }
  }

  function updateChart(step, intNodes) {
    // What if we want to chart efficiency?
    if (typeof Node.prototype.getChartValue === "function" && intNodes.length) {
      var values = intNodes.map((node) => node.getChartValue());
      var mean = values.reduce((s, v) => s + v, 0) / values.length;
      var variance_sq = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;

      chart.addPoint(step, mean, Math.sqrt(variance_sq));
    }
  }

  self.run = function run(steps) {
    this.running = true;

    // All links are bidirectional
    function getOtherIntNode(intLink, mac) {
      return (mac === intLink.target.o.mac) ? intLink.source : intLink.target;
    }

    function clonePacket(packet) {
      return JSON.parse(JSON.stringify(packet));
    }

    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    // Map of internal node index to array of d3 link objects
    var connections = {};

    for (var i in intNodes) {
      var n = intNodes[i];
      connections[n.index] = [];
    }

    for (var i in intLinks) {
      var l = intLinks[i];
      connections[l.source.index].push(l);
      connections[l.target.index].push(l);
    }

    var simStartTime = (new Date()).getTime();

    // Packet count per link to simulate a shared transport medium
    var packetCount = {};

    // Simulation steps
    for (var step = 0; step < steps; step += 1) {
      self.simStep += 1;
      updateChart(self.simStep, intNodes);

      // Initialize packet count
      for (var i in intLinks) {
        var intLink = intLinks[i];
        packetCount[intLink.index] = 0;
      }

      // Randomize order
      shuffleArray(intNodes);

      // Step nodes
      for (var i in intNodes) {
        var node = intNodes[i].o;
        node.step();
        node.incoming = [];
      }

      // Propagate packets
      for (var i in intNodes) {
        var intNode = intNodes[i];
        var intLinks = connections[intNode.index];

        // Randomize order
        shuffleArray(intLinks);

        for (var p in intNode.o.outgoing) {
          var packet = intNode.o.outgoing[p];
          var isBroadcast = (packet.receiverAddress == BROADCAST_MAC);

          if (packet.destinationAddress == intNode.o.mac) {
            // Drop outgoing packets with own address as destination
            console.log("Packet in outgoing that has its own address as destination! => drop packet");
            continue;
          }

          for (var j in intLinks) {
            var intLink = intLinks[j];
            var otherIntNode = getOtherIntNode(intLink, intNode.o.mac);

            if (isBroadcast || (packet.receiverAddress == otherIntNode.o.mac)) {
              if (isBroadcast) {
                // Necessary for broadcast
                packet = clonePacket(packet);
              }

              // Update count per node and channel to
              // simulate a shared transmission medium
              if (intLink.o.channel > 0) {
                intLinks.forEach(function(l) {
                  if (l.o.channel == intLink.o.channel) {
                    packetCount[l.index] += 1;
                  }
                });
              } else {
                packetCount[intLink.index] += 1;
              }

              if (intLink.o.transmit(packet, packetCount[intLink.index])) {
                // Packet transmitted
                otherIntNode.o.incoming.push(packet);
                if (!isBroadcast) {
                  // Packet has arrived at the destionation 
                  if (packet.destinationAddress == otherIntNode.o.mac) {
                    if ('deployedAtStep' in packet) {
                      packet.receivedAtStep = self.simStep;
                      self.receivedPackets.push(packet);
                    }
                  }
                }
              } else {
                // packet lost on link (by formula in link.js)
                self.lostOnLink += 1;
              }

              if (!isBroadcast) {
                break;
              }
            }
          }
        }

        // All packets should have been handled
        intNode.o.outgoing = [];
      }
    }

    self.simDuration = (new Date()).getTime() - simStartTime;

    updateSimStatistics();

    graph.redraw();

    this.running = false;
  }

  return self;
}
