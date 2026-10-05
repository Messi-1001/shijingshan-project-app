/* js/core/router.js —— hash 路由 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.core.router = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PATH_KEYS = ['id', 'sub'];

  function parseHash(hash) {
    var raw = String(hash || '').replace(/^#\/?/, '');
    if (!raw) return { name: '', params: {} };

    var qIdx = raw.indexOf('?');
    var pathPart = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    var queryPart = qIdx >= 0 ? raw.slice(qIdx + 1) : '';

    var params = {};
    if (queryPart) {
      queryPart.split('&').forEach(function (pair) {
        if (!pair) return;
        var eq = pair.indexOf('=');
        var k = eq >= 0 ? pair.slice(0, eq) : pair;
        var v = eq >= 0 ? pair.slice(eq + 1) : '';
        // 非法百分号编码只跳过这个键，不让整页崩掉
        try { params[decodeURIComponent(k)] = decodeURIComponent(v); } catch (e) { /* ignore */ }
      });
    }

    var parts = pathPart.split('/').filter(function (s) { return s !== ''; });
    if (!parts.length) return { name: '', params: params };

    var name = parts[0];
    if (parts[1]) params.id = decodeURIComponent(parts[1]);
    if (parts[2]) params.sub = decodeURIComponent(parts[2]);
    return { name: name, params: params };
  }

  function buildHash(name, params) {
    var p = params || {};
    var h = '#/' + String(name || '');
    if (p.id) h += '/' + encodeURIComponent(p.id);
    if (p.sub) h += '/' + encodeURIComponent(p.sub);
    // id / sub 走路径段，其余键（q、category、procedureId…）走查询串
    var extra = Object.keys(p).filter(function (k) {
      return PATH_KEYS.indexOf(k) < 0 && p[k] !== undefined && p[k] !== null && p[k] !== '';
    });
    if (extra.length) {
      h += '?' + extra.map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
      }).join('&');
    }
    return h;
  }

  function createRouter(opts) {
    var routes = (opts && opts.routes) || {};
    var mount = opts && opts.mount;
    var fallback = (opts && opts.fallback) || Object.keys(routes)[0];
    var current = { name: fallback, params: {} };
    var listeners = [];

    function render() {
      var parsed = parseHash(root.location ? root.location.hash : '');
      var name = routes[parsed.name] ? parsed.name : fallback;
      current = { name: name, params: parsed.params };
      if (mount && routes[name]) {
        while (mount.firstChild) mount.removeChild(mount.firstChild);
        var node = routes[name](current.params);
        if (node) mount.appendChild(node);
      }
      listeners.forEach(function (fn) { fn(current); });
    }

    return {
      start: function () {
        if (root.addEventListener) root.addEventListener('hashchange', render);
        render();
        return current;
      },
      go: function (name, params) {
        root.location.hash = buildHash(name, params);
        return current;
      },
      current: function () { return { name: current.name, params: Object.assign({}, current.params) }; },
      onChange: function (fn) { listeners.push(fn); }
    };
  }

  return { parseHash: parseHash, buildHash: buildHash, createRouter: createRouter };
});
