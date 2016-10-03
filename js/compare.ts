function changeSoftware(selectId, runId) {
  let software = $(selectId).val()

  let runs = new Array<string>()
  $.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'q': `select cpu from "${software}" group by run` }
    }).done(function(json) {
      for (let serie of json.results[0].series) {
        runs.push(parseInt(serie.tags.run))
      }
    })

  runs = runs.sort(function(a, b) { return a - b })

  $(runId).unbind()
  $(runId).empty()
  for (let run of runs) {
   $(runId).append($('<option>', {
     value: run,
     text: run
   }))
  }
}

function compare() {
  $('#chart').empty()
  let software1 = $('#software1 select').val()
  let run1 = $('#run1 select').val()
  let software2 = $('#software2 select').val()
  let run2 = $('#run2 select').val()

  let firstTimestamp1 = 0
  let lastTimestamp1 = 0
  let firstTimestamp2 = 0
  let lastTimestamp2 = 0
  let time = 0

  let firstTimestamp1 = 0
  let lastTimestamp1 = 0

  let software1Methods = []
  let software2Methods = []

  $.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'q': `select first(cpu) from "${software1}" where run = '${run1}' group by method; select first(cpu) from "${software2}" where run = '${run2}' group by method`}
  }).done(function(json) {
    for (let serie of json.results[0].series) {
      software1Methods.push(serie.tags.method)
    }
    for (let serie of json.results[1].series) {
      software2Methods.push(serie.tags.method)
    }
  })

  let software1TimeRequests = []
  let software2TimeRequests = []
  for (let method of software1Methods) {
    software1TimeRequests.push(`select method, first(cpu) from "${software1}" where run = '${run1}' and method = '${method}'; select method, last(cpu) from "${software1}" where run = '${run1}' and method = '${method}'`)
  }
  for (let method of software2Methods) {
    software2TimeRequests.push(`select method, first(cpu) from "${software2}" where run = '${run2}' and method = '${method}'; select method, last(cpu) from "${software2}" where run = '${run2}' and method = '${method}'`)
  }

  let software1BeginTimes = new Map<string, number>()
  let software1EndTimes = new Map<string, number>()
  $.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'q': `${software1TimeRequests.join(';')}` }
  }).done(function(json) {
    for (var i = 0; i < json.results.length; i+=2) {
      software1BeginTimes.set(json.results[i].series[0].values[0][1], json.results[i].series[0].values[0][0])
      software1EndTimes.set(json.results[i + 1].series[0].values[0][1], json.results[i + 1].series[0].values[0][0])
    }
  })

  let software2BeginTimes = new Map<string, number>()
  let software2EndTimes = new Map<string, number>()
  $.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'q': `${software2TimeRequests.join(';')}` }
  }).done(function(json) {
    for (var i = 0; i < json.results.length; i+=2) {
      software2BeginTimes.set(json.results[i].series[0].values[0][1], json.results[i].series[0].values[0][0])
      software2EndTimes.set(json.results[i + 1].series[0].values[0][1], json.results[i + 1].series[0].values[0][0])
    }
  })

  let software1DataRequests = []
  let software2DataRequests = []
  for (let method of software1Methods) {
    software1DataRequests.push(`select median(cpu) + median(disk) as sum from "${software1}" where run = '${run1}' and method = '${method}' and time >= '${software1BeginTimes.get(method)}' and time <= '${software1EndTimes.get(method)}' group by time(10ms) fill(previous)`)
  }
  for (let method of software2Methods) {
    software2DataRequests.push(`select median(cpu) + median(disk) as sum from "${software2}" where run = '${run2}' and method = '${method}' and time >= '${software2BeginTimes.get(method)}' and time <= '${software2EndTimes.get(method)}' group by time(10ms) fill(previous)`)
  }

  let software1Data = new Map<string, Array<string>>()
  let software2Data = new Map<string, Array<string>>()

  $.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'q': `${software1DataRequests.join(';')}` }
  }).done(function(json) {
    for (let i = 0; i < software1Methods.length; i++) {
      let method = software1Methods[i]
      let data = []
      for (let row of json.results[i].series[0].values) {
        data.push(row[1] != null ? row[1] : 0)
      }
      if (!software1Data.has(method.split('.').slice(-1)[0])) software1Data.set(method.split('.').slice(-1)[0], [])
      let allData = software1Data.get(method.split('.').slice(-1)[0]).concat(data)
      software1Data.set(method.split('.').slice(-1)[0], allData)
    }
  })

  $.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'q': `${software2DataRequests.join(';')}` }
  }).done(function(json) {
    for (let i = 0; i < software2Methods.length; i++) {
      let method = software2Methods[i]
      let data = []
      for (let row of json.results[i].series[0].values) {
        data.push(row[1] != null ? row[1] : 0)
      }
      if (!software2Data.has(method.split('.').slice(-1)[0])) software2Data.set(method.split('.').slice(-1)[0], [])
      let allData = software2Data.get(method.split('.').slice(-1)[0]).concat(data)
      software2Data.set(method.split('.').slice(-1)[0], allData)
    }
  })

  let _allMethods = new Set<string>()
  for (let method of software1Methods) {
    _allMethods.add(method.split('.').slice(-1)[0])
  }
  for (let method of software2Methods) {
    _allMethods.add(method.split('.').slice(-1)[0])
  }
  let allMethods = Array.from(_allMethods)

  function data2Metric(method: string) {
    let a = software1Data.has(method) ? software1Data.get(method) : new Array<number>(software2Data.get(method).length).fill(0)
    let b = software2Data.has(method) ? software2Data.get(method) : new Array<number>(software1Data.get(method).length).fill(0)

    if (a.length < b.length) a = a.concat(Array(b.length - a.length).fill(0))
    else if (b.length < a.length) b = b.concat(Array(a.length - b.length).fill(0))

    // let name = `${method.split('.')[0]}...${method.split('.').slice(1).slice(-2).join('.')}`
    let name = `${method}`

    if (software1Data.has(method) && software2Data.has(method)) {
       name = `${name} (1 - 2)`
    }
    else if(!software1Data.has(method)) {
      name = `${name} (2)`
    }
    else if(!software2Data.has(method)) {
      name = `${name} (1)`
    }

    let metric4a = context.metric(function(start, stop, step, callback) {
      callback(null, values = a.slice(-context.size()))
    }, name)

    let metric4b = context.metric(function(start, stop, step, callback) {
      callback(null, values = b.slice(-context.size()))
    }, '')

    return metric4a.subtract(metric4b)
  }

  let context = cubism.context()
    .step(10)
    .size($('#chart').width())
    .stop()

  d3.select("#chart").call(function(div) {
    div.append("div")
      .attr("class", "axis")
      .call(context.axis().orient("top"));

    div.selectAll(".horizon")
      .data(allMethods.map(data2Metric))
      .enter().append("div")
      .attr("class", "horizon")
      .call(context.horizon().colors(['#cb181d', '#fb6a4a', '#fcae91', '#fee5d9', '#bae4b3', '#74c476', '#31a354', '#006d2c']).format(function(d) { return d3.format("+.2f")(d) + 'W' }))

    div.append("div")
      .attr("class", "rule")
      .call(context.rule());

    div.append("div")
      .attr("class", "axis")
      .call(context.axis().orient("bottom"));
  }
}


let softwares = new Array<string>()
$.ajax({
  type: 'get',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
  },
  async: false,
  url: `http://${config.influxHost}:${config.influxPort}/query`,
 data: { 'db': config.influxDB, 'q': 'show measurements' }
}).done(function(json) {
  for (let value of json.results[0].series[0].values) {
    softwares.push(value[0])
  }
})
$('#software select').unbind()
for (let soft of softwares) {
  $('#software1 select').append($('<option>', {
    value: soft,
    text: soft
  }))
  $('#software2 select').append($('<option>', {
    value: soft,
    text: soft
  }))
}
$('#software1 select').change(function() {
  changeSoftware('#software1 select', '#run1 select')
})
$('#software1 select').change()
$('#software2 select').change(function() {
  changeSoftware('#software2 select', '#run2 select')
})
$('#software2 select').change()

$('#compare').click(function() {
  compare()
})
