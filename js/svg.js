var Sunburst = (function () {
    function Sunburst(name) {
        this.name = name;
        this.children = new Map();
        this.cpu = 0;
        this.disk = 0;
    }
    Sunburst.prototype.addChild = function (path, cpu, disk) {
        var dotIndex = path.indexOf('.');
        var method = dotIndex > 0 ? path.substring(0, dotIndex) : path;
        var remainingPath = dotIndex > 0 ? path.substring(dotIndex + 1) : '';
        if (this.children.has(method)) {
            if (remainingPath != '')
                this.children.get(method).addChild(remainingPath, cpu, disk);
            else {
                this.children.get(method).cpu = cpu;
                this.children.get(method).disk = disk;
            }
        }
        else {
            var subgraph = new Sunburst(method);
            this.children.set(method, subgraph);
            if (remainingPath != '')
                this.children.get(method).addChild(remainingPath, cpu, disk);
            else {
                subgraph.cpu = cpu;
                subgraph.disk = disk;
            }
        }
    };
    Sunburst.prototype.power = function () { return this.cpu + this.disk; };
    Sunburst.prototype.json = function () {
        var object = {};
        var children;
        children = Array.from(this.children.values()).map(function (node) { return node.json(); });
        var selfCPU = {};
        selfCPU.name = 'selfCPU';
        selfCPU.power = this.cpu;
        var selfDisk = {};
        selfDisk.name = 'selfDISK';
        selfDisk.power = this.disk;
        children.push(selfCPU);
        children.push(selfDisk);
        object.children = children;
        object.name = this.name;
        object.power = this.power();
        return object;
    };
    return Sunburst;
}());
var SVG = (function () {
    function SVG() {
    }
    SVG.createSunburst = function (d3, jquery, textures, colors, sunburstJson) {
        var partition = d3.layout.partition().value(function (d) { return d.power; });
        var sunburstData = partition.nodes(sunburstJson);
        function formatJSObjName(obj) {
            var name = obj.name.startsWith('self') ? obj.parent.name + " [" + obj.name.split('self')[1] + "]" : obj.name;
            var energy = obj.value;
            var totalEnergy = sunburstData[0].value;
            var percent = (energy / totalEnergy) * 100;
            return "<b>" + name + "</b><br><b>" + energy.toFixed(2) + " J (" + percent.toFixed(2) + "% of " + totalEnergy.toFixed(2) + " J)</b>";
        }
        function fullName(obj) {
            var current = obj;
            var path = new Array();
            var pathToDisplay = new Array();
            while (current.parent) {
                var firstParenthesis = current.name.indexOf("(");
                var firstSpace = current.name.indexOf(" ");
                var start = (firstSpace == -1 || firstSpace >= firstParenthesis) ? 0 : firstSpace + 1;
                var end = firstParenthesis == -1 ? current.name.length : firstParenthesis;
                path.unshift(current.name.substring(start, end));
                pathToDisplay.unshift(current.name);
                current = current.parent;
            }
            pathToDisplay.unshift(current.name);
            return { 'pathToDisplay': pathToDisplay.join("."), "path": path.join(".") };
        }
        var width = 350, height = 250, radius = Math.min(width, height) / 2;
        var xSunburst = d3.scale.linear()
            .range([0, 2 * Math.PI]);
        var ySunburst = d3.scale.sqrt()
            .range([0, radius]);
        var svg = d3.select('#sunburst')
            .append('svg')
            .attr('id', 'svg')
            .attr('viewBox', "0 0 " + width + " " + height)
            .attr('preserveAspectRatio', 'xMinYMid')
            .append('g')
            .attr('transform', "translate(" + width / 2.25 + "," + height / 2 + ")");
        var tooltip = d3.select('#sunburst')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('z-index', '10')
            .style('opacity', 0);
        var arc = d3.svg.arc()
            .startAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, xSunburst(d.x))); })
            .endAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, xSunburst(d.x + d.dx))); })
            .innerRadius(function (d) { return Math.max(0, ySunburst(d.y)); })
            .outerRadius(function (d) { return Math.max(0, ySunburst(d.y + d.dy)); });
        var path = svg.selectAll('path')
            .data(sunburstData)
            .enter()
            .append('path')
            .attr('d', arc)
            .style('fill', function (d) {
            if (d.name == 'selfCPU') {
                var t = textures.circles().size(4).radius(2).fill('white').stroke(colors(d.parent.name)).strokeWidth(2);
                d3.select('#sunburst svg').call(t);
                return t.url();
            }
            else if (d.name == 'selfDISK') {
                var t = textures.circles().size(4).radius(2).fill(colors(d.parent.name)).stroke('white').strokeWidth(2);
                d3.select('#sunburst svg').call(t);
                return t.url();
            }
            else
                return colors(d.name);
        })
            .style('stroke', function (d) { return 'white'; })
            .on('click', function (d) {
            if (!d.name.startsWith('self')) {
                path.transition().duration(750).attrTween('d', arcTween(d));
            }
        })
            .on('mouseover', function (d) {
            tooltip.html(function () {
                return formatJSObjName(d);
            });
            return tooltip.transition()
                .duration(50)
                .style('opacity', 1);
        })
            .on('mousemove', function (d) {
            return tooltip
                .style('top', (d3.event.layerY - 15) + "px")
                .style('left', (d3.event.layerX + 15) + "px");
        })
            .on('mouseout', function () {
            return tooltip.style('opacity', 0);
        });
        var coor = jquery('#sunburst g').offset();
        function arcTween(d) {
            var names = fullName(d);
            jquery('#context textarea').text(names.pathToDisplay);
            jquery('input[name=context-js]').attr('value', names.path).change();
            var xd = d3.interpolate(xSunburst.domain(), [d.x, d.x + d.dx]), yd = d3.interpolate(ySunburst.domain(), [d.y, 1]), yr = d3.interpolate(ySunburst.range(), [d.y ? 20 : 0, radius]);
            return function (d, i) {
                return i
                    ? function (t) { return arc(d); }
                    : function (t) { xSunburst.domain(xd(t)); ySunburst.domain(yd(t)).range(yr(t)); return arc(d); };
            };
        }
        var chart = jquery('#sunburst'), aspect = chart.width() / chart.height(), container = chart.parent();
        jquery(window).on('resize', function () {
            var targetWidth = container.width();
            chart.attr('width', targetWidth);
            chart.attr('height', Math.round(targetWidth / aspect));
        }).trigger('resize');
    };
    SVG.createStreamgraph = function (d3, jquery, textures, colors, timestamps, streamgraphJson, layout) {
        function formatTick(d) {
            var format = d3.time.format("%Y-%m-%d %H:%M:%S");
            var date = new Date(d / 1e6);
            return format(date);
        }
        var _streamgraphJson = JSON.parse(JSON.stringify(streamgraphJson));
        var svgStream = d3.select('#streamgraph-body').append('svg').attr('style', 'stroke: grey;').append('g');
        var nest = d3.nest().key(function (d) { return d.name; });
        var stack = d3.layout.stack().offset(layout).values(function (d) { return d.values; });
        var layers = stack(nest.entries(_streamgraphJson));
        var m = layers[0].values.length;
        var width = jquery(window).width() - 100;
        var height = 215;
        d3.select('#streamgraph-body svg')
            .attr('width', width)
            .attr('height', height);
        var xStream = d3.scale.linear()
            .domain(d3.extent(_streamgraphJson, function (d) { return d.x; }))
            .range([0, width - 10]);
        var yStream = d3.scale.linear()
            .domain([0, d3.max(_streamgraphJson, function (d) { return d.y0 + d.y; })])
            .range([height - 10, 0]);
        var areaStream = d3.svg.area()
            .x(function (d) { return xStream(d.x); })
            .y0(function (d) { return yStream(d.y0); })
            .y1(function (d) { return yStream(d.y0 + d.y); });
        var xAxis = d3.svg.axis()
            .scale(xStream)
            .tickFormat(function (d) { return formatTick(d); })
            .orient('bottom')
            .ticks(10);
        svgStream.selectAll('path')
            .data(layers)
            .enter()
            .append('path')
            .attr('d', function (d) { return areaStream(d.values); })
            .style('fill', function (d) {
            if (d.key.indexOf(' [CPU]') > 0) {
                var path = d.key.substring(0, d.key.indexOf(' [CPU]'));
                var parentName = path.split('.').slice(-1)[0];
                var t = textures.circles().size(4).radius(2).fill('white').stroke(colors(parentName)).strokeWidth(2);
                d3.select('#streamgraph-body svg').call(t);
                return t.url();
            }
            else if (d.key.indexOf(' [DISK]') > 0) {
                var path = d.key.substring(0, d.key.indexOf(' [DISK]'));
                var parentName = path.split('.').slice(-1)[0];
                var t = textures.circles().size(4).radius(2).fill(colors(parentName)).stroke('white').strokeWidth(2);
                d3.select('#streamgraph-body svg').call(t);
                return t.url();
            }
        });
        svgStream.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);
        svgStream.selectAll('path')
            .on('mousemove', function (d, i) {
            var mousex = d3.mouse(this);
            mousex = mousex[0];
            var xTimestamp = xStream.invert(mousex);
            var baseTimestamp = d.values[0].x;
            var yObject = d.values[Math.floor((xTimestamp - baseTimestamp) / 1e9)];
            var power = yObject.y == null ? '0 W' : (yObject.y.toFixed(2) + " W");
            var fields = d.key.split('.');
            var name = fields[fields.length - 1];
            var firstParenthesis = name.indexOf('(');
            var firstSpace = name.indexOf(' ');
            var start = (firstSpace == -1 || firstSpace >= firstParenthesis) ? 0 : firstSpace + 1;
            var end = firstParenthesis == -1 ? name.length : firstParenthesis;
            jquery('#info .form-horizontal #method span').text(name.substring(start, end));
            jquery('#info .form-horizontal #power span').text(power);
        })
            .on('mouseout', function (d, i) {
            jquery('#info .form-horizontal #method span').text('/');
            jquery('#info .form-horizontal #power span').text('/');
        });
        svgStream.selectAll('.tick')
            .filter(function (d, i) { return i === 0 || i === svgStream.selectAll('.tick').size() - 1; })
            .remove();
        d3.selectAll('.tick text')
            .attr('y', function (d) { return 20; });
        svgStream.selectAll('.domain')
            .style('fill', 'none')
            .style('stroke', 'grey')
            .style('stroke-width', '1')
            .style('shape-rendering', 'crispEdges');
        d3.select('#streamgraph-body svg').attr('height', height + 75);
    };
    return SVG;
}());
function changeRun(config, d3, jquery, textures, chroma, chromaPalette) {
    var software = jquery('#software select').val();
    var run = jquery('#run select').val();
    jquery('#streamgraph-body').empty();
    jquery('#sunburst').empty();
    var firstTimestamp = 0;
    var lastTimestamp = 0;
    jquery.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'epoch': 'ns', 'q': "select first(cpu) from " + software + " where run = '" + run + "'; select last(cpu) from " + software + " where run = '" + run + "'" }
    }).done(function (json) {
        firstTimestamp = json.results[0].series[0].values[0][0];
        lastTimestamp = json.results[1].series[0].values[0][0];
    });
    var sunburst = new Sunburst(software);
    var streamgraphJson = [];
    var timestamps = new Set();
    var methods = new Set();
    jquery.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'epoch': 'ns', 'q': "select median(cpu) as cpu, median(disk) as disk from " + software + " where run = '" + run + "' and time >= " + firstTimestamp + " and time <= " + lastTimestamp + " group by method,time(1s) fill(0)" }
    }).done(function (json) {
        for (var _i = 0, _a = json.results[0].series; _i < _a.length; _i++) {
            var object = _a[_i];
            var method = object.tags.method;
            methods.add(method);
            var totalCPU = 0;
            var totalDISK = 0;
            for (var _b = 0, _c = object.values; _b < _c.length; _b++) {
                var value = _c[_b];
                var timestamp = value[0];
                timestamps.add(timestamp);
                var cpu = value[1];
                var disk = value[2];
                var cpuJson = {};
                var diskJson = {};
                cpuJson['name'] = method + " [CPU]";
                diskJson['name'] = method + " [DISK]";
                cpuJson['x'] = timestamp;
                diskJson['x'] = timestamp;
                cpuJson['y'] = cpu;
                diskJson['y'] = disk;
                streamgraphJson.push(cpuJson);
                streamgraphJson.push(diskJson);
                totalCPU += cpu;
                totalDISK += disk;
            }
            sunburst.addChild(method, totalCPU, totalDISK);
        }
    });
    var palette = chromaPalette.palette();
    var colorsIWH = palette.generate(chroma, methods.size, function (color) {
        var hcl = color.hcl();
        return hcl[0] >= 0 && hcl[0] <= 360
            && hcl[1] >= 22.44 && hcl[1] <= 80
            && hcl[2] >= 57.480000000000004 && hcl[2] <= 80;
    }, true, 50, false, 'Default');
    colorsIWH = palette.diffSort(colorsIWH, 'Default').map(function (color) { return color.hex(); });
    var colors = d3.scale.ordinal().range(colorsIWH);
    SVG.createSunburst(d3, jquery, textures, colors, sunburst.json());
    jquery('input[name=context-js]').unbind();
    jquery('input[name=context-js]').change(function () {
        jquery('#streamgraph-body').empty();
        var context = this.value;
        SVG.createStreamgraph(d3, jquery, textures, colors, timestamps, streamgraphJson.filter(function (d) { return d.name.substring(0, context.length) === context; }), jquery('#layout select').val());
    });
    jquery('input[name=context-js]').change();
    jquery('#layout select').unbind();
    jquery('#layout select').change(function () {
        jquery('#streamgraph-body').empty();
        var context = jquery('input[name=context-js]').val();
        SVG.createStreamgraph(d3, jquery, textures, colors, timestamps, streamgraphJson.filter(function (d) { return d.name.substring(0, context.length) === context; }), this.value);
    });
}
function changeSoftware(config, d3, jquery, textures, chroma, chromaPalette) {
    var software = jquery('#software select').val();
    var runs = new Array();
    jquery.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'epoch': 'ns', 'q': "select cpu from " + software + " group by run" }
    }).done(function (json) {
        for (var _i = 0, _a = json.results[0].series; _i < _a.length; _i++) {
            var serie = _a[_i];
            runs.push(serie.tags.run);
        }
    });
    jquery('#run select').unbind();
    jquery('#run select').empty();
    for (var _i = 0, runs_1 = runs; _i < runs_1.length; _i++) {
        var run = runs_1[_i];
        jquery('#run select').append(jquery('<option>', {
            value: run,
            text: run
        }));
    }
    jquery('input[name=context-js]').attr('value', '');
    jquery('#run select').change(function () {
        changeRun(config, d3, jquery, textures, chroma, chromaPalette);
    });
    jquery('#run select').change();
}
require(['config', 'd3', 'jquery', 'bootstrap', 'textures', 'chroma', 'chromaPalette'], function (config, d3, jquery, bootstrap, textures, chroma, chromaPalette) {
    var softwares = new Array();
    jquery.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'epoch': 'ns', 'q': 'show measurements' }
    }).done(function (json) {
        for (var _i = 0, _a = json.results[0].series[0].values; _i < _a.length; _i++) {
            var value = _a[_i];
            softwares.push(value[0]);
        }
    });
    jquery('#software select').unbind();
    for (var _i = 0, softwares_1 = softwares; _i < softwares_1.length; _i++) {
        var soft = softwares_1[_i];
        jquery('#software select').append(jquery('<option>', {
            value: soft,
            text: soft
        }));
    }
    jquery('#software select').change(function () {
        jquery('#context textarea').text(this.value);
        changeSoftware(config, d3, jquery, textures, chroma, chromaPalette);
    });
    jquery('#software select').change();
    var legendCPUTexture = textures.circles().size(4).radius(2).fill('white').stroke('black').strokeWidth(1);
    var legendDiskTexture = textures.circles().size(6).radius(2).fill('black').stroke('white').strokeWidth(1);
    d3.select('#legend')
        .append('div')
        .attr('id', 'cpu')
        .append('svg')
        .attr('width', 40)
        .attr('height', 16)
        .call(legendCPUTexture)
        .append('rect')
        .attr('width', 40)
        .attr('height', 16)
        .style('fill', legendCPUTexture.url())
        .style('stroke', 'black')
        .style('stroke-width', '0.1');
    d3.select('#legend #cpu')
        .append('text')
        .text('CPU')
        .style('padding-left', '5px');
    d3.select('#legend')
        .append('div')
        .attr('id', 'disk')
        .append('svg')
        .call(legendDiskTexture)
        .attr('width', 40)
        .attr('height', 16)
        .append('rect')
        .attr('width', 40)
        .attr('height', 16)
        .style('fill', legendDiskTexture.url())
        .style('stroke', 'black')
        .style('stroke-width', '0.1');
    d3.select('#disk')
        .append('text')
        .text('DISK')
        .style('padding-left', '5px');
    function updateLinkToDownload(svgId, linkId) {
        var svg = jquery(svgId)[0];
        var serializer = new XMLSerializer();
        var source = serializer.serializeToString(svg);
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
        jquery(linkId).attr('href', url);
    }
    updateLinkToDownload('#sunburst svg', '#downloads #sunburst');
    updateLinkToDownload('#streamgraph #streamgraph-body svg', '#downloads #streamgraph');
});
