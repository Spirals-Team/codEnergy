/// <reference path='require.d.ts' />

type Power = number

class Sunburst {
  children: Map<string, Sunburst> = new Map<string, Sunburst>()
  cpu: Power = 0
  disk: Power = 0

  constructor(public name: string) {}

  addChild(path: string, cpu: Power, disk: Power): void {
    let dotIndex = path.indexOf('.')
    let method = dotIndex > 0 ? path.substring(0, dotIndex) : path
    let remainingPath = dotIndex > 0 ? path.substring(dotIndex + 1) : ''

    if (this.children.has(method)) {
      if (remainingPath != '') this.children.get(method).addChild(remainingPath, cpu, disk)
      else {
        this.children.get(method).cpu = cpu
        this.children.get(method).disk = disk
      }
    }

    else {
      let subgraph = new Sunburst(method)
      this.children.set(method, subgraph)

      if (remainingPath != '') this.children.get(method).addChild(remainingPath, cpu, disk)
      else {
        subgraph.cpu = cpu
        subgraph.disk = disk
      }
    }
  }

  power(): Power { return this.cpu + this.disk }

  json(): any {
    let object: any = {}
    let children: any[]

    children = Array.from(this.children.values()).map(function(node: Sunburst) { return node.json() })

    let selfCPU: any = {}
    selfCPU.name = 'selfCPU'
    selfCPU.power = this.cpu

    let selfDisk: any = {}
    selfDisk.name = 'selfDISK'
    selfDisk.power = this.disk

    children.push(selfCPU)
    children.push(selfDisk)

    object.children = children
    object.name = this.name
    object.power = this.power()

    return object
  }
}

class SVG {

