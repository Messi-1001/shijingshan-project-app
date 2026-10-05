/* js/data/conditions.js —— 四维度条件值（写全但不启用筛选 UI，G8） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.data = root.SJSQ.data || {};
    root.SJSQ.data.conditions = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DIMENSIONS = {
    buildNature:   ['新建', '改扩建', '装修改造'],
    investScale:   ['1000万以下', '1000-3000万', '3000万以上'],
    fundSource:    ['财政资金', '专项债', '社会投资'],
    approvalLevel: ['区级', '市级']
  };

  var FIXED_VALUES = {
    buildNature: '新建', investScale: '3000万以上',
    fundSource: '财政资金', approvalLevel: '市级'
  };

  var ANY = ['不限'];
  var NEW_BUILD = ['仅新建'];
  var NEW_OR_EXPAND = ['新建', '改扩建'];
  var GOV_FUND = ['财政资金', '专项债'];

  function C(bn, is, fs, al) {
    return { buildNature: bn, investScale: is, fundSource: fs, approvalLevel: al };
  }

  var CONDITIONS = {
    // ① 前期立项（7 步）—— 政府投资新建项目全流程
    'lx-1': C(NEW_OR_EXPAND, ['3000万以上'], GOV_FUND, ['市级']),
    'lx-2': C(NEW_OR_EXPAND, ['3000万以上'], GOV_FUND, ['市级']),
    'lx-3': C(NEW_OR_EXPAND, ['3000万以上'], GOV_FUND, ['市级']),
    'lx-4': C(NEW_OR_EXPAND, ['3000万以上'], GOV_FUND, ['市级']),
    'lx-5': C(NEW_OR_EXPAND, ['3000万以上'], GOV_FUND, ['市级']),
    'lx-6': C(NEW_OR_EXPAND, ['3000万以上'], GOV_FUND, ['市级']),
    'lx-7': C(NEW_OR_EXPAND, ['3000万以上'], GOV_FUND, ['市级']),

    // ② 用地手续（7 项）—— 划拨类仅新建
    'yd-1': C(NEW_BUILD, ANY, ANY, ANY),
    'yd-2': C(NEW_OR_EXPAND, ANY, ANY, ANY),
    'yd-3': C(NEW_OR_EXPAND, ANY, ANY, ANY),
    'yd-4': C(NEW_OR_EXPAND, ANY, ANY, ANY),
    'yd-5': C(NEW_BUILD, ANY, GOV_FUND, ANY),
    'yd-6': C(NEW_BUILD, ANY, GOV_FUND, ANY),
    'yd-7': C(NEW_BUILD, ANY, ANY, ANY),

    // ③ 规划报建（6 项）—— 新建与改扩建都走
    'gh-1': C(NEW_OR_EXPAND, ANY, ANY, ANY),
    'gh-2': C(NEW_OR_EXPAND, ANY, ANY, ANY),
    'gh-3': C(NEW_OR_EXPAND, ANY, ANY, ANY),
    'gh-4': C(NEW_OR_EXPAND, ANY, ANY, ANY),
    'gh-5': C(NEW_OR_EXPAND, ANY, ANY, ANY),
    'gh-6': C(NEW_OR_EXPAND, ANY, ANY, ANY),

    // ④′ 各类评价（8 项）—— 常驻不过滤（用"不限"表达），真实触发条件见 guidance.EVALUATION_HINTS
    'pj-1': C(ANY, ANY, ANY, ANY),
    'pj-2': C(ANY, ANY, ANY, ANY),
    'pj-3': C(ANY, ANY, ANY, ANY),
    'pj-4': C(ANY, ANY, ANY, ANY),
    'pj-5': C(ANY, ANY, ANY, ANY),
    'pj-6': C(ANY, ANY, ANY, ANY),
    'pj-7': C(ANY, ANY, ANY, ANY),
    'pj-8': C(ANY, ANY, ANY, ANY),

    // ④ 招标与合同（5 项）
    'zb-1': C(NEW_OR_EXPAND, ['3000万以上'], GOV_FUND, ANY),
    'zb-2': C(ANY, ['3000万以上'], ANY, ANY),
    'zb-3': C(ANY, ['3000万以上'], ANY, ANY),
    'zb-4': C(ANY, ['3000万以上'], ANY, ANY),
    'zb-5': C(ANY, ['3000万以上'], ANY, ANY),

    // ⑤ 施工许可（1 项）—— 只做新建常规路；装修改造走城市更新路本期未覆盖
    'sg-1': C(NEW_BUILD, ANY, ANY, ANY),

    // ⑦ 竣工验收（6 项）
    'jg-1': C(ANY, ANY, ANY, ANY),
    'jg-2': C(ANY, ANY, ANY, ANY),
    'jg-3': C(ANY, ANY, ANY, ANY),
    'jg-4': C(ANY, ANY, ANY, ANY),
    'jg-5': C(ANY, ANY, ANY, ANY),
    'jg-6': C(ANY, ANY, ANY, ANY)
  };

  function getConditions(id) {
    return CONDITIONS[id] || C(ANY, ANY, ANY, ANY);
  }

  function validateConditions(allProcedureIds) {
    var errs = [];
    (allProcedureIds || []).forEach(function (id) {
      var g = CONDITIONS[id];
      if (!g) { errs.push('缺少条件值：' + id); return; }
      Object.keys(DIMENSIONS).forEach(function (dim) {
        var v = g[dim];
        if (!Array.isArray(v) || !v.length) { errs.push(id + ' 的 ' + dim + ' 为空'); return; }
        v.forEach(function (val) {
          if (val !== '不限' && val !== '仅新建' && DIMENSIONS[dim].indexOf(val) < 0) {
            errs.push(id + ' 的 ' + dim + ' 含非法取值：' + val);
          }
        });
      });
    });
    return errs;
  }

  return {
    DIMENSIONS: DIMENSIONS, FIXED_VALUES: FIXED_VALUES, CONDITIONS: CONDITIONS,
    getConditions: getConditions, validateConditions: validateConditions
  };
});
