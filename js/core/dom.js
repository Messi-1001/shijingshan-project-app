/* js/core/dom.js —— 极简 DOM 构建与事件委托 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.core.dom = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function classNames(map) {
    if (!map) return '';
    return Object.keys(map).filter(function (k) { return !!map[k]; }).join(' ');
  }

  function escapeHtml(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') { el.className = v; return; }
      if (k === 'text') { el.textContent = String(v); return; }
      if (k === 'html') { el.innerHTML = String(v); return; }
      if (k === 'dataset') { Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; }); return; }
      if (k.slice(0, 2) === 'on' && typeof v === 'function') { el.addEventListener(k.slice(2).toLowerCase(), v); return; }
      if (k === 'value' || k === 'checked' || k === 'disabled') { el[k] = v; return; }
      el.setAttribute(k, v === true ? '' : String(v));
    });
    if (children !== undefined && children !== null) {
      var list = Array.isArray(children) ? children : [children];
      list.forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(typeof c === 'string' || typeof c === 'number'
          ? document.createTextNode(String(c)) : c);
      });
    }
    return el;
  }

  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function qs(sel, root) { return (root || document).querySelector(sel); }

  function on(root, evt, sel, fn) {
    root.addEventListener(evt, function (e) {
      var t = e.target.closest ? e.target.closest(sel) : null;
      if (t && root.contains(t)) fn.call(t, e, t);
    });
  }

  return {
    classNames: classNames, escapeHtml: escapeHtml, h: h,
    clear: clear, qs: qs, on: on
  };
});
