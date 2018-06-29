
function positionClients(ctx, p, startAngle, clients, startDistance) {
  if (clients === 0) {
    return;
  }

  var radius = 3;
  var a = 1.2;

  for (var orbit = 0, i = 0; i < clients; orbit++) {
    var distance = startDistance + orbit * 2 * radius * a;
    var n = Math.floor((Math.PI * distance) / (a * radius));
    var delta = clients - i;

    for (var j = 0; j < Math.min(delta, n); i++, j++) {
      var angle = 2 * Math.PI / n * j;
      var x = p.x + distance * Math.cos(angle + startAngle);
      var y = p.y + distance * Math.sin(angle + startAngle);

      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
    }
  }
}

function createDraw() {
  var self = {};

  var ctx;
  var width;
  var height;

  var transform;

  var selectedNodes = [];
  var selectedLinks = [];

  var highlightedNodes = [];
  var highlightedLinks = [];

  var clientColor = '#e6324b';
  var selectColor = 'rgba(255, 255, 255, 0.2)';
  var highlightColor = 'rgba(0, 0, 255, 0.2)';
  var linkScale = d3.interpolate('#F02311', '#04C714');
  var bandwidthWidthScale = d3.interpolateNumber(1.0, 3.0);
  var bandwidthAlphaScale = d3.interpolateNumber(0.1, 0.8);

  var NODE_RADIUS = 15;
  var LINE_RADIUS = 12;

  function getNodeValue(d, func, def) {
    if ((func in d.o) && (typeof d.o[func] === "function")) {
      return d.o[func]();
    }
    return def;
  };

  function drawDetailNode(d) {
    if (transform.k > 1) {
      var clientCount = getNodeValue(d, 'getClientCount', 0);
      if (clientCount > 0) {
        ctx.beginPath();
        positionClients(ctx, d, Math.PI, clientCount, 15);
        ctx.fillStyle = clientColor;
        ctx.fill();
      }

      var nodeName = getNodeValue(d, 'getNodeName', '').toString();
      if (nodeName.length) {
        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(nodeName, d.x, d.y + 20);
      }

      var nodeLabel = getNodeValue(d, 'getNodeLabel', '').toString();
      if (nodeLabel.length) {
        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        ctx.fillText(nodeLabel, d.x, d.y + 3.5);
      }
    }
  }

  function drawHighlightNode(d) {
    if (highlightedNodes.includes(d)) {
      ctx.arc(d.x, d.y, NODE_RADIUS * 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = highlightColor;
      ctx.fill();
      ctx.beginPath();
    }
  }

  function drawSelectedNode(d) {
    if (selectedNodes.includes(d)) {
      ctx.arc(d.x, d.y, NODE_RADIUS * 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = selectColor;
      ctx.fill();
      ctx.beginPath();
    }
  }

  function drawHighlightLink(d, to) {
    if (highlightedLinks.includes(d)) {
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = LINE_RADIUS * 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      to = [d.source.x, d.source.y];
    }
    return to;
  }

  function drawSelectLink(d, to) {
    if (selectedLinks.includes(d)) {
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = selectColor;
      ctx.lineWidth = LINE_RADIUS * 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      to = [d.source.x, d.source.y];
    }
    return to;
  }

  self.drawNode = function drawNode(d) {
    if (d.x < transform.invertX(0) || d.y < transform.invertY(0) || transform.invertX(width) < d.x || transform.invertY(height) < d.y) {
      return;
    }
    ctx.beginPath();

    drawSelectedNode(d);
    drawHighlightNode(d);

    var ringColor = getNodeValue(d, 'getRingColor', '');
    if (ringColor.length) {
      ctx.arc(d.x, d.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = ringColor;
      ctx.fill();
      ctx.beginPath();
    }

    var bodyColor = getNodeValue(d, 'getBodyColor', '#fff');
    if (bodyColor.length) {
      ctx.arc(d.x, d.y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = bodyColor;
      ctx.fill();
    }

    drawDetailNode(d);
  };

  self.drawLink = function drawLink(d) {
    var zero = transform.invert([0, 0]);
    var area = transform.invert([width, height]);
    if (d.source.x < zero[0] && d.target.x < zero[0] || d.source.y < zero[1] && d.target.y < zero[1] ||
        d.source.x > area[0] && d.target.x > area[0] || d.source.y > area[1] && d.target.y > area[1]) {
      return;
    }
    ctx.beginPath();
    ctx.moveTo(d.source.x, d.source.y);
    var to = [d.target.x, d.target.y];

    to = drawSelectLink(d, to);
    to = drawHighlightLink(d, to);

    ctx.lineTo(to[0], to[1]);
    ctx.strokeStyle = linkScale(d.o.quality / 100);
    ctx.lineWidth = bandwidthWidthScale(d.o.bandwidth / 100);
    ctx.globalAlpha = bandwidthAlphaScale(d.o.bandwidth / 100);

    ctx.stroke();
    ctx.globalAlpha = 1;

    var linkLabel = d.o.getLinkLabel();
    if (linkLabel.length) {
      ctx.beginPath();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'black';
      ctx.fillText(linkLabel, (d.source.x + to[0]) / 2, (d.source.y + to[1]) / 2 + 3);
    }
  };

  self.setCTX = function setCTX(newValue) {
    ctx = newValue;
  };

  self.getSelectedIntNodes = function getSelectedIntNodes() {
    return selectedNodes;
  };

  self.getSelectedIntLinks = function getSelectedIntLinks() {
    return selectedLinks;
  };

  self.clearSelection = function clearSelection() {
    selectedNodes = [];
    selectedLinks = [];
  };

  self.setSelection = function setSelection(nodes, links) {
    selectedNodes = nodes;
    selectedLinks = links;
  };

  self.setHighlight = function setHighlight(nodes, links) {
    highlightedNodes = nodes;
    highlightedLinks = links;
  };

  self.clearHighlight = function clearHighlight() {
    highlightedNodes = [];
    highlightedLinks = [];
  };

  // Remove selected/highlighted nodes/links that were deleted
  self.forgetRemovedItems = function forgetDeletedItems(intNodeDict, intLinkDict) {
    highlightedNodes = highlightedNodes.filter(function(e) {
      return !(e.index in intNodeDict);
    });

    highlightedLinks = highlightedLinks.filter(function(e) {
      return !(e.index in intLinkDict);
    });

    selectedNodes = selectedNodes.filter(function(e) {
      return !(e.index in intNodeDict);
    });

    selectedLinks = selectedLinks.filter(function(e) {
      return !(e.index in intLinkDict);
    });
  }

  self.selectNode = function selectNode(node) {
    if (d3.event && (d3.event.ctrlKey || d3.event.metaKey)) {
      var i = selectedNodes.indexOf(node);
      if (i < 0) {
        selectedNodes.push(node);
      } else {
        selectedNodes.splice(i, 1);
      }
    } else {
      selectedNodes = [node];
      selectedLinks = [];
    }
  };

  self.selectLink = function selectLink(link) {
    if (d3.event && (d3.event.ctrlKey || d3.event.metaKey)) {
      var i = selectedLinks.indexOf(link);
      if (i < 0) {
        selectedLinks.push(link);
      } else {
        selectedLinks.splice(i, 1);
      }
    } else {
      selectedNodes = [];
      selectedLinks = [link];
    }
  };

  self.setTransform = function setTransform(newValue) {
    transform = newValue;
  };

  self.setMaxArea = function setMaxArea(newWidth, newHeight) {
    width = newWidth;
    height = newHeight;
  };

  return self;
}
