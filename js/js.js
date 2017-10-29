// Assumes you've included D3 version 4 somewhere above:
// e.g. <script src="https://d3js.org/d3.v4.min.js"></script>

// Set up size
var mapWidth = 750;
var mapHeight = 750;

// Set up projection that the map is using

// This is the mapping between <longitude, latitude> position to <x, y> pixel position on the map
// projection is a function and it has an inverse:
// projection([lon, lat]) returns [x, y]
// projection.invert([x, y]) returns [lon, lat]
var projection = d3.geoMercator()
  .center([-122.433701, 37.767683]) // San Francisco, roughly
  .scale(225000)
  .translate([mapWidth / 2, mapHeight / 2]);

// MAIN STUFF
var sp; // species selected
var pl; // plot selected
var alldata; // global to store all data data

// LOADING DATA
d3.csv("data/trees.csv", parse, loadData);

// PARSE TREE INFO
function parse(d) {
	return {
	  tree: +d.TreeID,
    species: d.qSpecies,
    address: d.qAddress,
    plot: d.PlotSize,
    siteinfo : d.qSiteInfo,
    dbh : +d.DBH,
		val: [+d.Longitude,+d.Latitude]
	};
}

// LOADING DATA + CREATE PLOT
function loadData(error,data) {
  if (error) {
    return console.warn(error);
  }

  // filter out data that isn't well-formed
  data = data.filter(function(d) {
    if (d.species == "::" || d.species == "Tree(s) ::" || d.plot == "") {
      return false;
    } else {
      return true;
    }
  });

  // Add an SVG element to the DOM
  var svg = d3.select('#main-container').append('svg')
    .attr('width', mapWidth)
    .attr('height', mapHeight);

// Add SVG map at correct size, assuming map is saved in a subdirectory called `data`
  svg.append('image')
    .attr('width', mapWidth)
    .attr('height', mapHeight)
    .attr('xlink:href', 'data/sf-map.svg')
    .on('click',click); // fn when you click on map

  // Initial plot
  alldata=data;
  drawPlot(alldata);

  // ADJUSTING RADIUS
  var radiusAval = 0;
  var radiusBval = 0;
  d3.select("#radiusA").on("input", function() {
      radiusAval = +this.value;
      d3.select("#radiusA")
        .property("value", radiusAval)
        .attr("value", radiusAval);
      d3.select("#borderA") 
        .attr("r", radiusAval*ratio);
      drawPlot(alldata,filterfn);
  });
  d3.select("#radiusB").on("input", function() {
      radiusBval = +this.value;
      d3.select("#radiusB")
        .property("value", radiusBval)
        .attr("value", radiusBval);
      d3.select("#borderB") 
        .attr("r", radiusBval*ratio);
      drawPlot(alldata,filterfn);
  });

  // DRAG CTR
  function dragctr(d) {
    // update new center
    d3.select(this)
      .attr("cx", d3.event.x)
      .attr("cy", d3.event.y);
    var id = d3.select(this).attr("id");

    // update border
    d3.select("#border"+id)
      .attr("cx", d3.event.x)
      .attr("cy", d3.event.y)
    drawPlot(alldata,filterfn);
  }

  var count = 0;

  // MAKE INITIAL CIRCLES
  function click() {
    var point = d3.mouse(this);
    var pt = {x: point[0], y: point[1]};

    count += 1;

    if (count == 1) {
      svg.append("circle")
        .attr("cx", pt.x)
        .attr("cy", pt.y)
        .attr("r", "5px")
        .attr("id", "A")
        .attr("class", "dot")
        .attr("fill", "red")
        .call(d3.drag().on("drag", dragctr));
      svg.append("circle")
        .attr("cx", pt.x)
        .attr("cy", pt.y)
        .attr("r", 1 * ratio + "px")
        .attr("id", "borderA")
        .attr("class", "dot")
        .attr("fill","none")
        .attr("stroke", "red");

    } else if (count == 2) {
      svg.append("circle")
        .attr("cx", pt.x)
        .attr("cy", pt.y)
        .attr("r", "5px")
        .attr("id", "B")
        .attr("class", "dot")
        .attr("fill", "blue")
        .call(d3.drag().on("drag", dragctr));
      svg.append("circle")
        .attr("cx", pt.x)
        .attr("cy", pt.y)
        .attr("r", 1 * ratio + "px")
        .attr("id", "borderB")
        .attr("class", "dot")
        .attr("fill","none")
        .attr("stroke","blue");

        // update after doing both circles
        drawPlot(alldata,filterfn);
    }
  }

  // FILTERING
  // SPECIES
  // get unique species
  var uniquespecies = d3.nest()
    .key(function(d) { 
      return d.species;
    })
    .entries(data);

  uniquespecies.sort(function (a,b) {
    return d3.ascending(a.key, b.key);
  });

  //console.log(uniquespecies);
  // populate species dropdown
  d3.select('#speciesoption')
    .selectAll("option")
    .data(uniquespecies)
    .enter()
    .append("option")
    .attr("value", function (d) {
      return d.key; 
    })
    .text(function (d) { 
      return d.key; 
    });

  d3.select('#speciesoption').on('change', function() {
    sp = d3.select(this)
      .property('value');
    drawPlot(alldata, filterfn);
  });

  // PLOT SIZE
  // get unique size
  var uniqueplot = d3.nest()
    .key(function(d) {
      d.plot = d.plot.toLowerCase();
      return d.plot;
    })
    .entries(data);

  uniqueplot.sort(function (a,b) {
    return d3.ascending(a.key, b.key);
  });

  // populate plot dropdown
  d3.select('#plotsizeoption')
    .selectAll("option")
    .data(uniqueplot)
    .enter()
    .append("option")
    .attr("value", function(d) {
      return d.key;
    })
    .text(function (d) {
      return d.key;
    });

  d3.select('#plotsizeoption').on('change', function() {
    pl = d3.select(this)
      .property('value')
    drawPlot(alldata,filterfn);
  });

}

