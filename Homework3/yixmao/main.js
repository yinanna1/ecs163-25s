//main.js show three different graphs, histogram, scatterplot and chord plot about different attributes inside ds_salaries.csv
console.log("main.js loaded, D3 v" + d3.version)
//d3.select select container
const svg    = d3.select("svg")
const width  = +svg.node().clientWidth
const height = +svg.node().clientHeight
const margin = { top: 30, right: 20, bottom: 40, left: 50 }

const bandHeight = (height - margin.top - margin.bottom * 2) / 3
const innerWidth  = width  - margin.left - margin.right

const container = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`)

let histG, scatG, chordG
//d3.csv: file input
d3.csv("data/ds_salaries.csv").then(raw => {
  raw.forEach(d => {
    d.salary = +d.salary_in_usd
    d.year   = +d.work_year
    d.id     = Math.random() + "_" + d.salary
  })

  histG  = drawHistogram(raw).style("display","none")
  scatG  = drawScatter(raw).style("display","none")
  chordG = drawChord(raw).style("display","none")
//d3.select: button select used when click on the button change graph
  d3.select("#show-hist").on("click", () => {
    histG.style("display","")
    scatG.style("display","none")
    chordG.style("display","none")
  })
  d3.select("#show-scatter").on("click", () => {
    histG.style("display","none")
    scatG.style("display","")
    chordG.style("display","none")
  })
  d3.select("#show-chord").on("click", () => {
    histG.style("display","none")
    scatG.style("display","none")
    chordG.style("display","")
  })

  d3.select("#show-hist").dispatch("click")
})

function drawHistogram(data) {
  const g = container.append("g")
//d3.scaleLinear: linear scale for x axis
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.salary)).nice()
    .range([0, innerWidth])
//d3.bin: divide 20 bins for data
  const bins = d3.bin()
    .domain(x.domain())
    .thresholds(20)(data.map(d => d.salary))
//d3.scaleLinear: linear scale for y axis
  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)]).nice()
    .range([bandHeight, 0])

  const bars = g.selectAll("rect")
    .data(bins)
    .join("rect")
      .attr("x", d => x(d.x0) + 1)
      .attr("y", d => y(d.length))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("height", d => bandHeight - y(d.length))
      .attr("fill", "#69b3a2")
    .on("mousemove", (e, d) => {
      d3.select("#tooltip").style("opacity", 1)//d3.select tooltip when move the mouse
        .html(`$${d.x0.toLocaleString()}–$${d.x1.toLocaleString()}<br>Count: ${d.length}`)
        .style("left", (e.pageX + 10) + "px")
        .style("top",  (e.pageY - 30) + "px")
    })
    .on("mouseout", () => d3.select("#tooltip").style("opacity", 0))

  const xAxisG = g.append("g")
      .attr("transform", `translate(0,${bandHeight})`)
      .call(d3.axisBottom(x))
  g.append("g").call(d3.axisLeft(y))

  g.append("text")
    .attr("x", innerWidth / 2).attr("y", -10)
    .attr("text-anchor", "middle").style("font-size", "16px")
    .text("Histogram: Salary Distribution")
//d3.zoom: mouse move result in zoom in the graph for histogram
  const zoomX = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0,0], [innerWidth,bandHeight]])
    .extent([[0,0], [innerWidth,bandHeight]])
    .on("zoom", ({transform}) => {
      const zx = transform.rescaleX(x)
      bars.attr("x", d => zx(d.x0) + 1)
          .attr("width", d => Math.max(0, zx(d.x1) - zx(d.x0) - 1))
      xAxisG.call(d3.axisBottom(zx))
    })

  g.append("rect")
    .attr("width", innerWidth)
    .attr("height", bandHeight)
    .style("fill", "none")
    .style("pointer-events", "all")
    .call(zoomX)

  return g
}
//scatter plot
function drawScatter(data) {
  const extraY      = 30
  const scatterTopY = bandHeight + margin.bottom + extraY

  svg.selectAll(".scatter-group").remove()

  const g = container.append("g")
    .attr("class", "scatter-group")
    .attr("transform", `translate(0,${scatterTopY})`)
//x y attribute scale it differently
  const years = [2020, 2021, 2022, 2023]
  const x = d3.scalePoint().domain(years).range([0, innerWidth])
  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.salary)).nice()
    .range([bandHeight, 0])

  const xAxisG = g.append("g")
    .attr("transform", `translate(0,${bandHeight})`)
    .call(d3.axisBottom(x).tickValues(years).tickFormat(d3.format("d")))
  const yAxisG = g.append("g")
    .call(d3.axisLeft(y))
//xlab ylab
  g.append("text")
    .attr("x", innerWidth / 2).attr("y", bandHeight + margin.bottom - 20)
    .attr("text-anchor", "middle").style("font-size", "12px")
    .text("Work Year")
  g.append("text")
    .attr("x", -margin.left + 15).attr("y", -10)
    .attr("text-anchor", "start").style("font-size", "12px")
    .text("Salary (USD)")
  g.append("text")
    .attr("x", innerWidth / 2).attr("y", -10)
    .attr("text-anchor", "middle").style("font-size", "16px")
    .text("Scatter: Salary vs. Work Year")
//each point can show its number
  const expLevels = Array.from(new Set(data.map(d => d.experience_level)))
  const color     = d3.scaleOrdinal(d3.schemeCategory10).domain(expLevels)

  const dots = g.append("g").selectAll("circle")
    .data(data, d => d.id)
    .join("circle")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.salary))
      .attr("r", 3)
      .attr("fill", "#ccc")
      .attr("stroke", "steelblue")
      .attr("opacity", 0.7)
    .on("mousemove", (e, d) => {
      d3.select("#tooltip").style("opacity", 1)
        .html(`${d.experience_level}<br>$${d.salary.toLocaleString()}<br>${d.year}`)
        .style("left", (e.pageX + 10) + "px")
        .style("top",  (e.pageY - 30) + "px")
    })
    .on("mouseout", () => d3.select("#tooltip").style("opacity", 0))//mouse out

  const legend = g.append("g")
    .attr("transform", `translate(${innerWidth - 80},10)`)
    .style("font-size", "12px")
  expLevels.forEach((lev, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0,${i * 20})`)
    row.append("rect")
      .attr("width", 12).attr("height", 12)
      .attr("fill", color(lev))
    row.append("text")
      .attr("x", 18).attr("y", 10)
      .text(lev)
  })
