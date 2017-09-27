
function createEdit(graph) {
  var self = {};

  function genId(){
    var hexDigits = '0123456789abcdef';
    var id = '';
    for (var i = 0; i < 2; i++) {
      id += hexDigits.charAt(Math.round(Math.random() * 15));
      id += hexDigits.charAt(Math.round(Math.random() * 15));
    }
    return id;
  }

  function getUniqueIdPrefix() {
    var id;
    do {
      id = genId();
    } while(!graph.isUniqueIdPrefix(id));
    return id;
  }

  self.addLine = function addLine (count, loop) {
    var id = getUniqueIdPrefix();
    var nodes = [];
    var links = [];

    for (var i = 0; i < count; i++) {
      nodes.push({x: (i * 15), y: 0, o: {id: (id + '#' + i)}});
      if (i > 0) {
        var source = nodes[i - 1];
        var target = nodes[i];
        links.push({source: source, target: target, o: {id: (source.o.id + '_' + target.o.id)}});
      }
    }

    if (loop && (count > 2)) {
      var source = nodes[0];
      var target = nodes[count - 1];
      links.push({source: source, target: target, o: {id: (source.o.id + '_' + target.o.id)}});
    }

    graph.addElements(nodes, links);
  }

  return self;
}