
function $(id) {
  return document.getElementById(id);
}

function $$(id) {
  return document.getElementById(id).firstChild;
}

function showTab(evt, tabname) {
  var tabcontent = document.getElementsByClassName('tabcontent');
  for (var i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none';
  }

  var tablinks = document.getElementsByClassName('tablinks');
  for (var i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active');
  }

  document.getElementById(tabname).style.display = 'block';
  evt.currentTarget.classList.add('active');
}

function getText(id) {
  return $(id).value;
}

function getInt(id) {
  return Math.floor(parseInt($(id).value, 10));
}

function getFloat(id) {
  return parseInt($(id).value, 10);
}

function getBool(id) {
  return $(id).checked;
}

function clearChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

function displayElement(e, show) {
  if (show) {
    e.style.display = '';
  } else {
    e.style.display = 'none';
  }
}

// Return random boolean value based on propability.
function randomBoolean(propability) {
  return (propability != 0 && ((propability == 1) || propability > Math.random()));
}

function append(parent, name, content) {
  var e = document.createElement(name);
  if ((typeof content === 'string') || (typeof content === 'number')) {
    var text = document.createTextNode(content.toString());
    e.appendChild(text);
  }
  parent.appendChild(e);
  return e;
}

function isEmpty(obj) {
  return (Object.keys(obj).length === 0);
}

function findChildIndex(child) {
  var i = 0;
  while( (child = child.previousElementSibling) != null ) {
    i++;
  }
  return i;
}

function sortTableColumn(tbody, col, numerical) {
  function access(tr) {
    var val = tr.children[col].firstChild.nodeValue;
    return numerical ? parseInt(val) : val;
  }

  var items = Array.from(tbody.children);

  items.sort(function(tr1, tr2) {
    var a = access(tr1);
    var b = access(tr2);
    return (a == b) ? 0 : (a > b ? 1 : -1);
  });

  clearChildren(tbody);
  for (var i = 0; i < items.length; ++i) {
    tbody.appendChild(items[i]);
  }
}

function sortLexial(th) {
  var tbody = th.parentNode.parentNode.parentNode.getElementsByTagName('tbody')[0];
  var col = findChildIndex(th);
  sortTableColumn(tbody, col, false);
}

function sortNumerical(th) {
  var tbody = th.parentNode.parentNode.parentNode.getElementsByTagName('tbody')[0];
  var col = findChildIndex(th);
  sortTableColumn(tbody, col, true);
}

// Find a key in a nested object structure
function findValue(obj, name, def) {
  var val = def;

  function find(obj) {
    if (obj === null || typeof obj !== 'object') {
      return;
    }

    if (name in obj) {
      val = obj[name];
      return;
    }

    Object.values(obj).map(find);
  }

  find(obj);
  return val;
}

// Set a value in a nested dictionary at given path.
// Creates sub-dictionary elements if needed.
function setValue(obj, path, value) {
  for (var i = 0; i < (path.length - 1); i += 1) {
    var p = path[i];
    if (p in obj) {
      obj = obj[p];
    } else {
      var o = {};
      obj[p] = o;
      obj = o;
    }
  }
  obj[path[path.length - 1]] = value;
}

function copyExistingFields(oldObject, newObject) {
  for (var key in oldObject) {
    if (key in newObject) {
      var oldValue = oldObject[key];
      var newValue = newObject[key];
      if (typeof oldValue !== 'function' && typeof oldValue === typeof newValue) {
        newObject[key] = oldValue;
      }
    }
  }
}

function displayFileName(input) {
  if (input.files.length) {
    // Display selected files name in previous element
    var prev = input.previousElementSibling;
    var name = input.files[0].name;
    if (prev.tagName === 'INPUT') {
      prev.value = name;
    } else {
      prev.textContent = name;
    }
  }
}

function limitFloat(value, min, max) {
  if (value < min || isNaN(value)) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
