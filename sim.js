
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
    return isNaN(v) ? '-' : (v.toFixed(2) + suffix);
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
      return isNaN(p) ? '' : (' (' + p.toFixed(2) + '%)');
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
        nodeMap[src].incoming.push(
          new Packet(src, src, src, dst, self.simStep)
        );
        route.sendCount += 1
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

  // Get other part of the link
  function getNeighbor(intLink, intNode) {
    return (intLink.source.index !== intNode.index) ? intLink.source : intLink.target;
  }

  // Decide if a transmission is successful based on link properties
  function isTransmissionSuccessful(intLink) {
    var n = 100 * (Math.min(intLink.packetCount, intLink.bandwidth) / intLink.bandwidth);
    return ((intLink.quality / 100) * Math.pow(0.999, n)) < Math.random();
  }

  function propagateBroadcastPacket(packet, intNode, intLinks) {
    function clonePacket(packet) {
      return JSON.parse(JSON.stringify(packet));
    }

    // Send cloned packet to all neighbors
    for (var k = 0; k < intLinks.length; k++) {
      var intLink = intLinks[k];
      var intNeigh = getNeighbor(intLink, intNode);

      intLink.packetCount += 1;
      if (isTransmissionSuccessful(intLink)) {
        packet = clonePacket(packet);
        intNeigh.o.incoming.push(packet);
      }
    }
  }

  function propagateUnicastPacket(packet, intNode, intLinks) {
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

    // Send to one neighbor
    for (var k = 0; k < intLinks.length; k++) {
      var intLink = intLinks[k];
      var intNeigh = getNeighbor(intLink, intNode);

      if (packet.receiverAddress === intNeigh.o.mac) {
        intLink.packetCount += 1;
        if (isTransmissionSuccessful(intLink)) {
          intNeigh.o.incoming.push(packet);
          // Final destination reached
          if (packet.destinationAddress === intNeigh.o.mac) {
            updateRouteStats(packet);
          }
        }
        break;
      }
    }
  }

  self.step = function step(steps_id, deploy_id) {
    var steps = getInteger(steps_id);
    var deployPacketsEnabled = getBoolean(deploy_id);

    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    // Map internal node index to array of link objects
    var connections = {};

    intNodes.forEach(function(n) {
      connections[n.index] = [];
    });

    intLinks.forEach(function(l) {
      connections[l.source.index].push(l);
      connections[l.target.index].push(l);
      // Count packets over the link for packet loss calculation
      l.packetCount = 0;
    });

    var date = new Date();
    var simStartTime = date.getTime();

    // Simulation steps
    var len = intNodes.length;
    for (var step = 0; step < steps; step += 1) {
      self.simStep += 1;

      if (deployPacketsEnabled) {
        deployPackets_();
      }

      // Guarantee random handling
      shuffleArray(intNodes);

      // Step nodes
      for (var i = 0; i < len; i++) {
        var intNode = intNodes[i];
        intNode.o.step();
      }

      // Propagate packets
      for (var i = 0; i < len; i++) {
        var intNode = intNodes[i];
        var intLinks = connections[intNode.index];
        for (var p = 0; p < intNode.o.outgoing.length; p++) {
          var packet = intNode.o.outgoing[p];
          if (packet.receiverAddress === BROADCAST_MAC) {
            propagateBroadcastPacket(packet, intNode, intLinks);
          } else {
            propagateUnicastPacket(packet, intNode, intLinks);
          }
        }

        // All packets should have been handled
        intNode.o.outgoing = [];
      }
    }

    self.simDuration = date.getTime() - simStartTime;

    updateRouteEfficiency();
    updateRoutesTable();
    updateSimStatistics();

    graph.redraw();
  }

  return self;
}