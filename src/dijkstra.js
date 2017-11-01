/*
* Find the shortest path on a graph based on the Dijkstra algorithm.
* Needs to be recreated if the graph changes.
*/

function createDijkstra(intNodes, intLinks) {
  var self = {};

  self.intLinks = intLinks;
  self.intNodes = intNodes;

  // Build lookup map for neighbors
  function createNeighborsMap(intNodes, intLinks) {
    var m = {};
    intNodes.forEach(function(node) {
      m[node.index] = [];
    });

    intLinks.forEach(function(link) {
      m[link.source.index].push(link);
      m[link.target.index].push(link);
    });
    return m;
  }

  self.neighbors_map = createNeighborsMap(self.intNodes, self.intLinks);
  self.distances_cache = {};
  self.predecessors_cache = {};

  function getLinkCost(link) {
    return 1;
  };

  self.getShortestDistance = function getShortestDistance(sourceIntNode, targetIntNode) {
    if (!(sourceIntNode.index in self.distances_cache)) {
      calculateShortestPathData(sourceIntNode);
    }

    return self.distances_cache[sourceIntNode.index][targetIntNode.index];
  }

  self.getShortestPath = function getShortestPath(sourceIntNode, targetIntNode) {
    if (!(sourceIntNode.index in self.predecessors_cache)) {
      calculateShortestPathData(sourceIntNode);
    }

    var predecessors = self.predecessors_cache[sourceIntNode.index];
    var path = [];
    var u = targetIntNode;
    while (predecessors[u.index] !== null) {
      u = predecessors[u.index];
      path.push(u.o.mac);
    }
    return path;
  }

  function calculateShortestPathData(sourceIntNode) {
    var distances = {};
    var predecessors = {};
    var Q = {};

    for (var i = 0; i < self.intNodes.length; i++) {
      var node = self.intNodes[i];
      distances[node.index] = Infinity;
      predecessors[node.index] = null;
      Q[node.index] = node;
    }

    distances[sourceIntNode.index] = 0;

    function getSmallest() {
      var node = undefined;
      var distance = Infinity;

      for (var i in Q) {
        var n = Q[i];
        var d = distances[n.index];
        if (d <= distance) {
          node = n;
          distance = d;
        }
      }

      return node;
    }

    function distance_update(u, v, link) {
      var alt = distances[u.index] + getLinkCost(link);
      if (alt < distances[v.index]) {
        distances[v.index] = alt;
        predecessors[v.index] = u;
      }
    }

    // Get other node
    function getNeigh(link, u) {
      return (link.source.index === u.index) ? link.target : link.source;
    }

    while (!isEmpty(Q)) {
      var u = getSmallest();
      delete Q[u.index];
      var neighbors = self.neighbors_map[u.index];
      for (var i = 0; i < neighbors.length; i++) {
        var link = neighbors[i];
        var v = getNeigh(link, u);
        if (v.index in Q) {
          distance_update(u, v, link);
        }
      }
    }

    // Set cache
    self.distances_cache[sourceIntNode.index] = distances;
    self.predecessors_cache[sourceIntNode.index] = predecessors;
  }

  return self;
}
