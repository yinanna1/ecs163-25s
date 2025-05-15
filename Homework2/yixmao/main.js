//histogram, scatter plot, sankey diagram

console.log("main.js loaded, D3 v" + d3.version);

const svg = d3.select("svg");
const width = +svg.node().clientWidth;
const height = +svg.node().clientHeight;
const margin = { top: 30, right: 20, bottom: 40, left: 50 };

//bands
const bandHeight = (height - margin.top - margin.bottom * 2) / 3;
const innerWidth  = width  - margin.left - margin.right;
const innerHeight = bandHeight;

//top left
const container = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

//color
globalThis.histColor = d3.scaleSequential(d3.interpolateBlues);
const expLevels = [];
const sizeLevels = [];

d3.csv("data/ds_salaries.csv").then(raw => {
  console.log("data loaded:", raw.length, "rows");
  raw.forEach(d => {
    d.salary = +d.salary_in_usd;
    d.year   = +d.work_year;
  });

//make category into arrays
globalThis.expLevels = Array.from(new Set(raw.map(d => d.experience_level)));
globalThis.sizeLevels = Array.from(new Set(raw.map(d => d.company_size)));

//histogram
  (function drawHistogram() {
    const g = container.append("g");
    const vals = raw.map(d => d.salary).filter(v => !isNaN(v));

    const x = d3.scaleLinear()//linear scale for salaries
      .domain(d3.extent(vals)).nice()
      .range([0, innerWidth]);

    const bins = d3.bin()//group salaries into 20 bins
      .domain(x.domain())
      .thresholds(20)(vals);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)]).nice()
      .range([bandHeight, 0]);

    //color of doman in hist. graph
    histColor.domain([0, d3.max(bins, d => d.length)]);//darker the blue color, higher the counts

    g.selectAll("rect")
      .data(bins)
      .join("rect")
        .attr("x", d => x(d.x0) + 1)
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", d => y(d.length))
        .attr("height", d => bandHeight - y(d.length))
        .attr("fill", d => histColor(d.length));

    g.append("g")
      .attr("transform", `translate(0,${bandHeight})`)
      .call(d3.axisBottom(x));

    g.append("g")
      .call(d3.axisLeft(y));

    // Title
    g.append("text")
      .attr("x", innerWidth/2).attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("Histogram: Salary Distribution");

    // Legend for histogram
    const histLegend = g.append("g")
      .attr("transform", `translate(${innerWidth - 150}, ${bandHeight/2})`);
    const legendScale = d3.scaleLinear()
      .domain(histColor.domain())
      .range([0, 100]);
    // gradient
    const defs = svg.append("defs");
    const gradId = "hist-gradient";
    const grad = defs.append("linearGradient").attr("id", gradId).attr("x1","0%").attr("y1","0%").attr("x2","100%").attr("y2","0%");
    grad.selectAll("stop")
      .data(d3.ticks(0,1,5))
      .enter().append("stop")
        .attr("offset", d => `${d*100}%`)
        .attr("stop-color", d => d3.interpolateBlues(d));
    histLegend.append("rect")
      .attr("width", 100)
      .attr("height", 10)
      .attr("fill", `url(#${gradId})`);
    // legend axis
    const histAxis = d3.axisBottom(legendScale).ticks(3);
    histLegend.append("g")
      .attr("transform", "translate(0,10)")
      .call(histAxis);
    histLegend.append("text")
      .attr("x", 50).attr("y", 30)
      .attr("text-anchor","middle")
      .attr("font-size","12px")
      .text("Count");
  })();

  // 2) Scatterplot (focus)
  (function drawScatter() {
    const g = container.append("g")
      .attr("transform", `translate(0, ${bandHeight + margin.bottom})`);

    // derive unique experience levels from data
    const expLevelsLocal = Array.from(new Set(raw.map(d => d.experience_level)));
    const colorExp = d3.scaleOrdinal()
      .domain(expLevelsLocal)
      .range(d3.schemeTableau10);

    // x-scale: work_year
    const x = d3.scaleLinear()
      .domain(d3.extent(raw, d => d.year)).nice()
      .range([0, innerWidth]);
    // y-scale: salary
    const y = d3.scaleLinear()
      .domain(d3.extent(raw, d => d.salary)).nice()
      .range([bandHeight, 0]);

    // draw points
    g.selectAll("circle")
      .data(raw)
      .join("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.salary))
        .attr("r", 4)
        .attr("fill", d => colorExp(d.experience_level))
        .attr("opacity", 0.7);

    // axes
    g.append("g")
      .attr("transform", `translate(0,${bandHeight})`)
      .call(d3.axisBottom(x));
    g.append("g")
      .call(d3.axisLeft(y));

    // title
    g.append("text")
      .attr("x", innerWidth/2).attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("Scatter: Salary vs. Work Year");

    // legend for experience levels
    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth - 140}, 10)`);
    expLevelsLocal.forEach((lev, i) => {
      const row = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
      row.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorExp(lev));
      row.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("font-size", "12px")
        .text(lev);
    });
  })();

  //sankey
  (function drawSankey() {
    const g = container.append("g")
      .attr("transform", `translate(0, ${2*(bandHeight + margin.bottom)})`);

    // nodes and links
    const exp  = Array.from(new Set(raw.map(d => d.experience_level)));
    const size = Array.from(new Set(raw.map(d => d.company_size)));
    const nodes = exp.map(e => ({ name: e })) .concat(size.map(s => ({ name: s })));
    const idx = name => nodes.findIndex(n => n.name === name);

    const grouped = d3.rollup(raw, v => v.length,
      d => d.experience_level, d => d.company_size);

    const links = [];
    grouped.forEach((m, e) =>
      m.forEach((cnt, s) =>
        links.push({ source: idx(e), target: idx(s), value: cnt })
      )
    );

    const sankeyGen = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0,0],[innerWidth,bandHeight]]);

    const { nodes: n, links: l } = sankeyGen({ nodes: nodes.map(d=>({...d})), links });

    g.append("g")
      .selectAll("path")
      .data(l)
      .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", "#888")
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("fill","none");

    const node = g.append("g")
      .selectAll("g")
      .data(n)
      .join("g");

    node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", "#1f77b4");

    node.append("text")
      .attr("x", d => d.x0 - 6)
      .attr("y", d => (d.y0 + d.y1)/2)
      .attr("dy", "0.35em")
      .attr("text-anchor","end")
      .attr("font-size","12px")
      .text(d => d.name);

    g.append("text")
      .attr("x", innerWidth/2).attr("y",-10)
      .attr("text-anchor","middle")
      .attr("font-size","16px")
      .text("Sankey: Experience Level → Company Size");
  })();

})
.catch(err => console.error("CSV load error:", err));
