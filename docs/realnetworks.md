
# Real Networks

## With own links (wire-/wireless)

### Freifunk

[Freifunk](freifunk.net)

* since 2003
* aims to work mostly on WiFi links
* aims to have a decentralized, non-commercial, people based infrastructure for data
* off the shelf wifi routers (starting around 20EUR per node)
* every node opens up a Access Point for public access without login
* Internet access via gateway in the Freifunk network
* decentralized communities, every community with slightly different configuration or approach  
* organized into local communities
* >300 communities of separate mesh networks
* mostly batman-adv, some OLSR, experiments with Babel
* >45.000 nodes overall in Germany
* most routers are inter-connected over the Internet to connect areas that are out of range (>50m)


### Disaster Area Network

[Disaster Radio](https://disaster.radio/)

* since 2019
* uses LoRa, primarily with ESP32
* mesh network
* App that communicates with the ESP32 to send specific messages (chat, map, ..) over LoRa
* sends out hello packets every 15 seconds, data packets also act as hello messages
* every node has a niehgbor and a routing table
* routing table is send in intervals (max. 30 fit in dedicated packet)
  * more routing entries will send via multiple pakets in randomized portions
* [Protocol info](https://github.com/sudomesh/disaster-radio/wiki/Protocol)

### HAMNET

[European HAMNET](https://www.youtube.com/watch?v=3A6DDrJRcws)

* uses frequencies with higher range
* operators need Amateur radio operator license
* separated into regions that run some mesh network protocol
 * use eBGP on global level


### goTenna

A commercial Token with low band transmitter and blue tooth.

* BTLE (2.4 GHz) to mobile phone and MURS (150 MHz), USA only
* intended for hikers to send position (from phone app), meeting point, small messages in general
* small size, low weight and low power consumption
* long distance transmission (~ 3mil?)
* very small transmission bandwith (MURS), ~ 250 bytes per minute on the entire band
  * changed to another frequency now
* controlled via phone app and bluetooth
* expensive (~ 150EUR)
* mesh protocol documented in "ECHO: Efficient Zero-Control Network-WideBroadcast for Mobile Multi-hop Wireless Networks"

(Packet sniffing the Gotenna - DEF CON 25)[https://www.youtube.com/watch?v=pKP74WGa_s0]
[Kickstarter](https://www.kickstarter.com/projects/gotenna/gotenna-mesh-off-grid-people-powered-connectivity)

## With primary links over the Internet

These are networks that are meant to work mostly over the Internet.

#### Pure Overlays

Pure overlays over the Internet with some sort of meshing to create a decentralized system.

#### Freenode

Since: 
Overlay over the Internet only.

#### DN42

People connect between over the Internet with VPN tunnels to run BGP over it.
It is a Internet on the Internet to play around with BGP.

[Graph](https://nixnodes.net/dn42/graph/)

### CJDNS

* works entirely over the Internet
* P2P VPN network with explicity peering
* written in C
* state: mature

### GnuNet

* Written in C
* state: mature

An extensive environment.

(Overview)[https://www.youtube.com/watch?v=eM4J7ljCExM] ((Slides)[https://grothoff.org/christian/psc2015.pdf])
(R5N DHT)[https://grothoff.org/christian/teaching/2012/2194/r5n.pdf] ((Paper)[https://grothoff.org/christian/nss2011.pdf])

### Named Data Networking (NDN)

(Names Data Networking)[https://named-data.net/] focuses on requesting data by name prefixes.
- IP based routing based on endpoint addresse is the wrong approach for addressing on the Internet.
- Use content centric address approach is choosen.
- No NAT, ARP, DHCP, DNS etc. needed

A NDN router has several components:
- Forwarding  Information Base (FIB): a route cache for discovered routes to content
- Pending Interest Table (PIT): Store of requests (called Interest packets) that has been forwarded and wait for returning data.
- Content Store (CS): a cache containing  previously received Data.
- Forwarding Strategy Module: The routing module to route Interest packets to the destination. Several routing strategies are considered. 

Named Data Link State Routing (NLSR) and greedy routing on (hyperbolic embeddings)[https://arxiv.org/pdf/1611.00403.pdf] are tested. Small testbeds exist.

### Yggdrasil

* since 2018 (in beta)
* IPv6 inside
* node starts with a few peers or neihgbors (in a mesh environment). One will be the parent of a spanning tree, the other childs or a connection will be refused.
* nodes on the tree have virtual coordinates
* a DHT is used inside the spanning tree structure to find the virtual coordinates based on an IPv6 destination address
* intended for working on the Internet and semi static mesh networks
* A direct shortcut connection will be taken if found
* written in Go
* state: alpha
