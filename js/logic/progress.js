/* js/logic/progress.js —— 进度统计（纯函数） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.logic = root.SJSQ.logic || {};
    root.SJSQ.logic.progress = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SECTIONS_ORDER = ['lixiang', 'yongdi', 'guihua', 'pingjia', 'zhaobiao', 'shigong', 'jungong'];
  var SECTION_NAME = {
    lixiang: '① 前期立项', yongdi: '② 用地手续', guihua: '③ 规划报建',
    pingjia: '④′ 各类评价', zhaobiao: '④ 招标与合同', shigong: '⑤ 施工许可', jungong: '⑦ 竣工验收'
  };

  function statusOf(checklist, id) {
    var row = (checklist || {})[id];
    return row && row.status ? row.status : 'idle';
  }

  function doneMapOf(list, checklist) {
    var m = {};
    (list || []).forEach(function (p) { if (statusOf(checklist, p.id) === 'done') m[p.id] = true; });
    return m;
  }

  function summarize(list, checklist) {
    var src = list || [];
    var done = 0, doing = 0, idle = 0;
    src.forEach(function (p) {
      var s = statusOf(checklist, p.id);
      if (s === 'done') done += 1; else if (s === 'doing') doing += 1; else idle += 1;
    });

    var bySection = SECTIONS_ORDER.map(function (key) {
      var items = src.filter(function (p) { return p.section === key; });
      var d = items.filter(function (p) { return statusOf(checklist, p.id) === 'done'; }).length;
      return {
        section: key, name: SECTION_NAME[key], no: key,
        total: items.length, done: d,
        percent: items.length ? Math.round((d / items.length) * 100) : 0
      };
    }).filter(function (x) { return x.total > 0; });

    return {
      total: src.length, done: done, doing: doing, idle: idle,
      percent: src.length ? Math.round((done / src.length) * 100) : 0,
      bySection: bySection
    };
  }

  function nextUp(list, checklist) {
    var dm = doneMapOf(list, checklist);
    var candidates = (list || []).filter(function (p) {
      if (dm[p.id]) return false;
      return (p.prev || []).every(function (pid) { return !!dm[pid]; });
    });
    candidates.sort(function (a, b) { return (a.no || 0) - (b.no || 0); });
    return candidates.length ? candidates[0] : null;
  }

  function crossSectionBlockers(list, checklist) {
    var dm = doneMapOf(list, checklist);
    var out = [];
    (list || []).forEach(function (p) {
      if (dm[p.id]) return;
      var waiting = (p.prev || []).filter(function (pid) { return !dm[pid]; });
      if (waiting.length) out.push({ id: p.id, name: p.name, waitingFor: waiting });
    });
    return out;
  }

  return {
    SECTION_NAME: SECTION_NAME,
    statusOf: statusOf, doneMapOf: doneMapOf,
    summarize: summarize, nextUp: nextUp, crossSectionBlockers: crossSectionBlockers
  };
});
