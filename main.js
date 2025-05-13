import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const dataUrl = './Data/data_real';
const individualUrl = './Data/temp_act_data.json';

Promise.all([
    fetch(dataUrl).then(r => r.json()),
    fetch(individualUrl).then(r => r.json())
]).then(([meanData, indivData]) => {

    const minutes = Object.keys(meanData.female_temp);
    const combinedData = minutes.map(minute => ({
        minute,
        female_temp: meanData.female_temp[minute],
        male_temp: meanData.male_temp[minute],
        female_act_chng: meanData.female_act_chng[minute],
        male_act_chng: meanData.male_act_chng[minute],
        male__std: meanData.male__std[minute],
        female_std: meanData.female_std[minute]
    }));

    const filteredData = combinedData.filter(d =>
        !isNaN(d.female_temp) && !isNaN(d.male_temp)
    );

    createDropdowns(indivData, meanData);
    createLinePlot(filteredData);
});

function createDropdowns(indivData, meanData) {
    const femaleList = Object.keys(indivData).filter(k => k.startsWith('f')).sort();
    const maleList = Object.keys(indivData).filter(k => k.startsWith('m')).sort();

    const femSel = d3.select('body').insert("select", "#lineplot").attr("id", "femaleDropdown")
        .append("option").attr("value", "").text("-- Female Mean --");

    femaleList.forEach(id => {
        d3.select("#femaleDropdown")
          .append("option").attr("value", id).text(id);
    });

    const maleSel = d3.select('body').insert("select", "#lineplot").attr("id", "maleDropdown")
        .append("option").attr("value", "").text("-- Male Mean --");

    maleList.forEach(id => {
        d3.select("#maleDropdown")
          .append("option").attr("value", id).text(id);
    });

    d3.selectAll("select").on("change", function() {
        updateLines(indivData, meanData);
    });
}

