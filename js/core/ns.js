/* js/core/ns.js —— 命名空间与模块约定 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [], meta: {} };
    root.SJSQ.core.ns = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createModule(name, fn) {
    if (typeof name !== 'string' || !name) throw new Error('createModule: name 必须是非空字符串');
    if (typeof fn !== 'function') throw new Error('createModule: fn 必须是函数');
    fn();
    return { ok: true, version: 1 };
  }

  function ensureNamespace(root) {
    root.SJSQ = root.SJSQ || {};
    ['core', 'data', 'logic', 'views'].forEach(function (k) {
      root.SJSQ[k] = root.SJSQ[k] || {};
    });
    root.SJSQ.rawData = root.SJSQ.rawData || [];
    return root.SJSQ;
  }

  return { createModule: createModule, ensureNamespace: ensureNamespace, VERSION: 1 };
});
