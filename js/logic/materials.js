/* js/logic/materials.js —— 材料清单汇总（纯函数，不碰 DOM/存储） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.logic = root.SJSQ.logic || {};
    root.SJSQ.logic.materials = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function collect(list, opts) {
    var only = (opts && opts.onlyIds) || null;
    var out = [];
    (list || []).forEach(function (p) {
      if (only && only.indexOf(p.id) < 0) return;
      (p.materials || []).forEach(function (mt) {
        out.push({
          procedureNo: p.no, procedureName: p.name,
          name: mt.name || '', copies: mt.copies || null,
          seal: mt.seal || '', provider: mt.provider || ''
        });
      });
    });
    return out;
  }

  function uniqJoin(values) {
    var seen = {}, out = [];
    values.forEach(function (v) {
      var s = String(v || '').trim();
      if (s && !seen[s]) { seen[s] = true; out.push(s); }
    });
    return out.join('、');
  }

  function mergeDuplicates(rows) {
    var map = {}, order = [];
    (rows || []).forEach(function (r) {
      var key = r.name;
      if (!map[key]) {
        map[key] = { name: key, copies: 0, seals: [], providers: [], from: [] };
        order.push(key);
      }
      map[key].copies += (r.copies || 0);
      map[key].seals.push(r.seal);
      map[key].providers.push(r.provider);
      if (r.procedureName) map[key].from.push(r.procedureName);
    });

    return order.map(function (k) {
      var x = map[k];
      return {
        name: x.name,
        copies: x.copies || null,
        seal: uniqJoin(x.seals),
        provider: uniqJoin(x.providers),
        from: x.from.filter(function (v, i, a) { return a.indexOf(v) === i; })
      };
    });
  }

  // 先合并同名再分组（对已合并的行幂等）：调用方传原始行或已合并行都能得到去重结果
  function groupByProvider(rows) {
    var merged = mergeDuplicates(rows);
    var map = {}, order = [];
    merged.forEach(function (r) {
      var key = r.provider || '未标注提供方';
      if (!map[key]) { map[key] = { provider: key, items: [] }; order.push(key); }
      map[key].items.push(r);
    });
    return order.map(function (k) { return map[k]; });
  }

  function warnings(rows) {
    var out = [];
    (rows || []).forEach(function (r) {
      if (!r.copies) out.push('「' + r.name + '」缺少份数');
      if (!r.seal) out.push('「' + r.name + '」缺少盖章要求');
      if (!r.provider) out.push('「' + r.name + '」缺少提供方');
    });
    return out;
  }

  function summarize(rows) {
    var merged = mergeDuplicates(rows);
    return {
      rawCount: (rows || []).length,
      mergedCount: merged.length,
      totalCopies: merged.reduce(function (s, x) { return s + (x.copies || 0); }, 0)
    };
  }

  return {
    collect: collect, mergeDuplicates: mergeDuplicates,
    groupByProvider: groupByProvider, warnings: warnings, summarize: summarize
  };
});
