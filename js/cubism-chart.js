var frequency = json.cubism.frequency;
var data = json.cubism.data;
var format = d3.format(".3f"), formatWatt = function(d) { return format(d) + "W"; }

var context = cubism.context()
    .serverDelay(-Date.now())
    .step(frequency)
    .size(data[0].powers.length)
    .stop();

d3.select("#cubism-body").append("div")
    .attr("class", "rule")
    .call(context.rule());

d3.select("#cubism-body").selectAll(".horizon")
    .data(filteredContext($("input[name=context-js]").val()).map(jsonToData))
  .enter().insert("div", ".bottom")
    .attr("class", "horizon")
  .call(context.horizon()
    .height(40)
    .extent([0, 60])
    .colors(["#fff7fb","#ece2f0","#d0d1e6","#a6bddb","#67a9cf","#3690c0","#02818a","#016c59","#014636"])
    .format(function (d) {
      return formatWatt(d);
    }));

function filteredContext(current) {
  var filteredObjects = data.filter(function(elt) {
    return elt.name.substring(0, current.length) === current
  });

  return filteredObjects.map(function(obj) { return obj.name; });
}

function jsonToData(name) {
  return context.metric(function(start, stop, step, callback) {
    var filteredObject = data.filter(function(elt) {
      return elt.name == name;
    });

    callback(null, filteredObject[0].powers.map(function(data) { return data.power / 1000; }));
  }, name);
}
