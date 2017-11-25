
function Route(sourceAddress, destinationAddress, deployRate = 1) {
  this.sourceAddress = sourceAddress;
  this.destinationAddress = destinationAddress;
  this.deployRate = deployRate;

  this.sendCount = 0;
  this.receivedCount = 0;
  this.receivedStepCount = 0;
  this.lostCount = 0;
  this.efficiency = NaN;

  this.reset = function reset() {
    this.sendCount = 0;
    this.receivedCount = 0;
    this.receivedStepCount = 0;
    this.lostCount = 0;
    this.efficiency = NaN;
  }
}

function createSim(graph) {
  var self = {};

  // Number of steps the simulation has run
  self.simStep = 0;

  // Duration of the last simulation run
  self.simDuration = 0;

  // Routes to deploy packet on
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

    self.simStep = 0;
    self.simDuration = 0;

    self.clearRouteCounter();

    graph.redraw();
  }

  function num(v, suffix = '') {
    return isNaN(v) ? '-' : (v.toFixed(1) + suffix);
  }

  function updateSimStatistics() {
    var routesSend = 0;
    var routesReceived = 0;
    var routesLost = 0;
    var routesCount = 0;
    var routesEfficiencySum = 0;
    var routesEfficiencyCount = 0;

    for (var id in self.routes) {
      var route = self.routes[id];
      routesCount += 1;
      routesSend += route.sendCount;
      routesReceived += route.receivedCount;
      routesLost += route.lostCount;

      if (!isNaN(route.efficiency)) {
        routesEfficiencySum += route.efficiency;
        routesEfficiencyCount += 1;
      }
    }

    var packets_unicast = 0;
    var packets_broadcast = 0;

    function countPackets(packets) {
      for (var j = 0; j < packets.length; j += 1) {
        var packet = packets[j];
        if ('deployedAtStep' in packet) {
          continue;
        }
        var isBroadcast = (packet.receiverAddress === BROADCAST_MAC);
        packets_unicast += !isBroadcast;
        packets_broadcast += isBroadcast;
      }
    }

    var intNodes = graph.getIntNodes();
    for (var i = 0; i < intNodes.length; i += 1) {
      countPackets(intNodes[i].o.incoming);
      countPackets(intNodes[i].o.outgoing);
    }

    // Convert to medium percent
    var routingEfficiencyPercent = 100 * routesEfficiencySum / routesEfficiencyCount;

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

    $$('packets_broadcast').nodeValue = withPercent(packets_broadcast, packets_unicast + packets_broadcast);
    $$('packets_unicast').nodeValue = withPercent(packets_unicast, packets_unicast + packets_broadcast);
    $$('packets_per_node').nodeValue = intNodes.length ? ((packets_unicast + packets_broadcast) / intNodes.length).toFixed(2) : '-';

    $$('routes_count').nodeValue = routesCount;
    $$('routes_packets_send').nodeValue = routesSend;
    $$('routes_packets_received').nodeValue = withPercent(routesReceived, routesSend);
    $$('routes_packets_lost').nodeValue = withPercent(routesLost, routesSend);

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

      // Hover text
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
          var packet = new Packet(src, src, src, dst);
          // For route efficiency calculation
          packet.deployedAtStep = self.simStep;
          nodeMap[src].incoming.push(packet);
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

  function updateRoutesEfficiency() {
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

  function packetOnRouteReceived(packet) {
    var id = packet.sourceAddress + '=>' + packet.destinationAddress;
    if (id in self.routes) {
      var route = self.routes[id];
      route.receivedCount += 1;
      route.receivedStepCount += (self.simStep - packet.deployedAtStep);
    }
  }

  function packetOnRouteLost(packet) {
    var id = packet.sourceAddress + '=>' + packet.destinationAddress;
    if (id in self.routes) {
      var route = self.routes[id];
      route.lostCount += 1;
    }
  }

  self.clearRouteCounter = function clearRouteCounter() {
    for (var id in self.routes) {
      self.routes[id].reset();
    }

    updateSimStatistics();
  }

  self.start = function start(steps, delay, deployPacketsEnabled) {
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

      if (deployPacketsEnabled) {
        deployPackets_();
      }

      // Initialize packet count
      for (var i = 0; i < intLinks.length; i++) {
        var intLink = intLinks[i];
        packetCount[intLink.index] = 0;
      }

      // Randomize order
      shuffleArray(intNodes);

      // Step nodes
      for (var i = 0; i < intNodes.length; i++) {
        var node = intNodes[i].o;
        node.step();
        node.incoming = [];
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
                // Packet transmitted
                otherIntNode.o.incoming.push(packet);
                if ('deployedAtStep' in packet) {
                  if (packet.destinationAddress === otherIntNode.o.mac) {
                    packetOnRouteReceived(packet);
                  }
                }
              } else {
                // Packet lost
                if ('deployedAtStep' in packet) {
                  packetOnRouteLost(packet);
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
    }

    self.simDuration = (new Date()).getTime() - simStartTime;

    updateRoutesEfficiency();
    updateRoutesTable();
    updateSimStatistics();

    graph.redraw();
  }

  return self;
}
