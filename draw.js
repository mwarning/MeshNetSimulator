
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

  var clientColor = '#e6324b';
  var highlightColor = 'rgba(255, 255, 255, 0.2)';
  var linkScale = d3.interpolate('#F02311', '#04C714');

  var labelColor = '#fff';

  var NODE_RADIUS = 15;
  var LINE_RADIUS = 12;

  function drawDetailNode(d) {
    if (transform.k > 1) {
      if (d.o.clientCount > 0) {
        ctx.beginPath();
        positionClients(ctx, d, Math.PI, d.o.clientCount, 15);
        ctx.fillStyle = clientColor;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.textAlign = 'center';
      ctx.fillStyle = labelColor;
      ctx.fillText(d.o.name, d.x, d.y + 20);

      if (d.o.packetCount > 0) {
        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        ctx.fillText(d.o.packetCount, d.x, d.y + 3);
      }
    }
  }

  function drawHighlightNode(d) {
    if (selectedNodes.includes(d)) {
      ctx.arc(d.x, d.y, NODE_RADIUS * 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = highlightColor;
      ctx.fill();
      ctx.beginPath();
    }
  }

  function drawHighlightLink(d, to) {
    if (selectedLinks.includes(d)) {
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = highlightColor;
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

    drawHighlightNode(d);

    ctx.moveTo(d.x + 3, d.y);
    ctx.arc(d.x, d.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = d.o.color;
    ctx.fill();

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

    to = drawHighlightLink(d, to);

    ctx.lineTo(to[0], to[1]);
    ctx.strokeStyle = linkScale(d.quality / 100);
    // TODO: use bandwidth
    if (d.vpn) {
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1.5;
    } else {
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2.5;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
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

  self.selectNode = function selectNode(node) {
    if (d3.event && d3.event.ctrlKey) {
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
    if (d3.event && d3.event.ctrlKey) {
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
