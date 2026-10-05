/* js/logic/schedule.js —— 进度排期内核：正排 / 倒排 / 总时差 / 关键路径（纯函数，不碰 DOM 与存储） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./tender.js'));
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.logic = root.SJSQ.logic || {}; root.SJSQ.logic.schedule = factory(root.SJSQ.logic.tender); }
})(typeof self !== 'undefined' ? self : this, function (tender) {
  'use strict';
  var addDays = tender.addDays;

  // 按编号前缀给缺省办理天数（lx 立项 / yd 用地 / gh 规划 / pj 评价 / zb 招标 / sg 施工 / jg 竣工）
  var DEFAULT_DURATION = { default: 10, lx: 15, yd: 7, gh: 10, pj: 15, zb: 15, sg: 10, jg: 7 };

  function prefixOf(id) { return String(id).split('-')[0]; }

  function durationOf(p) {
    if (p && typeof p.duration === 'number' && p.duration > 0) return p.duration;
    var k = prefixOf(p && p.id);
    return DEFAULT_DURATION[k] || DEFAULT_DURATION.default;
  }

  function indexById(list) {
    var m = {};
    for (var i = 0; i < list.length; i++) m[list[i].id] = list[i];
    return m;
  }

  // 前置成环检测（DFS 三色标记），返回环列表，正常为 []
  function detectCycles(list) {
    var byId = indexById(list);
    var cycles = [];
    var WHITE = 0, GRAY = 1, BLACK = 2;
    var color = {};
    var stack = [];
    function visit(id) {
      if (color[id] === GRAY) {
        cycles.push(stack.slice(stack.indexOf(id)).concat(id));
        return;
      }
      if (color[id] === BLACK) return;
      color[id] = GRAY;
      stack.push(id);
      var p = byId[id];
      var prev = (p && p.prev) || [];
      for (var i = 0; i < prev.length; i++) visit(prev[i]);
      stack.pop();
      color[id] = BLACK;
    }
    for (var i = 0; i < list.length; i++) if (!color[list[i].id]) visit(list[i].id);
    return cycles;
  }

  // 正排：est = max(所有 prev 的 eft) + 1；无 prev 或 parallel 时从 startDate 起算。
  // prev 引用未知 id 一律抛错——数据 bug 要早发现，不能静默跳过。
  function forward(list, startDate) {
    if (detectCycles(list).length) throw new Error('schedule: 前置依赖成环，无法排期');
    var byId = indexById(list);
    var memo = {};
    function est(id) {
      if (memo[id]) return memo[id];
      var p = byId[id];
      if (!p) throw new Error('schedule: 未知前置 ' + id);
      var prev = p.parallel ? [] : (p.prev || []);
      var start = prev.length ? null : startDate;
      for (var i = 0; i < prev.length; i++) {
        var pid = prev[i];
        if (!byId[pid]) throw new Error('schedule: 未知前置 ' + pid + '（被 ' + id + ' 引用）');
        var peft = addDays(est(pid), durationOf(byId[pid]) - 1);
        var cand = addDays(peft, 1);
        if (start === null || cand > start) start = cand;
      }
      memo[id] = start;
      return start;
    }
    for (var i = 0; i < list.length; i++) est(list[i].id);
    return list.map(function (p, idx) {
      var e = memo[p.id];
      var d = durationOf(p);
      return { id: p.id, no: p.no, name: p.name, dur: d, est: e, eft: addDays(e, d - 1), row: idx };
    });
  }

  function maxEft(rows) {
    return rows.reduce(function (m, r) { return r.eft > m ? r.eft : m; }, rows[0].eft);
  }

  // 倒排：lft = min(所有子项的 lst) - 1，叶子直接取 targetEndDate；
  // 总时差 slack = lst − est（est 用「以最早 lst 为开工日」的内排基准，target=项目完成日时与正排完全一致）。
  function backward(list, targetEndDate) {
    if (detectCycles(list).length) throw new Error('schedule: 前置依赖成环，无法排期');
    var byId = indexById(list);
    var children = {};
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var prev = p.parallel ? [] : (p.prev || []);
      for (var j = 0; j < prev.length; j++) {
        (children[prev[j]] = children[prev[j]] || []).push(p.id);
      }
    }
    var memo = {};
    function lft(id) {
      if (memo[id]) return memo[id];
      var p = byId[id];
      if (!p) throw new Error('schedule: 未知前置 ' + id);
      var kids = children[id] || [];
      var end;
      if (!kids.length) end = targetEndDate;
      else {
        end = null;
        for (var k = 0; k < kids.length; k++) {
          var klst = addDays(lft(kids[k]), -(durationOf(byId[kids[k]]) - 1));
          var cand = addDays(klst, -1);
          if (end === null || cand < end) end = cand;
        }
      }
      memo[id] = end;
      return end;
    }
    for (var i2 = 0; i2 < list.length; i2++) lft(list[i2].id);

    // 总时差：拿最早可开工日（= 全部 lst 的最小值）做一次正排作基准
    var lstMap = {};
    var startMin = null;
    for (var i3 = 0; i3 < list.length; i3++) {
      var d3 = durationOf(list[i3]);
      lstMap[list[i3].id] = addDays(memo[list[i3].id], -(d3 - 1));
      if (startMin === null || lstMap[list[i3].id] < startMin) startMin = lstMap[list[i3].id];
    }
    var fwd = forward(list, startMin);
    var estMap = {};
    for (var i4 = 0; i4 < fwd.length; i4++) estMap[fwd[i4].id] = fwd[i4].est;

    return list.map(function (p) {
      var lf = memo[p.id];
      var d = durationOf(p);
      var ls = lstMap[p.id];
      return { id: p.id, lst: ls, lft: lf, slack: daysBetween(estMap[p.id], ls) };
    });
  }

  // 关键路径：总时差为 0 的项按最早开始排序成链
  function criticalPath(list, startDate) {
    var fwd = forward(list, startDate);
    var bwd = backward(list, maxEft(fwd));
    var bmap = {};
    for (var i = 0; i < bwd.length; i++) bmap[bwd[i].id] = bwd[i];
    var byId = indexById(list);
    var chain = fwd.filter(function (r) { return bmap[r.id].slack === 0; })
      .sort(function (a, b) { return a.est < b.est ? -1 : 1; })
      .map(function (r) { return r.id; });
    return { chain: chain, items: chain.map(function (id) { return byId[id]; }) };
  }

  function daysBetween(a, b) {
    var d1 = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
    var d2 = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
    return Math.round((d2 - d1) / 86400000);
  }

  // 统一入口：mode='forward' 按 startDate 正排；mode='backward' 按 targetEndDate 倒排
  // （倒排模式下行内 est/eft 即「最晚开始/最晚完成」，供甘特图直接铺条）
  function buildSchedule(list, opts) {
    opts = opts || {};
    var ordered = list.slice().sort(function (a, b) { return a.no < b.no ? -1 : a.no > b.no ? 1 : 0; });
    if (opts.mode === 'backward') {
      var bwd = backward(ordered, opts.targetEndDate);
      var bmap = {};
      for (var i = 0; i < bwd.length; i++) bmap[bwd[i].id] = bwd[i];
      var rows = ordered.map(function (p, idx) {
        return {
          id: p.id, no: p.no, name: p.name, dur: durationOf(p),
          est: bmap[p.id].lst, eft: bmap[p.id].lft, slack: bmap[p.id].slack, row: idx,
        };
      });
      var startMin = rows.reduce(function (m, r) { return r.est < m ? r.est : m; }, rows[0].est);
      return { mode: 'backward', rows: rows, range: { start: startMin, end: opts.targetEndDate }, totalDays: daysBetween(startMin, opts.targetEndDate) + 1 };
    }
    var fwd = forward(ordered, opts.startDate);
    var endMax = maxEft(fwd);
    return { mode: 'forward', rows: fwd, range: { start: opts.startDate, end: endMax }, totalDays: daysBetween(opts.startDate, endMax) + 1 };
  }

  return {
    DEFAULT_DURATION: DEFAULT_DURATION,
    durationOf: durationOf,
    forward: forward,
    backward: backward,
    criticalPath: criticalPath,
    detectCycles: detectCycles,
    buildSchedule: buildSchedule,
    daysBetween: daysBetween,
  };
});
