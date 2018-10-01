function renderDAG(dagData, treeOpts) {

    var defaultOpts = {
        target: "#treeMap",
        margin: 200,
        activeColor: "green",
        callbacks: {
            renderText: function(d){
                return d.id
            }
        }
    }

    treeOpts = Object.assign(defaultOpts, treeOpts)
    const dag = d3.dratify()(dagData)

    d3.sugiyama().decross(d3.decrossTwoLayer()).coord(d3.coordVert())(dag);

    const links = dag.links()
    const descendants = dag.descendants();

    const targetSelection = d3.select(treeOpts.target);

    if(!treeOpts.width){
        treeOpts.width = targetSelection.node().getBoundingClientRect().width - treeOpts.margin    
    }
    if(!treeOpts.height){
        treeOpts.height = targetSelection.node().getBoundingClientRect().height - treeOpts.margin
    }

    const svgSelection = targetSelection.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(d3.zoom().on("zoom", function () {
            svgSelection.attr("transform", d3.event.transform)
        })).append("g");

    svgSelection.attr("width", treeOpts.width + treeOpts.margin).attr("height", treeOpts.height + treeOpts.margin)

    function elbow(d, i) {
        return "M" + d.source.y + "," + d.source.x +
            "V" + d.target.x + "H" + d.target.y;
    }

    const line = d3.line()
        .curve(d3.curveCatmullRom)
        .x(d => d.x * treeOpts.width)
        .y(d => d.y * treeOpts.height);

    const g = svgSelection.append('g').attr('transform', `translate(${100},${100})`)

    g.append('g')
        .selectAll('path')
        .data(links)
        .enter()
        .append('path')
        .attr('d', ({
                source,
                target,
                data
            }) =>
            line([{
                x: source.x,
                y: source.y
            }].concat(
                data.points || [], [{
                    x: target.x,
                    y: target.y
                }])))
        .attr('fill', 'none')
        .attr('stroke', 'black')

    const nodes = g.append('g')
        .selectAll('g')
        .data(descendants)
        .enter()
        .append('g')
        .attr('transform', ({
            x,
            y
        }) => `translate(${x*treeOpts.width}, ${y*treeOpts.height})`);

    const nodeSize = 30

    var pedigreeNodes = nodes.filter((d) => d.data.name).attr("class", "node")
    pedigreeNodes.filter((d) => d.data.sex == "Female")
        .append('circle')
        .attr('r', nodeSize)
        .attr('fill', 'white')
        .attr('stroke', (d) => d.data.active ? treeOpts.activeColor : 'black')

    pedigreeNodes.filter((d) => d.data.sex == "Male")
        .append('rect')
        .attr('width', nodeSize * 2)
        .attr('height', nodeSize * 2)
        .attr('fill', 'white')
        .attr('stroke', (d) => d.data.active ? treeOpts.activeColor : 'black')
        .attr('transform', "translate(-" + nodeSize + ", -" + nodeSize + ")");

    pedigreeNodes.filter((d) => d.data.sex != "Male" && d.data.sex != "Female")
        .append('rect')
        .attr('width', nodeSize * 2)
        .attr('height', nodeSize * 2)
        .attr('fill', 'white')
        .attr('stroke', (d) => d.data.active ? treeOpts.activeColor : 'black')
        .attr('transform', "rotate(45) translate(-" + nodeSize + ", -" + nodeSize + ")");


    // Add text, which screws up measureement
    pedigreeNodes.append('foreignObject')
        .html(treeOpts.callbacks.renderText)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('x', -nodeSize)
        .attr('y', -nodeSize/2)
        .attr('width', nodeSize*2)
        .attr('height', nodeSize*2)
}