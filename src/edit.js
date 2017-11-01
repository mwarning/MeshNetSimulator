
function createEdit(graph) {
  var self = {};

  var NODE_SPACING = 40;

  self.setLinkParameters = function setLinkParameters(bandwidth_id, quality_id, quality_generation_id) {
    var intLinks = graph.getSelectedIntLinks();
    var quality_generation = getText(quality_generation_id);
    var quality = getFloat(quality_id);
    var bandwidth = getFloat(bandwidth_id);

    intLinks.forEach(function(e) {
      if (quality_generation == 'random') {
        e.quality = 100 * Math.random();
      } else {
        e.quality = quality;
      }
    });

    intLinks.forEach(function(e) {
      e.bandwidth = bandwidth;
    });

    graph.redraw();
  }

  self.getLinkParameters = function getLinkParameters(bandwidth_id, quality_id) {
    var intLinks = graph.getSelectedIntLinks();
    if (intLinks.length > 0) {
      var link = intLinks[intLinks.length - 1];
      $(bandwidth_id).value = link.bandwidth;
      $(quality_id).value = link.quality;
    } else {
      alert('Select at least one link.');
    }
  }

  self.addSingle = function addSingle () {
    graph.addElements([{}], []);
  }

  self.addLine = function addLine (count, loop) {
    var nodes = [];
    var links = [];

    count = getInteger(count);
    loop = getBoolean(loop);
    if (count < 1 || isNaN(count)) {
      return;
    }

    for (var i = 0; i < count; i++) {
      nodes.push({x: (i * NODE_SPACING), y: (1.1 * (i % 2))});
      if (i > 0) {
        var source = nodes[i - 1];
        var target = nodes[i];
        links.push({source: source, target: target});
      }
    }

    if (loop && (count > 2)) {
      var source = nodes[0];
      var target = nodes[count - 1];
      links.push({source: source, target: target});
    }

    graph.addElements(nodes, links);
  }

  self.addStar = function addStar(count) {
    var nodes = [];
    var links = [];

    count = getInteger(count);
    if (count < 1 || isNaN(count)) {
      return;
    }

    nodes.push({x: 0, y: 0});

    for (var i = 0; i < count; i++) {
      var a = i * 2 * Math.PI / count;
      var x = NODE_SPACING * Math.cos(a);
      var y = NODE_SPACING * Math.sin(a);
      nodes.push({x: x, y: y});

      var source = nodes[0];
      var target = nodes[nodes.length - 1];
      links.push({source: source, target: target});
    }

    graph.addElements(nodes, links);
  }

  /*
  self.addLayer = function addLayer(x_count, y_count) {
    var nodes = [];
    var links = [];

    x_count = getInteger(x_count);
    y_count = getInteger(y_count);

    if (x_count < 1 || y_count < 1 || isNaN(x_count) || isNaN(y_count)) {
      return;
    }

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < y_count; y++) {
        nodes.push({x: (x * NODE_SPACING), y: (y * NODE_SPACING * 0.8)});
        if (x > 0) {
          for (var ny = 0; ny < y_count; ny++) {
            var source = nodes[(x - 1) * y_count + ny];
            var target = nodes[nodes.length - 1];
            links.push({source: source, target: target});
          }
        }
      }
    }

    graph.addElements(nodes, links);
  }
  */

  self.addLattice = function addLattice(x_count, y_count) {
    var nodes = [];
    var links = [];

    x_count = getInteger(x_count);
    y_count = getInteger(y_count);

    if (x_count < 1 || y_count < 1 || isNaN(x_count) || isNaN(y_count)) {
      return;
    }

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < y_count; y++) {
        nodes.push({x: (x * NODE_SPACING), y: (y * NODE_SPACING)});
      }
    }

    for (var x = 0; x < (x_count - 1); x++) {
      for (var y = 0; y < y_count; y++) {
        var source = nodes[x * y_count + y];
        var target = nodes[(x + 1) * y_count + y];
        links.push({source: source, target: target});
      }
    }

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < (y_count - 1); y++) {
        var source = nodes[x * y_count + y];
        var target = nodes[x * y_count + (y + 1)];
        links.push({source: source, target: target});
      }
    }

    graph.addElements(nodes, links);
  }

  return self;
}