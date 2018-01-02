## What is mesh networking

Mesh networks consist of nodes connected via links. The links might be wired or wireless connections.
These networks change frequently due to nodes going offline/online and connections getting disturbed.
Also, nodes might be mobile and connect to other nodes, vanish or appear. These networks are called Mobile Ad Hoc Networks (MANET).

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

### Pro-Active vs. Reactive

Reactive (also on demand) routing protocols try to gather the information need for routing when a packet arrives.
This usually means that there is less traffic to keep local routing information up to date. It is only updated/gatheres when a packet actually needs to be routed. On the other hand this adds latency.

Example: DSR, AODV

Pro-active (also table driven) protocols keep all information ready and up to date for when a packet needs to be routed. For this a table of all received routing information is maintained.
This approach is popular in existing implementations, but needs a steady overhead to keep the routing information up to date.

Examples: DSDV, OLSR, BATMAN-adv

### Distance-Vector vs. Link State

Distance-vector approaches only try to decide the next neighbor a packet needs to be send to. 
In Link state protocols every node has a view of the whole network topology and it's link properties.
There are also hybrid approaches.

### Routing Metric

The routing metric is used to decide what path to choose. It attaches a cost to a path through the network.

Metric can be based on hopcount, packet-loss, throughput, latency and energy consumption.

### Convergence

A network is said to have converged, if all nodes have come to an angreement of its structure.
In MANETs, there will be packets send all the time to keep moving towards a convergence state in case the network changes.

## 802.11s

802.11s needs a special mentioning here, because it is implemented in wireless hardware and provides the base to run other routing protocols on top. This is done by disabling 802.11s meshing and only using the MAC layer for some other mesh routing software.
802.11s alone provides a mesh network of up to 32 nodes, which is not sufficient for large scale networks.

Note: Wireless Ad-Hoc mode can also be used to run mesh routing implementation on top. But it is old and often broken.

## Legend

* BATMAN-adv: Better Approach To Mobile AdHoc Networking - advanced
* OLSR: Optimized Link State Routing
* MANET: Mobile AdHoc Network
* WMN: Wireless Mesh Network
* DSR: Dynamic Source Routing
* AODV: Ad-hoc On-demand Distance Vector
* DSDV: Destination Sequenced Distance Vector

## Popular MANET Protocols

[Babel](https://www.irif.fr/~jch/software/babel/)
[BMX](http://bmx6.net/)
[BATMAN-adv](https://www.open-mesh.org/projects/batman-adv/wiki)
[OLSR](http://www.olsr.org/mediawiki/index.php/Main_Page)
[802.11s](https://en.wikipedia.org/wiki/IEEE_802.11s)
(In no particular order.)

## Further Reading

[MANET, its types, Challenges, goals and Approaches: A Review](https://www.ijsr.net/archive/v5i5/NOV163727.pdf) (And linked articles)
