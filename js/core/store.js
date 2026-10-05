/* js/core/store.js —— 存储契约 + 内存实现（测试用） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.core.store = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var TABLES = { projects: 'projects', checklist: 'checklist', meta: 'meta' };

  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

  function createMemoryStore() {
    var tables = {};
    function t(name) { tables[name] = tables[name] || {}; return tables[name]; }

    return {
      kind: 'memory',
      get: function (table, id) {
        if (!TABLES[table]) return Promise.reject(new Error('未知表：' + table));
        var row = t(table)[id];
        return Promise.resolve(row ? clone(row) : null);
      },
      list: function (table) {
        if (!TABLES[table]) return Promise.reject(new Error('未知表：' + table));
        var src = t(table);
        return Promise.resolve(Object.keys(src).map(function (k) { return clone(src[k]); }));
      },
      put: function (table, obj) {
        if (!TABLES[table]) return Promise.reject(new Error('未知表：' + table));
        if (!obj || !obj.id) return Promise.reject(new Error('put 需要 obj.id'));
        t(table)[obj.id] = clone(obj);
        return Promise.resolve(clone(obj));
      },
      remove: function (table, id) {
        if (!TABLES[table]) return Promise.reject(new Error('未知表：' + table));
        var src = t(table);
        var had = Object.prototype.hasOwnProperty.call(src, id);
        if (had) delete src[id];
        return Promise.resolve(had);
      },
      clear: function (table) {
        if (!TABLES[table]) return Promise.reject(new Error('未知表：' + table));
        tables[table] = {};
        return Promise.resolve();
      }
    };
  }

  function assertStoreContract(store) {
    var passed = [], failed = [];
    function ok(name, cond) { (cond ? passed : failed).push(name); }

    return Promise.resolve()
      .then(function () { return store.put('projects', { id: 'c-1', name: '契约' }); })
      .then(function () { return store.get('projects', 'c-1'); })
      .then(function (row) {
        ok('put 后 get 拿到数据', !!row && row.name === '契约');
        ok('kind 字段存在', typeof store.kind === 'string');
        return store.get('projects', '不存在');
      })
      .then(function (row) {
        ok('get 不存在的 id 返回 null', row === null);
        return store.list('projects');
      })
      .then(function (rows) {
        ok('list 返回数组', Array.isArray(rows));
        ok('list 含刚写入的行', rows.some(function (r) { return r.id === 'c-1'; }));
        return store.remove('projects', 'c-1');
      })
      .then(function (had) {
        ok('remove 返回 true', had === true);
        return store.clear('projects');
      })
      .then(function () { return store.list('projects'); })
      .then(function (rows) { ok('clear 后 list 为空', rows.length === 0); })
      .catch(function (e) { failed.push('异常：' + e.message); })
      .then(function () { return { passed: passed, failed: failed }; });
  }

  return {
    TABLES: TABLES,
    createMemoryStore: createMemoryStore,
    assertStoreContract: assertStoreContract
  };
});
