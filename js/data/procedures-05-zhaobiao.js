/* js/data/procedures-05-zhaobiao.js —— ④ 招标与合同（5 项，全部新增） */
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
      id: 'zb-1', no: 29, name: '提前开展勘察设计招标方案审查', section: 'zhaobiao',
      dept: '北京市发展和改革委员会', duration: '', durationDays: null, prev: ['gh-1'],
      notes: '勘察设计招标可在整个项目招标核准前提前开展，需先报发改委审查并取得批复。**这是真实且高频的场景**，参考真实文号：京发改（核）〔2026〕27 号。',
      basis: '必须招标的工程项目规定；招标投标法实施条例',
      materials: [
        { name: '关于提前开展勘察设计招标的请示', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '招标方案', copies: 3, seal: '加盖建设单位公章', provider: '招标代理机构' }
      ],
      platform: 'fgw', source: '🆕'
    }),
    mk({
      id: 'zb-2', no: 30, name: '设计招标', section: 'zhaobiao',
      dept: '建设单位 / 招标代理机构', duration: '', durationDays: null,
      prev: ['zb-1'], parallel: true, tenderType: '设计',
      notes: '设计招标。进入「招标工作时间计划」的设计轴。可与其他服务类招标并行，但需在施工招标前完成。',
      basis: '招标投标法；必须招标的工程项目规定',
      materials: [
        { name: '招标文件', copies: 3, seal: '加盖招标人公章', provider: '招标代理机构' },
        { name: '招标公告 / 投标邀请书', copies: 2, seal: '加盖招标人公章', provider: '招标代理机构' }
      ],
      source: '🆕'
    }),
    mk({
      id: 'zb-3', no: 31, name: '勘察招标', section: 'zhaobiao',
      dept: '建设单位 / 招标代理机构', duration: '', durationDays: null,
      prev: ['zb-1'], parallel: true, tenderType: '勘察',
      notes: '勘察招标。进入「招标工作时间计划」的勘察轴。可与设计招标并行。',
      basis: '招标投标法',
      materials: [{ name: '招标文件', copies: 3, seal: '加盖招标人公章', provider: '招标代理机构' }],
      source: '🆕'
    }),
    mk({
      id: 'zb-4', no: 32, name: '监理招标', section: 'zhaobiao',
      dept: '建设单位 / 招标代理机构', duration: '', durationDays: null,
      prev: ['zb-1'], parallel: true, tenderType: '监理',
      notes: '监理招标。进入「招标工作时间计划」的监理轴。',
      basis: '招标投标法',
      materials: [{ name: '招标文件', copies: 3, seal: '加盖招标人公章', provider: '招标代理机构' }],
      source: '🆕'
    }),
    mk({
      id: 'zb-5', no: 33, name: '施工招标', section: 'zhaobiao',
      dept: '建设单位 / 招标代理机构', duration: '', durationDays: null,
      prev: ['zb-1', 'gh-6'], tenderType: '施工',
      notes: '施工招标。进入「招标工作时间计划」的施工轴，并触发**施工招标方式建议**（资格预审 vs 资格后审 + 对应招标周期）。前置为施工图备案（gh-6）。',
      basis: '招标投标法；必须招标的工程项目规定；房屋建筑和市政基础设施工程施工招标投标管理办法',
      materials: [
        { name: '招标文件', copies: 3, seal: '加盖招标人公章', provider: '招标代理机构' },
        { name: '中标通知书', copies: 2, seal: '加盖招标人公章', provider: '招标代理机构' },
        { name: '施工合同（协议书）', copies: 4, seal: '双方盖章', provider: '施工单位 / 建设单位' }
      ],
      source: '🆕'
    })
  ];
});
