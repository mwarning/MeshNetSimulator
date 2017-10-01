
function createSim(graph) {
  var self = {};

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
  }

  function updateSimStatistics() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    var packets_total = 0;
    intNodes.forEach(function(e) {
      packets_total += e.o.incoming.length + e.o.outgoing.length;
    });

    document.getElementById('packets_total').innerHTML = packets_total;
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

    // _very_ simple simulation
    var len = intNodes.length;
    for (var c = 0; c < steps; c++) {
      shuffleArray(intNodes);

      for (var i = 0; i < len; i++) {
        intNodes[i].o.preStep();
      }

      for (var i = 0; i < len; i++) {
        var intNode = intNodes[i];
        var intLinks = connections[intNode.index];
        for (var k = 0; k < intLinks.length; k++) {
          var intLink = intLinks[k];
          var intNeigh = (intLink.source.index !== intNode.index) ? intLink.source : intLink.target;
          // Call node with every connected node
          intNode.o.step(intNeigh.o);
        }
      }

      for (var i = 0; i < len; i++) {
        intNodes[i].o.postStep();
      }
    }

    updateSimStatistics();
  }

  return self;
}