// DRAW POINTS
function drawPlot(data,filters) {
  var newdata;

  if (filters) {
    newdata=filters(data);
    //console.log("here");
  } else {
    //console.log("full");
    newdata=data;
  }

 	var pts = d3.select("svg")
    .selectAll("circle.cs").data(newdata, d=>d.tree);

  pts.enter()
      .append("circle")
      .attr("fill", "green")
      .attr("class","cs")
      .attr("r", "2px")
      .attr("cx", function(one) { 
        return projection(one.val)[0]; 
      })
      .attr("cy", function(one) { 
        return projection(one.val)[1]; 
      })
      // Source for jquery.tipsy.js and tipsy.css: 
      // http://bl.ocks.org/ilyabo/1373263
      $('svg circle.cs').tipsy({
        gravity: 'w',
        html:true,
        title: function (){
          var d = this.__data__, species = d.species, address=d.address, siteinfo = d.siteinfo, plot = d.plot, dbh = d.dbh;
          return '<b>Species:</b> ' + species + '<br><b>Address:</b> ' 
          + address + '<br><b>Site Info:</b> ' + siteinfo + '<br><b>Plot Size:</b> ' 
          + plot + '<br><b>DBH:</b> ' + dbh + ' inches';
        }
      });
  pts.exit().remove();
}

// FILTERING
function filterfn(d) {
  var filtered=d.filter(function(pt) {
    var filter=true;
    if (sp && sp !== "all") {
      filter = filter && (pt.species === sp);
    }

    if (pl && pl !== "all") {
      filter = filter && (pt.plot === pl);
    }

    if (d3.select("#A").size() && d3.select("#B").size()) {
      var ctrA = projection.invert([d3.select("#A").attr("cx"), d3.select("#A").attr("cy")]);
      var ctrB = projection.invert([d3.select("#B").attr("cx"), d3.select("#B").attr("cy")]);

      filter = filter && d3.geoDistance(ctrA, projection([ projection.invert(pt.val)[0] , projection.invert(pt.val)[1] ])) * earthradius <= d3.select("#radiusA").attr("value");
      filter = filter && d3.geoDistance(ctrB, projection([ projection.invert(pt.val)[0] , projection.invert(pt.val)[1] ])) * earthradius <= d3.select("#radiusB").attr("value");
    }
    return filter;
  });

  return filtered;
}

// GLOBALS
var earthradius = 3959; // from google
var miles = d3.geoDistance(projection.invert([750, 0]), projection.invert([0, 750])) * earthradius;

// PIXELS PER MILE
var ratio = (750 * Math.sqrt(2))/miles;