  static createSunburst(d3, jquery, textures, colors, sunburstJson): void {
    let partition = d3.layout.partition().value(function(d) { return d.power })
    let sunburstData = partition.nodes(sunburstJson)

    function formatJSObjName(obj: any) {
      let name = obj.name.startsWith('self') ? `${obj.parent.name} [${obj.name.split('self')[1]}]` : obj.name
      let power = obj.value
      let totalPower = sunburstData[0].value
      let percent = (power / totalPower) * 100

      return `<b>${name}</b><br><b>${power.toFixed(2)} W (${percent.toFixed(2)}% of ${totalPower.toFixed(2)} W)</b>`
    }

    function fullName(obj: any) {
      let current = obj
      let path = new Array<string>()
      let pathToDisplay = new Array<string>()

      while (current.parent) {
        let firstParenthesis = current.name.indexOf("(")
        let firstSpace = current.name.indexOf(" ")
        let start = (firstSpace == -1 || firstSpace >= firstParenthesis) ? 0 : firstSpace + 1
        let end = firstParenthesis == -1 ? current.name.length : firstParenthesis
        path.unshift(current.name.substring(start, end))
        pathToDisplay.unshift(current.name)
        current = current.parent
      }

      pathToDisplay.unshift(current.name)

      return { 'pathToDisplay': pathToDisplay.join("."), "path": path.join(".") }
    }

    let width = 350, height = 250, radius = Math.min(width, height) / 2

    let xSunburst = d3.scale.linear()
        .range([0, 2 * Math.PI])

    let ySunburst = d3.scale.sqrt()
        .range([0, radius])

    let svg = d3.select('#sunburst')
      .append('svg')
      .attr('id', 'svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMid')
      .append('g')
      .attr('transform', `translate(${width / 2.25},${height / 2})`)

    let tooltip = d3.select('#sunburst')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('z-index', '10')
      .style('opacity', 0)

    let arc = d3.svg.arc()
      .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, xSunburst(d.x))) })
      .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, xSunburst(d.x + d.dx))) })
      .innerRadius(function(d) { return Math.max(0, ySunburst(d.y)) })
      .outerRadius(function(d) { return Math.max(0, ySunburst(d.y + d.dy)) })

    let path = svg.selectAll('path')
      .data(sunburstData)
      .enter()
      .append('path')
      .attr('d', arc)
      .style('fill', function(d) {
        if(d.name == 'selfCPU') {
          let t = textures.circles().size(4).radius(2).fill('white').stroke(colors(d.parent.name)).strokeWidth(2)
          d3.select('#sunburst svg').call(t)
          return t.url()
        }
        else if(d.name == 'selfDISK') {
          let t = textures.circles().size(4).radius(2).fill(colors(d.parent.name)).stroke('white').strokeWidth(2)
          d3.select('#sunburst svg').call(t)
          return t.url()
        }
        else return colors(d.name)
      })
      .style('stroke', function(d) { return 'white' })
      .on('click', function(d) {
        if(!d.name.startsWith('self')) {
          path.transition().duration(750).attrTween('d', arcTween(d))
        }
      })
      .on('mouseover', function(d) {
        tooltip.html(function() {
          return formatJSObjName(d)
        })

        return tooltip.transition()
          .duration(50)
          .style('opacity', 1)
      })
      .on('mousemove', function(d) {
        return tooltip
          .style('top', `${d3.event.offsetY - 15}px`)
          .style('left', `${d3.event.offsetX + 30}px`)
      })
      .on('mouseout', function() {
        return tooltip.style('opacity', 0)
      })

    let coor = jquery('#sunburst g').offset()

    // Zooming: interpolate the scales
    function arcTween(d) {
      let names = fullName(d)
      jquery('#context textarea').text(names.pathToDisplay)
      jquery('input[name=context-js]').attr('value', names.path).change()

      let xd = d3.interpolate(xSunburst.domain(), [d.x, d.x + d.dx]),
          yd = d3.interpolate(ySunburst.domain(), [d.y, 1]),
          yr = d3.interpolate(ySunburst.range(), [d.y ? 20 : 0, radius])
      return function(d, i) {
        return i
            ? function(t) { return arc(d) }
            : function(t) { xSunburst.domain(xd(t)); ySunburst.domain(yd(t)).range(yr(t)); return arc(d) }
      }
    }

    let chart = jquery('#sunburst'),
        aspect = chart.width() / chart.height(),
        container = chart.parent()

    jquery(window).on('resize', function() {
        let targetWidth = container.width()
        chart.attr('width', targetWidth)
        chart.attr('height', Math.round(targetWidth / aspect))
    }).trigger('resize')
  }

  static createStreamgraph(d3, jquery, textures, colors, timestamps, streamgraphJson, layout) {
    function formatTick(d) {
      let format = d3.time.format("%Y-%m-%d %H:%M:%S")
      let date = new Date(d)
      return format(date)
    }

    let _streamgraphJson = JSON.parse(JSON.stringify(streamgraphJson))

    let svgStream = d3.select('#streamgraph-body').append('svg').attr('style', 'stroke: grey;').append('g')

    let nest = d3.nest().key(function(d){ return d.name})
    let stack = d3.layout.stack().offset(layout).values(function(d) { return d.values })

    let layers = stack(nest.entries(_streamgraphJson))
    let m = layers[0].values.length

    let width = jquery(window).width() - 100
    let height = 200

    d3.select('#streamgraph-body svg')
      .attr('width', width)
      .attr('height', height + 25)

    let xStream = d3.scale.linear()
              .domain(d3.extent(_streamgraphJson, function(d) { return d.x }))
              .range([0, width - 10])

    let yStream = d3.scale.linear()
              .domain([0, d3.max(_streamgraphJson, function(d) { return d.y0 + d.y })])
              .range([height - 10, 0])

    let areaStream = d3.svg.area()
                .x(function(d) { return xStream(d.x) })
                .y0(function(d) { return yStream(d.y0) })
                .y1(function(d) { return yStream(d.y0 + d.y) })

    let xAxis = d3.svg.axis()
                  .scale(xStream)
                  .tickFormat(function(d) { return formatTick(d) })
                  .orient('bottom')
                  .ticks(10)

    svgStream.selectAll('path')
      .data(layers)
      .enter()
      .append('path')
      .attr('d', function(d) {return areaStream(d.values) })
      .style('fill', function(d) {
        if (d.key.indexOf(' [CPU]') > 0) {
          let path = d.key.substring(0, d.key.indexOf(' [CPU]'))
          let parentName = path.split('.').slice(-1)[0]
          let t = textures.circles().size(4).radius(2).fill('white').stroke(colors(parentName)).strokeWidth(2)
          d3.select('#streamgraph-body svg').call(t)
          return t.url()
        }
        else if (d.key.indexOf(' [DISK]') > 0) {
          let path = d.key.substring(0, d.key.indexOf(' [DISK]'))
          let parentName = path.split('.').slice(-1)[0]
          let t = textures.circles().size(4).radius(2).fill(colors(parentName)).stroke('white').strokeWidth(2)
          d3.select('#streamgraph-body svg').call(t)
          return t.url()
        }
      })

    svgStream.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis)

    svgStream.selectAll('path')
      .on('mousemove', function(d, i) {
          let mousex = d3.mouse(this)
          mousex = mousex[0]
          let xTimestamp = xStream.invert(mousex)
          let baseTimestamp = d.values[0].x
          // 1e9 because we aggregate the values on each second (see request)
          let yObject = d.values[Math.floor((xTimestamp - baseTimestamp) / 1e3)]
          let power = yObject.y == null ? '0 W' : (`${yObject.y.toFixed(2)} W`)
          let fields = d.key.split('.')
          let name = fields[fields.length - 1]
          let firstParenthesis = name.indexOf('(')
          let firstSpace = name.indexOf(' ')
          let start = (firstSpace == -1 || firstSpace >= firstParenthesis) ? 0 : firstSpace + 1
          let end = firstParenthesis == -1 ? name.length : firstParenthesis
          jquery('#info .form-horizontal #method span').text(name.substring(start, end))
          jquery('#info .form-horizontal #power span').text(power)
        })
        .on('mouseout', function(d, i) {
          jquery('#info .form-horizontal #method span').text('/')
          jquery('#info .form-horizontal #power span').text('/')
        })

    svgStream.selectAll('.tick')
      .filter(function(d, i) { return i === 0 || i === svgStream.selectAll('.tick').size() - 1 })
      .remove()

    svgStream.selectAll('.domain')
      .style('fill', 'none')
      .style('stroke', 'grey')
      .style('stroke-width', '1')
      .style('shape-rendering', 'crispEdges')
  }
}

