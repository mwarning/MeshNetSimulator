
function createFile(graph) {
  var self = {};

  function offerDownload(filename, text) {
    var a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    a.setAttribute('download', filename);

    a.style.display = 'none';
    document.body.appendChild(a);

    a.click();
    document.body.removeChild(a);
  }

  function readFileContent(id, callback) {
    var file = document.getElementById(id).files[0];
    if (file) {
      var r = new FileReader();
      r.onload = function(e) {
        callback(e.target.result);
      }
      r.readAsText(file);
    } else {
      alert('No file selected.');
    }
  }

  function reloadJavaScriptFile(id, src) {
    // Remove old script
    var e = document.getElementById(id);
    e.parentNode.removeChild(e);

    // Load new script
    var s = document.createElement('script');
    s.id = id;
    if (src.indexOf('\n') === -1) {
      s.src = src;
    } else {
      s.textContent = src;
    }
    document.head.appendChild(s);
  }

  self.reloadNodeImplementation = function reloadNodeImplementation (id) {
    function changeImpl() {
      var nodeMap = {};

      // Recreate all Node objects 
      var intNodes = graph.getIntNodes();
      for (var i = 0; i < intNodes.length; i++) {
        var intNode = intNodes[i];
        var oldNode = intNode.o;
        var newNode = new Node(oldNode.mac, oldNode.meta);

        // Copy over fields
        newNode.copyFromOldImplementation(oldNode);

        // Replace old node instance
        intNode.o = newNode;

        nodeMap[newNode.mac] = newNode;
      }

      graph.redraw();
    }

    if ($(id).files.length) {
      readFileContent(id, function(content) {
        reloadJavaScriptFile('node_js', content);
        changeImpl();
      });
    } else {
      reloadJavaScriptFile('node_js', 'src/node.js');
      changeImpl();
    }
  }

  self.reloadPacketImplementation = function reloadPacketImplementation () {
    function changeImpl() {
      function renewPackets(packets) {
        for (var i = 0; i < packets.length; i++) {
          var oldPacket = packets[i];
          var newPacket = new Packet(
            oldPacket.transmitterAddress,
            oldPacket.receiverAddress,
            oldPacket.sourceAddress,
            oldPacket.destinationAddress
          );

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

      graph.redraw();
    }

    if ($(id).files.length) {
      readFileContent(id, function(content) {
        reloadJavaScriptFile('packet_js', content);
        changeImpl();
      });
    } else {
      reloadJavaScriptFile('packet_js', 'src/packet.js');
      changeImpl();
    }
  }

  self.reloadLinkImplementation = function reloadLinkImplementation () {
    function changeImpl() {
      // Recreate all link objects
      var intLinks = graph.getIntLinks();
      for (var i = 0; i < intLinks.length; i++) {
        var intLink = intLinks[i];
        var oldLink = intLink.o;
        var newLink = new Link(oldLink.quality, oldLink.bandwidth, oldLink.channel);

        // Copy over fields
        newLink.copyFromOldImplementation(oldLink);

        // Replace old link instance
        intLink.o = newLink;
      }

      graph.redraw();
    }

    if ($(id).files.length) {
      readFileContent(id, function(content) {
        reloadJavaScriptFile('link_js', content);
        changeImpl();
      });
    } else {
      reloadJavaScriptFile('link_js', 'src/link.js');
      changeImpl();
    }
  }

  function saveNetJsonNetworkGraph() {
    var intNodes = graph.getIntNodes();
    var intLinks = graph.getIntLinks();
    var nodes = [];
    var links = [];

    intNodes.forEach(function(e) {
      var node = {
        id: e.o.mac
      };
      if (e.o.meta) {
        node.properties = e.o.meta;
      }
      nodes.push(node);
    });

    intLinks.forEach(function(e) {
      var link = {
        source: e.source.o.mac,
        target: e.target.o.mac,
        cost: (100 / e.o.quality)
      };

      if (e.o.meta) {
        link.properties = e.o.meta;
      }
      links.push(link);
    });

    var json = {
      type: "NetworkGraph",
      protocol: "",
      version: "",
      metric: "tq",
      timestamp: (new Date).toISOString().slice(0, 19),
      directed: false,
      multigraph: false,
      links: links,
      nodes: nodes
    };

    offerDownload('netjson.json', JSON.stringify(json));
  }

  function saveNetMeshViewerGraph() {
    var intLinks = graph.getIntLinks();
    var intNodes = graph.getIntNodes();
    var graphDataNodes = [];
    var graphDataLinks = [];

    intNodes.forEach(function(e) {
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
        vpn: finValue(e.o.meta, 'vpn', (e.o.bandwidth > 50))
      });
    });

    var json = {
      batadv: {
        directed: false,
        graph: [],
        multigraph: false,
        nodes: graphDataNodes,
        links: graphDataLinks
      },
      version: 1
    };

    offerDownload('graph.json', JSON.stringify(json));
  }

  function saveNetMeshViewerNodes() {
    var intNodes = graph.getIntNodes();
    var nodes = [];
    var paths = [
      ['firstseen'],
      ['flags', 'gateway'],
      ['flags', 'online'],
      ['lastseen'],
      ['nodeinfo', 'hardware', 'model'],
      ['nodeinfo', 'hostname'],
      ['nodeinfo', 'location', 'latitude'],
      ['nodeinfo', 'location', 'longitude'],
      ['nodeinfo', 'network', 'mac'],
      ['nodeinfo', 'node_id'],
      ['nodeinfo', 'owner', 'contact'],
      ['nodeinfo', 'software', 'firmware', 'release'],
      ['nodeinfo', 'system', 'role', 'site_code'],
      ['statistics', 'clients'],
      ['statistics', 'memory_usage'],
      ['statistics', 'rootfs_usage'],
      ['statistics', 'uptime']
    ];

    intNodes.forEach(function(e) {
      var meta = e.o.meta;
      var node = {};

      if (meta) {
        paths.forEach(function(path) {
          console.log('path: ' + path);
          var value = findValue(meta, path[path.length - 1], null);
          if (value !== null) {
            setValue(node, path, value);
          }
        });
      }

      nodes.push(node);
    });

    var json = {
      meta: {
        timestamp: (new Date).toISOString().slice(0, 19)
      },
      nodes: nodes,
      version: 2
    };

    offerDownload('nodes.json', JSON.stringify(json));
  }

  // Save graph data as meshviewer data
  self.saveFile = function saveFile(type_id) {
    var type = getText(type_id);

    if (type === 'netjson_netgraph') {
      saveNetJsonNetworkGraph();
    } else if (type === 'meshviewer_nodes') {
      saveNetMeshViewerNodes();
    } else if (type === 'meshviewer_graph') {
      saveNetJsonNetworkGraph();
    } else {
      alert('Unknown export type: ' + type);
    }
  }

  function loadNetJsonNetworkGraph(ret, nodes, links) {
    var nodeDict = {};
    for (var i in nodes) {
      var e = nodes[i];
      var mac = findValue(e, 'mac', e.id);
      var meta = e.properties;
      var node = {o: new Node(mac, meta)};
      ret.nodesArray.push(node);
      // Remember id => node mapping
      nodeDict[e.id] = node;
    }

    for (var i in links) {
      var e = links[i];
      // Source and target are strings
      var quality = ('cost' in e) ? (100 / e.cost) : 100;
      var bandwidth = findValue(e, 'vpn', false) ? 80 : 20;
      ret.linksArray.push({
        source: nodeDict[e.source],
        target: nodeDict[e.target],
        o: new Link(quality, bandwidth)
      });
    }
  }

  function loadMeshviewerNodes(ret, nodes) {
    for (var i in nodes) {
      var e = nodes[i];
      var mac = findValue(e, 'mac', null);
      if (mac) {
        ret.nodesArray.push({
          o: new Node(mac, e)
        });
      }
    }
  }

  function loadMeshviewerLinks(ret, nodes, links) {
    for (var i in links) {
      var e = links[i];
      // source and target are indices into nodes
      var sourceMAC = nodes[e.source].id;
      var targetMAC = nodes[e.target].id;
      var quality = e.tq ? (100 / e.tq) : 100;
      var bandwidth = e.vpn ? 80 : 20;

      ret.linksArray.push({
        source: {o: new Node(sourceMAC)},
        target: {o: new Node(targetMAC)},
        o: new Link(quality, bandwidth)
      });
    }
  }

  self.loadFile = function loadFile(file_id) {
    readFileContent(file_id, function(text) {
      var obj = JSON.parse(text);

      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return;
      }

      var ret = {
        nodesArray: [],
        linksArray: []
      };

      if (obj.type === "NetworkGraph") {
        // NetJSON NetworkGraph data
        loadNetJsonNetworkGraph(ret, obj.nodes, obj.links);
      } else if ('batadv' in obj) {
        // Meshviewer graph.json version 1
        loadMeshviewerLinks(ret, obj.batadv.nodes, obj.batadv.links);
      } else if ('nodes' in obj) {
        // Meshviewer nodes.json version 2
        loadMeshviewerNodes(ret, obj.nodes);
      } else {
        alert('Unrecognized input format.');
        return;
      }

      graph.addElements(ret.nodesArray, ret.linksArray);
    });
  }

  return self;
}
