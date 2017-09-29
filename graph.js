

// from sidebar
function getWidth() {
  // Needed to avoid render blocking
  var gridBreakpoints = {
    lg: [992, 446],
    xl: [1200, 560]
  };

  if (gridBreakpoints.lg[0] > window.innerWidth) {
    return 0;
  } else if (gridBreakpoints.xl[0] > window.innerWidth) {
    return gridBreakpoints.lg[1];
  }
  return gridBreakpoints.xl[1];
};

function sidebar_width() {
  return 0; // getWidth();
}

function createGraph(id) {
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
  var el = document.getElementById(id);
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

  function moveTo(callback, forceMove) {
    clearTimeout(movetoTimer);
    if (!forceMove && force.alpha() > 0.3) {
      movetoTimer = setTimeout(function timerOfMoveTo() {
        moveTo(callback);
      }, 300);
      return;
    }
    var result = callback();
    var x = result[0];
    var y = result[1];
    var k = result[2];
    var end = { k: k };

    end.x = (canvas.width + sidebar_width()) / 2 - x * k;
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
      selectNode(n.o);
      return;
    }

    e = { x: e[0], y: e[1] };

    var closedLink;
    var radius = LINK_RADIUS_SELECT;
    intLinks
      .forEach(function (d) {
        var distance = math.distanceLink(e, d.source, d.target);
        if (distance < radius) {
          closedLink = d;
          radius = distance;
        }
      });

    if (closedLink !== undefined) {
      selectLink(closedLink.o);
    }
  }

  function redraw() {
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
      if (d.o.vpn) {
        return 0;
      }
      return 75;
    })
    .strength(function (d) {
      if (d.o.vpn) {
        return 0.02;
      }
      return Math.max(0.5, 1 / d.o.tq);
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

  this.addElements = function addElements(nodes, links) {
    var px = lastClick[0];
    var py = lastClick[1];

    nodes.forEach(function(e) {
      if ('x' in e) e.x += px;
      if ('y' in e) e.y += py;
      if (!('o' in e)) {
        var id = getUniqueIdPrefix();
        e.o = new Node(id);
      }
    });

    links.forEach(function(e) {
      if (!('o' in e)) {
        e.o = new Link();
      }
    });

    intNodes = intNodes.concat(nodes);
    intLinks = intLinks.concat(links);

    force.nodes(intNodes);
    forceLink.links(intLinks);

    force.alpha(1).restart();
    redraw();
  }

  self.getAllItems = function getAllItems() {
    var nodes = intNodes.map(function(e) {
      return e.o;
    });
    var links = intLinks.map(function(e) {
      return e.o;
    });
    return nodes + links;
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

  function genRandomId(len){
    var chars = 'abcdefghijklmnopqrstuvwxyz';
    var id = '';
    for (var i = 0; i < len; i++) {
      id += chars.charAt(Math.round(Math.random() * (chars.length - 1)));
    }
    return id;
  }

  function isUniqueIdPrefix(id) {
    return !intNodes.some(function(e) { return e.o.id.startsWith(id); });
  };

  self.getUniqueIdPrefix = function getUniqueIdPrefix() {
    var id;
    do {
      id = genRandomId(4);
    } while(!isUniqueIdPrefix(id));
    return id;
  }

  self.connectSelection = function connectSelection() {
    var selectedNodes = draw.getSelectedNodes();
    var linkDict = {};
    var links = [];

    // Create a direction independent link id
    function createLinkId(n1, n2) {
      var sid = n1.o.id;
      var tid = n2.o.id;
      return (sid > tid) ? (sid + '-' + tid) : (tid + '-' + sid);
    }

    intLinks.forEach(function(e) {
      linkDict[createLinkId(e.source, e.target)] = null;
    });

    selectedNodes.forEach(function (e1) {
      selectedNodes.forEach(function (e2) {
        if (e1.o.id < e2.o.id) {
          var id = createLinkId(e1, e2);
          if (id in linkDict) {
            // Link already exists
            return;
          }

          links.push({source: e1, target: e2});
          linkDict[id] = null;
        }
      });
    });

    addElements([], links);
  }

  self.toggleAnimation = function toggleAnimation() {
    //TODO: prevent animation restart on drag etc.
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
      connections[n.o.id] = [];
    });

    intLinks.forEach(function(l) {
      connections[l.source.o.id].push(l);
      connections[l.target.o.id].push(l);
    });

    function selectNode(n) {
      selectedNodes[n.o.id] = n;
      if (n.o.id in connections) {
        connections[n.o.id].forEach(function(l) {
          if (!(l.o.id in selectedLinks)) {
            selectedLinks[l.o.id] = l;
          }
          if (!(l.source.o.id in selectedNodes)) {
            selectNode(l.source);
          }
          if (!(l.target.o.id in selectedNodes)) {
            selectNode(l.target);
          }
        });
      }
    }

    draw.getSelectedNodes().forEach(function (e) {
      selectNode(e);
    });

    draw.getSelectedLinks().forEach(function (e) {
      selectNode(e.source);
      selectNode(e.target);
    });

    draw.setSelection(Object.values(selectedNodes), Object.values(selectedLinks));
    redraw();
  }

  self.removeSelection = function removeSelection() {
    var nodeDict = {};
    var linkDict = {};

    draw.getSelectedNodes().forEach(function(n) {
      nodeDict[n.o.id] = n;
    });

    draw.getSelectedLinks().forEach(function(l) {
      linkDict[l.o.id] = l;
    });

    // Remove from internal node list
    intNodes = intNodes.filter(function (e) {
      return !(e.o.id in nodeDict);
    });

    // Remove from internal link list
    intLinks = intLinks.filter(function (e) {
      return !(e.source.o.id in nodeDict) && !(e.target.o.id in nodeDict) && !(e.o.id in linkDict);
    });

    force.nodes(intNodes);
    forceLink.links(intLinks);

    draw.clearSelection();

    force.alpha(1).restart();
    redraw();
  };

  self.clearSelection = function clearSelection() {
    draw.clearSelection();
    redraw();
  }

  self.resetView = function resetView() {
    moveTo(function calcToReset() {
      // draw.clearSelection();
      return [0, 0, (ZOOM_MIN + 1) / 2];
    }, true);
  };

  self.selectNode = function selectNode(d) {
    moveTo(function calcToNode() {
      for (var i = 0; i < intNodes.length; i++) {
        var n = intNodes[i];
        if (n.o.id !== d.id) {
          continue;
        }
        draw.selectNode(n);
        return [n.x, n.y, (ZOOM_MAX + 1) / 2];
      }
      return [0, 0, (ZOOM_MIN + 1) / 2];
    });
  };

  self.selectLink = function selectLink(d) {
    moveTo(function calcToLink() {
      for (var i = 0; i < intLinks.length; i++) {
        var l = intLinks[i];
        if (l.o !== d) {
          continue;
        }
        draw.selectLink(l);
        return [(l.source.x + l.target.x) / 2, (l.source.y + l.target.y) / 2, (ZOOM_MAX / 2) + ZOOM_MIN];
      }
      return [0, 0, (ZOOM_MIN + 1) / 2];
    });
  };

  resizeCanvas();
  resetView();

  return self;
}
