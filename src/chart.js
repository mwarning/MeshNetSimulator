
function createChart(chart_id) {
  var self = this;
  var el = document.getElementById(chart_id);
  /*
  function createDataEntry(i) {
    return {a: i, b: (i + 10 - (10 * Math.random()))};
  }

  function createData(n) {
    var data = [];
      for (var i = 0; i < n; i++) {
        data.push(createDataEntry(i));
      }
    return data;
  }

  var n = 30;
  var data = createData(n);
  */
  var data = [];

  // Set the dimensions of the canvas / graph
  var margin = {top: 5, right: 0, bottom: 20, left: 20},
    width = 380 - margin.left - margin.right,
    height = 220 - margin.top - margin.bottom;

  // Set the ranges
  var x = d3.scaleLinear().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);

  // Define the axes
  var xAxis = d3.axisBottom().scale(x)
    .ticks(5);

  var yAxis = d3.axisLeft().scale(y)
    .ticks(5);

  // Define the line
  var valueline = d3.line()
    .x(function(d) { return x(d.a); })
    .y(function(d) { return y(d.b); });

  // Adds the svg canvas
  var svg = d3.select(el)
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the data
    x.domain(d3.extent(data, function(d) { return d.a; }));
    y.domain([0, d3.max(data, function(d) { return d.b; })]);

    // Add the valueline path.
    svg.append("path")
      .attr("class", "line")
      .attr("d", valueline(data));

    // Add the X Axis
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    // Add the Y Axis
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  self.addPoint = function(x, y) {
    data.push({a: x, b: y});
  };

  self.reset = function () {
    self.data = [];
    self.updateData();
  }

  // ** Update data section (Called from the onclick)
  self.updateData = function () {
    //n += 1;
    //data.push(createDataEntry(n));

    // Scale the range of the data again 
    x.domain(d3.extent(data, function(d) { return d.a; }));
    y.domain([0, d3.max(data, function(d) { return d.b; })]);

    // Select the section we want to apply our changes to
    var svg = d3.select("body").transition();

    // Make the changes
    svg.select(".line")   // change the line
      .duration(750)
      .attr("d", valueline(data));
    svg.select(".x.axis") // change the x axis
      .duration(750)
      .call(xAxis);
    svg.select(".y.axis") // change the y axis
      .duration(750)
      .call(yAxis);
  };

  return self;
}
