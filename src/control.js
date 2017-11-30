
function createControl(graph) {
  var self = {};

  self.sendCommand = function sendCommand(cmd) {
    var intNodes = graph.getSelectedIntNodes();

    if (typeof Node.prototype.executeCommand !== "function") {
      alert('Node.prototype.executeCommand(cmd) not implemented.');
      return;
    }

    if (intNodes.length === 0) {
      alert('No node selected.');
      return;
    }

    var replies = [];
    for (var i = 0; i < intNodes.length; i += 1) {
      var node = intNodes[i].o;
      var reply = node.executeCommand(cmd);
      if(typeof ret === 'string') {
        replies.push(reply);
      }
    }

    $('command_reply').textContent = replies.join('\n');
    graph.redraw();
  }

  return self;
}
