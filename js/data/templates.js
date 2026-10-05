/* js/data/templates.js —— 模板访问层 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.data = root.SJSQ.data || {};
    root.SJSQ.data.templates = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var CACHE = null;

  function rawSource() {
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.templatesRaw) return root.SJSQ.data.templatesRaw.RAW;
    if (typeof module !== 'undefined' && module.exports) return require('./templates-index.js').RAW;
    return [];
  }

  function proceduresIndex() {
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.index) return root.SJSQ.data.index;
    if (typeof module !== 'undefined' && module.exports) return require('./procedures-index.js');
    return null;
  }

  function build(raw) {
    var list = (raw || rawSource()).slice();
    var byId = {}, errors = [];
    list.forEach(function (t) {
      if (byId[t.id]) errors.push('模板 id 重复：' + t.id);
      byId[t.id] = t;
      if (['可复用', '参考'].indexOf(t.type) < 0) errors.push(t.id + ' 的 type 非法：' + t.type);
      if (!t.fileName) errors.push(t.id + ' 缺少 fileName');
    });

    var idx = proceduresIndex();
    if (idx && idx.getAll && idx.getAll().length) {
      list.forEach(function (t) {
        (t.procedureIds || []).forEach(function (pid) {
          if (!idx.getById(pid)) errors.push(t.id + ' 挂靠的手续不存在：' + pid);
        });
      });
    }

    var byProcedureMap = {};
    list.forEach(function (t) {
      (t.procedureIds || []).forEach(function (pid) {
        byProcedureMap[pid] = byProcedureMap[pid] || [];
        byProcedureMap[pid].push(t);
      });
    });

    CACHE = { list: list, byId: byId, byProcedure: byProcedureMap, errors: errors };
    return CACHE;
  }

  function ensure() { return CACHE || build(); }

  function allIds() { return ensure().list.map(function (t) { return t.id; }); }
  function getById(id) { return ensure().byId[id] || null; }
  function byProcedure(procedureId) { return ensure().byProcedure[procedureId] || []; }

  function getByPlaceholder(placeholderId) {
    return ensure().list.filter(function (t) { return t.placeholderId === placeholderId; })[0] || null;
  }

  function search(keyword) {
    var kw = String(keyword || '').trim().toLowerCase();
    var src = ensure().list;
    if (!kw) return src.slice();
    return src.filter(function (t) {
      return [t.fileName, t.category, t.type, t.dir].join(' ').toLowerCase().indexOf(kw) >= 0;
    });
  }

  function validate() { return ensure().errors; }

  return {
    build: build, allIds: allIds, getById: getById, byProcedure: byProcedure,
    getByPlaceholder: getByPlaceholder, search: search, validate: validate
  };
});
