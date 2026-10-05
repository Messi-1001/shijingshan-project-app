/* js/logic/filter.js —— 四维度规则引擎（纯函数） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.logic = root.SJSQ.logic || {};
    root.SJSQ.logic.filter = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var DIM_LABEL = {
    buildNature: '建设性质', investScale: '投资规模',
    fundSource: '资金来源', approvalLevel: '审批层级'
  };

  function conditions(condMap) {
    if (condMap) return condMap;
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.conditions) return root.SJSQ.data.conditions;
    if (typeof module !== 'undefined' && module.exports) return require('../data/conditions.js');
    return null;
  }

  function matchCondition(allowed, value) {
    var a = allowed || ['不限'];
    if (a.indexOf('不限') >= 0) return true;
    if (a.indexOf('仅新建') >= 0) return value === '新建';
    return a.indexOf(value) >= 0;
  }

  function matchProcedure(procedureId, projectValues, condMap) {
    var cm = conditions(condMap);
    var g = cm.getConditions(procedureId);
    var miss = [];
    Object.keys(DIM_LABEL).forEach(function (dim) {
      var v = (projectValues || {})[dim];
      if (v === undefined || v === null || v === '') return; // 项目未填该维度 → 视为不限
      if (!matchCondition(g[dim], v)) miss.push(DIM_LABEL[dim]);
    });
    return { pass: miss.length === 0, miss: miss };
  }

  function filterProcedures(list, projectValues, condMap) {
    var kept = [], dropped = [];
    (list || []).forEach(function (p) {
      var r = matchProcedure(p.id, projectValues, condMap);
      if (r.pass) kept.push(p);
      else dropped.push({ id: p.id, name: p.name, miss: r.miss });
    });
    return { kept: kept, dropped: dropped };
  }

  function explainHit(procedureId, projectValues, condMap) {
    var cm = conditions(condMap);
    var g = cm.getConditions(procedureId);
    var out = [];
    Object.keys(DIM_LABEL).forEach(function (dim) {
      var v = (projectValues || {})[dim];
      if (v === undefined || v === null || v === '') return;
      if (matchCondition(g[dim], v)) {
        out.push({ dim: DIM_LABEL[dim], value: v, allowed: g[dim] });
      }
    });
    return out;
  }

  function safeFilter(list, projectValues, condMap) {
    var r = filterProcedures(list, projectValues, condMap);
    var warning = '';
    if (r.dropped.length) {
      warning = '按当前项目四维取值，有 ' + r.dropped.length +
        ' 项手续被裁掉。可在「全量手续库」查看完整清单与被裁原因。';
    }
    return { kept: r.kept, dropped: r.dropped, warning: warning };
  }

  return {
    DIM_LABEL: DIM_LABEL,
    matchCondition: matchCondition, matchProcedure: matchProcedure,
    filterProcedures: filterProcedures, explainHit: explainHit, safeFilter: safeFilter
  };
});