function changeRun(config, d3, jquery, textures, chroma, chromaPalette): void {
  let software = jquery('#software select').val()
  let run = jquery('#run select').val()
  jquery('#streamgraph-body').empty()
  jquery('#sunburst').empty()

  /**
   * Get all methods for creating a color palette.
   */
  let methods = new Set<string>()
  jquery.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'epoch': 'ns', 'q': `select cpu from ${software} where run = '${run}' group by method` }
  }).done(function(json) {
    for (let object of json.results[0].series) {
      for (let method of object.tags.method.split('.')) {
        methods.add(method)
      }
    }
  })

  /**
   * Create the palette.
   */
  let palette = chromaPalette.palette()
  let colorsIWH = palette.generate(
    chroma,
    methods.size,
    function(color){ // This function filters valid colors
      let hcl = color.hcl()
      return hcl[0]>=0 && hcl[0]<=360
        && hcl[1]>=22.44 && hcl[1]<=80
        && hcl[2]>=57.480000000000004 && hcl[2]<=80
    },
    true, // Using Force Vector instead of k-Means
    50, // Steps (quality)
    false, // Ultra precision
    'Default' // Color distance type (colorblindness)
  )
  colorsIWH = palette.diffSort(colorsIWH, 'Default').map(function(color) { return color.hex() })
  let colors = d3.scale.ordinal().range(colorsIWH)

  /**
   * Add the sunburst to the HTML page.
   */
  jquery.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'epoch': 'ns', 'q': `select sum(cpu) as cpu, sum(disk) as disk from ${software} where run = '${run}' group by method` }
  }).done(function(json) {
    let sunburst = new Sunburst(software)
    for (let object of json.results[0].series) {
      sunburst.addChild(object.tags.method, object.values[0][1], object.values[0][2])
    }
    SVG.createSunburst(d3, jquery, textures, colors, sunburst.json())
  })

  /**
   * Add the streamgraph to the HTML page.
   */
  let timestamps: Array<number> = []
  jquery.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'epoch': 'ns', 'q': `select time,cpu from ${software} where run = '${run}' order by time` }
  }).done(function(json) {
    for (let object of json.results[0].series[0].values) {
     timestamps.push(object[0])
    }
    timestamps = timestamps.sort()
  })

  let streamgraphJson = []

  jquery.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
    data: { 'db': config.influxDB, 'epoch': 'ms', 'q': `select sum(cpu) as cpu, sum(disk) as disk from ${software} where run = '${run}' and time >= ${timestamps[0]} and time <= ${timestamps[timestamps.length - 1]} group by method,time(1s) fill(previous)` }
  }).done(function(json) {
    for (let object of json.results[0].series) {
      for (let value of object.values) {
        let cpu = {}
        let disk = {}
        cpu['name'] = `${object.tags.method} [CPU]`
        disk['name'] = `${object.tags.method} [DISK]`
        cpu['x'] = value[0]
        disk['x'] = value[0]
        cpu['y'] = value[1]
        disk['y'] = value[2]
        streamgraphJson.push(cpu)
        streamgraphJson.push(disk)
      }
    }
  })

  jquery('input[name=context-js]').unbind()
  jquery('input[name=context-js]').change(function() {
    jquery('#streamgraph-body').empty()
    let context = this.value
    SVG.createStreamgraph(d3, jquery, textures, colors, timestamps, streamgraphJson.filter(function(d) { return d.name.substring(0, context.length) === context }), jquery('#layout select').val())
  })
  jquery('input[name=context-js]').change()

  jquery('#layout select').unbind()
  jquery('#layout select').change(function() {
    jquery('#streamgraph-body').empty()
    let context = jquery('input[name=context-js]').val()
    SVG.createStreamgraph(d3, jquery, textures, colors, timestamps, streamgraphJson.filter(function(d) { return d.name.substring(0, context.length) === context }), this.value)
  })
}

