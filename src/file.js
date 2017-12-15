
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

  // Save graph data as meshviewer data
  self.saveFile = function saveFile() {
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
        timestamp: (new Date).toISOString().slice(0, 19)
      },
      nodes: [],
      version: 2
    };

    offerDownload('graph.json', JSON.stringify(graph_json));
    offerDownload('nodes.json', JSON.stringify(nodes_json));
  }

  self.loadFile = function loadFile(file_id) {
    function loadNetJsonNetworkGraph(ret, nodes, links) {
      var nodeDict = {};
      for (var i in nodes) {
        var e = nodes[i];
        var mac = findValue(e, 'mac', e.id);
        var node = {o: new Node(mac, e)};
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