function updateLines(indivData, meanData) {
    const fID = d3.select("#femaleDropdown").property("value");
    const mID = d3.select("#maleDropdown").property("value");

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    fetch('./Data/data_real')
        .then(r => r.json())
        .then(meanData => {
            const minutes = Object.keys(meanData.female_temp);
            
            const base = minutes.map(minute => {
    
                const dataPoint = {
                    minute,
                    time: d3.timeParse("%H:%M")(minute),
                    female_temp: fID ? indivData[fID][minute] : meanData.female_temp[minute],
                    male_temp: mID ? indivData[mID][minute] : meanData.male_temp[minute],
                };
                
                dataPoint.female_act_chng = fID && indivData[fID+"_act"] && indivData[fID+"_act"][minute] ? 
                    indivData[fID+"_act"][minute] : meanData.female_act_chng[minute];
                dataPoint.male_act_chng = mID && indivData[mID+"_act"] && indivData[mID+"_act"][minute] ? 
                    indivData[mID+"_act"][minute] : meanData.male_act_chng[minute];
   
                dataPoint.female_std = meanData.female_std[minute];
                dataPoint.male__std = meanData.male__std[minute];
                
                return dataPoint;
            });

            const filteredBase = base.filter(d => !isNaN(d.female_temp) && !isNaN(d.male_temp));

            const svg = d3.select("#lineplot");
            svg.selectAll("*").remove();

            svg.attr("width", width + margin.left + margin.right)
               .attr("height", height + margin.top + margin.bottom);

            const g = svg.append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

            const x = d3.scaleTime()
                .domain(d3.extent(filteredBase, d => d.time))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([
                    d3.min(filteredBase, d => Math.min(d.female_temp, d.male_temp)) - 0.2,
                    d3.max(filteredBase, d => Math.max(d.female_temp, d.male_temp)) + 0.2
                ])
                .range([height, 0]);

            const lineF = d3.line().x(d => x(d.time)).y(d => y(d.female_temp));
            const lineM = d3.line().x(d => x(d.time)).y(d => y(d.male_temp));

            const highlightStart = d3.timeParse("%H:%M")("12:15");
            const highlightEnd = d3.timeMinute.offset(highlightStart, 85); 

            const xStart = x(highlightStart);
            const xEnd = x(highlightEnd);

            g.append("rect")
                .attr("x", xStart)
                .attr("y", 0)
                .attr("width", xEnd - xStart)
                .attr("height", height)
                .attr("fill", "#fff8b0") 
                .attr("opacity", 0.4)
                .attr("stroke", "#e0c000") 
                .attr("stroke-width", 1)
                .attr("style", "cursor: pointer")
                .attr("style", "pointer-events: visible")
                .on("mousemove", event => onMouseMove(event, filteredBase, x, y))
                .on("mouseout", () => {
                    tooltip.style("visibility", "hidden");
                    focusLine.style("opacity", 0);
                })
                .on("click", () => {
                    tooltip.style("visibility", "hidden");
                    svg.selectAll("*").remove();
                    onClickEvent(svg);
                })
                .lower();

            g.append("path")
                .datum(filteredBase)
                .attr("fill", "none")
                .attr("stroke", "#ff6f61")
                .attr("stroke-width", 2)
                .attr("d", lineF);

            g.append("path")
                .datum(filteredBase)
                .attr("fill", "none")
                .attr("stroke", "#6fa3ff")
                .attr("stroke-width", 2)
                .attr("d", lineM);

            // Tooltip elements
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background", "rgba(0, 0, 0, 0.7)")
                .style("color", "#fff")
                .style("padding", "8px")
                .style("border-radius", "4px")
                .style("pointer-events", "none");

            const focusLine = g.append("line")
                .attr("stroke", "#aaa")
                .attr("stroke-width", 1)
                .attr("y1", 0)
                .attr("y2", height)
                .style("opacity", 0);

            // Add overlay for mouse interactions
            g.append("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "none")
                .attr("pointer-events", "all")
                .on("mousemove", event => onMouseMove(event, filteredBase, x, y))
                .on("mouseout", () => {
                    tooltip.style("visibility", "hidden");
                    focusLine.style("opacity", 0);
                });

            // Add axes
            g.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));

            g.append("g")
                .call(d3.axisLeft(y));

            // Tooltip mouse move function
            function onMouseMove(event, data, x, y) {
                const [mouseX] = d3.pointer(event);
                const x0 = x.invert(mouseX);
                const bisect = d3.bisector(d => d.time).left;
                const i = bisect(data, x0);
                const d0 = data[i - 1];
                const d1 = data[i];
                const d = (!d0 || !d1) ? (d0 || d1) : (x0 - d0.time > d1.time - x0 ? d1 : d0);

                if (!d) return;

                // Move vertical line
                focusLine
                    .attr("x1", x(d.time))
                    .attr("x2", x(d.time))
                    .style("opacity", 1);

                const minTemp = Math.min(d.female_temp, d.male_temp) - 1;
                const maxTemp = Math.max(d.female_temp, d.male_temp) + 1;

                const tempToX = d3.scaleLinear()
                    .domain([minTemp, maxTemp])
                    .range([0, 130]);

                tooltip
                    .style("visibility", "visible")
                    .html(`
                        <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">
                            ${d3.timeFormat("%H:%M")(d.time)}
                        </div>

                        <svg width="100" height="90">
                            <text x="50" y="12" text-anchor="middle" font-size="9" font-weight="bold" fill="white">
                                Change in activity
                            </text>

                            <!-- Male vector (now blue) -->
                            <line 
                                x1="15" y1="60" 
                                x2="${15 + 25}" 
                                y2="${60 - d.male_act_chng * 3}" 
                                stroke="#6fa3ff" 
                                stroke-width="2" 
                                marker-end="url(#arrow-blue)"/>
                            <text x="25" y="30" text-anchor="middle" font-size="9" font-weight="bold" fill="#6fa3ff">M</text>

                            <!-- Female vector (now red) -->
                            <line 
                                x1="60" y1="60" 
                                x2="${60 + 25}" 
                                y2="${60 - d.female_act_chng * 3}" 
                                stroke="#ff6f61" 
                                stroke-width="2" 
                                marker-end="url(#arrow-red)"/>
                            <text x="70" y="30" text-anchor="middle" font-size="9" font-weight="bold" fill="#ff6f61">F</text>

                            <defs>
                                <marker id="arrow-blue" markerWidth="3" markerHeight="3" refX="2.2" refY="1.5" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L3,1.5 L0,3 Z" fill="#6fa3ff" />
                                </marker>
                                <marker id="arrow-red" markerWidth="3" markerHeight="3" refX="2.2" refY="1.5" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L3,1.5 L0,3 Z" fill="#ff6f61" />
                                </marker>
                            </defs>

                        </svg>

                        <svg width="130" height="90">
                            <text x="65" y="12" text-anchor="middle" fill="white" font-size="9" font-weight="bold">
                                Temperature Distribution
                            </text>
                            <text x="${tempToX(d.male_temp)}" y="88" text-anchor="middle" font-size="7" fill="#6fa3ff">
                                ${d.male_temp.toFixed(1)}
                            </text>

                            <text x="${tempToX(d.female_temp)}" y="88" text-anchor="middle" font-size="7" fill="#ff6f61">
                                ${d.female_temp.toFixed(1)}
                            </text>


                            <!-- Tick for Male Temp -->
                            <line x1="${tempToX(d.male_temp)}" y1="70" x2="${tempToX(d.male_temp)}" y2="80" stroke="#6fa3ff" stroke-width="1.5" />

                            <!-- Tick for Female Temp -->
                            <line x1="${tempToX(d.female_temp)}" y1="70" x2="${tempToX(d.female_temp)}" y2="80" stroke="#ff6f61" stroke-width="1.5" />


                            <line x1="0" y1="75" x2="130" y2="75" stroke="black" stroke-width="1" />

                            <!-- Male Gaussian (now blue) -->
                            <path d="${generateGaussianPath(d.male_temp, d.male__std * 0.5, tempToX)}" fill="none" stroke="#6fa3ff" stroke-width="2" />
                            <text x="8" y="30" fill="#6fa3ff" font-size="9" font-weight="bold">M</text>

                            <!-- Female Gaussian (now red) -->
                            <path d="${generateGaussianPath(d.female_temp, d.female_std * 0.5, tempToX)}" fill="none" stroke="#ff6f61" stroke-width="2" />
                            <text x="100" y="30" fill="#ff6f61" font-size="9" font-weight="bold">F</text>
                        </svg>
                    `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 80}px`);
            }
        });
}

function generateGaussianPath(mean, std, tempToX) {
    const steps = 300;
    let path = "";

    const HEIGHT_SCALE = 16;   
    const BASELINE_Y = 75;     

    for (let i = 0; i <= steps; i++) {
        const xVal = mean + (i / steps) * 6 * std - 3 * std;
        const yVal = normalPDF(xVal, mean, std);
        const x = tempToX(xVal);
        const y = BASELINE_Y - yVal * HEIGHT_SCALE;

        path += i === 0 ? `M${x},${y}` : `L${x},${y}`;
    }

    return path;
}

function normalPDF(x, mean, std) {
    return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
}

function createLinePlot(data) {
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#lineplot")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

 
    const parseTime = d3.timeParse("%H:%M");
    data.forEach(d => {
        d.time = parseTime(d.minute);
    });

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.time))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(data, d => Math.min(d.female_temp, d.male_temp)) - 0.2,
            d3.max(data, d => Math.max(d.female_temp, d.male_temp)) + 0.2
        ])
        .range([height, 0]);

    const lineFemale = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.female_temp));

    const lineMale = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.male_temp));

    
    const highlightStart = parseTime("12:15");
    const highlightEnd = d3.timeMinute.offset(highlightStart, 85); 

    const xStart = x(highlightStart);
    const xEnd = x(highlightEnd);

    svg.append("rect")
        .attr("x", xStart)
        .attr("y", 0)
        .attr("width", xEnd - xStart)
        .attr("height", height)
        .attr("fill", "#fff8b0") 
        .attr("opacity", 0.4)
        .attr("stroke", "#e0c000") 
        .attr("stroke-width", 1)
        .lower(); 

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none");

    const focusLine = svg.append("line")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1)
        .attr("y1", 0)
        .attr("y2", height)
        .style("opacity", 0);

    // Append lines
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#ff6f61")
        .attr("stroke-width", 2)
        .attr("d", lineFemale);

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#6fa3ff")
        .attr("stroke-width", 2)
        .attr("d", lineMale);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mousemove", event => onMouseMove(event, data, x, y))
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
            focusLine.style("opacity", 0);
        });

    svg.append("rect")
        .attr("x", xStart)
        .attr("y", 0)
        .attr("width", xEnd - xStart)
        .attr("height", height)
        .attr("fill", "#fff8b0")
        .attr("opacity", 0.4)
        .attr("stroke", "#e0c000")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .style("pointer-events", "visible") // Allow interaction only with painted area
        .on("mousemove", event => onMouseMove(event, data, x, y)) // same function as overlay
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
            focusLine.style("opacity", 0);
        })
        .on("click", () => {
            tooltip.style("visibility", "hidden");
            svg.selectAll("*").remove();
            onClickEvent(svg);
        });

    // Tooltip mouse move function
    function onMouseMove(event, data, x, y) {
        const [mouseX] = d3.pointer(event);
        const x0 = x.invert(mouseX);
        const bisect = d3.bisector(d => d.time).left;
        const i = bisect(data, x0);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = (!d0 || !d1) ? (d0 || d1) : (x0 - d0.time > d1.time - x0 ? d1 : d0);

        if (!d) return;

        // Move vertical line
        focusLine
            .attr("x1", x(d.time))
            .attr("x2", x(d.time))
            .style("opacity", 1);

        const minTemp = Math.min(d.female_temp, d.male_temp) - 1;
        const maxTemp = Math.max(d.female_temp, d.male_temp) + 1;

        const tempToX = d3.scaleLinear()
            .domain([minTemp, maxTemp])
            .range([0, 130]); 

        tooltip
        .style("visibility", "visible")
        .html(`
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">
                ${d3.timeFormat("%H:%M")(d.time)}
            </div>

            <svg width="100" height="90">
                <text x="50" y="12" text-anchor="middle" font-size="9" font-weight="bold" fill="white">
                    Change in activity
                </text>

                <!-- Male vector (now blue) -->
                <line 
                    x1="15" y1="60" 
                    x2="${15 + 25}" 
                    y2="${60 - d.male_act_chng * 3}" 
                    stroke="#6fa3ff" 
                    stroke-width="2" 
                    marker-end="url(#arrow-blue)"/>
                <text x="25" y="30" text-anchor="middle" font-size="9" font-weight="bold" fill="#6fa3ff">M</text>

                <!-- Female vector (now red) -->
                <line 
                    x1="60" y1="60" 
                    x2="${60 + 25}" 
                    y2="${60 - d.female_act_chng * 3}" 
                    stroke="#ff6f61" 
                    stroke-width="2" 
                    marker-end="url(#arrow-red)"/>
                <text x="70" y="30" text-anchor="middle" font-size="9" font-weight="bold" fill="#ff6f61">F</text>

                <defs>
                    <marker id="arrow-blue" markerWidth="3" markerHeight="3" refX="2.2" refY="1.5" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L3,1.5 L0,3 Z" fill="#6fa3ff" />
                    </marker>
                    <marker id="arrow-red" markerWidth="3" markerHeight="3" refX="2.2" refY="1.5" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L3,1.5 L0,3 Z" fill="#ff6f61" />
                    </marker>
                </defs>

            </svg>

            <svg width="130" height="90">
                <text x="65" y="12" text-anchor="middle" fill="white" font-size="9" font-weight="bold">
                    Temperature Distribution
                </text>
                <text x="${tempToX(d.male_temp)}" y="88" text-anchor="middle" font-size="7" fill="#6fa3ff">
                    ${d.male_temp.toFixed(1)}
                </text>

                <text x="${tempToX(d.female_temp)}" y="88" text-anchor="middle" font-size="7" fill="#ff6f61">
                    ${d.female_temp.toFixed(1)}
                </text>


                <!-- Tick for Male Temp -->
                <line x1="${tempToX(d.male_temp)}" y1="70" x2="${tempToX(d.male_temp)}" y2="80" stroke="#6fa3ff" stroke-width="1.5" />

                <!-- Tick for Female Temp -->
                <line x1="${tempToX(d.female_temp)}" y1="70" x2="${tempToX(d.female_temp)}" y2="80" stroke="#ff6f61" stroke-width="1.5" />


                <line x1="0" y1="75" x2="130" y2="75" stroke="black" stroke-width="1" />

                <!-- Male Gaussian (now blue) -->
                <path d="${generateGaussianPath(d.male_temp, d.male__std * 0.5, tempToX)}" fill="none" stroke="#6fa3ff" stroke-width="2" />
                <text x="8" y="30" fill="#6fa3ff" font-size="9" font-weight="bold">M</text>

                <!-- Female Gaussian (now red) -->
                <path d="${generateGaussianPath(d.female_temp, d.female_std * 0.5, tempToX)}" fill="none" stroke="#ff6f61" stroke-width="2" />
                <text x="100" y="30" fill="#ff6f61" font-size="9" font-weight="bold">F</text>
            </svg>
        `)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 80}px`);
    }
}

