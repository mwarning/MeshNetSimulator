
function $(id) {
  return document.getElementById(id);
}

function showTab(evt, tabname) {
  var tabcontent = document.getElementsByClassName("tabcontent");
  for (var i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  var tablinks = document.getElementsByClassName("tablinks");
  for (var i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active');
  }

  document.getElementById(tabname).style.display = "block";
  evt.currentTarget.classList.add('active');
}

function getText(id) {
  return $(id).value;
}

function getInteger(id) {
  return Math.floor(parseInt($(id).value, 10));
}

function getFloat(id) {
  return parseInt($(id).value, 10);
}

function getBoolean(id) {
  return $(id).checked;
}

function clearChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

// Return random boolean value based on propability.
function randomBoolean(propability) {
  return (propability != 0 && ((propability == 1) || propability > Math.random()));
}

function append(parent, name, content = '') {
  var e = document.createElement(name);
  if (content.length) {
    var text = document.createTextNode(content)
    e.appendChild(text);
  }
  parent.appendChild(e);
  return e;
}

function sortLexial(th) {
  // TODO
}

function sortNumerical(th) {
  // TODO
}
