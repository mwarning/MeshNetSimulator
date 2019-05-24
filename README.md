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

- `step [<steps>]`: Perform simulation steps.
- `test`: Check the routing success, this does not change the state of any nodes/links. Nodes are written to a JSON file after each invocation.
- `stat`: Display statistics.
- `add_line <number of nodes> <make loop>`
- `add_lattice4 <x count> <y count>`: Add a common lattice structure.
- `add_tree <number of nodes> <cross links>`: Add a random tree structure with some number of additional cross links between the branches.
- `algorithm [<algorithm>]`: Get or set routing algorithm (e.g. `random`, `vivaldi`)
- `import <file>`: Import a network from a JSON file.
- `export <file>`: Export the network structure to a JSON file.

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
