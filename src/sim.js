
function Route(sourceAddress, destinationAddress, deployRate = 1) {
  this.sourceAddress = sourceAddress;
  this.destinationAddress = destinationAddress;
  this.deployRate = deployRate;

  this.sendCount = 0;
  this.receivedCount = 0;
  this.receivedStepCount = 0;
  this.efficiency = NaN;

  this.reset = function reset() {
    this.sendCount = 0;
    this.receivedCount = 0;
    this.receivedStepCount = 0;
    this.efficiency = NaN;
  }
}

function createSim(graph) {
  var self = {};

  self.simStep = 0;
  self.simDuration = 0;
  self.routes = {};

  function shuffleArray(a) {
    for (let i = a.length; i; i--) {
      let j = Math.floor(Math.random() * i);
      [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
  }

  self.reset = function reset() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    for (var i = 0; i < intLinks.length; i++) {
      intLinks[i].o.reset();
    }

    for (var i = 0; i < intNodes.length; i++) {
      intNodes[i].o.reset();
    }

    for (var id in self.routes) {
      self.routes[id].reset();
    }

    self.simStep = 0;
    self.simDuration = 0;

    updateSimStatistics();

    graph.redraw();
  }

  function num(v, suffix = '') {
    return isNaN(v) ? '-' : (v.toFixed(1) + suffix);
  }

  function updateSimStatistics() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    var packetsBroadcastCount = 0;
    var packetsUnicastCount = 0;
    var packetsSendCount = 0;
    var packetsReceivedCount = 0;
    var packetsTransitCount = 0;
    var routesCount = 0;

    var routingEfficiencySum = 0;
    var routingEfficiencyCount = 0;

    function countPackets(packet) {
      if (packet.destinationAddress === BROADCAST_MAC) {
        packetsBroadcastCount += 1;
      } else {
        packetsUnicastCount += 1;

        var id = packet.sourceAddress + '=>' + packet.destinationAddress;
        packetsTransitCount += (id in self.routes);
      }
    }

    for (var i in intNodes) {
      var node = intNodes[i].o;
      node.incoming.forEach(countPackets);
      node.outgoing.forEach(countPackets);
    }

    for (var id in self.routes) {
      var route = self.routes[id];
      routesCount += 1;
      packetsSendCount += route.sendCount;
      packetsReceivedCount += route.receivedCount;

      if (!isNaN(route.efficiency)) {
        routingEfficiencySum += route.efficiency;
        routingEfficiencyCount += 1;
      }
    }

    // Convert to medium percent
    var routingEfficiencyPercent = 100 * routingEfficiencySum / routingEfficiencyCount;

    $$('sim_steps_total').nodeValue = self.simStep;
    $$('sim_duration').nodeValue = self.simDuration + ' ms';

    $$('packets_unicast_count').nodeValue = packetsUnicastCount
    $$('packets_broadcast_count').nodeValue = packetsBroadcastCount;

    function percent(value) {
      var p = (100 * value / packetsSendCount);
      return isNaN(p) ? '' : (' (' + p.toFixed(1) + '%)');
    };

    $$('routes_count').nodeValue = routesCount;
    $$('routes_packets_send').nodeValue = packetsSendCount;
    $$('routes_packets_received').nodeValue = packetsReceivedCount + percent(packetsReceivedCount);
    $$('routes_packets_transit').nodeValue = packetsTransitCount + percent(packetsTransitCount);
    var packetsLostCount = (packetsSendCount - packetsReceivedCount - packetsTransitCount);
    $$('routes_packets_lost').nodeValue = packetsLostCount + percent(packetsLostCount);

    $$('routing_efficiency').nodeValue = num(routingEfficiencyPercent, '%');
  }

  function updateRoutesTable() {
    var tbody = $('sim_routes');

    // Remove all elements
    clearChildren(tbody);

    for (key in self.routes) {
      var route = self.routes[key];
      var tr = append(tbody, 'tr');
      var source_td = append(tr, 'td', route.sourceAddress.slice(-5));
      var target_td = append(tr, 'td', route.destinationAddress.slice(-5));
      append(tr, 'td', route.deployRate);
      append(tr, 'td', route.sendCount);
      append(tr, 'td', route.receivedCount);
      append(tr, 'td', num(route.efficiency * 100, '%'));

      source_td.title = route.sourceAddress
      target_td.title = route.destinationAddress;
    }

    var display = (tbody.children.length === 0);
    displayElement($('sim_no_routes'), display);
  }

  self.delRoutes = function delRoutes() {
    function delRoute(sourceNode, targetNode) {
      var id = sourceNode.mac + '=>' + targetNode.mac;
      delete routes[id];
      updateSimStatistics();
    }

    var intNodes = graph.getSelectedIntNodes();
    if (intNodes.length == 0) {
      alert('Select one source and at least one target node.');
      return;
    }

    var sourceNode = intNodes[0].o;
    for (var i = 1; i < intNodes.length; i += 1) {
      var targetNode = intNodes[i].o;
      delRoute(sourceNode, targetNode);
    }

    updateRoutesTable();
  }

  self.addRoutes = function addRoutes() {
    function addRoute(sourceAddress, destinationAddress) {
      var id = sourceAddress + '=>' + destinationAddress;
      if (!(id in self.routes)) {
        self.routes[id] = new Route(sourceAddress, destinationAddress, 1);
        updateSimStatistics();
      }
    }

    var intNodes = graph.getSelectedIntNodes();
    if (intNodes.length == 0) {
      alert('Select one source and at least one target node.');
      return;
    }

    var sourceAddress = intNodes[0].o.mac;
    for (var i = 1; i < intNodes.length; i += 1) {
      var destinationAddress = intNodes[i].o.mac;
      addRoute(sourceAddress, destinationAddress);
    }

    updateRoutesTable();
  }

  function deployPackets_() {
    var nodes = graph.getIntNodes();
    var nodeMap = {};

    nodes.forEach(function(e) {
      nodeMap[e.o.mac] = e.o;
    });

    for (var id in self.routes) {
      var route = self.routes[id];
      if (randomBoolean(route.deployRate)) {
        var src = route.sourceAddress;
        var dst = route.destinationAddress;
        if (src in nodeMap && dst in nodeMap) {
          nodeMap[src].incoming.push(
            new Packet(src, src, src, dst, self.simStep)
          );
          route.sendCount += 1;
        } else {
          console.log('Route does not exists: ' + src  + ' => ' + dst);
        }
      }
    }
  }

  self.deployPackets = function deployPackets() {
    if (isEmpty(self.routes)) {
      alert('No routes set on which to deploy packets.');
      return;
    }

    deployPackets_();
    updateRoutesTable();
    updateSimStatistics();

    graph.redraw();
  }

  function updateRouteEfficiency() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();
    var dijkstra = createDijkstra(intNodes, intLinks);

    for (var id in self.routes) {
      var route = self.routes[id];
      var sourceIntNode = intNodes.find(function(e) { return e.o.mac === route.sourceAddress; });
      var targetIntNode = intNodes.find(function(e) { return e.o.mac === route.destinationAddress; });
      var shortestDistance = dijkstra.getShortestDistance(sourceIntNode, targetIntNode);
      /*
      * Efficiency as rate of optimal step count weighted by rate of received packets.
      * This means packets in transit are counted as lost packets.
      */
      route.efficiency = (shortestDistance * route.receivedCount / route.receivedStepCount) * (route.receivedCount / route.sendCount);
    }
  }

  self.step = function step(steps_id, deploy_id) {
    // Record successful transmissions
    function updateRouteStats(packet) {
      var id = packet.sourceAddress + '=>' + packet.destinationAddress;
      if (id in self.routes) {
        var route = self.routes[id];
        route.receivedCount += 1;
        route.receivedStepCount += (self.simStep - packet.deployedAtStep);
      } else {
        console.log('Packet route not known: ' + id);
      }
    }

    // All links are bidirectional
    function getOtherIntNode(intLink, mac) {
      return (mac === intLink.target.o.mac) ? intLink.source : intLink.target;
    }

    function clonePacket(packet) {
      return JSON.parse(JSON.stringify(packet));
      /*
      var newPacket = new Packet();
      newPacket.copyFromOldImplementation(packet);
      return newPacket;
      */
    }

    var steps = getInteger(steps_id);
    var deployPacketsEnabled = getBoolean(deploy_id);

    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    // Map of internal node index to array of d3 link objects
    var connections = {};

    intNodes.forEach(function(n) {
      connections[n.index] = [];
    });

    intLinks.forEach(function(l) {
      connections[l.source.index].push(l);
      connections[l.target.index].push(l);
    });

    var simStartTime = (new Date()).getTime();

    // Cumulated packet count for each link
    var packetCount = {};

    // Simulation steps
    for (var step = 0; step < steps; step += 1) {
      self.simStep += 1;

      // Initialize packet count
      for (var i = 0; i < intLinks.length; i++) {
        var intLink = intLinks[i];
        packetCount[intLink.index] = 0;
      }

      // Randomize order
      shuffleArray(intNodes);

      // Step nodes
      for (var i = 0; i < intNodes.length; i++) {
        var intNode = intNodes[i];
        intNode.o.step();
      }

      // Propagate packets
      for (var i = 0; i < intNodes.length; i++) {
        var intNode = intNodes[i];
        var intLinks = connections[intNode.index];

        // Randomize order
        shuffleArray(intLinks);

        for (var p = 0; p < intNode.o.outgoing.length; p++) {
          var packet = intNode.o.outgoing[p];
          var isBroadcast = (packet.receiverAddress === BROADCAST_MAC);

          for (var j = 0; j < intLinks.length; j++) {
            var intLink = intLinks[j];
            var otherIntNode = getOtherIntNode(intLink, intNode.o.mac);

            if (isBroadcast || (packet.receiverAddress === otherIntNode.o.mac)) {
              if (isBroadcast) {
                // Necessary for broadcast
                packet = clonePacket(packet);
              }

              // Update count per node and channel to
              // simulate a shared transmission medium
              if (intLink.o.channel > 0) {
                intLinks.forEach(function(l) {
                  if (l.o.channel === intLink.o.channel) {
                    packetCount[l.index] += 1;
                  }
                });
              } else {
                packetCount[intLink.index] += 1;
              }

              if (intLink.o.transmit(packet, packetCount[intLink.index])) {
                otherIntNode.o.incoming.push(packet);
                // Final destination reached (and unicast)
                if (packet.destinationAddress === otherIntNode.o.mac) {
                  updateRouteStats(packet);
                }
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

      if (deployPacketsEnabled) {
        deployPackets_();
      }
    }

    self.simDuration = (new Date()).getTime() - simStartTime;

    updateRouteEfficiency();
    updateRoutesTable();
    updateSimStatistics();

    graph.redraw();
  }

  return self;
}