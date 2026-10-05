/* js/core/idb.js —— IndexedDB 实现 + 三级降级 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.core.idb = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var DB_NAME = 'sjsq-engineering';
  var DB_VERSION = 1;
  var TABLES = { projects: 'projects', checklist: 'checklist', meta: 'meta' };

  function chooseFallback(env) {
    if (env && env.indexedDb) return 'idb';
    if (env && env.localStorage) return 'localStorage';
    return 'memory';
  }

  function probeEnv() {
    var hasIdb = false, hasLs = false;
    try { hasIdb = typeof root.indexedDB !== 'undefined' && root.indexedDB !== null; } catch (e) { hasIdb = false; }
    try { root.localStorage.setItem('__probe__', '1'); root.localStorage.removeItem('__probe__'); hasLs = true; } catch (e) { hasLs = false; }
    return { indexedDb: hasIdb, localStorage: hasLs };
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = root.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        Object.keys(TABLES).forEach(function (t) {
          if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' });
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB 打开失败')); };
    });
  }

  function tx(db, table, mode, fn) {
    return new Promise(function (resolve, reject) {
      var t = db.transaction(table, mode);
      var os = t.objectStore(table);
      var out;
      try { out = fn(os); } catch (e) { reject(e); return; }
      t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
      t.onerror = function () { reject(t.error); };
      t.onabort = function () { reject(t.error || new Error('事务中止')); };
    });
  }

  function createIdbStore() {
    return openDb().then(function (db) {
      return {
        kind: 'idb', degraded: false, reason: '',
        get: function (table, id) {
          return new Promise(function (resolve, reject) {
            var t = db.transaction(table, 'readonly');
            var r = t.objectStore(table).get(id);
            r.onsuccess = function () { resolve(r.result === undefined ? null : r.result); };
            r.onerror = function () { reject(r.error); };
          });
        },
        list: function (table) {
          return new Promise(function (resolve, reject) {
            var t = db.transaction(table, 'readonly');
            var r = t.objectStore(table).getAll();
            r.onsuccess = function () { resolve(r.result || []); };
            r.onerror = function () { reject(r.error); };
          });
        },
        put: function (table, obj) {
          if (!obj || !obj.id) return Promise.reject(new Error('put 需要 obj.id'));
          return tx(db, table, 'readwrite', function (os) { os.put(obj); return obj; });
        },
        remove: function (table, id) {
          return new Promise(function (resolve, reject) {
            var t = db.transaction(table, 'readwrite');
            var os = t.objectStore(table);
            var g = os.get(id);
            var had = false;
            g.onsuccess = function () { had = g.result !== undefined; os.delete(id); };
            t.oncomplete = function () { resolve(had); };
            t.onerror = function () { reject(t.error); };
          });
        },
        clear: function (table) {
          return tx(db, table, 'readwrite', function (os) { os.clear(); });
        }
      };
    });
  }

  function createLocalStorageStore() {
    var KEY = 'sjsq-store';
    function readAll() {
      try { return JSON.parse(root.localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
    }
    function writeAll(all) { root.localStorage.setItem(KEY, JSON.stringify(all)); }
    return {
      kind: 'localStorage', degraded: true, reason: 'IndexedDB 不可用，已降级为 localStorage',
      get: function (table, id) {
        var all = readAll();
        var row = (all[table] || {})[id];
        return Promise.resolve(row ? JSON.parse(JSON.stringify(row)) : null);
      },
      list: function (table) {
        var all = readAll();
        return Promise.resolve(Object.keys(all[table] || {}).map(function (k) { return all[table][k]; }));
      },
      put: function (table, obj) {
        if (!obj || !obj.id) return Promise.reject(new Error('put 需要 obj.id'));
        var all = readAll();
        all[table] = all[table] || {};
        all[table][obj.id] = obj;
        writeAll(all);
        return Promise.resolve(obj);
      },
      remove: function (table, id) {
        var all = readAll();
        var had = !!(all[table] && all[table][id]);
        if (had) { delete all[table][id]; writeAll(all); }
        return Promise.resolve(had);
      },
      clear: function (table) { var all = readAll(); all[table] = {}; writeAll(all); return Promise.resolve(); }
    };
  }

  // 取 store 模块：Node 下走 require，浏览器下走全局（浏览器里没有 require！）
  function memStoreModule() {
    if (typeof require === 'function') return require('./store.js');
    return root.SJSQ.core.store;
  }

  function createBestStore(opts) {
    var env = (opts && opts.__force)
      ? {
          indexedDb: opts.__force.indexedDB !== false,
          localStorage: opts.__force.localStorage !== false,
        }
      : probeEnv();
    var kind = chooseFallback(env);
    if (kind === 'idb') {
      return createIdbStore().catch(function () {
        var store = createLocalStorageStore();
        store.degraded = true;
        store.reason = 'IndexedDB 打开失败，已降级为 localStorage';
        return store;
      });
    }
    if (kind === 'localStorage') return Promise.resolve(createLocalStorageStore());
    var mem = memStoreModule().createMemoryStore();
    mem.degraded = true;
    mem.reason = '浏览器已禁用本地存储，本次录入数据只能保存在当前页面内存中，刷新或关闭页面会丢失。请立即到「数据管理」页导出备份';
    return Promise.resolve(mem);
  }

  return {
    DB_NAME: DB_NAME, TABLES: TABLES,
    chooseFallback: chooseFallback, probeEnv: probeEnv,
    createIdbStore: createIdbStore, createLocalStorageStore: createLocalStorageStore,
    createBestStore: createBestStore
  };
});
