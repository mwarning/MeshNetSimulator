
function createFile(graph) {
  var self = {};

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

  function reloadJavaScriptFile(src) {
    // Remove old script
    var e = Array.from(document.head.getElementsByTagName('script')).find(function(e) {
      return e.src.endsWith(src);
    });
    e.parentNode.removeChild(e);

    // Load new script
    var s = document.createElement('script');
    s.src = src;
    document.head.appendChild(s);
  }

  self.reloadNodeImplementation = function reloadNodeImplementation () {
    reloadJavaScriptFile('src/node.js');

    var nodeMap = {};

    // Recreate all Node objects 
    var intNodes = graph.getIntNodes();
    for (var i = 0; i < intNodes.length; i++) {
      var intNode = intNodes[i];
      var oldNode = intNode.o;
      var newNode = new Node();

      // Copy over fields
      newNode.copyFromOldImplementation(oldNode);

      // Replace old node instance
      intNode.o = newNode;

      nodeMap[newNode.mac] = newNode;
    }
  }

  self.reloadPacketImplementation = function reloadPacketImplementation () {
    reloadJavaScriptFile('src/packet.js');

    function renewPackets(packets) {
      for (var i = 0; i < packets.length; i++) {
        var oldPacket = packets[i];
        var newPacket = new Packet();

        // Copy over fields
        newPacket.copyFromOldImplementation(oldPacket);

        // Replace old packet instance
        packets[i] = newPacket;
      }
    }

    var intNodes = graph.getIntNodes();
    for (var i = 0; i < intNodes.length; i++) {
      var intNode = intNodes[i];
      renewPackets(intNode.incoming);
      renewPackets(intNode.outgoing);
    }
  }

  self.reloadLinkImplementation = function reloadLinkImplementation () {
    reloadJavaScriptFile('src/link.js');

    // Recreate all node objects
    var intLinks = graph.getIntLinks();
    for (var i = 0; i < intLinks.length; i++) {
      var intLink = intLinks[i];
      var oldLink = intLink.o;
      var newLink = new Node();

      // Copy over fields
      newLink.copyFromOldImplementation(oldLink);

      // Replace old link instance
      intLink.o = newLink;
    }
  }

  // Copy elements from 'from' to 'to' object, if elements
  // are in the same place of the structure of scheme
  function applyByScheme(from, to, scheme) {
    var path = [];
    function copy(from, scheme) {
      if (typeof scheme === 'object') {
        if (typeof from === 'object') {
          for (key in scheme) {
            if (key in from) {
              path.push(key);
              copy(from[key], scheme[key]);
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

    copy(from, scheme);
    return to;
  }

  self.saveMeshViewerData = function saveMeshViewerData() {
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
      var o = applyByScheme(e.o.meta, {}, nodesScheme);

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
        tq: (100 / e.o.quality),
        vpn: (e.o.bandwidth > 50)
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

  self.loadMeshViewerData = function loadMeshViewerData(graph_id, nodes_id) {
    readFileContent(graph_id, function(graph_content) {
      readFileContent(nodes_id, function(nodes_content) {
        var graphData = JSON.parse(graph_content);
        var nodesData = JSON.parse(nodes_content);

        if (typeof graphData !== 'object' || typeof nodesData !== 'object') {
          return;
        }

        var nodeDict = {};
        var graphDataNodes = graphData.batadv.nodes;
        var graphDataLinks = graphData.batadv.links;
        var nodesDataNodes = nodesData.nodes;
        var nodes = [];
        var links = [];

        nodesDataNodes.forEach(function(e) {
          var mac = e.nodeinfo.network.mac;
          var node = new Node(mac, e);
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
          var source = nodeDict[sid];
          var target = nodeDict[tid];
          links.push({
            source: source,
            target: target,
            o: new Link(100 / e.tq, e.vpn ? 80 : 20)
          });
        });

        nodes = Object.values(nodeDict);
        graph.addElements(nodes, links);
      });
    });
  }

  return self;
}
