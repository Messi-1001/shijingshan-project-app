/* js/logic/graph.js —— 前置依赖图：拓扑序 / 就绪判定 / 关键路径（纯函数，不碰 DOM） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.logic = root.SJSQ.logic || {};
    root.SJSQ.logic.graph = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function buildGraph(list) {
    var byId = {}, edges = {};
    (list || []).forEach(function (p) {
      byId[p.id] = p;
      edges[p.id] = (p.prev || []).slice();
    });
    return { byId: byId, edges: edges };
  }

  function topoOrder(list) {
    var gr = buildGraph(list);
    var inDeg = {}, queue = [], out = [];
    Object.keys(gr.byId).forEach(function (id) { inDeg[id] = gr.edges[id].length; });

    Object.keys(gr.byId).forEach(function (id) { if (inDeg[id] === 0) queue.push(id); });
    queue.sort(function (a, b) { return (gr.byId[a].no || 0) - (gr.byId[b].no || 0); });

    while (queue.length) {
      var id = queue.shift();
      out.push(id);
      Object.keys(gr.byId).forEach(function (other) {
        if (gr.edges[other].indexOf(id) >= 0) {
          inDeg[other] -= 1;
          if (inDeg[other] === 0) queue.push(other);
        }
      });
      queue.sort(function (a, b) { return (gr.byId[a].no || 0) - (gr.byId[b].no || 0); });
    }

    return out.length === Object.keys(gr.byId).length ? out : [];
  }

  function descendants(list, id) {
    var gr = buildGraph(list);
    var seen = {}, stack = [id], out = [];
    while (stack.length) {
      var cur = stack.pop();
      Object.keys(gr.byId).forEach(function (other) {
        if (gr.edges[other].indexOf(cur) >= 0 && !seen[other]) {
          seen[other] = true; out.push(other); stack.push(other);
        }
      });
    }
    return out;
  }

  function blockedBy(list, id, doneMap) {
    var gr = buildGraph(list);
    var p = gr.byId[id];
    if (!p) return [];
    return (p.prev || []).filter(function (pid) { return !(doneMap || {})[pid]; });
  }

  function readyToStart(list, doneMap) {
    var d = doneMap || {};
    var gr = buildGraph(list);
    return list.filter(function (p) {
      if (d[p.id]) return false;
      return (p.prev || []).every(function (pid) { return !!d[pid]; });
    }).map(function (p) { return p.id; });
  }

  function criticalPath(list) {
    var gr = buildGraph(list);
    var order = topoOrder(list);
    if (!order.length) return [];
    var dist = {}, back = {}, days = {};

    order.forEach(function (id) {
      var p = gr.byId[id];
      days[id] = p.durationDays || 0;
    });

    order.forEach(function (id) {
      var best = days[id], prev = null;
      (gr.edges[id] || []).forEach(function (pid) {
        var cand = (dist[pid] || 0) + days[id];
        if (cand > best) { best = cand; prev = pid; }
      });
      dist[id] = best;
      back[id] = prev;
    });

    var end = order.reduce(function (a, b) { return (dist[a] || 0) >= (dist[b] || 0) ? a : b; }, order[0]);
    var path = [];
    var cur = end;
    while (cur) { path.unshift(cur); cur = back[cur]; }
    return path;
  }

  return {
    buildGraph: buildGraph, topoOrder: topoOrder, descendants: descendants,
    blockedBy: blockedBy, readyToStart: readyToStart, criticalPath: criticalPath
  };
});
