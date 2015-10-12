
var width = window.innerWidth,
    height = window.innerHeight,
    x = d3.scale.linear().domain([0, width]).range([0, width]),
    y = d3.scale.linear().domain([0, height]).range([height, 0]),
    padding = 6,
    maxRadius = 1,
    selected = null,
    svg,
    nodes,
    force,
    zoom;

var setSelection,
    color = d3.scale.quantize().range(["#156b87", "#876315", "#543510", "#872815"]);

updateSelection = function(current, node) {

  if(selected) {
    selected.classed('selected', false);
  }

  if(selected != current) {
    selected = current;
    selected.classed('selected', true);

    document.getElementsByClassName('body-name')[0].innerHTML = node.name;
  } else {
    selected = null;
  }
};

nodes = objects.planets.filter(function(planet) {
  planet.cx = width / 2;
  planet.cy = height / 2;
  return planet.radius && planet.radius >= 1.0;
});

color.domain(d3.extent(nodes, function(d) { return d.radius; }));

d3.layout.pack()
    .sort(null)
    .size([width, height])
    .children(function(d) { return d.values; })
    .value(function(d) { return d.radius * d.radius; })
    .nodes({values: d3.nest()
      .key(function(d) { return d.cluster; })
      .entries(nodes)});

force = d3.layout.force()
    .nodes(nodes)
    .size([width, height])
    .gravity(0)
    .charge(0)
    .on("tick", tick)
    .start();

force.drag().on("dragstart", function(node) {
  d3.event.sourceEvent.stopPropagation();
  updateSelection(d3.select(this), node);
});

zoom = d3.behavior.zoom().x(x).y(y).scaleExtent([0,10]).on('zoom', function() {
          svg.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
        });

svg = d3.select("body").append("svg")
    .call(zoom)
    .on('dblclick.zoom', null)
    .attr('width', width).attr('height', height)
    .attr('pointer-events', 'all')
    .attr('viewBox', '0 0 ' + width + ' ' + height)
    .attr('preserveAspectRatio', 'xMinYMid')
    .append('svg:g');

var node = svg.selectAll("circle")
    .data(nodes)
  .enter().append("circle")
    .style("fill", function(d) { return color(d.radius); })
    .call(force.drag)
    .on("mouseover", function(){
      d3.select(this).classed('hover', true);
    })
    .on("mouseout", function(){
      d3.select(this).classed('hover', false);
    });

node.transition()
    .duration(500)
    .delay(function(d, i) { return i * 5; })
    .attrTween("r", function(d) {
      var i = d3.interpolate(0, d.radius);
      return function(t) { return d.radius = i(t); };
    });

function tick(e) {
  node
      .each(gravity(.002 * e.alpha))
      .each(collide(.5))
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
}

function gravity(alpha) {
  return function(d) {
    d.y += (d.cy - d.y) * alpha;
    d.x += (d.cx - d.x) * alpha;
  };
}

function collide(alpha) {
  var quadtree = d3.geom.quadtree(nodes);
  return function(d) {
    var r = d.radius + maxRadius + padding,
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
        if (l < r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}

