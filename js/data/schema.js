/* js/data/schema.js —— 数据结构定义与校验 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.data = root.SJSQ.data || {};
    root.SJSQ.data.schema = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SECTIONS = {
    lixiang:  { no: '①',  name: '前期立项',   from: 1,  to: 7  },
    yongdi:   { no: '②',  name: '用地手续',   from: 8,  to: 14 },
    guihua:   { no: '③',  name: '规划报建',   from: 15, to: 20 },
    pingjia:  { no: '④′', name: '各类评价',   from: 21, to: 28 },
    zhaobiao: { no: '④',  name: '招标与合同', from: 29, to: 33 },
    shigong:  { no: '⑤',  name: '施工许可',   from: 34, to: 34 },
    jungong:  { no: '⑦',  name: '竣工验收',   from: 35, to: 40 }
  };

  var SECTION_ORDER = ['lixiang', 'yongdi', 'guihua', 'pingjia', 'zhaobiao', 'shigong', 'jungong'];
  var SOURCES = ['✅', '🆕', '预留'];

  // ⑧ 收尾结算：保留但不编号、不计入手续数量（spec v1.3 第 4 节 ⑧）
  var CLOSING_NOTE = '项目结算（工程费 + 二类费汇总）属工程后期的资金结算事项，由财务 / 审计环节另行办理。本系统只作一句话说明，不单列为一项手续，也不提供结算计算器。';

  function createProcedure(input) {
    var i = input || {};
    return {
      id: i.id || '',
      no: i.no === undefined ? null : i.no,
      name: i.name || '',
      section: i.section || '',
      dept: i.dept || '',
      duration: i.duration || '',
      durationDays: i.durationDays === undefined ? null : i.durationDays,
      prev: Array.isArray(i.prev) ? i.prev.slice() : [],
      parallel: !!i.parallel,
      basis: i.basis || '',
      materials: Array.isArray(i.materials) ? i.materials.slice() : [],
      templates: Array.isArray(i.templates) ? i.templates.slice() : [],
      platform: i.platform || '',
      notes: i.notes || '',
      source: i.source || '✅',
      reserved: !!i.reserved
    };
  }

  function validateProcedure(p) {
    var errs = [];
    if (!p || typeof p !== 'object') return ['手续对象无效'];
    if (!p.id) errs.push('缺少 id');
    if (!p.name) errs.push('缺少 name');
    if (!SECTIONS[p.section]) errs.push('section 非法：' + p.section);
    if (SOURCES.indexOf(p.source) < 0) errs.push('source 非法：' + p.source);
    if (p.no !== null && (!Number.isInteger(p.no) || p.no < 1)) errs.push('no 必须是正整数或 null');
    if (!Array.isArray(p.prev)) errs.push('prev 必须是数组');
    return errs;
  }

  function hasCycle(list) {
    var byId = {};
    list.forEach(function (p) { byId[p.id] = p; });
    var state = {}; // 0 未访问 / 1 访问中 / 2 已完成
    var found = false;

    function dfs(id) {
      if (found) return;
      if (state[id] === 1) { found = true; return; }
      if (state[id] === 2) return;
      state[id] = 1;
      var p = byId[id];
      ((p && p.prev) || []).forEach(dfs);
      state[id] = 2;
    }

    Object.keys(byId).forEach(dfs);
    return found;
  }

  function validateProcedureSet(list) {
    var errs = [];
    var ids = {}, nos = {};

    (list || []).forEach(function (p) {
      validateProcedure(p).forEach(function (e) { errs.push('[' + p.id + '] ' + e); });
      if (ids[p.id]) errs.push('id 重复：' + p.id);
      ids[p.id] = true;
      if (p.no !== null && p.no !== undefined) {
        if (nos[p.no]) errs.push('编号重复：' + p.no + '（' + nos[p.no] + ' 与 ' + p.id + '）');
        nos[p.no] = p.id;
      }
    });

    // prev 必须指向存在的手续
    (list || []).forEach(function (p) {
      (p.prev || []).forEach(function (pid) {
        if (!ids[pid]) errs.push('[' + p.id + '] 前置手续不存在：' + pid);
      });
    });

    if (hasCycle(list || [])) errs.push('前置依赖存在环');

    // 编号必须从 1 连续到 N
    var numbers = Object.keys(nos).map(Number).sort(function (a, b) { return a - b; });
    if (numbers.length) {
      for (var i = 0; i < numbers.length; i++) {
        if (numbers[i] !== i + 1) { errs.push('编号不连续：期望 ' + (i + 1) + '，实际 ' + numbers[i]); break; }
      }
    }

    return errs;
  }

  return {
    SECTIONS: SECTIONS, SECTION_ORDER: SECTION_ORDER, SOURCES: SOURCES,
    CLOSING_NOTE: CLOSING_NOTE,
    createProcedure: createProcedure, validateProcedure: validateProcedure,
    validateProcedureSet: validateProcedureSet, hasCycle: hasCycle
  };
});
