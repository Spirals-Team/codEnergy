var dataStream = json.streamgraph;
dataStream.forEach(function(d) {
  d.y = +d.y / 1000;
});

function update(data) {
  var svgStream = d3.select("#streamgraph-body").append("svg").attr("style", "stroke: grey;").append("g");

  var nest = d3.nest().key(function(d){ return d.name});
  var stack = d3.layout.stack().offset("silhouette").values(function(d) { return d.values; });

  var layers = stack(nest.entries(data));
  var m = layers[0].values.length;

  var yDomain = d3.max(layers, function(layer) { 
    return d3.max(layer.values, function(d) { 
      return d.y0 + d.y; 
    }); 
  });

  var width = $(window).width() - 100;
  var height = 200;

  d3.select("#streamgraph-body svg")
    .attr("width", width)
    .attr("height", height);

  var starts = [];
  var ends = [];

  layers.forEach(function(layer) {
    var startObj = layer.values.filter(function(obj) { return obj.y > 0; })[0];
    var endObj = layer.values.slice(0).reverse().filter(function(obj, index) { return obj.y > 0; })[0];
    starts.push(startObj === undefined ? 0 : startObj.x);
    ends.push(endObj === undefined ? m : endObj.x)
  });

  var start = Math.min.apply(Math, starts);
  var end = Math.max.apply(Math, ends);

  var xStream = d3.scale.linear()
            .domain([start, end])
            .range([0, width - 10]);

  var yStream = d3.scale.linear()
            .domain([0, yDomain])
            .range([height - 10, 0]);

  var areaStream = d3.svg.area()
              .x(function(d) { return xStream(d.x); })
              .y0(function(d) { return yStream(d.y0); })
              .y1(function(d) { return yStream(d.y0 + d.y); }); 

  svgStream.selectAll("path")
     .data(layers)
     .enter()
      .append("path")
      .attr("d", function(d) {return areaStream(d.values); })
      .style("fill", function(d) { return colors(d.key.split(".").slice(-1)[0]); });
      
  svgStream.selectAll("path")
    .on("mousemove", function(d, i) {
        mousex = d3.mouse(this);
        mousex = mousex[0];
        var index = Math.floor(xStream.invert(mousex));
        var power = "{0} W".replace("{0}", d.values[index].y.toFixed(2));
        $("#info .form-horizontal #method span").text(d.key);
        $("#info .form-horizontal #power span").text(power);
      })
      .on("mouseout", function(d, i) {
        $("#info .form-horizontal #method span").text("/");
        $("#info .form-horizontal #power span").text("/");
      });
}

function transition() {
  d3.select("#streamgraph-body svg").remove();

  var context = $("input[name=context-js]").val();

  update(dataStream.filter(function(d) {
    return d.name.substring(0, context.length) === context;
  }));
}

update(dataStream);

$("input[name=context-js]").on("change", transition);
