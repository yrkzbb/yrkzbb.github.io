(function () {
  "use strict";
  var host = document.querySelector("[data-knowledge-graph]");
  if (!host) return;
  var status = document.querySelector("[data-graph-status]");
  var search = document.querySelector("[data-graph-search]");

  fetch("/data/knowledge-graph.json")
    .then(function (response) {
      return response.json();
    })
    .then(function (graph) {
      var width = 1000;
      var height = 620;
      var centerX = width / 2;
      var centerY = height / 2;
      var nodes = graph.nodes.slice().sort(function (a, b) {
        return b.count - a.count;
      });
      var byId = {};
      nodes.forEach(function (node, index) {
        var angle = index * 2.399963;
        var radius = 45 + Math.sqrt(index) * 62;
        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius * 0.72;
        byId[node.id] = node;
      });
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("tabindex", "0");
      graph.links.forEach(function (link) {
        if (!byId[link.source] || !byId[link.target]) return;
        var line = document.createElementNS(svg.namespaceURI, "line");
        line.setAttribute("x1", byId[link.source].x);
        line.setAttribute("y1", byId[link.source].y);
        line.setAttribute("x2", byId[link.target].x);
        line.setAttribute("y2", byId[link.target].y);
        line.setAttribute("stroke-width", Math.min(7, 0.8 + link.weight));
        line.dataset.source = link.source;
        line.dataset.target = link.target;
        svg.appendChild(line);
      });
      nodes.forEach(function (node) {
        var link = document.createElementNS(svg.namespaceURI, "a");
        link.setAttribute("href", "/tags/" + encodeURIComponent(node.id) + "/");
        link.dataset.node = node.id;
        var circle = document.createElementNS(svg.namespaceURI, "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", 8 + Math.sqrt(node.count) * 5);
        var text = document.createElementNS(svg.namespaceURI, "text");
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y + 4);
        text.textContent = node.id;
        link.append(circle, text);
        svg.appendChild(link);
      });
      host.appendChild(svg);
      status.textContent =
        nodes.length + " 个标签 · " + graph.links.length + " 条联系";
      search.addEventListener("input", function () {
        var term = search.value.trim().toLowerCase();
        svg.querySelectorAll("[data-node]").forEach(function (node) {
          node.classList.toggle(
            "is-muted",
            Boolean(term) && !node.dataset.node.toLowerCase().includes(term),
          );
        });
        svg.querySelectorAll("line").forEach(function (line) {
          line.classList.toggle(
            "is-muted",
            Boolean(term) &&
              !line.dataset.source.toLowerCase().includes(term) &&
              !line.dataset.target.toLowerCase().includes(term),
          );
        });
      });
    })
    .catch(function () {
      status.textContent = "知识图谱加载失败";
    });
})();
