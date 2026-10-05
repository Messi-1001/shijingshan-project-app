/* js/data/guidance.js —— 文字说明与口径备忘（不属手续数据） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.data = root.SJSQ.data || {};
    root.SJSQ.data.guidance = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function schema() {
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.schema) return root.SJSQ.data.schema;
    if (typeof module !== 'undefined' && module.exports) return require('./schema.js');
    return { CLOSING_NOTE: '' };
  }

  var EXCLUDED = [
    { name: '建设用地规划许可证', reason: '已确认不列入本系统手续清单（用户 2026-09-25 确认）' },
    { name: '办理产权证', reason: '已确认本项目不要求办理产权证（沿用 v2.1 口径）' },
    { name: '质量监督登记 / 安全监督登记', reason: 'v1.1 收窄：⑤ 施工许可只办「建筑工程施工许可证」' },
    { name: '项目储备入库（区政府投资项目库）', reason: '已确认不进流程（用户 2026-09-25 确认）' },
    { name: '财务决算 / 资产移交转固 / 产权登记', reason: '不属本岗位职责，与"不办产权证"口径一致' },
    { name: '⑥ 建设实施（施工过程 / 进度款 / 监理月报 / 质量安全检查）', reason: '本系统只管"办手续"，不管"盖房子"' }
  ];

  // 评价类手续的触发条件（写进详情页；不做条件过滤，由经办人自行判断）
  var EVALUATION_HINTS = {
    'pj-1': '看**建筑面积**是否达到规模阈值。达到阈值才需做交评，未达阈值可跳过。',
    'pj-2': '看**是否涉及用水 / 排水**（含施工降水、雨污水排放）。涉及才需做水评。',
    'pj-3': '看**是否涉及征收、拆迁或敏感信访风险**。新建学校若不涉及征收，通常不需要。',
    'pj-4': '对照**《建设项目环境影响评价分类管理名录》**判定属于报告书 / 报告表 / 登记表。学校类项目多为报告表或登记表。',
    'pj-5': '看**是否采用装配式建筑**、是否需要装配率认定。',
    'pj-6': '预留项，暂不展开。',
    'pj-7': '预留项，暂不展开。',
    'pj-8': '预留项，暂不展开。'
  };

  var NEW_CITY_UPDATE_NOTE = '装修改造类项目走的是"城市更新"路径（城市更新号 → 风险等级 → 超危大数量 → 工程性质 → 单体信息 → 工程编码），本期**不覆盖**。本系统只做新建工程常规路，故当项目「建设性质 = 装修改造」时，⑤ 施工许可在专属清单中显示为「本期未覆盖」，而非静默隐藏。';

  function closingNote() { return schema().CLOSING_NOTE; }

  return {
    EXCLUDED: EXCLUDED,
    EVALUATION_HINTS: EVALUATION_HINTS,
    NEW_CITY_UPDATE_NOTE: NEW_CITY_UPDATE_NOTE,
    closingNote: closingNote
  };
});
