function changeSoftware(selectId, runId) {
    var software = $(selectId).val();
    var runs = new Array();
    $.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'q': "select cpu from \"" + software + "\" group by run" }
    }).done(function (json) {
        for (var _i = 0, _a = json.results[0].series; _i < _a.length; _i++) {
            var serie = _a[_i];
            runs.push(parseInt(serie.tags.run));
        }
    });
    runs = runs.sort(function (a, b) { return a - b; });
    $(runId).unbind();
    $(runId).empty();
    for (var _i = 0, runs_1 = runs; _i < runs_1.length; _i++) {
        var run = runs_1[_i];
        $(runId).append($('<option>', {
            value: run,
            text: run
        }));
    }
}
function compare() {
    $('#chart').empty();
    var software1 = $('#software1 select').val();
    var run1 = $('#run1 select').val();
    var software2 = $('#software2 select').val();
    var run2 = $('#run2 select').val();
    var firstTimestamp1 = 0;
    var lastTimestamp1 = 0;
    var firstTimestamp2 = 0;
    var lastTimestamp2 = 0;
    var time = 0;
    var firstTimestamp1 = 0;
    var lastTimestamp1 = 0;
    var software1Methods = [];
    var software2Methods = [];
    $.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'q': "select first(cpu) from \"" + software1 + "\" where run = '" + run1 + "' group by method; select first(cpu) from \"" + software2 + "\" where run = '" + run2 + "' group by method" }
    }).done(function (json) {
        for (var _i = 0, _a = json.results[0].series; _i < _a.length; _i++) {
            var serie = _a[_i];
            software1Methods.push(serie.tags.method);
        }
        for (var _b = 0, _c = json.results[1].series; _b < _c.length; _b++) {
            var serie = _c[_b];
            software2Methods.push(serie.tags.method);
        }
    });
    var software1TimeRequests = [];
    var software2TimeRequests = [];
    for (var _i = 0, software1Methods_1 = software1Methods; _i < software1Methods_1.length; _i++) {
        var method = software1Methods_1[_i];
        software1TimeRequests.push("select method, first(cpu) from \"" + software1 + "\" where run = '" + run1 + "' and method = '" + method + "'; select method, last(cpu) from \"" + software1 + "\" where run = '" + run1 + "' and method = '" + method + "'");
    }
    for (var _a = 0, software2Methods_1 = software2Methods; _a < software2Methods_1.length; _a++) {
        var method = software2Methods_1[_a];
        software2TimeRequests.push("select method, first(cpu) from \"" + software2 + "\" where run = '" + run2 + "' and method = '" + method + "'; select method, last(cpu) from \"" + software2 + "\" where run = '" + run2 + "' and method = '" + method + "'");
    }
    var software1BeginTimes = new Map();
    var software1EndTimes = new Map();
    $.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'q': "" + software1TimeRequests.join(';') }
    }).done(function (json) {
        for (var i = 0; i < json.results.length; i += 2) {
            software1BeginTimes.set(json.results[i].series[0].values[0][1], json.results[i].series[0].values[0][0]);
            software1EndTimes.set(json.results[i + 1].series[0].values[0][1], json.results[i + 1].series[0].values[0][0]);
        }
    });
    var software2BeginTimes = new Map();
    var software2EndTimes = new Map();
    $.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'q': "" + software2TimeRequests.join(';') }
    }).done(function (json) {
        for (var i = 0; i < json.results.length; i += 2) {
            software2BeginTimes.set(json.results[i].series[0].values[0][1], json.results[i].series[0].values[0][0]);
            software2EndTimes.set(json.results[i + 1].series[0].values[0][1], json.results[i + 1].series[0].values[0][0]);
        }
    });
    var software1DataRequests = [];
    var software2DataRequests = [];
    for (var _b = 0, software1Methods_2 = software1Methods; _b < software1Methods_2.length; _b++) {
        var method = software1Methods_2[_b];
        software1DataRequests.push("select median(cpu) + median(disk) as sum from \"" + software1 + "\" where run = '" + run1 + "' and method = '" + method + "' and time >= '" + software1BeginTimes.get(method) + "' and time <= '" + software1EndTimes.get(method) + "' group by time(10ms) fill(previous)");
    }
    for (var _c = 0, software2Methods_2 = software2Methods; _c < software2Methods_2.length; _c++) {
        var method = software2Methods_2[_c];
        software2DataRequests.push("select median(cpu) + median(disk) as sum from \"" + software2 + "\" where run = '" + run2 + "' and method = '" + method + "' and time >= '" + software2BeginTimes.get(method) + "' and time <= '" + software2EndTimes.get(method) + "' group by time(10ms) fill(previous)");
    }
    var software1Data = new Map();
    var software2Data = new Map();
    $.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'q': "" + software1DataRequests.join(';') }
    }).done(function (json) {
        for (var i = 0; i < software1Methods.length; i++) {
            var method = software1Methods[i];
            var data = [];
            for (var _i = 0, _a = json.results[i].series[0].values; _i < _a.length; _i++) {
                var row = _a[_i];
                data.push(row[1] != null ? row[1] : 0);
            }
            if (!software1Data.has(method.split('.').slice(-1)[0]))
                software1Data.set(method.split('.').slice(-1)[0], []);
            var allData = software1Data.get(method.split('.').slice(-1)[0]).concat(data);
            software1Data.set(method.split('.').slice(-1)[0], allData);
        }
    });
    $.ajax({
        type: 'get',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
        },
        async: false,
        url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
        data: { 'db': config.influxDB, 'q': "" + software2DataRequests.join(';') }
    }).done(function (json) {
        for (var i = 0; i < software2Methods.length; i++) {
            var method = software2Methods[i];
            var data = [];
            for (var _i = 0, _a = json.results[i].series[0].values; _i < _a.length; _i++) {
                var row = _a[_i];
                data.push(row[1] != null ? row[1] : 0);
            }
            if (!software2Data.has(method.split('.').slice(-1)[0]))
                software2Data.set(method.split('.').slice(-1)[0], []);
            var allData = software2Data.get(method.split('.').slice(-1)[0]).concat(data);
            software2Data.set(method.split('.').slice(-1)[0], allData);
        }
    });
    var _allMethods = new Set();
    for (var _d = 0, software1Methods_3 = software1Methods; _d < software1Methods_3.length; _d++) {
        var method = software1Methods_3[_d];
        _allMethods.add(method.split('.').slice(-1)[0]);
    }
    for (var _e = 0, software2Methods_3 = software2Methods; _e < software2Methods_3.length; _e++) {
        var method = software2Methods_3[_e];
        _allMethods.add(method.split('.').slice(-1)[0]);
    }
    var allMethods = Array.from(_allMethods);
    function data2Metric(method) {
        var a = software1Data.has(method) ? software1Data.get(method) : new Array(software2Data.get(method).length).fill(0);
        var b = software2Data.has(method) ? software2Data.get(method) : new Array(software1Data.get(method).length).fill(0);
        if (a.length < b.length)
            a = a.concat(Array(b.length - a.length).fill(0));
        else if (b.length < a.length)
            b = b.concat(Array(a.length - b.length).fill(0));
        var name = "" + method;
        if (software1Data.has(method) && software2Data.has(method)) {
            name = name + " (1 - 2)";
        }
        else if (!software1Data.has(method)) {
            name = name + " (2)";
        }
        else if (!software2Data.has(method)) {
            name = name + " (1)";
        }
        var metric4a = context.metric(function (start, stop, step, callback) {
            callback(null, values = a.slice(-context.size()));
        }, name);
        var metric4b = context.metric(function (start, stop, step, callback) {
            callback(null, values = b.slice(-context.size()));
        }, '');
        return metric4a.subtract(metric4b);
    }
    var context = cubism.context()
        .step(10)
        .size($('#chart').width())
        .stop();
    d3.select("#chart").call(function (div) {
        div.append("div")
            .attr("class", "axis")
            .call(context.axis().orient("top"));
        div.selectAll(".horizon")
            .data(allMethods.map(data2Metric))
            .enter().append("div")
            .attr("class", "horizon")
            .call(context.horizon().colors(['#cb181d', '#fb6a4a', '#fcae91', '#fee5d9', '#bae4b3', '#74c476', '#31a354', '#006d2c']).format(function (d) { return d3.format("+.2f")(d) + 'W'; }));
        div.append("div")
            .attr("class", "rule")
            .call(context.rule());
        div.append("div")
            .attr("class", "axis")
            .call(context.axis().orient("bottom"));
    });
}
var softwares = new Array();
$.ajax({
    type: 'get',
    beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', "Basic " + btoa(config.influxUser + ":" + config.influxPwd));
    },
    async: false,
    url: "http://" + config.influxHost + ":" + config.influxPort + "/query",
    data: { 'db': config.influxDB, 'q': 'show measurements' }
}).done(function (json) {
    for (var _i = 0, _a = json.results[0].series[0].values; _i < _a.length; _i++) {
        var value = _a[_i];
        softwares.push(value[0]);
    }
});
$('#software select').unbind();
for (var _i = 0, softwares_1 = softwares; _i < softwares_1.length; _i++) {
    var soft = softwares_1[_i];
    $('#software1 select').append($('<option>', {
        value: soft,
        text: soft
    }));
    $('#software2 select').append($('<option>', {
        value: soft,
        text: soft
    }));
}
$('#software1 select').change(function () {
    changeSoftware('#software1 select', '#run1 select');
});
$('#software1 select').change();
$('#software2 select').change(function () {
    changeSoftware('#software2 select', '#run2 select');
});
$('#software2 select').change();
$('#compare').click(function () {
    compare();
});
