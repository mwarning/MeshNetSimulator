
function createSim(graph) {
  var self = {};
  sim_steps_total = 0;

  function getInteger(id) {
    return Math.floor(parseInt(document.getElementById(id).value, 10));
  }

  function shuffleArray(a) {
    for (let i = a.length; i; i--) {
      let j = Math.floor(Math.random() * i);
      [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
  }

  self.reset = function reset() {
    graph.getIntNodes().forEach(function(e) {
      e.o.reset();
    });
    sim_steps_total = 0;
    updateSimStatistics();
  }

  function updateSimStatistics() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    var sim_packets_total = 0;
    intNodes.forEach(function(e) {
      sim_packets_total += e.o.incoming.length + e.o.outgoing.length;
    });

    document.getElementById('sim_packets_total').innerHTML = sim_packets_total;
    document.getElementById('sim_steps_total').innerHTML = sim_steps_total;
  }

  self.addPacketRoute = function addPacketRoute() {
    var intNodes = graph.getSelectedIntNodes();
    if (intNodes.length == 2) {
      var sourceNode = intNodes[0].o;
      var targetNode = intNodes[1].o;
      sourceNode.addNewPacket(targetNode.mac, "hello");
      graph.redraw();
    } else {
      alert('Select a source and target node.');
    }
  }

  self.step = function step(steps_id) {
    var steps = getInteger(steps_id);
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    // Map node id to array of link objects
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

    // _very_ simple simulation
    var len = intNodes.length;
    for (var c = 0; c < steps; c++) {
      shuffleArray(intNodes);

      for (var i = 0; i < len; i++) {
        var intNode = intNodes[i];
        var intLinks = connections[intNode.index];
        // send outgoing packets over links
        for (var p = 0; p < intNode.o.outgoing.length; p++) {
          var packet = intNode.o.outgoing[p];
          // console.log('send packet of ' + intNode.o.mac + ' to ' + packet.targetMAC);
          if (packet.targetMAC == '00:00:00:00:00:00') {
            // Send to all neighbors
            for (var k = 0; k < intLinks.length; k++) {
              var intLink = intLinks[k];
              var intNeigh = (intLink.source.index !== intNode.index) ? intLink.source : intLink.target;
              intNeigh.o.incoming.push(clonePacket(packet));
            }
          } else {
            // Send to one neighbor
            for (var k = 0; k < intLinks.length; k++) {
              var intLink = intLinks[k];
              var intNeigh = (intLink.source.index !== intNode.index) ? intLink.source : intLink.target;
              if (packet.targetMAC == intNeigh.o.mac) {
                // console.log('send packet from ' + intNode.o.mac + ' to ' + intNeigh.o.mac);
                intNeigh.o.incoming.push(packet);
                break;
              }
            };
          }
        }
        intNode.o.outgoing = [];
        intNode.o.step();
      }
    }

    sim_steps_total += steps;

    graph.redraw();
    updateSimStatistics();
  }

  return self;
}