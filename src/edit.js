
function createEdit(graph) {
  var self = {};

  var NODE_SPACING = 40;

  self.setLinkParameters = function setLinkParameters(bandwidth_id, quality_id, quality_generation_id, channel_id) {
    var intLinks = graph.getSelectedIntLinks();
    var quality_generation = getText(quality_generation_id);
    var quality = getFloat(quality_id);
    var bandwidth = getFloat(bandwidth_id);
    var channel = getInt(channel_id);

    intLinks.forEach(function(e) {
      if (quality_generation == 'random') {
        e.o.quality = 100 * Math.random();
      } else {
        e.o.quality = quality;
      }
      e.o.bandwidth = bandwidth;
      e.o.channel = channel;
    });

    graph.redraw();
  }

  self.getLinkParameters = function getLinkParameters(bandwidth_id, quality_id, channel_id) {
    var intLinks = graph.getSelectedIntLinks();

    if (intLinks.length > 0) {
      var link = intLinks[intLinks.length - 1].o;
      $(bandwidth_id).value = link.bandwidth;
      $(quality_id).value = link.quality;
      $(quality_id).value = link.channel;
    } else {
      alert('Select at least one link.');
    }
  }

  self.addSingle = function addSingle () {
    graph.addElements([{x: 0, y: 0}], []);
  }

  self.addLine = function addLine (count, loop) {
    var nodes = [];
    var links = [];

    if (count < 1 || isNaN(count)) {
      return;
    }

    for (var i = 0; i < count; i++) {
      if (loop) {
        var r = NODE_SPACING * count / (2 * Math.PI);
        var a = i * 2 * Math.PI / count;
        nodes.push({x: (r * Math.sin(a)), y: (r * Math.cos(a))});
      } else {
        nodes.push({x: (i * NODE_SPACING), y: (1.1 * (i % 2))});
      }

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

  // Add lattice with horizontal and vertical neighbors
  self.addLattice4 = function addLattice4(x_count, y_count) {
    addLattice(x_count, y_count, false);
  }

  // Add lattice with horizontal, vertical and diagonal neighbors
  self.addLattice8 = function addLattice8(x_count, y_count) {
    addLattice(x_count, y_count, true);
  }

  function addLattice(x_count, y_count, diag) {
    var nodes = [];
    var links = [];

    if (x_count < 1 || y_count < 1 || isNaN(x_count) || isNaN(y_count)) {
      return;
    }

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < y_count; y++) {
        nodes.push({x: (x * NODE_SPACING), y: (y * NODE_SPACING)});
      }
    }

    function connect(x1, y1, x2, y2) {
      // Validate coordinates
      if ((x2 >= 0) && (x2 < x_count) && (y2 >= 0) && (y2 < y_count)) {
        var source = nodes[x1 * y_count + y1];
        var target = nodes[x2 * y_count + y2];
        links.push({source: source, target: target});
      }
    }

    for (var x = 0; x < x_count; x++) {
      for (var y = 0; y < y_count; y++) {
        if (diag) {
          //connect(x, y, x - 1, y - 1);
          //connect(x, y, x - 1, y + 1);
          connect(x, y, x + 1, y + 1);
          connect(x, y, x + 1, y - 1);
        }
        //connect(x, y, x - 1, y);
        //connect(x, y, x, y - 1);
        connect(x, y, x, y + 1);
        connect(x, y, x + 1, y);
      }
    }

    graph.addElements(nodes, links);
  }

  // Add randomized tree network with extra connections
  self.addTree = function addTree(count, extra = 0) {
    var nodes = [];
    var links = {};

    // Create bidirectional id
    function id(i, j) {
      return (i > j) ? ((i << 16) + j) : ((j << 16) + i);
    }

    // Connect random nodes
    for (var i = 0; i < count; i += 1) {
      var source = {};
      nodes.push(source);

      if (i > 0) {
        // Connect node with random previous node
        var j = i;
        while (j === i || id(i, j) in links) {
          j = Math.floor((Math.random() * nodes.length));
        }
        links[id(i, j)] = {source: nodes[i], target: nodes[j]};
      }
    }

    // Limit density to maximum amount of possible bidrectional links
    extra = Math.min(extra, (count * (count - 1)) / 2);

    // Interconnect part of the tree with additional connections
    for (var k = 0; k < extra; k += 1) {
      var i = 0;
      var j = 0;
      while (j === i || id(i, j) in links) {
        i = Math.floor((Math.random() * nodes.length));
        j = Math.floor((Math.random() * nodes.length));
      }
      links[id(i, j)] = {source: nodes[i], target: nodes[j]};
    }

    graph.addElements(nodes, Object.values(links));
  }

  return self;
}
