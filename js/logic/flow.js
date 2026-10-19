/* js/logic/flow.js —— 手续流程图（正交布局 SVG + PNG/SVG 双路降级导出） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.logic = root.SJSQ.logic || {}; root.SJSQ.logic.flow = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NODE = { w: 172, h: 46, gapX: 26, gapY: 34, padTop: 56, padLeft: 32, bandTitle: 22 };
  var TONE = { idle: '#f2f4f7', doing: '#fff3d6', done: '#dcf2e3', hl: '#dbe7ff' };
  var STROKE = { idle: '#c9ced6', doing: '#e0b352', done: '#69b783', hl: '#3b7ddd' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 板块键（如 lixiang）→ 中文标签（如「① 前期立项」）。映射由调用方经 opts 注入，
  // 保持本模块零数据依赖；未注入时回退显示原始键，不至于出现空白标题。
  var SECTION_FALLBACK = {
    lixiang: '① 前期立项', yongdi: '② 用地手续', guihua: '③ 规划报建',
    pingjia: '④′ 各类评价', zhaobiao: '④ 招标与合同', shigong: '⑤ 施工许可',
    jungong: '⑦ 竣工验收'
  };

  function sectionLabel(key, map) {
    var m = map || SECTION_FALLBACK;
    if (m[key]) {
      var s = m[key];
      return typeof s === 'string' ? s : ((s.no ? s.no + ' ' : '') + (s.name || key));
    }
    return key;
  }

  function groupBySection(list) {
    var order = [], map = {};
    list.forEach(function (p) {
      var s = p.section || '未分组';
      if (!map[s]) { map[s] = []; order.push(s); }
      map[s].push(p);
    });
    order.forEach(function (s) { map[s].sort(function (a, b) { return a.no < b.no ? -1 : a.no > b.no ? 1 : 0; }); });
    return { order: order, map: map };
  }

  function flowLayout(index, opts) {
    opts = opts || {};
    var list = (index && index.list) || [];
    var g = groupBySection(list);
    var labels = opts.sectionLabels || SECTION_FALLBACK;
    var nodes = [], bands = [];
    var y = NODE.padTop;
    var maxCols = 0;

    g.order.forEach(function (section) {
      var row = g.map[section];
      maxCols = Math.max(maxCols, row.length);
      bands.push({ section: section, y: y - NODE.bandTitle, title: sectionLabel(section, labels) + '（' + row.length + ' 项）' });
      row.forEach(function (p, i) {
        nodes.push({
          id: p.id, no: p.no, name: p.name, section: section,
          x: NODE.padLeft + i * (NODE.w + NODE.gapX), y: y,
          w: NODE.w, h: NODE.h,
        });
      });
      y += NODE.h + NODE.gapY + NODE.bandTitle;
    });

var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    var srcById = {};
    list.forEach(function (p) { srcById[p.id] = p; });

    var step = NODE.w + NODE.gapX;
    var edges = [];
nodes.forEach(function (n) {
      var src = srcById[n.id];
      var prev = (src && src.parallel) ? [] : ((src && src.prev) || []);

      // 跨板块前置关系：**不画连线**，改为写进节点的 depNote文字。
      // 理由：一条跨板块连线最长要横跨1600px（是相邻连线的 70+倍），
      // 绕行后视觉上比「没有线」更容易被误读成另一组串联。
      var cross = [];
      prev.forEach(function (pid) {
        var a = byId[pid];
        if (a && a.section !== n.section) cross.push(a);
      });
      n.depNote = cross.map(function (a) {
        return '前置：第' + a.no + '项 ' + a.name;
      }).join('；');

      // 只画「同板块且左右相邻」的连线，形成一条干净的横向主流程。
      prev.forEach(function (pid) {
        var a = byId[pid];
        if (!a) return;
        if (a.section !== n.section) return;                 // 跨板块 → 只留文字
        if (Math.abs(Math.round((n.x - a.x) / step)) !== 1) return; // 跳格 → 靠编号顺序
        edges.push({ from: pid, to: n.id, d: edgePath(a, n), dashed: false });
      });
    });

    var width = NODE.padLeft * 2 + maxCols * NODE.w + Math.max(0, maxCols - 1) * NODE.gapX;
    var height = y - NODE.gapY + NODE.padTop / 2;
    return { width: width, height: height, bands: bands, nodes: nodes, edges: edges, NODE: NODE };
  }
  // 路径规划：现在只处理「同板块内左右相邻」这一种情形 —— 一条水平直线。
  // 为什么退化到只支持这一种：跨板块连线实测最长要横跨 1600px，是相邻连线(23px)的 70+倍，
  // 绕行后视觉上比「没有线」更容易被误读成另一组串联（用户 2026-10-08 决策）。
  // 跨板块前置关系改为写在节点框内的depNote 文字里。
  function edgePath(a, b) {
    var sy = a.y + a.h / 2;
    return 'M' + (a.x + a.w) + ' ' + sy + ' H' + (b.x - 3);
  }

  function buildFlowSvg(layout, opts) {
    opts = opts || {};
    var statusOf = opts.statusOf || function () { return 'idle'; };
    var hl = opts.highlight || null;
    var N = layout.NODE || NODE;
    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + layout.width + '" height="' + layout.height +
      '" viewBox="0 0 ' + layout.width + ' ' + layout.height + '" font-family="Microsoft YaHei, SimSun, sans-serif">');
    parts.push('<defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="#9aa3ae"/></marker></defs>');
    parts.push('<rect x="0" y="0" width="' + layout.width + '" height="' + layout.height + '" fill="#ffffff"/>');

    layout.bands.forEach(function (b) {
      parts.push('<text x="' + NODE.padLeft + '" y="' + (b.y + 15) + '" font-size="14" font-weight="bold" fill="#4a5460">' + esc(b.title) + '</text>');
    });

    layout.edges.forEach(function (e) {
      var on = hl && (e.from === hl || e.to === hl);
      parts.push('<path d="' + e.d + '" fill="none" stroke="' + (on ? '#3b7ddd' : '#9aa3ae') + '" stroke-width="' + (on ? 2 : 1.2) + '" marker-end="url(#arw)"/>');
    });

    // 有跨板块前置的节点：框内底部加一条橙色说明文字（不画绕圈连线）
    var hasDep = layout.nodes.some(function (n) { return !!n.depNote; });

    layout.nodes.forEach(function (n) {
      var st = statusOf(n.id);
      var isHl = hl && n.id === hl;
      var fill = isHl ? TONE.hl : (TONE[st] || TONE.idle);
      var stroke = isHl ? STROKE.hl : (STROKE[st] || STROKE.idle);
      parts.push('<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="7" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>');
      parts.push('<text x="' + (n.x + 10) + '" y="' + (n.y + 19) + '" font-size="11" fill="#7a828c">' + esc(n.no) + '</text>');
      // 名称过长分两行
      var name = String(n.name);
      var line1 = name, line2 = '';
      if (name.length > 11) { line1 = name.slice(0, 11); line2 = name.slice(11, 22) + (name.length > 22 ? '…' : ''); }
      parts.push('<text x="' + (n.x + 10) + '" y="' + (n.y + 33) + '" font-size="12.5" fill="#1f2733">' + esc(line1) + '</text>');
      if (line2) parts.push('<text x="' + (n.x + 10) + '" y="' + (n.y + 47 - 2) + '" font-size="12.5" fill="#1f2733">' + esc(line2) + '</text>');
      if (n.h < 46) parts.push('<title>' + esc(name) + '</title>');
      // 跨板块前置说明：框内底部小字，橙色以区别于流程线
      if (n.depNote) {
        parts.push('<text x="' + (n.x + 8) + '" y="' + (n.y + n.h - 6) + '" font-size="10" fill="#b8730f">' +
          esc(n.depNote.length > 22 ? n.depNote.slice(0, 21) + '…' : n.depNote) + '</text>');
      }
    });

    if (hasDep) {
      parts.push('<text x="' + NODE.padLeft + '" y="' + (layout.height - 8) +
        '" font-size="10.5" fill="#8a6d3b">注：框内橙色小字为跨板块前置条件（第15项 多规合一初审意见），本图不再为其绘制连线。</text>');
    }

    parts.push('</svg>');
    return parts.join('');
  }

  async function exportFlowImage(svgString, baseName) {
    var name = baseName || '手续流程图';
    // 先试 PNG
    try {
      var svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(svgBlob);
      var img = await new Promise(function (res, rej) {
        var i = new Image();
        i.onload = function () { res(i); };
        i.onerror = function () { rej(new Error('SVG 载入失败')); };
        i.src = url;
      });
      var m = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svgString);
      var w = m ? Math.ceil(+m[1]) : img.width, h = m ? Math.ceil(+m[2]) : img.height;
      var scale = 2;
      var canvas = document.createElement('canvas');
      canvas.width = w * scale; canvas.height = h * scale;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/png'); // file:// 下可能抛 SecurityError
      URL.revokeObjectURL(url);
      var a = document.createElement('a');
      a.href = dataUrl; a.download = name + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      return { ok: true, format: 'png' };
    } catch (err) {
      // 降级：直接下载 SVG
      try {
        var b2 = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        var u2 = URL.createObjectURL(b2);
        var a2 = document.createElement('a');
        a2.href = u2; a2.download = name + '.svg';
        document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
        setTimeout(function () { URL.revokeObjectURL(u2); }, 2000);
        return { ok: true, format: 'svg', reason: '浏览器安全策略限制 PNG 导出（' + (err && err.name || 'Error') + '），已改为导出 SVG。可用浏览器打开 SVG 后另存或打印为 PDF。' };
      } catch (err2) {
        return { ok: false, format: null, reason: '图片导出失败：' + (err2 && err2.message || err2) };
      }
    }
  }

  return {
    NODE: NODE, TONE: TONE, STROKE: STROKE,
    esc: esc, flowLayout: flowLayout, edgePath: edgePath, buildFlowSvg: buildFlowSvg, exportFlowImage: exportFlowImage,
    sectionLabel: sectionLabel, SECTION_FALLBACK: SECTION_FALLBACK,
  };
});
