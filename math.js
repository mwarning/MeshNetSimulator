
function createMath() {
  var self = {};

  self.distance = function distance(a, b) {
    return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
  };

  self.distancePoint = function distancePoint(a, b) {
    return Math.sqrt(self.distance(a, b));
  };

  self.distanceLink = function distanceLink(p, a, b) {
    /* http://stackoverflow.com/questions/849211 */
    var l2 = self.distance(a, b);
    if (l2 === 0) {
      return self.distance(p, a);
    }
    var t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    if (t < 0) {
      return self.distance(p, a);
    } else if (t > 1) {
      return self.distance(p, b);
    }
    return self.distancePoint(p, {
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y)
    });
  };

  return self;
}
