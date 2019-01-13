## What is mesh networking

Mesh networks consist of nodes connected via links. The links might be wired or wireless connections.
These networks change frequently due to nodes going offline/online and connections getting disturbed.
Also, nodes might be mobile and connect to other nodes, vanish or appear. These networks are called Mobile Ad Hoc Networks (MANET).
Nodes, that do not move after being placed, form a (static) mesh network.

Static network
* usually cable network
  * high throughput, low latency, low packet loss
* stable topology
* transitive connection

Mesh network:
* usually wireless
  * low throughput, high latency, high paxcket loss
* changing topology
* MANET
  * mobile nodes
  * more extreme topology changes

## Categories

Mesh routing algorithms can be categorized by different properties to distinguish those protocols.
Note that hybrid approaches are alway possible.


### Layer 2 vs. Layer3
Emulating OSI model layer 2 or 3 as part of the mesh network protocol has some pros and cons.

Layer 2 is the data link layer and deals with MAC addresses. Layer 2 mesh routing implementations basicly emulate a big switch.
pros:
* easier to implement
* trivial to implement roaming (when a client moves between nodes)

Layer 3 is the procotol layer and deals with IP addresses.
The routing protocol takes care of assigning subnets.
pros:
* better scalability because subnets do not forward broadcast/mutlicast packets by definition

As always, things are not clear cut as many properties can be achieved in some other way.

