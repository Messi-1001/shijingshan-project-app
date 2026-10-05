/* js/data/procedures-01-lixiang.js —— ① 前期立项（7 步，A/B 两段严格先后） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else { root.SJSQ = root.SJSQ || { rawData: [] }; (root.SJSQ.rawData = root.SJSQ.rawData || []).push(mod); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function mk(input) {
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.schema) {
      return root.SJSQ.data.schema.createProcedure(input);
    }
    return Object.assign({ prev: [], materials: [], templates: [], parallel: false, source: '✅', durationDays: null, no: null }, input);
  }

  return [
    mk({
      id: 'lx-1', no: 1, name: '线下沟通', section: 'lixiang',
      dept: '建设单位 ↔ 区发改委 / 市发改委',
      duration: '', durationDays: null, prev: [],
      notes: '**A 段（线下，非正式）第 1 步**。前期沟通项目意向、投资口径、审批路径。此步不在公开办事指南中，属实操惯例。',
      basis: '实操惯例（非正式环节）',
      materials: [{ name: '项目基本情况说明', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' }],
      source: '✅'
    }),
    mk({
      id: 'lx-2', no: 2, name: '评审公司评审', section: 'lixiang',
      dept: '第三方投资评审 / 咨询机构',
      duration: '', durationDays: null, prev: ['lx-1'],
      notes: '**A 段第 2 步**。委托评审机构出具评审意见（可研 / 投资估算评审）。',
      basis: '实操惯例',
      materials: [
        { name: '评审委托书', copies: 1, seal: '双方盖章', provider: '建设单位' },
        { name: '可行性研究报告 / 投资估算书', copies: 3, seal: '加盖建设单位公章', provider: '建设单位 / 编制单位' }
      ],
      source: '✅'
    }),
    mk({
      id: 'lx-3', no: 3, name: '市发改委上主任会', section: 'lixiang',
      dept: '市发改委主任办公会',
      duration: '', durationDays: null, prev: ['lx-2'],
      notes: '**A 段第 3 步**。上会审议通过。',
      basis: '实操惯例',
      materials: [{ name: '上会汇报材料', copies: 5, seal: '加盖建设单位公章', provider: '建设单位' }],
      source: '✅'
    }),
    mk({
      id: 'lx-4', no: 4, name: '分管副市长签批', section: 'lixiang',
      dept: '北京市政府',
      duration: '', durationDays: null, prev: ['lx-3'],
      notes: '**A 段第 4 步，A 段终点**。分管副市长签批同意后，方可进入 B 段正式申报。',
      basis: '实操惯例',
      materials: [{ name: '请示文件', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' }],
      source: '✅'
    }),
    mk({
      id: 'lx-5', no: 5, name: '区发改委批复', section: 'lixiang',
      dept: '石景山区发改委',
      duration: '', durationDays: null, prev: ['lx-4'],
      notes: '**B 段（正式申报）第 5 步**。区级初审 / 转报关。**必须在 A 段 1→4 全部跑通后才能启动**（严格先后）。',
      basis: '政府投资项目审批管理规定',
      materials: [
        { name: '项目建议书（代可行性研究报告）', copies: 3, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '请示函', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      templates: ['tpl-lixiang-shiqing'],
      platform: 'tzxm', source: '✅'
    }),
    mk({
      id: 'lx-6', no: 6, name: '市发改委批复', section: 'lixiang',
      dept: '北京市发展和改革委员会',
      duration: '', durationDays: null, prev: ['lx-5'],
      notes: '**B 段第 6 步**。取得正式立项批复文号。参考真实文号：京发改（审）〔2023〕477 号。',
      basis: '政府投资项目审批管理规定',
      materials: [{ name: '区发改委转报文件', copies: 1, seal: '加盖区发改委公章', provider: '区发改委' }],
      platform: 'fgw', source: '✅'
    }),
    mk({
      id: 'lx-7', no: 7, name: '初步设计概算审批', section: 'lixiang',
      dept: '北京市发展和改革委员会',
      duration: '2 个月', durationDays: 44, prev: ['lx-6'],
      notes: '**C 段**。参考真实文号：京发改（审）〔2024〕224 号。概算金额不得超过批复投资估算。',
      basis: '政府投资项目初步设计概算审批规定',
      materials: [
        { name: '初步设计概算说明书', copies: 3, seal: '加盖建设单位公章', provider: '设计单位' },
        { name: '发改委初审设计概算的请示函', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      templates: ['tpl-gaisuan-qingshi', 'tpl-gaisuan-wenben', 'tpl-gaisuan-moban'],
      platform: 'fgw', source: '✅'
    })
  ];
});
