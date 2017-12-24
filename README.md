# MeshNetSimulator

Community networks such as [Freifunk](https://freifunk.net) struggle with scaling issues and data overhead beyond a few hundred nodes.

This is a simple simulator for exploring/sketching mesh network routing strategies in the hopes to find better approaches.
The code is written in plain JavaScript/HTML and the [d3](https://d3js.org) visualization library.

A live demo can be found [here](https://mwarning.de/MeshNetSimulator/) - Pull requests are welcome!

![settings](docs/screenshot.png)

Features:
- load, edit and save [MeshViewer](https://github.com/ffrgb/meshviewer) and [NetJSON](http://netjson.org/rfc.html) data
- create custom (bidirectional) graphs from primitives (single node, line/loop, 4-/8-Lattice, random tree)
- live editing of [Node](src/node.js), [Link](src/link.js) and [Packet](src/packet.js) implementations
- run simulations stepwise and with intervals
- elaborate routing statistics
- nodes state introspection
- send commands to selected nodes

Available are [basic information](docs/about_mesh_networking.md) about mesh routing and a collection of [examples](docs/node_examples.md).

## FAQ

* **Why JavaScript?**  
  Because of d3.js for visualisation. Also, JavaScript is simple enough for sketching ideas.

* **How fast is the simulation?**  
  10000 steps for a lattice of 10000 nodes and 19800 links with ~36000 packets takes about three minutes on a i7.

* **How is the routing efficiency value calculated?**  
  Overall efficiency is computed as the medium efficiency of each route. Route efficiency is calculated as (`optimal route hop count` * `number of received packets` / `accumulated hop count of received packets`).

## How to Use

### Start

Get the content of the repository and open the file index.html in a browser.

### Create a topology

Create some network using the `Edit` tab and click on the `lattice` button to create a 3x3 lattice.
You can also load JSON files (e.g. [nodes.json](https://regensburg.freifunk.net/data/nodes.json)/[graph.json](https://regensburg.freifunk.net/data/graph.json) or [netjson.json](https://nodeshot.org/netjsongraph/examples/data/netjson.json)).

### Implement a routing strategy (optional)

A simple routing algorithm is already implemented. It will discovery neighbors and route packets to random neighbors.
For sketching your own mesh routing strategy, you need to edit the node.js and packet.js files.

### Deploy packets
Select a start and end node for a route to deploy packets on. Keep the control key pressed to select multiple nodes.
Click the `Add Routes` button on the `Sim` tab to create a route on which packets can be deployed.

### Simulate

Click the `step` button two times to let the nodes discover its neighbors with special broadcast packets.
Now to click the `Deploy Packets` button once to place packets on the created routes.
The number of (unicast) packets will be displayed on the node.
Use the `step` button to let the nodes propagate through the network in a random fashion until the destination is reached.

### Evaluate (optional)

The `Sim` tab will show the efficiency of the routing approach once a packet has reached its destination.
Use the `show` tab to inspect the state of selected nodes and its current packets.

## Related Software

[OMNeT++](https://www.omnetpp.org/): OMNeT++ is an extensible, modular, component-based C++ simulation library and framework, primarily for building network simulators.

[ns-3](https://www.nsnam.org/): ns-3 is a discrete-event network simulator for Internet systems, targeted primarily for research and educational use. 

[MeshViewer](https://github.com/ffrgb/meshviewer): A visualization tool for mesh networks. Primarily used by Freifunk communities. Some code was used by this project.

## Various Links

- [Ask Slashdot: Could We Build A Global Wireless Mesh Network?](https://ask.slashdot.org/story/17/04/29/2134234/ask-slashdot-could-we-build-a-global-wireless-mesh-network)

- In depth analysis of B.A.T.M.A.N.-adv [Performance Analysis and Simulation of a Freifunk mesh network](http://thardes.de/wp-content/uploads/2016/03/thesis.pdf)

- Contains an overview of different mesh routing strategies: [From MANET To IETF ROLL Standardization: A Paradigm Shift in WSN Routing Protocols](http://www.cttc.es/publication/from-manet-to-ietf-roll-standardization-a-paradigm-shift-in-wsn-routing-protocols/)

- A routing algorithm based on virtual coordinates: [Routing without Geometry](https://www.tik.ee.ethz.ch/file/f26a5590c4dcab48af753012f3aa9ab4/sirocco05.pdf)
