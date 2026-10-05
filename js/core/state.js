/* js/core/state.js —— 应用状态与订阅 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.core.state = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULTS = {
    projects: [],       // 项目列表
    currentId: null,    // 当前项目 id
    checklist: {},      // { [projectId]: { [procedureId]: { status, note, updatedAt } } }
    ui: { search: '' }
  };

  function createState(initial) {
    var data = Object.assign({}, DEFAULTS, initial || {});
    var listeners = [];

    function get() { return Object.assign({}, data); }

    function set(patch) {
      if (patch && typeof patch === 'object') Object.assign(data, patch);
      var snap = get();
      listeners.forEach(function (fn) { try { fn(snap); } catch (e) { /* 单个订阅者出错不影响其他 */ } });
      return snap;
    }

    function subscribe(fn) {
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    }

    function select(fn) { return fn(get()); }

    return { get: get, set: set, subscribe: subscribe, select: select };
  }

  return { DEFAULTS: DEFAULTS, createState: createState };
});
