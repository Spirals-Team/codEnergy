var dataStream = json.streamgraph;
//TODO: get frequency from json
var frequency = 250

dataStream.forEach(function(d) {
  d.y = +d.y / 1000;
});

function formatTick(d) {
  var ms_num = parseInt(d, 10);
  var hours   = Math.floor(ms_num / 3600000);
  var minutes = Math.floor((ms_num - (hours * 3600000)) / 60000);
  var seconds = Math.floor((ms_num - (hours * 3600000) - (minutes * 60000)) / 1000);
  var ms = ms_num - (hours * 3600000) - (minutes * 60000) - (seconds * 1000);

  var strHour = hours == 0 ? "" : hours + "H";
  var strMin = minutes == 0 ? "" : minutes + "m";
  var strSec = seconds == 0 ? "" : seconds + "s";
  var strMs = ms + "ms";
  
  return strHour + strMin + strSec + strMs;
}

function update(data, layout) {
  var svgStream = d3.select("#streamgraph-body").append("svg").attr("style", "stroke: grey;").append("g");

  var nest = d3.nest().key(function(d){ return d.name});
  var stack = d3.layout.stack().offset(layout).values(function(d) { return d.values; });

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
    .attr("height", height + 25);

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


  var xAxis = d3.svg.axis()
                .scale(xStream)
                .tickFormat(function(d) { return formatTick(d * frequency); })
                .orient("bottom")
                .ticks(10);

  svgStream.selectAll("path")
    .data(layers)
    .enter()
    .append("path")
    .attr("d", function(d) {return areaStream(d.values); })
    .style("fill", function(d) { return colors(d.key.split(".").slice(-1)[0]); });

  svgStream.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
      
  svgStream.selectAll("path")
    .on("mousemove", function(d, i) {
        mousex = d3.mouse(this);
        mousex = mousex[0];
        var index = Math.floor(xStream.invert(mousex));
        var power = "{0} W".replace("{0}", d.values[index].y.toFixed(2));
        var fields = d.key.split(".");
        var name = fields[fields.length - 1];
        var firstParenthesis = name.indexOf("(");
        var firstSpace = name.indexOf(" ");
        var start = (firstSpace == -1 || firstSpace >= firstParenthesis) ? 0 : firstSpace + 1;
        var end = firstParenthesis == -1 ? name.length : firstParenthesis;
        $("#info .form-horizontal #method span").text(name.substring(start, end));
        $("#info .form-horizontal #power span").text(power);
      })
      .on("mouseout", function(d, i) {
        $("#info .form-horizontal #method span").text("/");
        $("#info .form-horizontal #power span").text("/");
      });

  svgStream.selectAll(".tick")
    .filter(function(d, i) { return i === 0 || i === svgStream.selectAll(".tick").size() - 1; })
    .remove();
}

function transition() {
  d3.select("#streamgraph-body svg").remove();

  var context = $("input[name=context-js]").val();

  update(dataStream.filter(function(d) {
    return d.name.substring(0, context.length) === context;
  }));
}

update(dataStream, "silhouette");

$("input[name=context-js]").on("change", transition);

$("#layout select").change(function() {
  d3.select("#streamgraph-body svg").remove();

  update(dataStream, this.value);
});