Layer 4 meshes would be TOR, I2P, and CJDNS. (https://superuser.com/questions/481145/what-is-the-difference-between-ad-hoc-and-mesh-network-also-with-p2p ??)

[Scaling Layer 2 Mesh Protocols 1000 nodes and beyond](https://www.youtube.com/watch?v=yE8uE-0tMuM)

### Feasability Condition

Used in distributed Bellman-Ford algorithm to check if a received announcement creates a routing loop or not.
A node will only integrate feasible routes in its routing table.

BGP: only accept route announcements that do not include its own node. The complete route must be announced and attached to the packets. Internet routes usually have 3-4 hops.

DSDV, AODV: only accept routes if they do not increase the metric known by that node

EIGR/DUAL, Babel: node sending a route update remembers the smalles value (metric) it send and accepts only better routes

### Pro-Active vs. Reactive

Reactive (also on demand) routing protocols try to gather the information need for routing when a packet arrives.
This usually means that there is less traffic to keep local routing information up to date. It is only updated/gatheres when a packet actually needs to be routed. On the other hand this adds latency.

Example: Babel, DSR, AODV

Pro-active (also table driven) protocols keep all information ready and up to date for when a packet needs to be routed. For this a table of all received routing information is maintained.
This approach is popular in existing implementations, but needs a steady overhead to keep the routing information up to date.

Examples: DSDV, OLSR, BATMAN-adv

### Uni- or Bi-directional Links

Routing protocols can see links as symmetrical or asymmetric connections. If traffic can flow in one direction only, then it would be uni-directional connection. If the quality of a connection is not symmetrical, then a routing protocol can still try to ignore this and assume that it is perfectly symmetrical in its transmission quality.

A sender and a receiver would form a typical asymmetric link.

### Name-dependent vs. Name-independent

Name-dependent routing schemes assign an address (of some kind, not necessarily a familiar IP address) based on a node’s location in the network. Name-independent routing schemes place no requirements on a node’s address and treat it as some opaque identifier in a flat (i.e. non-subnetted) address space. 

### Flat Proactive Routing

Flat proactive Routing protocols can be roughly divided into two subcategories; link-state (LS) and distributed Bellman-Ford (DBF) algorithms.
Flat proactive routing scales very well with respect to the frequency of connection
establishment (F) and the number of concurrent connections (C). However, the
number of control packet transmissions per node is Θ(N ).

Link state Examples: Fish-eye State Routing [22], Global State Routing [4] and Opti-
mized Link-State Routing.
Every node has a complete but not accurate view of the toplogy.
Can react fast on link change.
FSR does not keep changes far away, idea: link changes far away have a small effect on local routing decisions.

DBF examples:
Destination Sequenced Distance Vector routing [24] and Wire-
less Routing Protocol [19]

routing table consisting of the distance to the destination, and the next hop neighbor on the shortest route toward the destination.

### Pure Reactive Routing

### Location management

Location management is any technique by which a source can determine the current address or location of an intended destination node, given its identifier. [Routing Scalability in MANETs, Chapter 1](http://www.cs.ucr.edu/~michalis/PAPERS/RoutingScalability.pdf)

### Geographic Routing

Every node has a geographic coordinate (e.g. by GPS). A packet is routed to a geographic location by selection a neighbor node that is nearer to the desired location. Packet delivery, is not guaranteed, as packets can get stuck in local minima (called voids).

Geo info is flooded through network with decrasing frequency for nodes far away.

Examples: DREAM, GPSR, LAR

### Geographic Routing with virtual coordiates

Building up virtual coordinates are a useful replacement, since GPS transponders are expensive and geographic coordinates might not be adequate to cover the multidimensions dimension of a local mesh network. Routing based on coordinates promises the best scaling properties.
Greedy routing is expected to work better on virtual coordinates.
Problems: The coordinate system can drift over time und finally overflow the number represenation. Solution, small gravity towards a fixed coordinate, e.g. (0,0,0).

Problems:
churn: new nodes with new (e.g. zero or random) start coordiantes
drift: all coordiantes may drift to a direction an finally the coordiantes may overflow => add gravity term to 0,0,0
       coordinate rotation may occur
       drift / rotation / flipping (knot in the topology)
intrinsic error:
corruption: broken packets with random data
latency variance.

Landmark-based (centralized)
 Landmark-based. In GNP [Predicting Internet Network Distance with Coordinates-Based Approaches.], nodes contact multiple landmark nodes to triangulate their coordinates. The drawbacks of this approach are that the accuracy of the coordinates depends on the choice of landmark nodes and landmark nodes may become a bottleneck. Lighthouses [Lighthouses for Scalable Distributed Location.] addresses this by supporting multiple independent sets of landmarks with their own coordinate systems. These local coordinates map into a global coordinate system. PIC [PIC: Practical Internet Coordinates for Distance Estimation.] does not use explicit landmarks, incorporating measurements to any node using a simplex optimization algorithm to obtain an up-to-date coordinate. These landmark-based schemes require a reasonably stable infrastructure and, to the best of our knowledge, have not been adopted for wide-spread use. 

Simulation-based
Vivaldi ["Vivaldi: A Decentralized Network Coordinate System.] and Big Bang Simulation ["Big-Bang Simulation for embedding network distances in Euclidean space."] determine coordinates using spring-relaxation and force-field simulation, respectively. In both, nodes attract and repel each other according to network distance measurements. The low-energy state of the physical system corresponds to the coordinates with minimum error. 

(https://www.usenix.org/legacy/events/nsdi07/tech/full_papers/ledlie/ledlie_html/index_save.html)

Approaches:
Euclidean distance model, matrix factorization model and Hyperbolic space model


Examples:
GNP, VL, ICS (use all landmarks) 
 Vivaldi, NPS, PIC (dencentralized)

### Compact Routing

Compact Routing refers to a category of routing algorithms that do not guarantee short path delivery but worst-case sublinear (e.g. log) growing state at all nodes. It guarantees an upper bound path length called path stretch (times the length of the shortest path) between all sources and destinations nodes.

For Dynamic networks (MANET) or static networks (like Internet)?

Compact routing investigates the trade-off between path length and routing table size.

Examples: Thorup-Zwick, Brady-Cowen

Thorup and Zwick: O(sqrt(n)) table size on each node, maximum multiple path stretch of 3

"Additionally, it is known that no routing algorithm can exist that guarantees sublinear state
growth at all nodes while simultaneously guaranteeing a worst-case multiplicative path stretch
better than 3 [72]." [https://csperkins.org/research/thesis-phd-strowes.pdf]

Mean multiplicative stretch of 1.1 on snapshot of the Internet AS graph.

https://users.cs.duke.edu/~xwy/publications/compact_routing.pdf

[On Compact Routing for the Internet](https://arxiv.org/pdf/0708.2309.pdf)


### Static Routing

Uses Nonadaptive algorithms. Choice of route is computed in advance and then put onto routers.

### Dynamic Routing / Adaptive Routing

Routing decisions changes as the network topology changes.

### Minimum Spanning Tree

A Minimum Spanning Tree (MST) is a acyclic connected graph. A network whose edges are removed to form a tree structure that also has the minimum weight of all remaining edge numbers.

A MST ist created by dividing a graph in two connected parts. The edge with the minimal weight is then part of the MST. The same algoritm is applied to each two parts.

Algorithms to create a MST: Prim's Algorithm, Kruskal's Algorithm

### Shortest Paths Algorithms

In distributed routing protocols, Dijkstra’s algorithm and Bellman-Ford are commonly used.  These Dijstra's algorithm is run locally on each node in a link-state routing protocol (every node knows the whole network topology). Bellman Ford is run locally on all known distances to all other
nodes resulting in a distance vector approach. 

### Path Stretch

Relation of the path length to the shortest path length. There is multiplicative and additive stretch. Often used to describe an upper bound for the path length. 
A multiplicative patch stretch of 3 would refer to a worst case path length three times the shortest path.

### Labelled vs. Unlabelled Routing Schemes

TODO: did not understand...
Labelled algorithms (e.g. using landmarks) need additional information to node ids to route packets.
Unlabelled algorithms must use arbitrary node ids.


### GLS

[GLS](http://cseweb.ucsd.edu/classes/sp07/cse291-d/presentations/farrington.pdf)

### Power Law Distribution

### Scale Free Network

A network where most nodes only have very few connections, but some nodes have a lot of connections. The number of connections is distributed by a power law (exponetional distribution).

### Small World Network

A network where a single node knows some nodes far away, but exponentionaly more nodes with shrinking distance. A DHT works by this principle to guarantee O(log(n)) lookups.

### OSPF

For cable/static networks. Creates a spanning tree and ignores other connections not part of the tree. If a connection breaks, a new spanning tree is formed. OSPF or IS-IS is typically used for networks operated by the same network operator (a interior BGP protocol).  

### LISP

Locator/Identifier Separation is a principle to map static identifiers (like IP or MAC address)  dynamic locators. This separation principle is meant to improve future routing approaches.

In a typical network, the IP address also encodes the network location. Aside from that, a MAC address is a pure identifier.

### BGP

Border Gateway Protocol. Used as the backbone protocol of the Internet. All ISP (Internet Service Provider) network prefixes are shared among all other BGP partitipants. Routing is done via shortest path. BGP allows policies to be set to choose cost effective paths over peers.

BGP is between organizations, which inside runs internally of the network owned by one organization (like OSPF).
Organizations in BGP are assigned an AS (Automous System) number. The routing table of a BGP router contains an IP address prefix, the originator AS number, and the path of AS numbers to reach the originator.
Traffic will be forwarded to the AS with the longest prefix match and passed towards the AS router with the "shortest" path to the destination.

Traffic flows through a tree where parents are the providers

Routing table entries are propagated to other BGP routers which decide if thes insert the entries into their own routing table and certain routes are given a preference.
This is the important part of BGP, as specific routes may be preferred, even if they are not the fastest. Peers have different kind of business relationships. They forward traffic with a certain costs that every peer wants to minimize. BGP has a lot of options to influence a routing decision.
This can get very complicated.

Routing preference:
1. Longest prefix match
2. Highest Local Priority
3. Shortest AS Path
4. Lowest MED (if routes through same AS)
5. Min Cost Next hop  router (consulting IGP)
6. Prefer external to internal routes
6.2. Pick lowest BGP identifier among many E-BGP
6.2. Pick lowest BGP identifier among many I-BGP

BGP treats every connection as bi-drectional.

BGP relationships

* Customer and Provider: Customer pays provider for the Internet access
* Peer to Peer: Exchange traffic between customers
* Sibling to Sibling: Exchange traffic at will, it is the same organization, but with different AS numbers

### Source Routing

In Source Routing, also called path addressing, a packet header contains the full or partial path a packet has to traverse to reach the destination ().


### Source Specific Routing

Examples: Babel

### Label Switching

### Scalable Source Routing

Mesh routing protocol, DHT and source routing semantics 

### TORA

ractive
Logical time of link failure. "Height" metric.
Node entry: [logical time of link failure, node-id that updated the reference level, reflection indicator bit, propogation ordering parameter, unique node id]

### AODV

Reactive:
Sent route request packet. On receiving a request for a route path, a node remembers:
`[node, next-node, hops-to-node, path-sequence-number]` (the previous path)
When destination is reached, the desitination will send packet back on the path.
Every nodes on the path adds an entry that makes the path back possible and established the orginally requested path for routing.

### DSR

Reactive

Route-Discovery: Network is flooded with Route Disvovery packets containing [Request-Sequence-ID, path, source, destination], path is extended on each hop.

### GHLS

Grid Location Service 
.. Location Service. A mesh routing protocol which used geographic routing. Every node hashes its id to a location and stores its own coordinates at that a node near that location (anchor node).

### Fisheye State Routing

[Fisheye State Routing](https://en.wikipedia.org/wiki/Fisheye_State_Routing) is a Link State protocol (every node knows the entire topology). Hello messages are send to direct neighbors much more frequently that to nodes further away.
Pro:
 - better scalability
Cons:
 - might construct routing loops (albeit temporary) as nodes further away have different view of the topology if nodes move.

### Topology Control

Often used for wireless ad-hoc and sensor networks. Improves distributed algorithms by achange of topology. By limiting transmission range or disconnect nodes to reduce interference or to form a spanning tree, that makes it easier for routing.

Example: OSPF

### Network Coding

Send XORed packets to multiple nodes in range. With subsequent packets, the retransmission rate can be reduced when a data frame gets lost in transmission.

### Multi-Point Relays (MPR)

A way to optimize broadcast traffic. Multi-Point Relay (MPR) nodes are a set of nodes, so that every node is only one hop away from a node in the MPR set. Broadcast traffic coming from a node x is only propagated through these nodes.
Finding the optimal set is NP complete, but heuristic approaches are most times sufficient.
The task is that all nodes get a packet, but only via one neighbor.
To get the neccessary information, a nodes discovers it's one and two hop neighbors.

Examples: OLSR

### Multi Dimensional Scaling (MDS)

### Connected Dominating Set

Another way to optimize broadcast traffic. The set consists of nodes that are connected and have all other nodes as 1 hop nodes. Broadcast traffic is send through this line of nodes to all nodes.


### Distance-Vector vs. Link State

Distance-vector approaches only tries to decide the next neighbor a packet needs to be send to based on the cost to the destination.
In Link state protocols every node has a view of the whole network topology and it's link properties. There are also many hybrid approaches.

Distance-Vector:
* tendency to create routing loops
* slow convergence

Link-State:
* more routing overhead (less scalability)

Link-State: OSPF, IS-IS
Distance-Vector: RIP, IGRP
(none are MANET protocols)

### Hierarchical Routing

Clustering of nodes with cluster heads.
Spanning tree..


### Routing Metric

The routing metric is used to decide what path to choose. It attaches a cost to a path through the network.

Metric can be based on hopcount, packet-loss, throughput, latency or energy consumption. Hybrid metric are also possible.

### Convergence

A network is said to have converged, if all nodes have come to an angreement of its structure.
In MANETs, there will be packets send all the time to keep moving towards a convergence state in case the network changes.

## 802.11s

802.11s needs a special mentioning here, because it is implemented in wireless hardware and provides the base to run other routing protocols on top. This is done by disabling 802.11s meshing and to only use the MAC layer for some other mesh routing software such as batman-adv.
802.11s alone provides a mesh network of up to 32 nodes, which is not sufficient for large scale networks.

Note: Wireless Ad-Hoc mode can also be used to run mesh routing implementation on top. But it is old and often broken.

## OLSR

Link State Routing protocol. Layer 3. Based on the concept of MPR. Every node uses iterative Dijkstra shortest path algorithm on the discovered topology to find the shortest path.

## BATMAN-adv

Layer 2. Packet lost metric (`batman_IV`) or bandwith metric (`batman_V`).

[batman-adv - Kernel Space L2 Mesh Routing](https://downloads.open-mesh.org/batman/papers/batman-adv_v_intro.pdf)

## BMX
Layer 3. Started out as a fork of the batmand routing daemon before it changed to BATMAN-adv.
[BMX? thesis](http://people.ac.upc.edu/leandro/docs/phd_axel.pdf)

## Legend

* BATMAN-adv: Better Approach To Mobile AdHoc Networking - advanced
* OLSR: Optimized Link State Routing Protocol
* MANET: Mobile AdHoc Network
* WMN: Wireless Mesh Network
* DSR: Dynamic Source Routing Protocol
* AODV: Ad-hoc On-demand Distance Vector
* DSDV: Destination Sequenced Distance Vector
* MPR: Multi-Point Relays
* Jitter: variability of the packet latency across the network

## Popular MANET Protocols

* [Babel](https://www.irif.fr/~jch/software/babel/) [Video](https://www.youtube.com/watch?v=1zMDLVln3XM)
* [BMX6](http://bmx6.net/)
* [BMX7](https://github.com/bmx-routing/bmx7)
* [BATMAN-adv](https://www.open-mesh.org/projects/batman-adv/wiki)
* [OLSR](http://www.olsr.org/mediawiki/index.php/Main_Page)
* [802.11s](https://en.wikipedia.org/wiki/IEEE_802.11s)

## Further Reading

[MANET, its types, Challenges, goals and Approaches: A Review](https://www.ijsr.net/archive/v5i5/NOV163727.pdf) (And linked articles)
[Multipoint Relay flooding: Network coding improvements](https://people.kth.se/~maguire/DEGREE-PROJECT-REPORTS/090421-Wanning_Zhu-with-cover.pdf)
[Performance Analysis and Simulation of a Freifunk mesh network](http://thardes.de/wp-content/uploads/2016/03/thesis.pdf) (BATMAN-adv related)
[Evaluation of mesh routing protocols for wireless community networks](http://people.ac.upc.edu/leandro/pubs/eomrpfwcn.pdf) (Babel, OLSR, BMX6)
