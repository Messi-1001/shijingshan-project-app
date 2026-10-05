/* js/views/gantt.js —— 甘特图组件：纯函数布局（Node 可测）+ DOM 渲染（浏览器） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {}; root.SJSQ.views.gantt = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // 最小条宽（%）：再短的日程也要可见
  var MIN_WIDTH = 1.2;

  function toDay(s) {
    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
  }
  function totalDays(range) { return toDay(range.end) - toDay(range.start) + 1; }

  function round1(n) { return Math.round(n * 10) / 10; }

  function toneOf(item) { return item && item.critical ? 'critical' : 'normal'; }

  // 横轴按自然日铺满区间宽度：left/width 均为 0–100 百分比
  function ganttLayout(rows, range) {
    var total = totalDays(range);
    return rows.map(function (r, idx) {
      var left = (toDay(r.est) - toDay(range.start)) / total * 100;
      var days = toDay(r.eft) - toDay(r.est) + 1;
      var width = days / total * 100;
      return {
        id: r.id, no: r.no, name: r.name, row: idx,
        left: Math.max(0, round1(left)),
        width: round1(Math.max(MIN_WIDTH, width)),
        tone: toneOf(r),
      };
    });
  }

  // 月刻度：每个自然月 1 号一个刻度；区间起点不在 1 号时补一个 0% 刻度
  function monthTicks(range) {
    var total = totalDays(range);
    var out = [];
    var y = +range.start.slice(0, 4), m = +range.start.slice(5, 7);
    var cur = range.start.slice(0, 7) + '-01';
    if (cur < range.start) { m += 1; if (m > 12) { m = 1; y += 1; } cur = y + '-' + (m < 10 ? '0' + m : m) + '-01'; }
    while (cur <= range.end) {
      out.push({ label: (+cur.slice(0, 4)) + '年' + (+cur.slice(5, 7)) + '月', left: round1((toDay(cur) - toDay(range.start)) / total * 100) });
      m += 1; if (m > 12) { m = 1; y += 1; }
      cur = y + '-' + (m < 10 ? '0' + m : m) + '-01';
    }
    if (!out.length || out[0].left !== 0) out.unshift({ label: (+range.start.slice(0, 4)) + '年' + (+range.start.slice(5, 7)) + '月', left: 0 });
    return out;
  }

  // DOM 版：opts.today 传入 'YYYY-MM-DD' 则画今天竖线
  function gantt(rows, range, opts) {
    opts = opts || {};
    var layout = ganttLayout(rows, range);
    var el = document.createElement('div');
    el.className = 'gantt';
    var ticks = monthTicks(range);
    var head = document.createElement('div');
    head.className = 'gantt-head';
    ticks.forEach(function (t) {
      var s = document.createElement('span');
      s.className = 'gantt-tick';
      s.style.left = t.left + '%';
      s.textContent = t.label;
      head.appendChild(s);
    });
    el.appendChild(head);

    layout.forEach(function (l) {
      var row = document.createElement('div');
      row.className = 'gantt-row';
      var label = document.createElement('div');
      label.className = 'gantt-label';
      label.textContent = l.no + '. ' + l.name;
      var track = document.createElement('div');
      track.className = 'gantt-track';
      var bar = document.createElement('div');
      bar.className = 'gantt-bar tone-' + l.tone;
      bar.style.left = l.left + '%';
      bar.style.width = l.width + '%';
      bar.title = l.name + '：' + l.left + '%';
      track.appendChild(bar);
      if (opts.today) {
        var total = totalDays(range);
        var tl = (toDay(opts.today) - toDay(range.start)) / total * 100;
        if (tl >= 0 && tl <= 100) {
          var line = document.createElement('div');
          line.className = 'gantt-today';
          line.style.left = tl + '%';
          track.appendChild(line);
        }
      }
      row.appendChild(label);
      row.appendChild(track);
      el.appendChild(row);
    });
    return el;
  }

  return { MIN_WIDTH: MIN_WIDTH, ganttLayout: ganttLayout, toneOf: toneOf, monthTicks: monthTicks, gantt: gantt, totalDays: totalDays };
});
