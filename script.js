const width = 960;
const height = 600;

const svgContainer = d3
  .select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

let tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .attr("id", "tooltip")
  .style("opacity", 0);


const urls = [
  {
    education:
      "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json"
  },
  {
    county:
      "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json"
  },
  { votes: "https://raw.githubusercontent.com/booshay/temp/master/countypres_2000-2016.json" }
];
var path = d3.geoPath();

const getData = async (url) => {
  const data = await axios(url);
  return data;
};

const fetchURLs = async () => {
  const requests = urls.map((e) => {
    const url = Object.values(e)[0];
    return getData(url).then((a) => {
      return a.data;
    });
  });
  return Promise.all(requests); // Waiting for all the requests to get resolved.
};

fetchURLs().then((data) => {
  const [educationData, countyData, voteData] = data; //destructured into seperate arrays
  const geoData = topojson.feature(countyData, countyData.objects.counties)
    .features; //converted to GeoJSON

  const voteTotal = data[2].filter((e) => {
    return e.state == "California" && e.year == '2016' && (e.party == "republican" || e.party == "democrat")
  })



  console.log(voteTotal)

  const minBachelors = d3.min(educationData, (d) => d.bachelorsOrHigher);
  const maxBachelors = d3.max(educationData, (d) => d.bachelorsOrHigher);

  var colorScale = d3
    .scaleLinear()
    .domain(
      d3.range(minBachelors, maxBachelors, (maxBachelors - minBachelors) / 8)
    )
    .range(d3.schemePurples[6]);

  const colors = colorScale.range();

  //legend
  var legendColors = colors;
  var legendWidth = 400;
  var legendHeight = 300 / legendColors.length;

  var legendThreshold = d3
    .scaleThreshold()
    .domain(
      (function (min, max, count) {
        var array = [];
        var step = (max - min) / count;
        var base = min;
        for (var i = 1; i < count; i++) {
          array.push(base + i * step);
        }
        return array;
      })(minBachelors, maxBachelors, legendColors.length + 1)
    )
    .range(legendColors);

  const legendScale = d3
    .scaleOrdinal()
    .domain(
      legendThreshold.domain().map((d) => {
        return Math.round(d * 10) / 10;
      })
    )
    .range(legendColors);

  const legend = d3
    .legendColor()
    .orient("horizontal")
    .shape("rect")
    .shapeRadius(11)
    .shapePadding(25)
    .labelOffset(20)
    .scale(legendScale);

  svgContainer
    .append("g")
    .attr("class", "legend")
    .attr("id", "legend")
    .style("fill", "#fff")
    .attr("transform", "translate(622, 45)") // x,y
    .call(legend);

  //map

  svgContainer
    .append("g")
    .attr("class", "counties")
    .selectAll("path")
    .data(geoData)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("data-fips", function (d) {
      return d.id;
    })
    .attr("data-education", (d) => {
      var result = educationData.filter((obj) => {
        return obj.fips == d.id;
      });
      if (result[0]) {
        return result[0].bachelorsOrHigher;
      }
      //could not find a matching fips id in the data
      console.log("could find data for: ", d.id);
      return 0;
    })
    .attr("fill", function (d) {
      var result = educationData.filter((obj) => {
        return obj.fips == d.id;
      });
      if (result[0]) {
        return colorScale(result[0].bachelorsOrHigher);
      }
      //could not find a matching fips id in the data
      return colorScale(0);
    })
    .attr("d", path) //start tooltip below ------------------------------

    .on("mouseover", function (d) {
      const voteResult = voteData.filter((obj) => {   /////////////working here------------------
        return obj.FIPS == d.id && obj.year == 2016
      })
      const Hilary = Number(voteResult[0].candidatevotes);
      const Trump = Number(voteResult[1].candidatevotes);
      const totalVotes = voteResult[0].totalvotes;
      tooltip.style("opacity", 0.9);
      tooltip
        .html(function () {
          var result = educationData.filter((obj) => {
            return obj.fips == d.id;
          });
          if (result[0]) {
            return (
              "<span>" + result[0]["area_name"] + " </span>" +
              "<span>" + result[0]["state"] + " </span>" +
              "</br>" +
              "<span>" + result[0].bachelorsOrHigher + "% have a bachelor's degree or higher</span>" +
              "</br>" +
              "<span> Vote results for " + voteResult[0].county + " " + voteResult[0].state + "</span>" +
              "</br>" +
              "<span> Total votes: " + totalVotes + " </span>" +
              "</br>" +
              "<span>" + d3.format('.0%')(Hilary / totalVotes) + " voted for Hillary</span>" +
              "</br>" +
              "<span>" + d3.format('.0%')(Trump / totalVotes) + " voted for Trump</span>"
            );
          }
          //could not find a matching fips id in the data
          return 0;
        })
        .attr("data-education", () => {
          var result = educationData.filter((obj) => {
            return obj.fips == d.id;
          });
          if (result[0]) {
            return result[0].bachelorsOrHigher;
          }
          //could not find a matching fips id in the data
          return 0;
        })
        .style("left", d3.event.pageX + 15 + "px")
        .style("top", d3.event.pageY - 150 + "px");
    })
    .on("mouseout", (d) => {
      tooltip.style("opacity", 0);
    });
}); //end of fetching data, nothing below this line