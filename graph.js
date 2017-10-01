
function createGraph(graph_id) {
  var draw = createDraw();
  var math = createMath();
  var d3Interpolate = d3;
  var d3Zoom = d3;
  var d3Force = d3;
  var d3Drag = d3;
  var d3Selection = d3;
  var d3Timer = d3;
  var d3Ease = d3;
  var animationEnabled = true; //TODO: replace...

  var self = this;
  var lastClick = [0, 0];
  var el = document.getElementById(graph_id);
  var canvas;
  var ctx;
  var force;
  var forceLink;

  var transform = d3Zoom.zoomIdentity;
  var intNodes = [];
  var intLinks = [];
  var movetoTimer;

  var NODE_RADIUS_DRAG = 10;
  var NODE_RADIUS_SELECT = 15;
  var LINK_RADIUS_SELECT = 12;
  var ZOOM_ANIMATE_DURATION = 350;

  var ZOOM_MIN = 1 / 8;
  var ZOOM_MAX = 3;

  var FORCE_ALPHA = 0.3;

  draw.setTransform(transform);

  function resizeCanvas() {
    canvas.width = el.offsetWidth;
    canvas.height = el.offsetHeight;
    draw.setMaxArea(canvas.width, canvas.height);
  }

  function transformPosition(p) {
    transform.x = p.x;
    transform.y = p.y;
    transform.k = p.k;
  }

  function moveTo(pos, forceMove) {
    clearTimeout(movetoTimer);
    if (!forceMove && force.alpha() > 0.3) {
      movetoTimer = setTimeout(function timerOfMoveTo() {
        moveTo(pos);
      }, 300);
      return;
    }

    var x = pos[0];
    var y = pos[1];
    var k = pos[2];
    var end = { k: k };

    end.x = canvas.width / 2 - x * k;
    end.y = canvas.height / 2 - y * k;

    var start = { x: transform.x, y: transform.y, k: transform.k };
    var interpolate = d3Interpolate.interpolateObject(start, end);

    var timer = d3Timer.timer(function (t) {
      if (t >= ZOOM_ANIMATE_DURATION) {
        timer.stop();
        return;
      }

      var v = interpolate(d3Ease.easeQuadInOut(t / ZOOM_ANIMATE_DURATION));
      transformPosition(v);
      window.requestAnimationFrame(redraw);
    });
  }

  function onClick() {
    if (d3Selection.event.defaultPrevented) {
      return;
    }

    var e = transform.invert(d3.mouse(this));
    var n = force.find(e[0], e[1], NODE_RADIUS_SELECT);

    // Remember last click position
    lastClick = e;

    if (n !== undefined) {
      selectNode(n);
      return;
    }

    e = { x: e[0], y: e[1] };

    var closedLink;
    var radius = LINK_RADIUS_SELECT;
    intLinks.forEach(function (d) {
      var distance = math.distanceLink(e, d.source, d.target);
      if (distance < radius) {
        closedLink = d;
        radius = distance;
      }
    });

    if (closedLink !== undefined) {
      selectLink(closedLink);
    }
  }

  self.redraw = function redraw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    intLinks.forEach(draw.drawLink);
    intNodes.forEach(draw.drawNode);

    ctx.restore();
  }

  forceLink = d3Force.forceLink()
    .distance(function (d) {
      if (d.vpn) {
        return 0;
      }
      return 75;
    })
    .strength(function (d) {
      if (d.vpn) {
        return 0.02;
      }
      return Math.max(0.5, 1 / d.quality);
    });

  var zoom = d3Zoom.zoom()
    .scaleExtent([ZOOM_MIN, ZOOM_MAX])
    .on('zoom', function () {
      transform = d3Selection.event.transform;
      draw.setTransform(transform);
      redraw();
    });

  force = d3Force.forceSimulation()
    .force('link', forceLink)
    .force('charge', d3Force.forceManyBody())
    .force('x', d3Force.forceX().strength(0.02))
    .force('y', d3Force.forceY().strength(0.02))
    .force('collide', d3Force.forceCollide())
    .on('tick', redraw)
    .alphaDecay(0.015);

  var drag = d3Drag.drag()
    .subject(function () {
      var e = transform.invert([d3Selection.event.x, d3Selection.event.y]);
      var n = force.find(e[0], e[1], NODE_RADIUS_DRAG);

      if (n !== undefined) {
        n.x = d3Selection.event.x;
        n.y = d3Selection.event.y;
        return n;
      }
      return undefined;
    })
    .on('start', function () {
      if (!d3Selection.event.active) {
        force.alphaTarget(FORCE_ALPHA).restart();
      }
      d3Selection.event.subject.fx = transform.invertX(d3Selection.event.subject.x);
      d3Selection.event.subject.fy = transform.invertY(d3Selection.event.subject.y);
    })
    .on('drag', function () {
      d3Selection.event.subject.fx = transform.invertX(d3Selection.event.x);
      d3Selection.event.subject.fy = transform.invertY(d3Selection.event.y);
    })
    .on('end', function () {
      if (!d3Selection.event.active) {
        force.alphaTarget(0);
      }
      d3Selection.event.subject.fx = null;
      d3Selection.event.subject.fy = null;
    });

  canvas = d3Selection.select(el)
    .append('canvas')
    .on('click', onClick)
    .call(drag)
    .call(zoom)
    .node();

  ctx = canvas.getContext('2d');
  draw.setCTX(ctx);

  window.addEventListener('resize', function () {
    resizeCanvas();
    redraw();
  });

  function updateGraphStatistics() {
    document.getElementById('nodes_total').innerHTML = intNodes.length;
    document.getElementById('links_total').innerHTML = intLinks.length;
  }

  this.addElements = function addElements(nodes, links) {
    var px = lastClick[0];
    var py = lastClick[1];

    nodes.forEach(function(e) {
      // Add base position
      if ('x' in e) e.x += px;
      if ('y' in e) e.y += py;

      // Make sure a Node object exists
      if (!('o' in e)) {
        var mac = getUniqueMAC();
        e.o = new Node(mac);
      }
    });

    links.forEach(function(e) {
      // Make sure required fields are present
      // We inject them into the d3 optject for simplicity...
      if (!('quality' in e)) e.quality = 100;
      if (!('vpn' in e)) e.vpn = false;
    });

    intNodes = intNodes.concat(nodes);
    intLinks = intLinks.concat(links);

    force.nodes(intNodes);
    forceLink.links(intLinks);

    force.alpha(1).restart();
    redraw();

    updateGraphStatistics();
  }

  self.resetData = function resetData() {
    draw.clearSelection();

    intNodes = [];
    intLinks = [];

    force.nodes(intNodes);
    forceLink.links(intLinks);

    force.alpha(1).restart();
    resizeCanvas();
  }

  function getRandomMAC(){
    var chars = '0123456789abcdef';
    var mac = '';
    for (var i = 0; i < 6; i++) {
      mac += chars.charAt(Math.round(Math.random() * (chars.length - 1)));
      mac += chars.charAt(Math.round(Math.random() * (chars.length - 1)));
      if (i < 5) {
        mac += ':';
      }
    }
    return mac;
  }

  function isUniqueMAC(mac) {
    return !intNodes.some(function(e) { return e.o.mac == mac; });
  };

  self.getUniqueMAC = function getUniqueMAC() {
    var mac;
    do {
      mac = getRandomMAC();
    } while(!isUniqueMAC(mac));
    return mac;
  }

  self.disconnectSelectedNodes = function disconnectSelectedNodes() {
    var selectedNodes = draw.getSelectedIntNodes();

    intLinks = intLinks.filter(function(e) {
      return (selectedNodes.indexOf(e.source) < 0 || selectedNodes.indexOf(e.target) < 0);
    });

    forceLink.links(intLinks);

    force.alpha(1).restart();
    redraw();
  }

  self.connectSelectedNodes = function connectSelectedNodes() {
    var selectedNodes = draw.getSelectedIntNodes();
    var dict = {};
    var links = [];

    // Create link identifier (assume index < 2^16)
    function getLinkNum(source, target) {
      return (source.index << 16) + target.index;
    }

    intLinks.forEach(function(e) {
      dict[getLinkNum(e.source, e.target)] = null;
    });

    selectedNodes.forEach(function (e1) {
      selectedNodes.forEach(function (e2) {
        if (e1.index < e2.index) {
          var n = getLinkNum(e1, e2);
          if (!(n in dict)) {
            links.push({source: e1, target: e2});
            dict[n] = null;
          }
        }
      });
    });

    addElements([], links);
  }

  self.toggleAnimation = function toggleAnimation() {
    //TODO: prevent animation restart on drag/click etc.
    if (animationEnabled) {
      force.stop();
    } else {
      force.alpha(1).restart();
    }
    animationEnabled = !animationEnabled;
  }

  self.extendSelection = function extendSelection() {
    var selectedNodes = {};
    var selectedLinks = {};

    // Map node id to array of link objects
    var connections = {};

    intNodes.forEach(function(n) {
      connections[n.index] = [];
    });

    intLinks.forEach(function(l) {
      connections[l.source.index].push(l);
      connections[l.target.index].push(l);
    });

    function selectNode(n) {
      selectedNodes[n.index] = n;
      if (n.index in connections) {
        connections[n.index].forEach(function(l) {
          if (!(l.index in selectedLinks)) {
            selectedLinks[l.index] = l;
          }
          if (!(l.source.index in selectedNodes)) {
            selectNode(l.source);
          }
          if (!(l.target.index in selectedNodes)) {
            selectNode(l.target);
          }
        });
      }
    }

    draw.getSelectedIntNodes().forEach(function (e) {
      selectNode(e);
    });

    draw.getSelectedIntLinks().forEach(function (e) {
      selectNode(e.source);
      selectNode(e.target);
    });

    draw.setSelection(Object.values(selectedNodes), Object.values(selectedLinks));
    redraw();
  }

  // Remove selected items
  self.removeSelection = function removeSelection() {
    var nodeDict = {};
    var linkDict = {};

    draw.getSelectedIntNodes().forEach(function (e) {
      nodeDict[e.index] = e;
    });

    draw.getSelectedIntLinks().forEach(function (e) {
      linkDict[e.index] = e;
    });

    // Remove from internal node list
    intNodes = intNodes.filter(function (e) {
      return !(e.index in nodeDict);
    });

    // Remove from internal link list
    intLinks = intLinks.filter(function (e) {
      return !(e.source.index in nodeDict) && !(e.target.index in nodeDict) && !(e.index in linkDict);
    });

    force.nodes(intNodes);
    forceLink.links(intLinks);

    draw.clearSelection();

    force.alpha(1).restart();
    redraw();

    updateGraphStatistics();
  };

  self.getSelectedIntNodes = function getSelectedIntNodes() {
    return draw.getSelectedIntNodes();
  }

  self.getSelectedIntLinks = function getSelectedIntLinks() {
    return draw.getSelectedIntLinks();
  }

  self.getIntNodes = function getIntNodes() {
    return intNodes;
  }

  self.getIntLinks = function getIntLinks() {
    return intLinks;
  }

  self.clearSelection = function clearSelection() {
    draw.clearSelection();
    redraw();
  }

  self.resetView = function resetView() {
    moveTo([0, 0, (ZOOM_MIN + 1) / 2], true);
  };

  self.selectNode = function selectNode(node) {
    draw.selectNode(node);

    if (!(d3.event && d3.event.ctrlKey)) {
      moveTo([node.x, node.y, (ZOOM_MAX + 1) / 2]);
    }
  };

  self.selectLink = function selectLink(link) {
    draw.selectLink(link);

    if (!(d3.event && d3.event.ctrlKey)) {
      moveTo([(link.source.x + link.target.x) / 2, (link.source.y + link.target.y) / 2, (ZOOM_MAX / 2) + ZOOM_MIN]);
    }
  };

  resizeCanvas();
  resetView();

  return self;
}
