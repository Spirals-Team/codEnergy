function fullName(d) {
  var names = [];
  var current = d;

  while (current.parent) {
    names.unshift(current.name)
    current = current.parent;
  }
  
  names.unshift("main")

  return names.join(".");
}

function rawEnergy(d) {
  var energy = 0.0;

  if(d.children) {
    $.each(d.children, function(index, child) {
      energy += rawEnergy(child);
    });
  }

  else energy = d.selfEnergy;

  return energy;
}

function formatName(d) {
  var str = "<b>{0}</b><br><b>{1} J ({2}% of {3} J)</b>";
  var name = d.name == "self" ? "{1} ({2})".replace("{1}", d.parent.name).replace("{2}", "parent") : d.name;
  var raw = rawEnergy(d);
  var percentEnergy = ((raw / d.totalEnergy) * 100);
  var totalEnergy = d.totalEnergy;

  return str.replace("{0}", name)
    .replace("{1}", (raw / 1000).toFixed(2))
    .replace("{2}", percentEnergy.toFixed(2))
    .replace("{3}", (totalEnergy / 1000).toFixed(2));
}

var width = 800,
    height = 700,
    radius = Math.min(width, height) / 2;

var xSunburst = d3.scale.linear()
    .range([0, 2 * Math.PI]);

var ySunburst = d3.scale.sqrt()
    .range([0, radius]);

var svg = d3.select("#sunburst")
  .append("svg")
  .attr("id", "svg")
  .attr("viewBox", "0 0 " + width + " " + height)
  .attr("preserveAspectRatio", "xMinYMid")
  .append("g")
  .attr("transform", "translate(" + (width / 2.25) + "," + (height / 2) + ")");

var tooltip = d3.select("#sunburst")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("opacity", 0);

var partition = d3.layout.partition().value(function(d) { return d.selfEnergy; });

var arc = d3.svg.arc()
  .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, xSunburst(d.x))); })
  .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, xSunburst(d.x + d.dx))); })
  .innerRadius(function(d) { return Math.max(0, ySunburst(d.y)); })
  .outerRadius(function(d) { return Math.max(0, ySunburst(d.y + d.dy)); });

var sunburstData = partition.nodes(json.sunburst);
var nbColors = sunburstData.length > 100 ? 100 : sunburstData.length;
var colorsIWH = paletteGenerator.generate(
  nbColors, // Colors
  function(color){ // This function filters valid colors
    var hcl = color.hcl();
    return hcl[0]>=0 && hcl[0]<=360
      && hcl[1]>=0.4 && hcl[1]<=1.2
      && hcl[2]>=1 && hcl[2]<=1.5;
  },
  true, // Using Force Vector instead of k-Means
  50 // Steps (quality)
);
colorsIWH = paletteGenerator.diffSort(colorsIWH).map(function(color){return color.hex()});
var colors = d3.scale.ordinal().range(colorsIWH);

var path = svg.selectAll("path")
  .data(sunburstData)
  .enter()
  .append("path")
  .attr("d", arc)
  .style("fill", function(d) { 
    if(d.name == "self") {
      var t = textures.lines().size(4).strokeWidth(1);
      t.stroke(colors(d.parent.name));
      d3.select("svg").call(t)
      return t.url();
    }
    else return colors(d.name);
  })
  .style("stroke", function(d) { return d.name == "self" ? "" : "white"; })
  .on("click", function(d) {
    if(d.name != "self") {
      path.transition().duration(750).attrTween("d", arcTween(d));
    }
  })
  .on("mouseover", function(d) {
    tooltip.html(function() {
      return formatName(d);
    });
  
    return tooltip.transition()
      .duration(50)
      .style("opacity", 1);
  })
  .on("mousemove", function(d) {
    return tooltip
      .style("top", (d3.event.pageY - 65) + "px")
      .style("left", (d3.event.pageX + 15) + "px");
  })
  .on("mouseout", function() { 
    return tooltip.style("opacity", 0);
  });

// Zooming: interpolate the scales
function arcTween(d) {
  var name = fullName(d);
  d3.select("#context span").text(name);
  $("input[name=context-js]").attr("value", name).trigger('change');

  var xd = d3.interpolate(xSunburst.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(ySunburst.domain(), [d.y, 1]),
      yr = d3.interpolate(ySunburst.range(), [d.y ? 20 : 0, radius]);
  return function(d, i) {
    return i
        ? function(t) { return arc(d); }
        : function(t) { xSunburst.domain(xd(t)); ySunburst.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}

var chart = $("#sunburst"),
    aspect = chart.width() / chart.height(),
    container = chart.parent();

$(window).on("resize", function() {
    var targetWidth = container.width();
    chart.attr("width", targetWidth);
    chart.attr("height", Math.round(targetWidth / aspect));
}).trigger("resize");
