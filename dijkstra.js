 
function createDijkstra(intNodes, intLinks) {
  var self = {};

  self.intLinks = intLinks;
  self.intNodes = intNodes;

  function getLinkCost(link) {
    return link.quality / 100;
  };

  self.getShortestDistance = function getShortestDistance(sourceIntNode, targetIntNode) {
    console.log('find shortest path from ' + sourceIntNode.o.mac + ' to ' + targetIntNode.o.mac);

    var distances = {};
    //var predecessors = {};
    var neighbors_map = {};
    var Q = {};

    for (var i = 0; i < self.intNodes.length; i++) {
      var node = self.intNodes[i];
      distances[node.index] = Infinity;
      //predecessors[node.index] = null;
      Q[node.index] = node;
      neighbors_map[node.index] = [];
    }

    /*
    we need distance between two nodes
    and iterate over each neighbor
    */
    for (var i = 0; i < self.intLinks.length; i++) {
      var link = self.intLinks[i];
      neighbors_map[link.source.index].push(link);
      neighbors_map[link.target.index].push(link);
    }

    distances[sourceIntNode.index] = 0;

    //function getDistance(fromNode, toNode)

    function isEmpty(obj) {
      return (Object.keys(obj).length === 0);
    }

    function getSmallest() {
      var distance = Infinity;
      var found = undefined;
      //console.log(Object.keys(Q).length);
      for (var i in Q) {
        var node = Q[i];
        //console.log('i: ' + i + ', distance: ' + distances[node.index]);
        if (distances[node.index] <= distance) {
          found = node;
        }
      }
      return found;
    }

    function distance_update(u, v, link) {
      console.log('cost: ' + getLinkCost(link))
      var alt = distances[u.index] + getLinkCost(link);
      if (alt < distances[v.index]) {
        distances[v.index] = alt;
        //predecessors[v.index] = u;
      }
    }

    function getNeigh(link, u) {
      return (link.source.index === u.index) ? link.target : link.source;
    }

    while (!isEmpty(Q)) {
      var u = getSmallest();
      console.log('u: ' + u.o.mac);
      delete Q[u.index];
      var neighbors = neighbors_map[u.index];
      console.log(u.o.mac + ' has ' + neighbors.length + ' neighbors');
      for (var i = 0; i < neighbors.length; i++) {
        var link = neighbors[i];
        var v = getNeigh(link, u);
        if (v.index in Q) {
          console.log('check ' + v.o.mac);
          distance_update(u, v, link);
        }
      }
    }

    /*
    var path = [];
    var u = destination;
    console.log('destination: ' + u.o.mac);
    while (predecessors[u.index] !== null) {
      console.log('predecessor of ' + u.o.mac);
      u = predecessors[u.index];
      path.push(u.o.mac);
    }
    console.log('path: '  + path.reverse().join(' => '));
    */

    return distances[targetIntNode.index];
  }

  self.getShortestPath = function getShortestPath(sourceIntNode, targetIntNode) {
    return [];
  }

  return self;
}
