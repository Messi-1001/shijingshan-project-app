/* js/logic/search.js —— 全局搜索（Task 56）：四类数据统一索引 + 可预测匹配 + XSS 安全高亮
 * 纯函数：不碰 DOM / 存储（Node 可测）。数据纪律：只读已有数据结构，不另建副本。
 * 搜索纪律：全库仅几十条数据，normalize + indexOf 即可，不引入模糊匹配库。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.logic = root.SJSQ.logic || {}; root.SJSQ.logic.search = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SOURCES = ['procedure', 'template', 'reason', 'platform'];
  var KIND_LABEL = { procedure: '手续', template: '模板', reason: '退回原因', platform: '平台' };
  var KIND_WEIGHT = { procedure: 0, template: 1, reason: 2, platform: 3 };

  // 去空格、全角转半角、转小写 —— 查询与被检索文本走同一套归一化，保证结果可预测
  function normalize(s) {
    return String(s == null ? '' : s)
      .replace(/[\uFF01-\uFF5E]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); })
      .replace(/[\u3000\s]+/g, '')
      .toLowerCase();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 浏览器侧默认数据源：手续索引在 boot 后挂于 app.procedures，模板索引在 app.templates
  //（build 自 data.templatesRaw.RAW）。Node 测试一律显式传 data，不走这里。
  function defaultData() {
    if (typeof window === 'undefined' || !window.SJSQ) return {};
    var d = window.SJSQ.data || {};
    var a = window.SJSQ.app || {};
    var out = Object.assign({}, d);
    if (a.procedures) out.proceduresIndex = a.procedures;
    if (a.templates) out.templatesIndex = a.templates;
    else if (d.templatesRaw && d.templatesRaw.RAW) out.templatesIndex = { list: d.templatesRaw.RAW };
    return out;
  }

  // 四类数据合成统一检索项：{ kind, id, title, subtitle, text, hash }，
  // 并预计算归一化字段 _nTitle/_nSub/_nText（O(n) 一次，检索时只做 indexOf）
  function buildSearchIndex(data) {
    var d = data || defaultData();
    var out = [];

    var procs = (d.proceduresIndex && d.proceduresIndex.list) || [];
    procs.forEach(function (p) {
      out.push({
        kind: 'procedure', id: p.id,
        title: p.no + '. ' + p.name,
        subtitle: p.dept || '',
        text: [p.name, p.dept, p.remark, p.note, p.notes, p.basis].filter(Boolean).join(' '),
        hash: '#/detail?id=' + encodeURIComponent(p.id),
      });
    });

    // 兼容三种形态：{list:[…]}、直接数组（自定义模板走 customTemplates 传入，一并检索）
    var tpls = (d.templatesIndex && (d.templatesIndex.list || d.templatesIndex)) || [];
    tpls = (Array.isArray(tpls) ? tpls : []).concat(d.customTemplates || []);
    tpls.forEach(function (t) {
      var label = t.name || t.label || t.fileName || '';
      out.push({
        kind: 'template', id: t.id,
        title: label,
        subtitle: (t.category || '') + ' · ' + (t.label || t.fileName || ''),
        text: [label, t.name, t.category, t.fileName, t.dir, t.type, t.note].filter(Boolean).join(' '),
        hash: '#/templates?focus=' + encodeURIComponent(t.id),
      });
    });

    var reasons = (d.rejectReasons && d.rejectReasons.REASONS) || [];
    reasons.forEach(function (r) {
      out.push({
        kind: 'reason', id: r.id,
        title: r.reason,
        subtitle: r.category + ' · ' + r.freq,
        text: [r.reason, r.fix, r.avoid, r.category].filter(Boolean).join(' '),
        hash: '#/reasons?focus=' + encodeURIComponent(r.id),
      });
    });

    var plats = (d.platforms && d.platforms.PLATFORMS) || [];
    plats.forEach(function (p) {
      var stepText = (p.steps || []).map(function (s) { return s.title + ' ' + s.body; }).join(' ');
      out.push({
        kind: 'platform', id: p.id,
        title: p.name,
        subtitle: p.short + ' · ' + (p.scope || ''),
        text: [p.name, p.short, p.scope, p.account, stepText].filter(Boolean).join(' '),
        hash: '#/platform?id=' + encodeURIComponent(p.id),
      });
    });

    out.forEach(function (x) {
      x._nTitle = normalize(x.title);
      x._nSub = normalize(x.subtitle);
      x._nText = normalize(x.text);
    });
    return out;
  }

  // 返回 { hits, total, byKind }。排序：标题命中 > 副标题命中 > 正文命中；同档按 kind 固定序。
  // 复杂度 O(n·m)（n 检索项数、m 关键词长），无嵌套全量扫描。
  function search(query, opts) {
    opts = opts || {};
    var data = opts.__data || null;
    var idx = opts.index || buildSearchIndex(data);
    var q = normalize(query);
    var byKind = {}; SOURCES.forEach(function (k) { byKind[k] = 0; });
    if (!q) return { hits: [], total: 0, byKind: byKind, query: query };

    var kinds = opts.kinds && opts.kinds.length ? opts.kinds : SOURCES;
    var limit = opts.limit || 50;
    var scored = [];
    idx.forEach(function (x) {
      if (kinds.indexOf(x.kind) < 0) return;
      var rank = -1;
      if (x._nTitle.indexOf(q) >= 0) rank = 0;
      else if (x._nSub.indexOf(q) >= 0) rank = 1;
      else if (x._nText.indexOf(q) >= 0) rank = 2;
      if (rank < 0) return;
      byKind[x.kind] += 1;
      scored.push({ x: x, rank: rank });
    });
    scored.sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return KIND_WEIGHT[a.x.kind] - KIND_WEIGHT[b.x.kind];
    });
    var total = scored.length;
    var hits = scored.slice(0, limit).map(function (s) {
      return { kind: s.x.kind, kindLabel: KIND_LABEL[s.x.kind], id: s.x.id, title: s.x.title, subtitle: s.x.subtitle, hash: s.x.hash, rank: s.rank };
    });
    return { hits: hits, total: total, byKind: byKind, query: query };
  }

  // 在原文上按归一化命中的起止重新定位（归一化会删空格，且转义会改写长度，
  // 二者都会让「归一化下标」与「原文下标」错位，故逐字符建立映射后再切片），
  // 最后对切片分别转义再包 <mark> —— 绝不对原文直接拼 mark。
  function locateHit(text, q) {
    var norm = [], map = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var code = text.charCodeAt(i);
      if (code >= 0xFF01 && code <= 0xFF5E) ch = String.fromCharCode(code - 0xFEE0);
      if (/[\u3000\s]/.test(ch)) continue;
      var lower = ch.toLowerCase();
      for (var j = 0; j < lower.length; j++) map.push(i);
      norm.push(lower);
    }
    var start = norm.join('').indexOf(q);
    if (start < 0) return null;
    return [map[start], map[start + q.length - 1] + 1];
  }

  function highlight(text, query) {
    var str = String(text == null ? '' : text);
    var q = normalize(query);
    if (!q) return escapeHtml(str);
    var hit = locateHit(str, q);
    if (!hit) return escapeHtml(str);
    return escapeHtml(str.slice(0, hit[0])) +
      '<mark>' + escapeHtml(str.slice(hit[0], hit[1])) + '</mark>' +
      escapeHtml(str.slice(hit[1]));
  }

  return {
    SOURCES: SOURCES, KIND_LABEL: KIND_LABEL,
    normalize: normalize, escapeHtml: escapeHtml,
    buildSearchIndex: buildSearchIndex, search: search, highlight: highlight,
  };
});
