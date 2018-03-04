
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

  function readFileContent(file, callback) {
    if (file) {
      var r = new FileReader();
      r.onload = function(e) {
        callback(e.target.result);
      };
      r.onerror = function(e) {
        alert('Failed to load file: ' + file.name + ' (' + e.target.error.name + ')');
      };
      r.readAsText(file);
    } else {
      alert('No file selected.');
    }
  }

  function readUrlContent(url, callback) {
    if (url.length) {
      var request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if (request.readyState == 4) {
          if (request.status == 200) {
            callback(request.responseText, url);
          } else {
            var msg = request.statusText;
            alert('Failed to load URL: ' + url + ' (' + (msg.length ? msg : 'unknown') + ')');
          }
        }
      };
      request.open('GET', url, true);
      request.send();
    } else {
      alert('No URL selected.');
    }
  }

  function reloadJavaScriptFile(id, src) {
    // Remove script element
    var e = document.getElementById(id);
    e.parentNode.removeChild(e);

    // Create new script element
    var e = document.createElement('script');
    e.type = 'text/javascript';
    e.id = id;
    if (src.indexOf('\n') === -1) {
      e.src = src;
    } else {
      e.text = src;
    }
    document.head.appendChild(e);
  }

  self.reloadNodeImplementation = function reloadNodeImplementation (files, url) {
    function load(content) {
      function changeNodeImplementation() {
        var nodeMap = {};

        // Recreate all Node objects
        var intNodes = graph.getIntNodes();
        for (var i = 0; i < intNodes.length; i += 1) {
          var intNode = intNodes[i];
          var oldNode = intNode.o;
          var newNode = new Node(oldNode.mac, oldNode.meta);

          // Copy over fields
          if (typeof Node.prototype.copyFromOldImplementation !== 'function') {
            copyExistingFields(oldNode, newNode);
          } else {
            newNode.copyFromOldImplementation(oldNode);
          }

          // Replace old node instance
          intNode.o = newNode;

          nodeMap[newNode.mac] = newNode;
        }

        graph.redraw();
      }
      reloadJavaScriptFile('node_js', content);
      setTimeout(changeNodeImplementation, 10);
    }

    if (files.length && files[0].name === url) {
      readFileContent(files[0], load);
    } else {
      readUrlContent(url, load);
    }
  }

  self.reloadPacketImplementation = function reloadPacketImplementation (files, url) {
    function load(content) {
      function changePacketImplementation() {
        function renewPackets(packets) {
          for (var i = 0; i < packets.length; i += 1) {
            var oldPacket = packets[i];
            var newPacket = new Packet(
              oldPacket.transmitterAddress,
              oldPacket.receiverAddress,
              oldPacket.sourceAddress,
              oldPacket.destinationAddress
            );

            // Copy over fields
            if (typeof Packet.prototype.copyFromOldImplementation !== 'function') {
              copyExistingFields(oldPacket, newPacket);
            } else {
              newPacket.copyFromOldImplementation(oldPacket);
            }

            // Replace old packet instance
            packets[i] = newPacket;
          }
        }

        var intNodes = graph.getIntNodes();
        for (var i = 0; i < intNodes.length; i += 1) {
          var intNode = intNodes[i];
          renewPackets(intNode.o.incoming);
          renewPackets(intNode.o.outgoing);
        }

        graph.redraw();
      }
      reloadJavaScriptFile('packet_js', content);
      setTimeout(changePacketImplementation, 10);
    }

    if (files.length && files[0].name === url) {
      readFileContent(files[0], load);
    } else {
      readUrlContent(url, load);
    }
  }

  self.reloadLinkImplementation = function reloadLinkImplementation (files, url) {
    function load(content) {
      function changeLinkImplementation() {
        // Recreate all link objects
        var intLinks = graph.getIntLinks();
        for (var i = 0; i < intLinks.length; i += 1) {
          var intLink = intLinks[i];
          var oldLink = intLink.o;
          var newLink = new Link(oldLink.quality, oldLink.bandwidth, oldLink.channel);

          // Copy over fields
          if (typeof Link.prototype.copyFromOldImplementation !== 'function') {
            copyExistingFields(oldLink, newLink);
          } else {
            newLink.copyFromOldImplementation(oldLink);
          }

          // Replace old link instance
          intLink.o = newLink;
        }

        graph.redraw();
      }

      reloadJavaScriptFile('link_js', content);
      setTimeout(changeLinkImplementation, 10);
    }

    if (files.length && files[0].name === url) {
      readFileContent(files[0], load);
    } else {
      readUrlContent(url, load);
    }
  }

  function toJSON(obj, indent = -1) {
    if (indent === -1) {
      return JSON.stringify(obj);
    } else if (indent === -2) {
      return JSON.stringify(obj, undefined, '\t');
    } else {
      return JSON.stringify(obj, undefined, indent);
    }
  }

  function saveNetJsonNetworkGraph(indent) {
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
      type: 'NetworkGraph',
      protocol: '',
      version: '',
      metric: 'tq',
      timestamp: (new Date).toISOString().slice(0, 19),
      directed: false,
      multigraph: false,
      links: links,
      nodes: nodes
    };

    offerDownload('netjson.json', toJSON(json, indent));
  }

  function saveMeshViewer(indent) {
    var intLinks = graph.getIntLinks();
    var intNodes = graph.getIntNodes();
    var nodes = [];
    var links = [];

    var nodeDict = {};
    var timestamp = (new Date).toISOString().slice(0, 19);

    intNodes.forEach(function(e) {
      var meta = e.o.meta;
      var node = {
        firstseen: timestamp,
        lastseen: timestamp,
        is_online: true,
        is_gateway: false,
        clients: 0,
        clients_wifi24: 0,
        clients_wifi5: 0,
        clients_other: 0,
        rootfs_usage: 0,
        loadavg: 0,
        memory_usage: 0,
        uptime: '',
        gateway_nexthop: '',
        gateway: '',
        addresses: [],
        site_code: '',
        hostname: '',
        location: {longitude: 0, latitude: 0},
        firmware: {base: '', release: ''},
        autoupdater: {enabled: true, branch: ''},
        nproc: 1,
        model: '',
        vpn: false
      };

      if (meta) {
        // Replace field by data in meta
        for (var key in node) {
          node[key] = findValue(meta, key, node[key]);
        }
      }

      // Should not be replaced by data in meta
      node['mac'] = e.o.mac;
      node['node_id'] = e.o.mac.replace(/:/g, '');

      nodeDict[node.mac] = node;

      nodes.push(node);
    });

    intLinks.forEach(function(e) {
      var tq = (100 / e.o.quality);
      var source = e.source.o;
      var target = e.target.o;
      var source_tq = tq;
      var target_tq = tq;
      var type = findValue(e.o.meta, 'type', 'other'); //'wifi',"vpn", "other"

      links.push({
        type: type,
        source: nodeDict[source.mac].node_id,
        target: nodeDict[target.mac].node_id,
        source_tq: source_tq,
        target_tq: target_tq,
        source_mac: source.mac,
        target_mac: target.mac
      });
    });

    var json = {
      timestamp: timestamp,
      nodes: nodes,
      links: links
    };

    offerDownload('meshviewer.json', toJSON(json, indent));
  }

  function saveMeshViewerGraph(indent) {
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
        vpn: findValue(e.o.meta, 'vpn', (e.o.bandwidth > 50))
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

    offerDownload('graph.json', toJSON(json, indent));
  }

  function saveMeshViewerNodes(indent) {
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

    offerDownload('nodes.json', toJSON(json, indent));
  }

  // Save graph data as meshviewer data
  self.saveFile = function saveFile(type, indent) {
    if (type === 'netjson_netgraph') {
      saveNetJsonNetworkGraph(indent);
    } else if (type === 'meshviewer_nodes') {
      saveMeshViewerNodes(indent);
    } else if (type === 'meshviewer_graph') {
      saveMeshViewerGraph(indent);
    } else if (type === 'meshviewer') {
      saveMeshViewer(indent);
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

    // Get highest/lowest cost
    var lowestCost = +Infinity;
    var highestCost = -Infinity;
    for (var i in links) {
      var e = links[i];
      if ('cost' in e) {
        if (e.cost < lowestCost) {
          lowestCost = e.cost;
        }
        if (e.cost > highestCost) {
          highestCost = e.cost;
        }
      }
    }

    var costScale = function(v) {
      if (highestCost == lowestCost) {
        return 100;
      }
      return 100 - 100 * (v - lowestCost) / (highestCost - lowestCost);
    };

    for (var i in links) {
      var e = links[i];
      // Source and target are strings
      var quality = ('cost' in e) ? costScale(e.cost) : 100;
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
        var node = {o: new Node(mac, e)};
        ret.nodesArray.push(node);
      }
    }
  }

  function loadMeshviewerData(ret, nodes, links) {
    var nodeDict = {};

    for (var i in nodes) {
      var e = nodes[i];
      var mac = findValue(e, 'mac', null);
      if (mac) {
        var node = {o: new Node(mac, e)};
        nodeDict[e.node_id] = node;
        ret.nodesArray.push(node);
      }
    }

    for (var i in links) {
      var e = links[i];
      var source = nodeDict[e.source];
      var target = nodeDict[e.target];
      var quality = 100 / ((e.source_tq + e.target_tq) / 2);
      var bandwidth = (e.type === 'wifi') ? 20 : 80;

      ret.linksArray.push({
        source: source,
        target: target,
        o: new Link(quality, bandwidth)
      });
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

  self.loadData = function loadData(files, url) {
    function load(text) {
      var obj = JSON.parse(text);

      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return;
      }

      var ret = {
        nodesArray: [],
        linksArray: []
      };

      if (obj.type === 'NetworkGraph') {
        // NetJSON NetworkGraph data
        loadNetJsonNetworkGraph(ret, obj.nodes, obj.links);
      } else if ('nodes' in obj && 'links' in obj) {
        // Meshviewer mesviewer.json version 3
        loadMeshviewerData(ret, obj.nodes, obj.links);
      } else if ('batadv' in obj) {
        // Meshviewer graph.json version 1
        loadMeshviewerLinks(ret, obj.batadv.nodes, obj.batadv.links);
      } else if ('nodes' in obj) {
        // Meshviewer nodes.json version 2
        loadMeshviewerNodes(ret, obj.nodes, null);
      } else {
        alert('Unrecognized input format.');
        return;
      }

      graph.addElements(ret.nodesArray, ret.linksArray);
    }

    if (files.length && files[0].name === url) {
      readFileContent(files[0], load);
    } else {
      readUrlContent(url, load);
    }
  }

  return self;
}
