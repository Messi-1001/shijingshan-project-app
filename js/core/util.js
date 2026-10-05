/* js/core/util.js —— 通用工具（纯函数，无 DOM、无存储） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.core.util = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var _seq = 0;
  var _collator = new Intl.Collator('zh-Hans');

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatDate(input, fmt) {
    var d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '';
    fmt = fmt || 'YYYY-MM-DD';
    return fmt
      .replace('YYYY', String(d.getFullYear()))
      .replace('MM', pad2(d.getMonth() + 1))
      .replace('DD', pad2(d.getDate()))
      .replace('HH', pad2(d.getHours()))
      .replace('mm', pad2(d.getMinutes()));
  }

  function formatMoney(n) {
    var v = typeof n === 'number' ? n : parseNum(n);
    if (typeof v !== 'number' || isNaN(v)) return '';
    var neg = v < 0;
    var s = String(Math.abs(Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + s;
  }

  function parseNum(s) {
    if (typeof s === 'number') return s;
    if (s === null || s === undefined) return NaN;
    var t = String(s).replace(/[,，\s]/g, '');
    if (t === '') return NaN;
    return Number(t);
  }

  function sortZh(arr, key) {
    var copy = Array.isArray(arr) ? arr.slice() : [];
    copy.sort(function (a, b) {
      var va = key ? a[key] : a;
      var vb = key ? b[key] : b;
      return _collator.compare(String(va), String(vb));
    });
    return copy;
  }

  function deepClone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(self, args); }, ms);
    };
  }

  function uid(prefix) {
    _seq += 1;
    // 时间熵 + 随机段：模块级 _seq 会随页面刷新重置，光靠序号跨会话必撞，
    // 后缀保证不同会话生成的 id 也不会重叠（store.put 按主键覆盖，撞 id = 吞数据）
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 8) || '0';
    return String(prefix) + '-' + _seq + '-' + t + r;
  }

  // 把计数器回置到不小于 n：boot 时用存量 id 里的最大序号调用，
  // 防止刷新后新 uid 的序号段与旧数据重叠（时间熵之外的第二道保险）
  function seedSeq(n) {
    var v = parseInt(n, 10);
    if (!isNaN(v) && v > _seq) _seq = v;
    return _seq;
  }

  function groupBy(arr, key) {
    var out = {};
    (arr || []).forEach(function (it) {
      var k = it[key];
      if (!out[k]) out[k] = [];
      out[k].push(it);
    });
    return out;
  }

  function percent(done, total) {
    if (!total || total <= 0) return 0;
    return Math.round((done / total) * 100);
  }

  return {
    pad2: pad2, formatDate: formatDate, formatMoney: formatMoney, parseNum: parseNum,
    sortZh: sortZh, deepClone: deepClone, debounce: debounce, uid: uid, seedSeq: seedSeq,
    groupBy: groupBy, percent: percent
  };
});
