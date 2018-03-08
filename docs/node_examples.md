# Simple mesh algorithm examples

A small collection of algorithms that runs on graphs and can aid to find new routing schemes.
The examples can be run by selecting the implementation file in the GUI.
By default, [node.js](/src/node.js) is used and contains a random forwarding routing strategy.

## Basic Consensus

These examples show how simple algorithms can reach a consensus.

* [Max number consensus](/src/node_max_num_consensus.js)
  * Every node chooses a random number that is displayed
  * All nodes try to find this highest number and display it
* [Distance enumeration](/src/node_distance_enumeration.js)
  * The nodes choose one node by random and display its shortest hop distance to that node
  * The network converges in a finite number of steps

## Game Of Life

A [Game Of Life implementation](/src/node_game_of_life.js) similar to the well known [Conways Game Of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life). But a predictable and complex behavior is hard to maintain on mesh networks.

Every node is in a state called `dead` or `alive`, signified by the colors red and green.

## Distance Vector

An example of a distance vector based routing protocol.

* [Distance Vector](/src/node_distance_vector.js)
  * A full routing protocol
  * Every node floods the entire network in intervals with hello packets
  * Every node maintains a table of all known nodes and from whch neighbor it heard about it
    * This makes it possible to always use the best routes
  * Adapts to network changes
  * Scales with quadratic traffic effort