function changeSoftware(config, d3, jquery, textures, chroma, chromaPalette): void {
  let software = jquery('#software select').val()

  /**
   * Get all runs for a given software.
   */
   let runs = new Array<string>()
   jquery.ajax({
     type: 'get',
     beforeSend: function (xhr) {
       xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
     },
     async: false,
     url: `http://${config.influxHost}:${config.influxPort}/query`,
     data: { 'db': config.influxDB, 'epoch': 'ns', 'q': `select cpu from ${software} group by run` }
   }).done(function(json) {
     for (let serie of json.results[0].series) {
       runs.push(serie.tags.run)
     }
   })

   jquery('#run select').unbind()
   jquery('#run select').empty()
   for (let run of runs) {
     jquery('#run select').append(jquery('<option>', {
       value: run,
       text: run
     }))
   }

   jquery('input[name=context-js]').attr('value', '')

   jquery('#run select').change(function() {
     changeRun(config, d3, jquery, textures, chroma, chromaPalette)
   })
   jquery('#run select').change()
}

require(['config', 'd3', 'jquery', 'bootstrap', 'textures', 'chroma', 'chromaPalette'], function(config, d3, jquery, bootstrap, textures, chroma, chromaPalette) {
  /**
   * Get all software names and update the <select> tag.
   */
  let softwares = new Array<string>()
  jquery.ajax({
    type: 'get',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', `Basic ${btoa(`${config.influxUser}:${config.influxPwd}`)}`)
    },
    async: false,
    url: `http://${config.influxHost}:${config.influxPort}/query`,
   data: { 'db': config.influxDB, 'epoch': 'ns', 'q': 'show measurements' }
  }).done(function(json) {
    for (let value of json.results[0].series[0].values) {
      softwares.push(value[0])
    }
  })
  jquery('#software select').unbind()
  for (let soft of softwares) {
    jquery('#software select').append(jquery('<option>', {
      value: soft,
      text: soft
    }))
  }
  jquery('#software select').change(function() {
    jquery('#context textarea').text(this.value)
    changeSoftware(config, d3, jquery, textures, chroma, chromaPalette)
  })
  jquery('#software select').change()

  /**
   * Add a legend.
   */
  let legendCPUTexture = textures.circles().size(4).radius(2).fill('white').stroke('black').strokeWidth(1)
  //let t = textures.circles().size(4).radius(2).fill('white').stroke(colors(parentName)).strokeWidth(2)
  let legendDiskTexture = textures.circles().size(6).radius(2).fill('black').stroke('white').strokeWidth(1)

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
    .style('stroke-width', '0.1')

  d3.select('#legend #cpu')
    .append('text')
    .text('CPU')
    .style('padding-left', '5px')

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
    .style('stroke-width', '0.1')

  d3.select('#disk')
    .append('text')
    .text('DISK')
    .style('padding-left', '5px')

  function updateLinkToDownload(svgId, linkId) {
    let svg = jquery(svgId)[0]

    let serializer = new XMLSerializer()
    let source = serializer.serializeToString(svg)

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
    }
    if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
    }

    source = '<?xml version="1.0" standalone="no"?>\r\n' + source

    let url = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source)
    jquery(linkId).attr('href', url)
  }

  updateLinkToDownload('#sunburst svg', '#downloads #sunburst')
  updateLinkToDownload('#streamgraph #streamgraph-body', '#downloads #streamgraph')
})