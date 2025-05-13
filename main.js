import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const dataUrl = './Data/data_real';

fetch(dataUrl)
    .then(response => response.json())
    .then(data => {
        const minutes = Object.keys(data.female_temp);
        const transformedData = minutes.map(minute => ({
            minute: minute,
            female_temp: data.female_temp[minute],
            male_temp: data.male_temp[minute],
            female_act_chng: data.female_act_chng[minute],
            male_act_chng: data.male_act_chng[minute],
            male__std: data.male__std[minute],
            female_std: data.female_std[minute]
        }));


        const filteredData = transformedData.filter(d =>
            !isNaN(d.female_temp) &&
            !isNaN(d.male_temp) &&
            !isNaN(d.female_act_chng) &&
            !isNaN(d.male_act_chng) &&
            !isNaN(d.male__std) &&
            !isNaN(d.female_std)
        );


        createLinePlot(filteredData);
    })
    .catch(error => {
        console.error("Error loading the data:", error);
    });


function createLinePlot(data) {
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#lineplot")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Parse time
    const parseTime = d3.timeParse("%H:%M");
    data.forEach(d => {
        d.time = parseTime(d.minute);
    });

    // Scales
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.time))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(data, d => Math.min(d.female_temp, d.male_temp)),
            d3.max(data, d => Math.max(d.female_temp, d.male_temp))
        ])
        .range([height, 0]);

    // Line generators
    const lineFemale = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.female_temp));

    const lineMale = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.male_temp));

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

    // X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));

    // Y axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add overlay rect
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mousemove", onMouseMove)
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
            focusLine.style("opacity", 0);
        });

    // Bisector to find closest time
    const bisect = d3.bisector(d => d.time).left;

    function onMouseMove(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = x.invert(mouseX);
        const i = bisect(data, x0);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = (!d0 || !d1) ? (d0 || d1) : (x0 - d0.time > d1.time - x0 ? d1 : d0);

        // Move vertical line
        focusLine
            .attr("x1", x(d.time))
            .attr("x2", x(d.time))
            .style("opacity", 1);

        // Update tooltip
        const scale = 5; // Adjust to make lines visible but not too long
        const svgWidth = 40;
        const svgHeight = 30;

        const femaleY2 = 15 - d.female_act_chng * scale;
        const maleY2 = 15 - d.male_act_chng * scale;
        console.log(d.female_std)
        const minTemp = Math.min(d.female_temp, d.male_temp) - 1;
        const maxTemp = Math.max(d.female_temp, d.male_temp) + 1;

        const tempToX = d3.scaleLinear()
            .domain([minTemp, maxTemp])
            .range([0, 130]); // match SVG width


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

    function generateGaussianPath(mean, std, tempToX) {
        const steps = 300;
        let path = "";

        const HEIGHT_SCALE = 16;   // reduced height
        const BASELINE_Y = 75;     // line is at y=75 now

        for (let i = 0; i <= steps; i++) {
            const xVal = mean + (i / steps) * 6 * std - 3 * std;
            const yVal = normalPDF(xVal, mean, std);
            const x = tempToX(xVal);
            const y = BASELINE_Y - yVal * HEIGHT_SCALE;

            path += i === 0 ? `M${x},${y}` : `L${x},${y}`;
        }

        return path;
    }





    const probScale = d3.scaleLinear()
    .domain([0, 0.4]) 
    .range([0, 30]);  

    function normalPDF(x, mean, std) {
        return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
    }

}


