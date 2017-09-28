
function createEdit(graph) {
  var self = {};
  var NODE_SPACING = 40;

  function genId(){
    var chars = 'abcdefghijklmnopqrstuvwxyz';
    var id = '';
    for (var i = 0; i < 4; i++) {
      id += chars.charAt(Math.round(Math.random() * (chars.length - 1)));
    }
    return id;
  }

  function getUniqueIdPrefix() {
    var id;
    do {
      id = genId();
    } while(!graph.isUniqueIdPrefix(id));
    return id;
  }

  self.addLine = function addLine (count, loop) {
    var id = getUniqueIdPrefix();
    var nodes = [];
    var links = [];

    if (count < 1 || isNaN(count)) {
      return;
    }

    for (var i = 0; i < count; i++) {
      nodes.push({x: (i * NODE_SPACING), y: 0, o: {id: (id + '#' + i)}});
      if (i > 0) {
        var source = nodes[i - 1];
        var target = nodes[i];
        links.push({source: source, target: target, o: {}});
      }
    }

    if (loop && (count > 2)) {
      var source = nodes[0];
      var target = nodes[count - 1];
      links.push({source: source, target: target, o: {}});
    }

    graph.addElements(nodes, links);
  }

  self.addStar = function addStar(count) {
    var id = getUniqueIdPrefix();
    var nodes = [];
    var links = [];

    if (count < 1 || isNaN(count)) {
      return;
    }

    nodes.push({x: 0, y: 0, o: {id: (id + 0)}});

    for (var i = 0; i < count; i++) {
      var a = i * 2 * Math.PI / count;
      var x = NODE_SPACING * Math.cos(a);
      var y = NODE_SPACING * Math.sin(a);
      nodes.push({x: x, y: y, o: {id: (id + (i + 1))}});

      var source = nodes[0];
      var target = nodes[nodes.length - 1];
      links.push({source: source, target: target, o: {}});
    }

    graph.addElements(nodes, links);
  }

  self.addLayer = function addLayer(x_count, y_count) {
    var id = getUniqueIdPrefix();
    var nodes = [];
    var links = [];

    if (x_count < 1 || y_count < 1 || isNaN(x_count) || isNaN(y_count)) {
      return;
    }

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < y_count; y++) {
        nodes.push({x: (x * NODE_SPACING), y: (y * NODE_SPACING * 0.8), o: {id: (id + '_' + x + 'x' + y)}});
        if (x > 0) {
          for (var ny = 0; ny < y_count; ny++) {
            var source = nodes[(x - 1) * y_count + ny];
            var target = nodes[nodes.length - 1];
            links.push({source: source, target: target, o: {}});
          }
        }
      }
    }

    graph.addElements(nodes, links);
  }

  self.addLattice = function addLattice(x_count, y_count) {
    var id = getUniqueIdPrefix();
    var nodes = [];
    var links = [];

    if (x_count < 1 || y_count < 1 || isNaN(x_count) || isNaN(y_count)) {
      return;
    }

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < y_count; y++) {
        nodes.push({x: (x * NODE_SPACING), y: (y * NODE_SPACING), o: {id: (id + '_' + x + 'x' + y)}});
      }
    }

    for (var x = 0; x < (x_count - 1); x++) {
      for (var y = 0; y < y_count; y++) {
        var source = nodes[x * y_count + y];
        var target = nodes[(x + 1) * y_count + y];
        links.push({source: source, target: target, o: {}});
      }
    }

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < (y_count - 1); y++) {
        var source = nodes[x * y_count + y];
        var target = nodes[x * y_count + (y + 1)];
        links.push({source: source, target: target, o: {}});
      }
    }

    graph.addElements(nodes, links);
  }

  self.setData = function setData(data) {
    var nodeDict = {};

    var nodes = data.graph.nodes.map(function (d) {
      var e = {};
      e.o = d;
      nodeDict[d.id] = e;
      return e;
    });

    var links = data.graph.links.map(function (d) {
      var e = {};
      e.o = d;
      e.source = nodeDict[d.source.id];
      e.target = nodeDict[d.target.id];
      return e;
    });

    graph.clear();
    graph.addElements(nodes, links);
  };

  return self;
}