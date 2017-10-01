
function createEdit(graph) {
  var self = {};

  var NODE_SPACING = 40;

  function getText(id) {
    return document.getElementById(id).value;
  }

  function getInteger(id) {
    return Math.floor(parseInt(document.getElementById(id).value, 10));
  }

  function getFloat(id) {
    return parseInt(document.getElementById(id).value, 10);
  }

  function getBoolean(id) {
    return document.getElementById(id).checked;
  }

  function readFileContent(id, callback) {
    var file = document.getElementById(id).files[0];
    if (file) {
      var r = new FileReader();
      r.onload = function(e) {
        callback(e.target.result);
      }
      r.readAsText(file);
    }
  }

  self.changeLinkQuality = function changeLinkQuality(type_id, value_id) {
    var type = getText(type_id);
    var value = getFloat(value_id);

    graph.getSelectedIntLinks().forEach(function(e) {
      if (type == 'random') {
        e.quality = 100 * Math.random();
      } else {
        e.quality = value;
      }
    });
    graph.redraw();
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
      nodes.push({x: (i * NODE_SPACING), y: 0});
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

    nodes.push({x: 0, y: 0, o: new Node(id + 0)});

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

  // Copy elements from 'from' to 'to' object, if elements
  // are in the same place of the structure of scheme
  function applyByScheme(from, to, scheme) {
    var path = [];
    function apply(from, scheme) {
      if (typeof scheme === 'object') {
        if (typeof from === 'object') {
          for (key in scheme) {
            if (key in from) {
              path.push(key);
              apply(from[key], scheme[key]);
              path.pop();
            }
          }
        }
      } else if ((typeof scheme === typeof from)) {
        var o = to;
        for (var i = 0; i < (path.length - 1); i++) {
          if (!(path[i] in o)) {
            var e = {};
            o[path[i]] = e;
            o = e;
          }
        }
        o[path[path.length - 1]] = from;
      }
    }
    apply(from, scheme);
    return to;
  }

  self.writeMeshViewerData = function writeMeshViewerData() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();

    var nodesDataNodes = [];
    var graphDataNodes = [];
    var graphDataLinks = [];

    var nodesScheme = {
      firstseen: '',
      flags: {gateway: false,  online: false },
      lastseen: '',
      nodeinfo: {
        hardware: { model: '' },
        hostname: '',
        location: {
          latitude: 0,
          longitude: 0
        },
        network: { mac: '' },
        node_id: '',
        owner: { contact: '' },
        software: { firmware: { release: '' } },
        system: { role: '', site_code: '' }
      },
      statistics: {
        clients: 0,
        memory_usage: 0,
        rootfs_usage: 0,
        uptime: 0
      }
    }

    intNodes.forEach(function(e) {
      //var o = applyByScheme(e.o.p, {}, nodesScheme);

      nodesDataNodes.push(e.o);
      graphDataNodes.push({
        id: e.o.mac,
        node_id: e.o.mac.replace(/:/g, '')
      });
    });

    intLinks.forEach(function(e) {
      graphDataLinks.push({
        bidirect: true,
        source: e.source.index,
        target: e.target.index,
        tq: e.tq,
        vpn: e.vpn
      });
    });

    var graph_json = {
      batadv: {
        directed: false,
        graph: [],
        multigraph: false,
        nodes: graphDataNodes,
        links: graphDataLinks
      },
      version: 1
    };

    var nodes_json = {
      meta: {
        timestamp: Date.now().format('DD.MM.Y HH:mm')
      },
      nodes: [],
      version: 2
    };
    // TODO: write files here
  }

  function addMeshViewerData(graphData, nodesData) {
    var nodeDict = {};
    var graphDataNodes = graphData.batadv.nodes;
    var graphDataLinks = graphData.batadv.links;
    var nodesDataNodes = nodesData.nodes;
    var nodes = [];
    var links = [];

    nodesDataNodes.forEach(function(e) {
      var mac = e.nodeinfo.network.mac;
      var node = new Node(mac);
      node.name = e.nodeinfo.hostname;
      node.clients = e.statistics.clients;
      nodeDict[mac] = {o: node};
    });

    graphDataNodes.forEach(function(e) {
      var mac = e.id;
      if (!(mac in nodeDict)) {
        nodeDict[mac] = {o: new Node(mac)};
      }
    });

    graphDataLinks.map(function(e) {
      var sid = graphDataNodes[e.source].id;
      var tid = graphDataNodes[e.target].id;
      links.push({source: nodeDict[sid], target: nodeDict[tid], quality: (100 / e.tq), vpn: e.vpn});
    });

    nodes = Object.values(nodeDict);
    addElements(nodes, links);
  }

  self.loadMeshViewerData = function loadMeshViewerData(graph_id, nodes_id) {
    readFileContent(graph_id, function(graph_content) {
      readFileContent(nodes_id, function(nodes_content) {
        var graphData = JSON.parse(graph_content);
        var nodesData = JSON.parse(nodes_content);
        if (typeof graphData == 'object' && typeof nodesData == 'object') {
          addMeshViewerData(graphData, nodesData);
        }
      });
    });
  }

  self.saveMeshViewerData = function saveMeshViewerData(format) {
    // TODO
  }

  return self;
}