
function createEdit(graph) {
  var self = {};

  function genId(){
    var hexDigits = '0123456789abcdef';
    var id = '';
    for (var i = 0; i < 2; i++) {
      id += hexDigits.charAt(Math.round(Math.random() * 15));
      id += hexDigits.charAt(Math.round(Math.random() * 15));
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

    for (var i = 0; i < count; i++) {
      nodes.push({x: (i * 15), y: 0, o: {id: (id + '#' + i)}});
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

    nodes.push({x: 0, y: 0, o: {id: (id + 0)}});

    for (var i = 1; i < count; i++) {
      var x = 20 * Math.cos(n * 2 * Math.PI/count);
      var y = 20 * Math.sin(n * 2 * Math.PI/count);
      nodes.push({x: x, y: y, o: {id: (id + i)}});

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

    for (var x = 0; x < x_count; i++) {
      for (var y = 0; y < y_count; i++) {
        nodes.push({x: (x * 20), y: (y * 15), o: {id: (id + x + 'x' + y)}});
        if (x > 0) {
          for (var ny = 0; ny < y_count; ny++) {
            var source = nodes[(x - 1) * ny];
            var target = nodes[x * y];
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

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < y_count; y++) {
        nodes.push({x: (x * 15), y: (y * 15), o: {id: (id + '_' + x + 'x' + y)}});
      }
    }

    for (var x = 0; x < (x_count - 1); x++) {
      for (var y = 0; y < y_count; y++) {
        var source = nodes[x * y];
        var target = nodes[(x + 1) * y];
        links.push({source: source, target: target, o: {}});
      }
    }

    for (var x = 0; < x_count; x++) {
      for (var y = 0; y < (y_count - 1); y++) {
        var source = nodes[x * y];
        var target = nodes[x * (y + 1)];
        links.push({source: source, target: target, o: {}});
      }
    }

    graph.addElements(nodes, links);
  }

  return self;
}