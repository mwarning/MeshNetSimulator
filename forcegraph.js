

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

function createForceGraph() {
  var draw = createDraw();
  var math = createMath();
  var d3Interpolate = d3;
  var d3Zoom = d3;
  var d3Force = d3;
  var d3Drag = d3;
  var d3Selection = d3;
  var d3Timer = d3;
  var d3Ease = d3;
  var linkScale = d3Interpolate.interpolate('#F02311', '#04C714');

  var self = this;
  var el;
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
    console.log('resizeCanvas: ' + el.offsetWidth + ', ' + el.offsetHeight);
    canvas.width = el.offsetWidth;
    canvas.height = el.offsetHeight;
    draw.setMaxArea(canvas.width, canvas.height);
  }

  function transformPosition(p) {
    // console.log('transformPosition: ' + p.x + ', ' + p.y + ', ' + p.k);
    transform.x = p.x;
    transform.y = p.y;
    transform.k = p.k;
  }

  function moveTo(callback, forceMove) {
    console.log('moveTo: forceMove: ' + forceMove + ', sidebar_width: ' + sidebar_width());
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


    if (n !== undefined) {
      selectNode(n.o);
      // selectNode({ nodeId: n.o.node.nodeinfo.node_id });
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
      // router.selectLink({ linkId: closedLink.o.id });
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

  el = document.createElement('div');
  el.classList.add('graph');

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

  // self.addConnections(nodes)

  // TODO: test
  self.removeSelected = function removeSelected() {
    console.log('TODO: ' + draw.getSelectedNodes().length);
    var nodeDict = draw.getSelectedNodes().reduce(function(map, n) {
      map[n.o.id] = n;
      return map;
    }, {});

    var linkDict = draw.getSelectedLinks().reduce(function(map, l) {
      map[l.o.id] = l;
      return map;
    }, {});

    // Remove from internal node list
    intNodes = intNodes.filter(function (e) {
      return !(e.o.id in nodeDict);
    });

    // Remove from internal link list
    intLinks = intLinks.filter(function (e) {
      return !(e.source.o.id in nodeDict) && !(e.target.o.id in nodeDict) && !(e.o.id in linkDict);
    });

    console.log("intNodes.length: " + intNodes.length + ", intLinks.length: " + intLinks.length);

    draw.clearSelection();
    force.alpha(1).restart();
    redraw();
  };

  self.setData = function setData(data) {
    var nodeDict = intNodes.reduce(function(map, n) {
      map[n.o.id] = n;
      return map;
    }, {});

    intNodes = data.graph.nodes.map(function (d) {
      var e;
      if (d.id in nodeDict) {
        e = nodeDict[d.id];
      } else {
        e = {};
        nodeDict[d.id] = e;
      }

      e.o = d;
      return e;
    });

    intLinks = data.graph.links.map(function (d) {
      var e = {};
      e.o = d;
      e.source = nodeDict[d.source.id];
      e.target = nodeDict[d.target.id];
      e.color = linkScale(1 / d.tq);
      console.log('add link: ' + Object.keys(e.o).join(', '));

      return e;
    });

    force.nodes(intNodes);
    forceLink.links(intLinks);

    force.alpha(1).restart();
    resizeCanvas();
  };

  self.resetView = function resetView() {
    console.log('resetView');
    moveTo(function calcToReset() {
      draw.clearSelection();
      return [0, 0, (ZOOM_MIN + 1) / 2];
    }, true);
  };

  self.selectNode = function selectNode(d) {
    console.log('selectNode');
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
    console.log('selectLink');
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

  self.destroy = function destroy() {
    force.stop();
    canvas.remove();
    force = null;

    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  };

  self.render = function render(d) {
    d.appendChild(el);
    resizeCanvas();
  };

  return self;
}