function onClickEvent(svg) {
    fetch('./Data/additional_data')
        .then(response => response.json())
        .then(data => {
            const minutes = Object.keys(data.max); 
            const transformedData = minutes.map(minute => ({
                minute: minute,
                max: data.max[minute],
                min: data.min[minute],
                mean: data.mean[minute],
                m1: data.m1[minute],
                m2: data.m2[minute],
                m3: data.m3[minute],
                m4: data.m4[minute],
                m5: data.m5[minute],
                m6: data.m6[minute],
                m7: data.m7[minute],
                m8: data.m8[minute],
                m9: data.m9[minute],
                m10: data.m10[minute],
                m11: data.m11[minute],
                m12: data.m12[minute],
                m13: data.m13[minute],
            }));
            
            createPlotB(transformedData)
        });
}

function createPlotB(data) {
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#lineplot");

    svg.selectAll("*").remove();

    // Reset SVG dimensions
    svg.attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const parseTime = d3.timeParse("%H:%M");
    data.forEach(d => {
        d.time = parseTime(d.minute);
    });

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.time))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(data, d => d.min - 0.1),
            d3.max(data, d => d.max + 0.1)
        ])
        .range([height, 0]);

    const areaMinMax = d3.area()
        .x(d => x(d.time))
        .y0(d => y(d.min) + 7)
        .y1(d => y(d.max) - 7);

    g.append("path")
        .datum(data)
        .attr("fill", "#cce5ff") 
        .attr("opacity", 0.4)
        .attr("d", areaMinMax);

    const lineMax = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.max) - 6);

    const lineMin = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.min) + 6);

    const lineMean = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.mean));

    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#6fa3ff")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2")
        .attr("opacity", 0.4)
        .attr("d", lineMax);

    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#6fa3ff")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2")
        .attr("opacity", 0.4)
        .attr("d", lineMin);

    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#222")
        .attr("stroke-width", 2)
        .attr('opacity', 0.3)
        .attr("stroke-dasharray", "4,2") 
        .attr("d", lineMean);


    const memberLines = d3.line()
        .x(d => x(d.time))
        .y((d, i, arr) => {

            return 0;
        });


    const memberKeys = [
        'm1', 'm2', 'm3', 'm4', 'm5', 'm6',
        'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13'
    ];

    memberKeys.forEach(key => {
        const line = d3.line()
            .x(d => x(d.time))
            .y(d => y(d[key]));

        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#6fa3ff") 
            .attr("stroke-width", 1)
            .attr("opacity", 0.1)
            .attr("d", line);
    });

    // X axis
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));

    // Y axis
    g.append("g")
        .call(d3.axisLeft(y));
}


