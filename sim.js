
function Route(sourceMAC, targetMAC, rate = 0, expectedSteps = 100) {
  this.sourceMAC = sourceMAC;
  this.targetMAC = targetMAC;
  this.rate = rate;
  this.expectedStepCount = expectedSteps; // TODO: use dijkstra

  this.sendCount = 0;
  this.receivedCount = 0;
  this.receivedStepCount = 0;

  this.reset = function reset() {
    this.sendCount = 0;
    this.receivedCount = 0;
    this.receivedStepCount = 0;
  }
}

function createSim(graph) {
  var self = {};

  self.sim_steps_total = 0;
  self.sim_duration = 0;
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

    for (var id in routes) {
      routes[id].reset();
    }

    self.sim_steps_total = 0;
    self.sim_duration = 0;

    updateSimStatistics();
  }

  function updateSimStatistics() {
    console.log('updateSimStatistics');
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();
    var dijkstra = createDijkstra(intNodes, intLinks);

    var packetsBroadcastCount = 0;
    var packetsUnicastCount = 0;
    var routesSendCount = 0;
    var routesReceivedCount = 0;
    var routesTransitCount = 0;
    var routesCount = 0;

    function countPackets(packet) {
      if (packet.destinationMAC === BROADCAST_MAC) {
        packetsBroadcastCount += 1;
      } else {
        packetsUnicastCount += 1;
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
      routesSendCount += route.sendCount;
      routesReceivedCount += route.receivedCount;

      var sourceIntNode = intNodes.find(function(e) { return e.o.mac === route.sourceMAC; });
      var targetIntNode = intNodes.find(function(e) { return e.o.mac === route.targetMAC; });
      var distance = dijkstra.getShortestDistance(sourceIntNode, targetIntNode);
      //var path = dijkstra.getShortestPath(sourceIntNode, targetIntNode);
      //var expectedRouteSteps = distances[target]; // => route.expectedRouteSteps;
      console.log('Route ' + route.sourceMAC + ' => ' + route.targetMAC
        + ': distance: ' + distance);
        //+ ', send: ' + route.sendCount
        //+ ', received: ' + route.receivedCount);


      // send, received, expected_travel_steps
      //var efficiencyPercent = 1 - (route.receivedStepCount / (route.sendCount * distance));
      //var arrivalPercent = (route.sendCount - route.receivedCount) / route.sendCount;
    }

    $('sim_steps_total').innerHTML = self.sim_steps_total;
    $('sim_duration').innerHTML = (self.sim_duration / 1000);

    function inPercent(value) {
      var p = (100 * value / routesSendCount);
      return isNaN(p) ? '' : (' (' + p + '%)');
    };

    var routesLostCount = (routesSendCount - routesReceivedCount - routesTransitCount);

    $('packets_unicast_count').innerHTML = packetsUnicastCount;
    $('packets_broadcast_count').innerHTML = packetsBroadcastCount;

    $('routes_count').innerHTML = routesCount;
    $('routes_packets_send').innerHTML = routesSendCount;
    $('routes_packets_received').innerHTML = routesReceivedCount + inPercent(routesReceivedCount);
    $('routes_packets_transit').innerHTML = routesTransitCount + inPercent(routesTransitCount);
    $('routes_packets_lost').innerHTML = routesLostCount + inPercent(routesLostCount);
  }

  function append(parent, name, content = '') {
    var e = document.createElement(name);
    if (content.length) {
      var text = document.createTextNode(content)
      e.appendChild(text);
    }
    parent.appendChild(e);
    return e;
  }

  function updateRoutesTable() {
    console.log('updateRoutesTable');
    var tbody = document.getElementById('sim_routes');

    // Remove all elements
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    for (key in self.routes) {
      var route = self.routes[key];
      var tr = append(tbody, 'tr');
      append(tr, 'td', route.sourceMAC);
      append(tr, 'td', route.targetMAC);
      append(tr, 'td', route.rate);
      append(tr, 'td', route.sendCount);
      append(tr, 'td', route.receivedCount);
      append(tr, 'td', route.receivedStepCount);
    }
  }

  self.delRoutes = function delRoutes() {
    function delRoute(sourceNode, targetNode) {
      var id = sourceNode.mac + '=>' + targetNode.mac;
      delete routes[id];
      updateSimStatistics();
    }

    var intNodes = graph.getSelectedIntNodes();
    if (intNodes.length == 0) {
      alert('Select at least a source and one target node.');
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
    console.log('addRoutes');
    function addRoute(sourceNode, targetNode) {
      var id = sourceMAC + '=>' + targetMAC;
      console.log('route: ' + id);
      self.routes[id] = new Route(sourceMAC, targetMAC, 1);
      updateSimStatistics();
    }

    var intNodes = graph.getSelectedIntNodes();
    if (intNodes.length == 0) {
      alert('Select at least a source and one target node.');
      return;
    }

    var sourceMAC = intNodes[0].o.mac;
    for (var i = 1; i < intNodes.length; i += 1) {
      var targetMAC = intNodes[i].o.mac;
      addRoute(sourceMAC, targetMAC);
    }
    updateRoutesTable();
  }

  function deployPackets_() {
    console.log('deployPacketsOnRoutes');
    var nodes = graph.getIntNodes();
    var nodeMap = {};
    nodes.forEach(function(e) {
      nodeMap[e.o.mac] = e.o;
    });

    for (var id in self.routes) {
      var route = self.routes[id];
      if (randomBoolean(route.rate)) {
        var srcMAC = route.sourceMAC;
        var dstMAC = route.targetMAC;
        //console.log('add packet: ' + srcMAC + ' => ' + dstMAC);
        nodeMap[srcMAC].incoming.push(
          new Packet(srcMAC, srcMAC, srcMAC, dstMAC, self.sim_steps_total)
        );
        route.sendCount += 1
      }
    }
  }

  self.deployPackets = function deployPackets() {
    deployPackets_();
    graph.redraw();
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
    });

    function clonePacket(packet) {
      return JSON.parse(JSON.stringify(packet));
    }

    // Get other part of the link
    function getNeighbor(intLink, intNode) {
      return (intLink.source.index !== intNode.index) ? intLink.source : intLink.target;
    }

    // console.log('steps: ' + steps + ' (all ' + self.sim_steps_total + ')');

    var date = new Date();
    var simStartTime = date.getTime();

    // _very_ simple simulation
    var len = intNodes.length;
    for (var step = 0; step < steps; step += 1) {
      self.sim_steps_total += 1;

      if (deployPacketsEnabled) {
        deployPackets_();
      }

      shuffleArray(intNodes);

      // Step nodes
      for (var i = 0; i < len; i++) {
        var intNode = intNodes[i];
        intNode.o.step();
      }

      // Move packets over links
      for (var i = 0; i < len; i++) {
        var intNode = intNodes[i];
        var intLinks = connections[intNode.index];
        // Send outgoing packets over links
        for (var p = 0; p < intNode.o.outgoing.length; p++) {
          var packet = intNode.o.outgoing[p];
          if (packet.dstMAC === BROADCAST_MAC) {
            // Handle broadcast packet
            // Send to all neighbors
            for (var k = 0; k < intLinks.length; k++) {
              var intLink = intLinks[k];
              var intNeigh = getNeighbor(intLink, intNode);
              packet = clonePacket(packet);

              if (randomBoolean(intLink.quality / 100)) {
                intNeigh.o.incoming.push(packet);
              } else {
                // Packet is lost
              }
            }
          } else {
            // Handle unicast packet
            var targetFound = false;
            // Send to one neighbor
            for (var k = 0; k < intLinks.length; k++) {
              var intLink = intLinks[k];
              var intNeigh = getNeighbor(intLink, intNode);
              //console.log("check neighbor: " + packet.dstMAC + ' => ' + intNeigh.o.mac);
              if (packet.dstMAC === intNeigh.o.mac) {
                targetFound = true;
                if (randomBoolean(intLink.quality / 100)) {
                  intNeigh.o.incoming.push(packet);
                  // Update route stats if packet reached final destination
                  if (packet.destinationMAC === intNeigh.o.mac) {
                    var id = packet.originatorMAC + '=>' + packet.destinationMAC;
                    if (id in self.routes) {
                      var route = self.routes[id];
                      route.receivedCount += 1;
                      route.receivedStepCount += (self.sim_steps_total - packet.step);
                    }
                  }
                }
                break;
              }

              if (!targetFound) {
                console.log('packet lost because next target not found: ' + packet.dstMAC);
              }
            }
          }
        }

        // All packets should have been handled
        intNode.o.outgoing = [];
      }
    }

    self.sim_duration = date.getTime() - simStartTime;

    updateSimStatistics();

    graph.redraw();
  }

  return self;
}