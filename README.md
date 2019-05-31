# Mesh Network Routing Algorithm Simulator

This is a simple simulator for sketching mesh network routing strategies in the hopes to find better approaches to mesh routing. Please note that this simulator does not virtualize a TCP/IP stack nor all characteristics of wireless connections. The dynamic nature of MANETs is also not (yet) covered by this simulator.

The simulator is controled via a command line that can also be reached over a network. The output from the simulator is a json files and can be displayed using the [Graph Viewer](https://github.com/mwarning/GraphViewer/).

The motivation for this project is that community networks such as [Freifunk](https://freifunk.net) struggle with scaling issues of their [MANET](https://en.wikipedia.org/wiki/Mobile_ad_hoc_network)s. The cause is management traffic caused by hundreds of nodes.

Also part of this repository are [basic information](docs/about_mesh_networking.md) about mesh routing protocols.

Note: The project was formally written in JavaScript. Use the commit history if you want to look at that version.

## Visualization

The graph can be inspected e.g. by using [GraphViewer](https://github.com/mwarning/GraphViewer).

## Command Line

Some commands on the command line are:


- `clear`  
  Clear graph state
- `graph_state`  
  Show Graph state
- `sim_state`  
  Show Simulator state.
- `reset`  
  Reset node state.
- `test`  
  Test routing algorithm (samples, test packets arrived, path stretch).
- `get <key>`  
  Get node property.
- `set <key> <value>`  
  Set node property.
- `connect_in_range <range>`  
  Connect all nodes in range of less then range (in km).
- `randomize_position <range>`  
  Randomize nodes in an area with edge length in range (in km).
- `remove_unconnected`  
  Remove nodes without any connections.
- `algorithm [<algorithm>]`  
  Get or set given algorithm.
- `add_line <node_count> <create_loop>`  
  Add a line of nodes. Connect ends to create a loop.
- `add_tree <node_count> <inter_count>`  
  Add a tree structure of nodes with interconnections
- `add_lattice4 <x_xount> <y_count>`  
  Create a lattice structure of squares.
- `add_lattice8 <x_xount> <y_count>`  
  Create a lattice structure of squares and diagonal connections.
- `remove_nodes <node_list>`  
  Remove nodes. Node list is a comma separated list of node ids.
- `connect_nodes <node_list>`  
  Connect nodes. Node list is a comma separated list of node ids.
- `disconnect_nodes <node_list>`  
  Disconnect nodes. Node list is a comma separated list of node ids.
- `step [<steps>]`  
  Run simulation steps. Default is 1.
- `execute <file>`  
  Execute a script with a command per line.
- `import <file>`  
  Import a graph as JSON file.
- `export <file>`  
  Export a graph as JSON file.
- `move_node <node_id> <x> <y> <z>`  
  Move a node by x/y/z (in km).
- `move_nodes <x> <y> <z>`  
  Move all nodes by x/y/z (in km).
- `help`  
  Show this help.

## Related Software

[OMNeT++](https://www.omnetpp.org/): OMNeT++ is an extensible, modular, component-based C++ simulation library and framework, primarily for building network simulators.

[ns-3](https://www.nsnam.org/): ns-3 is a discrete-event network simulator for Internet systems, targeted primarily for research and educational use. 

[EMANE](https://github.com/adjacentlink/emane): Extendable Mobile Ad-hoc Network Emulator.

## Various Links

- Primer on wireless mesh routing algorithms [Review on Routing Algorithms in Wireless Mesh Networks](http://www.ijcst.org/Volume3/Issue5/p15_3_5.pdf)

- [Review of Simulators for Wireless Mesh Network](http://dlibra.itl.waw.pl/dlibra-webapp/Content/1800/ISSN_1509-4553_3_2014_82.pdf)

- Understanding Mesh Networking ([Part I](https://inthemesh.com/archive/understanding-mesh-networking-part-i/), [Part II](https://inthemesh.com/archive/understanding-mesh-networking-part-ii/), [Slides](https://www.dropbox.com/s/wqksd8dmykev8x7/))

- [Ask Slashdot: Could We Build A Global Wireless Mesh Network?](https://ask.slashdot.org/story/17/04/29/2134234/ask-slashdot-could-we-build-a-global-wireless-mesh-network)

- Contains an overview of different mesh routing strategies: [From MANET To IETF ROLL Standardization: A Paradigm Shift in WSN Routing Protocols](http://www.cttc.es/publication/from-manet-to-ietf-roll-standardization-a-paradigm-shift-in-wsn-routing-protocols/)

## Various Scientific Papers

A [collection](docs/papers.md) of scientific papers somewhat related to Mobile Ad-Hoc Mesh Routing.
