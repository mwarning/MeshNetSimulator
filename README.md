# MeshNetSimulator

A simple simulator for exploring/sketching mesh network routing strategies.
The code is written in plain JavaScript/HTML and [d3](https://d3js.org).

Pull request are welcome!

![settings](screenshot.png)

Features:
- load MeshViewer nodes.json/graph.json data
- graph editor
- run simple simulations

Known issues:
- animation toggle does not work properly
- no input file sanity check

Format Documentation:
- [MeshViewer](https://github.com/ffrgb/meshviewer)
- [NetJSON](http://netjson.org/rfc.html#rfc.section.5) (not supported yet)

License: GPLv3

## How to Use

Open the file index.html in a browser. Then load nodes.json/graph.json (e.g. [nodes](https://regensburg.freifunk.net/data/nodes.json)/[graph](https://regensburg.freifunk.net/data/graph.json)) or create some network using the Edit tab.

For sketching a mesh routing strategie, you need to edit the node.js and packet.js files. A simple strategy is already implemented.
