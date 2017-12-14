
function createShow (graph) {
  var self = {};

  function accessPath(o, path) {
    for (var i = 0; i < path.length; i++) {
      var key = path[i];
      if (key in o) {
        o = o[key];
      } else {
        // Pretend we found an empty object instead of no object
        return {};
      }
    }
    return o;
  }

  function createCallback(self, o, path) {
    return function() { self.showObject(o, path); }
  }

  self.showSelectedObject = function showSelectedObject (o) {
    var intNodes = graph.getSelectedIntNodes();
    var intLinks = graph.getSelectedIntLinks();

    if (intNodes.length == 1 && intLinks.length == 0) {
      self.showObject(intNodes[0].o, []);
    } else if (intNodes.length == 0 && intLinks.length == 1) {
      self.showObject(intLinks[0].o, []);
    } else if (intNodes.length == 0 && intLinks.length == 0) {
      self.showObject(null, []);
    } else {
      alert('Select only one node/link.');
    }
  }

  function setPathSelect(o, path) {
    var p = $('show_path');
    clearChildren(p);

    append(p, 'span', '/');
    for (var i = 0; i < path.length; i++) {
      append(p, 'span', path[i]).onclick = createCallback(self, o, path.slice(0, i));
      append(p, 'span', '/');
    }
  }

  self.showObject = function showObject (o, path) {
    var tbody = document.getElementById('show_object_tbody');

    setPathSelect(o, path);
    $$('show_type').nodeValue = o ? o.constructor.name : '-';

    clearChildren(tbody);

    if (o) {
      var obj = accessPath(o, path);

      for (var key in obj) {
        var value = obj[key];

        if (typeof value === 'function') {
          continue;
        }

        // Create table rows of properties
        var tr = append(tbody, 'tr');
        var td = append(tr, 'td', key);

        var type = (typeof value);
        if (type === 'string' || type === 'boolean') {
          append(tr, 'td', value.toString());
        } else if (type === 'number') {
          append(tr, 'td', value.toFixed(2));
        } else if (value === null) {
          append(tr, 'td', 'null');
        } else if (Array.isArray(value)) {
          append(tr, 'td', '(' + value.length + ')');
          tr.onclick = createCallback(self, o, path.concat([key]));
        } else if (type === 'object') {
          append(tr, 'td', '(' + Object.keys(value).length + ')');
          tr.onclick = createCallback(self, o, path.concat([key]));
        } else {
          append(tr, 'td', '???');
        }
      }
    }

    var display = (tbody.children.length === 0);
    displayElement($('show_no_items'), display);
  }

  return self;
}