//d3.brush used for grey selection/ select animation
//when selected color is shown or default grey for unselected
  const brush = d3.brush()
    .extent([[0, 0], [innerWidth, bandHeight]])
    .on("start brush end", ({selection}) => {
      dots.attr("fill", "#ccc")
      if (selection) {
        const [[x0,y0],[x1,y1]] = selection
        dots.filter(d => {
          const px = x(d.year), py = y(d.salary)
          return x0 <= px && px < x1 && y0 <= py && py < y1
        }).attr("fill", d => color(d.experience_level))
      } else {
        dots.attr("fill", d => color(d.experience_level))
      }
      svg.property("value",
        selection
          ? dots.filter(d => d3.select(this).attr("fill") !== "#ccc").data()
          : []
      ).dispatch("input")
    })

  g.append("g")
    .attr("class", "brush")
    .call(brush)

  return g
}
//3rd graph chord graph
function drawChord(data) {
  const centerY = 2 * (bandHeight + margin.bottom) + margin.top + 100
  const centerX = innerWidth / 2
  const outerR  = Math.min(innerWidth, bandHeight) / 2 - 20
  const innerR  = outerR - 15

  const exps = Array.from(new Set(data.map(d => d.experience_level)))
  const emps = Array.from(new Set(data.map(d => d.employment_type)))

  const matrix = exps.map(e =>
    emps.map(em =>
      data.filter(d => d.experience_level === e && d.employment_type === em).length
    )
  )
//input d3chord graph
  const chordLayout = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(matrix)
  const arcGen = d3.arc().innerRadius(innerR).outerRadius(outerR)
  const ribbon = d3.ribbon().radius(innerR)

  const g = container.append("g")
    .attr("transform", `translate(${centerX},${centerY})`)

  const groups = g.append("g").selectAll("g")
    .data(chordLayout.groups).join("g")

  groups.append("path")
    .attr("d", arcGen)
    .attr("fill", (d,i) => d3.schemeCategory10[i % 10])
    .attr("stroke", "#000")

  groups.append("text")
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2 })
    .attr("transform", d =>
      `rotate(${(d.angle * 180 / Math.PI - 90)}) translate(${outerR + 5}) ${d.angle > Math.PI ? "rotate(180)" : ""}`
    )
    .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
    .style("font-size", "12px")
    .text(d => exps[d.index])

  g.append("g").selectAll("path")
    .data(chordLayout).join("path")
      .attr("d", ribbon)
      .attr("fill", d => d3.schemeCategory10[d.source.index % 10])
      .attr("stroke", "#000")
      .attr("opacity", 0.7)

  const legend = g.append("g")
    .attr("transform", `translate(${outerR + 40},${-outerR})`)
    .style("font-size", "12px")
  emps.forEach((em, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0,${i * 20})`)
    row.append("rect")
      .attr("width", 12).attr("height", 12)
      .attr("fill", d3.schemeCategory10[i % 10])
    row.append("text")
      .attr("x", 18).attr("y", 10)
      .text(em)
  })

  return g
}
