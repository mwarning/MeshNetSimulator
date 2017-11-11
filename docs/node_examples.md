# Simple mesh examples

A small collection of algorithms that runs on graphs and can aid to find new routing schemes.
The examples can be run by replacing [node.js](/src/node.js) with the content of the linked files below:

## Basic Network Consensus

These examples show how simple algorithms can reach a consensus.

* [Max number consensus](/src/node_max_num_consensus.js)
* [Distance enumeration](/src/node_distance_enumeration.js)

- basic enumration of nodes, no routing of packets
- network converges in finite number of steps
  The maximum number of steps is the maximum step duration it takes for information to pass between the longest distance of any two nodes.
- scales with linear effort

## Distance Vector

An example of a distance vector based routing protocol.

* [Distance Vector](/src/node_distance_vector.js)

- a full routing protocol
- every node floods the entire network in intervals
- every node maintains a table of all known nodes and from whch neighbor it heard about it
 - this makes it possible to always use the best routes
- adapts to network changes
- scales with quadratic effort
