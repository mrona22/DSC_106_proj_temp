import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const dataUrl = './Data/checkp_data';

fetch(dataUrl)
    .then(response => response.json())
    .then(data => {
        const transformedData = Object.keys(data.Activity).map(key => {
            return {
                Activity: data.Activity[key],
                Temperature: data.Temperature[key]
            };
        });

        const filteredData = transformedData.filter(d => !isNaN(d.Activity) && !isNaN(d.Temperature));

        createScatterPlot(filteredData);
    })
    .catch(error => {
        console.error("Error loading the data: ", error);
    });

function createScatterPlot(data) {
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#scatterplot")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear()
        .domain([d3.min(data, d => d.Activity), d3.max(data, d => d.Activity)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([d3.min(data, d => d.Temperature), d3.max(data, d => d.Temperature)])
        .range([height, 0]);

    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.Activity))
        .attr("cy", d => y(d.Temperature))
        .attr("r", 3)
        .attr("fill", "#6fa3ff");

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height + 40})`)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text("Activity Count");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text("Body Temperature (°C)");
}
