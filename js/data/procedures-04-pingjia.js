/* js/data/procedures-04-pingjia.js —— ④′ 各类评价（8 项 = 5 有效 + 3 预留） */
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
      id: 'pj-1', no: 21, name: '交通影响评价（交评）', section: 'pingjia',
      dept: '交通管理部门 / 公安交管部门', duration: '', durationDays: null, prev: [],
      parallel: true,
      notes: '**触发条件（自行判断）：建筑面积达规模阈值**时需做交评。参考真实文号：京交函〔2023〕1318 号。评价板块穿插于规划报建与施工图阶段，可与其他评价并联推进。',
      basis: '建设项目交通影响评价技术标准',
      materials: [
        { name: '交通影响评价报告', copies: 3, seal: '加盖编制单位章', provider: '评价机构' },
        { name: '交评审查申请', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      templates: ['tpl-jiaoping-baogao', 'tpl-jiaoping-shencha'],
      source: '✅'
    }),
    mk({
      id: 'pj-2', no: 22, name: '水影响评价（水评）', section: 'pingjia',
      dept: '水务部门', duration: '', durationDays: null, prev: [], parallel: true,
      notes: '**触发条件（自行判断）：涉及用水 / 排水**时需做水评。可与交评并联。',
      basis: '建设项目水资源论证管理办法',
      materials: [{ name: '水影响评价报告', copies: 3, seal: '加盖编制单位章', provider: '评价机构' }],
      source: '✅'
    }),
    mk({
      id: 'pj-3', no: 23, name: '社会稳定风险评估（稳评）', section: 'pingjia',
      dept: '属地街道 / 相关部门', duration: '', durationDays: null, prev: [], parallel: true,
      notes: '**触发条件（自行判断）：涉及征收、拆迁或可能引发社会不稳定因素**时需做稳评。本项目为新建学校，如不涉及征收则通常不需要。',
      basis: '重大决策社会稳定风险评估办法',
      materials: [{ name: '社会稳定风险评估报告', copies: 3, seal: '加盖编制单位章', provider: '评价机构' }],
      source: '✅'
    }),
    mk({
      id: 'pj-4', no: 24, name: '环境影响评价（环评）', section: 'pingjia',
      dept: '生态环境部门', duration: '', durationDays: null, prev: [], parallel: true,
      notes: '**触发条件（自行判断）：对照《建设项目环境影响评价分类管理名录》判定属于报告书 / 报告表 / 登记表**。学校类项目多为登记表或报告表。',
      basis: '环境影响评价法；建设项目环境影响评价分类管理名录',
      materials: [{ name: '环境影响评价文件', copies: 3, seal: '加盖编制单位章', provider: '评价机构' }],
      source: '✅'
    }),
    mk({
      id: 'pj-5', no: 25, name: '装配式评审', section: 'pingjia',
      dept: '住房和城乡建设部门', duration: '', durationDays: null, prev: [], parallel: true,
      notes: '**触发条件（自行判断）：项目采用装配式建筑 / 需进行装配率认定**时需办。',
      basis: '北京市装配式建筑管理办法',
      materials: [
        { name: '装配式建筑设计方案', copies: 3, seal: '加盖设计单位章', provider: '设计单位' },
        { name: '装配率计算书', copies: 2, seal: '加盖设计单位章', provider: '设计单位' }
      ],
      source: '✅'
    }),
    mk({
      id: 'pj-6', no: 26, name: '节能评估', section: 'pingjia',
      dept: '发展改革 / 住房和城乡建设部门', duration: '', durationDays: null, prev: [],
      parallel: true, reserved: true, source: '预留',
      notes: '**预留项（仅登记名称，暂不展开）**。触发条件：按规定需单独做节能审查的项目。',
      basis: '固定资产投资项目节能审查办法',
      materials: [], source: '预留', reserved: true
    }),
    mk({
      id: 'pj-7', no: 27, name: '地震安全性评价', section: 'pingjia',
      dept: '地震部门', duration: '', durationDays: null, prev: [],
      parallel: true, reserved: true, source: '预留',
      notes: '**预留项（仅登记名称，暂不展开）**。触发条件：按规定需做地震安全性评价的工程。',
      basis: '地震安全性评价管理条例',
      materials: [], source: '预留', reserved: true
    }),
    mk({
      id: 'pj-8', no: 28, name: '地质灾害评估', section: 'pingjia',
      dept: '规划和自然资源部门', duration: '', durationDays: null, prev: [],
      parallel: true, reserved: true, source: '预留',
      notes: '**预留项（仅登记名称，暂不展开）**。触发条件：位于地质灾害易发区的项目。',
      basis: '地质灾害防治条例',
      materials: [], source: '预留', reserved: true
    })
  ];
});
