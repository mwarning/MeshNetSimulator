# MeshNetSimulator

Community networks such as [Freifunk](https://freifunk.net) struggle with scaling issues and data overhead beyond a few hundred nodes.

This is a simple simulator for exploring/sketching mesh network routing strategies in the hopes to find better approaches.
The code is written in plain JavaScript/HTML using the [d3](https://d3js.org) visualization library. Files graph.js and draw.js originate from the [meshviewer](https://github.com/ffrgb/meshviewer) project.

Pull requests are welcome!

![settings](docs/screenshot.png)

Features:
- load MeshViewer nodes.json/graph.json data
- create and edit graphs
- run simple simulations

TODO:
- fix animation toggle
- refactor code into a link.js file
- network export not implemented yet

Format Documentation:
- [MeshViewer](https://github.com/ffrgb/meshviewer)
- [NetJSON](http://netjson.org/rfc.html#rfc.section.5) (not supported yet)

For more information about mesh routing see [here](docs/about_mesh_networking.md).


## How to Use

### Start

Get the content of the repository and open the file index.html in a browser.

### Create a topology

Create some network using the `Edit` tab and click on the `lattice` button to create a 3x3 lattice.
You can also load meshviewer nodes.json/graph.json data files (e.g. [nodes.json](https://regensburg.freifunk.net/data/nodes.json)/[graph.json](https://regensburg.freifunk.net/data/graph.json)).

### Implement a routing strategy (optional)

A simple routing algorithm is already implemented. It will discovery neighbors and route packets to random neighbors.
For sketching your own mesh routing strategy, you need to edit the node.js and packet.js files.

### Deploy packets
Select a start and end node for a route to deploy packets on. Keep the control key pressed to select multiple nodes.
Click the 'Add route' button on the `Sim` tab to create a route on which packets can be deployed.

### Simulate

Click the `step` button two times to let the nodes discover its neighbors with special broadcast packets.
Now to click the 'Deploy Packets' button once to place packets on the created routes.
The number of (unicast) packets will be displayed on the node.
Use the `step` button to let the nodes propagate through the network in a random fashion until the destionation is reached.

### Evaluate (optional)

The `Sim` tab will show the efficiency of the routing approach once a packet has reached its destination.
Use the `show` tab to inspect the state of selected nodes and its current packets.
