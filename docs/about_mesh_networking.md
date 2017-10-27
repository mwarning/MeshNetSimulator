## What is mesh networking

Mesh networks consist of arbritray connected nodes.
In case of mesh networks
The problem of mesh networking 
Mesh networking is the problem to forward packets

Routing loops
Convergence
Scalability
split horizon

## Categories

Mesh routing algorithms can be categorized by different distinct properties.

### Layer 2 vs. Layer3
Emulating OSI model layer 2 or 3 as part of the mesh network protocol has some pros and cons.

Layer 2 is the data link layer and deals with MAC addresses. Layer 2 mesh routing implementations basicly emulate a big switch.
pros:
- easier to implement
- trivial to implement roaming (when a client moves between nodes)

Layer 3 is the procotol layer and deals with IP addresses.
The routing protocol takes care of assigning subnets.
pros:
- better scalability because subnets do not foward broadcast/mutlicast packets by definition

As always, things are not clear cut as many properties can be achieved in some other way.


### Pro-Active vs. Reactive

Reactive routing protocols try to gather the information need for routing when a packet arrives.
This usually means that there is less traffic to keep local routing information up to date. It is only updated/gatheres when a packet actually needs to be routed. On the other hand this adds latency.

Pro-active approaches keep all information ready and up to date for when a packet needs to be routed.
This approach is popular in existing implementations, but need a steady overhead to keep the routing information updated.

### Distance-Vector vs. Link State

Distance-vector approaches only try to decide the next neighbor a packet needs to be send to. 
Link state protocols have a view of the whole network topology and it's link properties on each node.

### Routing Metric

hopcount
packet-loss
throughput
latency 

## Implemenation

[Babel](https://www.irif.fr/~jch/software/babel/)
[BATMAN-adv](https://www.open-mesh.org/projects/batman-adv/wiki)
[OLSR](http://www.olsr.org/mediawiki/index.php/Main_Page)
[802.11s]() Hardcoded limit of up to ~30 nodes.



