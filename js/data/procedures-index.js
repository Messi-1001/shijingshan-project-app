/* js/data/procedures-index.js —— 汇总七板块 → 40 条登记 + 校验 + 检索 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.data = root.SJSQ.data || {};
    root.SJSQ.data.index = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var CACHE = { list: [], byId: {}, bySection: {}, errors: [] };

  function schema() {
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.schema) return root.SJSQ.data.schema;
    if (typeof module !== 'undefined' && module.exports) return require('./schema.js');
    return null;
  }

  function buildIndex(lists) {
    var all = [];
    (lists || []).forEach(function (l) { (l || []).forEach(function (p) { all.push(p); }); });

    all.sort(function (a, b) {
      var ao = a.no === null || a.no === undefined ? 1e9 : a.no;
      var bo = b.no === null || b.no === undefined ? 1e9 : b.no;
      return ao - bo;
    });

    var byId = {}, bySection = {};
    all.forEach(function (p) {
      byId[p.id] = p;
      bySection[p.section] = bySection[p.section] || [];
      bySection[p.section].push(p);
    });

    var sch = schema();
    var errors = sch ? sch.validateProcedureSet(all) : [];

    CACHE = { list: all, byId: byId, bySection: bySection, errors: errors };
    return CACHE;
  }

  function getAll() { return CACHE.list; }
  function getById(id) { return CACHE.byId[id] || null; }
  function getBySection(key) { return CACHE.bySection[key] || []; }

  function getCounts() {
    var bySection = {};
    Object.keys(CACHE.bySection).forEach(function (k) { bySection[k] = CACHE.bySection[k].length; });
    var reserved = CACHE.list.filter(function (p) { return !!p.reserved; }).length;
    return {
      total: CACHE.list.length,
      effective: CACHE.list.length - reserved,
      reserved: reserved,
      bySection: bySection
    };
  }

  function searchProcedures(keyword, list) {
    var src = list || CACHE.list;
    var kw = String(keyword || '').trim().toLowerCase();
    if (!kw) return src.slice();
    return src.filter(function (p) {
      var hay = [p.name, p.dept, p.notes, p.basis, p.duration].join(' ').toLowerCase();
      return hay.indexOf(kw) >= 0;
    });
  }

  function closingNote() {
    var sch = schema();
    return sch ? sch.CLOSING_NOTE : '';
  }

  return {
    buildIndex: buildIndex, getAll: getAll, getById: getById,
    getBySection: getBySection, getCounts: getCounts,
    searchProcedures: searchProcedures, closingNote: closingNote
  };
});
