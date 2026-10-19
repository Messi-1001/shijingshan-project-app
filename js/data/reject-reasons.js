/* js/data/reject-reasons.js —— 退回原因库：27 条通用/分类原因，每条带可执行整改动作 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.data = root.SJSQ.data || {}; root.SJSQ.data.rejectReasons = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIES = ['材料类', '形式类', '内容类', '口径类'];

  var REASONS = [
    // —— 通用（appliesTo: 'ALL'）——
    { id: 'r-001', category: '形式类', appliesTo: 'ALL', freq: '常见',
      reason: '申报表使用了旧版本空白表',
      fix: '在平台"办事指南"里重新下载当前版本表格，重新填写盖章后再报',
      avoid: '任何表格都不要用上一次项目的留存版本' },
    { id: 'r-002', category: '形式类', appliesTo: 'ALL', freq: '常见',
      reason: '漏盖公章、骑缝章或法人签字缺失',
      fix: '逐页核对盖章位：首页公章、多页骑缝章、承诺页法人签字，缺哪补哪',
      avoid: '装订前先按"盖章位清单"过一遍' },
    { id: 'r-003', category: '形式类', appliesTo: 'ALL', freq: '常见',
      reason: '扫描件模糊、缺页、倒置',
      fix: '重新扫描：300dpi、彩色、正置、单页单文件，重新上传',
      avoid: '扫描后用 PDF 阅读器抽查每页可辨认' },
    { id: 'r-004', category: '口径类', appliesTo: 'ALL', freq: '常见',
      reason: '项目名称、总投资、用地面积在不同材料中不一致',
      fix: '以立项批复为准，统一全部材料的项目名称与关键数字后再报',
      avoid: '每次改动关键数字后，全库检索一次同名项目' },
    { id: 'r-005', category: '材料类', appliesTo: 'ALL', freq: '偶发',
      reason: '缺少上一环节的批复文件作为前置附件',
      fix: '把前置批复的电子文件取出并作为附件上传，文号写在申报表对应栏',
      avoid: '每取得一份批复立即归档到本系统对应手续详情页' },
    { id: 'r-006', category: '材料类', appliesTo: 'ALL', freq: '常见',
      reason: '申报主体与项目单位不一致（如以代建单位名义申报）',
      fix: '以立项批复上的项目单位为申报主体；代建关系需附委托文件',
      avoid: '开工前先把"谁申报"这件事定死并写进内部交底' },

    // —— 立项 / 发改类 ——
    { id: 'r-007', category: '材料类', appliesTo: ['lx-1', 'lx-2', 'lx-3', 'lx-4'], freq: '常见',
      reason: '未提交资金来源说明或说明未盖出具单位公章',
      fix: '补交区财政、区教委出具的"资金已落实"说明，加盖出具单位公章',
      avoid: '财政部门开说明有周期，立项启动就去预约' },
    { id: 'r-008', category: '内容类', appliesTo: ['lx-1', 'lx-2', 'lx-3', 'lx-4'], freq: '常见',
      reason: '建设规模与办学需求不匹配（班级数、学位数无依据）',
      fix: '补办学规模测算依据（服务半径、学位缺口数据），在正文中列出',
      avoid: '立项文本第一节就写清"为什么是这个规模"' },
    { id: 'r-009', category: '内容类', appliesTo: ['pj-1', 'pj-2', 'pj-3'], freq: '常见',
      reason: '投资估算与可研批复口径不符（概算超可研 10% 未说明）',
      fix: '重新按同一口径编制概算；确需超额的，先补充分项对比说明再报',
      avoid: '估算编制统一引用本系统"投资估算"页导出结果，避免两套数字' },
    { id: 'r-010', category: '材料类', appliesTo: ['pj-1', 'pj-2', 'pj-3'], freq: '常见',
      reason: '缺评审公司评审意见或意见未落实',
      fix: '上传评审意见原件，并附"意见逐条落实情况表"',
      avoid: '评审会后 3 日内先出落实表初稿' },
    { id: 'r-011', category: '口径类', appliesTo: ['pj-1', 'pj-2', 'pj-3'], freq: '偶发',
      reason: '资金来源比例与"市级、区级各 50%"口径不一致',
      fix: '按市区各承担 50% 修正资金来源表，与财政部门确认后重报',
      avoid: '资金来源表金额要能加总对上总投资' },

    // —— 用地 / 规划类 ——
// 注：第8项已改为「与土地开发单位签订土地移交协议」，属签约动作，
//     不涉及用地范围坐标与用地权属证明（那是 yd-2 及以后审批环节的事项），故不再挂 r-012 / r-013。
{ id: 'r-012', category: '内容类', appliesTo: ['yd-2', 'yd-3', 'yd-4', 'gh-1', 'gh-2'], freq: '常见',
      reason: '用地范围坐标不闭合或坐标系不是 2000 国家大地坐标系',
      fix: '由测绘单位重新导出闭合面坐标，注明坐标系与面积',
      avoid: '坐标文件拿到后先用本系统"用地面积"栏核对闭合性' },
    { id: 'r-013', category: '材料类', appliesTo: ['yd-2', 'yd-3', 'yd-4'], freq: '常见',
      reason: '缺用地权属证明或现状地形图',
      fix: '补交权属证明（不动产权证/划拨决定书）与 1:500 现状地形图',
      avoid: '划拨用地要同时准备划拨相关文件，不要只交权证' },

    // 第8项专属：土地移交协议签订环节的常见问题（id 顺延至库内最大号之后，避免撞号）
    { id: 'r-028', category: '内容类', appliesTo: ['yd-1'], freq: '常见',
      reason: '移交协议未写明四至范围、移交面积或地块交付现状',
      fix: '按测绘成果补全四至边界与面积，并写明地块现状（已完成一级开发及验收、无附着物）',
      avoid: '签约前先取一份测绘成果图，四至与面积照图抄，不要口头约定' },
    { id: 'r-029', category: '材料类', appliesTo: ['yd-1'], freq: '偶发',
      reason: '土地移交协议未双方盖章，或未附一级开发验收意见',
      fix: '补盖建设单位与土地开发单位公章，并附一级开发验收意见复印件',
      avoid: '协议一式四份双方各执两份，盖章页与附件页一并交接' },
    { id: 'r-014', category: '口径类', appliesTo: ['gh-1', 'gh-2', 'gh-3', 'gh-4', 'gh-5'], freq: '常见',
      reason: '总平面指标与规划条件不符（容积率、绿地率、建筑密度）',
      fix: '按规划条件复核总平面，逐项列指标对比表后再报',
      avoid: '方案设计第一轮就把规划条件作为设计输入硬约束' },
    { id: 'r-015', category: '形式类', appliesTo: ['gh-3', 'gh-4'], freq: '常见',
      reason: '施工图未盖审图专用章或审图合格书已过期',
      fix: '完成施工图审查并取得加盖审图机构印章的合格书后再报',
      avoid: '审图合格书有效期有限，报建材料按最近一期准备' },
    { id: 'r-016', category: '内容类', appliesTo: ['gh-3', 'gh-4'], freq: '偶发',
      reason: '消防设计文件与图纸版本不一致',
      fix: '统一图纸版本号，重新提交成套消防设计文件',
      avoid: '任何一次改图都要同步更新消防设计文件' },
    { id: 'r-017', category: '形式类', appliesTo: ['gh-3', 'gh-4'], freq: '偶发',
      reason: '勘察图纸备案未完成即申报规划许可（顺序颠倒）',
      fix: '先完成勘察图纸备案，再申报工程规划许可',
      avoid: '规划类手续顺序固定，严格按本系统"细节页-前置"提示执行' },

    // —— 招标 / 施工许可类 ——
    { id: 'r-018', category: '口径类', appliesTo: ['zb-2', 'zb-3', 'zb-4'], freq: '常见',
      reason: '招标控制价与批复概算不匹配',
      fix: '以批复概算为上限复核控制价，出具对比说明后重报',
      avoid: '控制价编制前先把批复概算作为拦标价输入' },
    { id: 'r-019', category: '材料类', appliesTo: ['zb-2', 'zb-3', 'zb-4'], freq: '偶发',
      reason: '招标公告发布渠道或公告期不满足规定天数',
      fix: '按规定渠道重新发布，公告期满后方可开标',
      avoid: '排期时直接用本系统"招标计划"页的天数，不要口头估算' },
    { id: 'r-020', category: '口径类', appliesTo: ['sg-1'], freq: '常见',
      reason: '施工合同金额、工期与中标通知书不一致',
      fix: '按中标通知书修正合同金额与工期后重新签订或补充协议',
      avoid: '签合同前先做一次"三单一致"核对：中标通知书 / 合同 / 控制价' },
    { id: 'r-021', category: '材料类', appliesTo: ['sg-1'], freq: '常见',
      reason: '缺少资金落实情况说明或监理合同',
      fix: '补交资金落实说明与监理合同（监理单位须已确定）',
      avoid: '监理招标不要拖到施工招标之后' },
    { id: 'r-022', category: '材料类', appliesTo: ['sg-1'], freq: '偶发',
      reason: '误提交了质监、安监登记材料（本期不办该事项）',
      fix: '撤回多余事项，本期只申报"建筑工程施工许可证"',
      avoid: '申报前确认事项名称，本系统"专属清单"只列施工许可证一项' },

    // —— 验收类 ——
    { id: 'r-023', category: '材料类', appliesTo: ['jg-1', 'jg-2', 'jg-3', 'jg-4'], freq: '常见',
      reason: '专项验收资料不齐即发起联合验收',
      fix: '按各专项清单逐项备齐后再一次性发起联合验收',
      avoid: '任一专项不通过会整批延后，宁可晚发起也不要缺件发起' },
    { id: 'r-024', category: '形式类', appliesTo: ['jg-1', 'jg-2', 'jg-3', 'jg-4'], freq: '常见',
      reason: '竣工图纸未按实际施工修正（仍用施工图）',
      fix: '由施工单位出具竣工图并加盖竣工图章后再提交',
      avoid: '施工过程中的变更要及时反映到竣工图，不要集中到最后补' },
    { id: 'r-025', category: '内容类', appliesTo: ['jg-5', 'jg-6'], freq: '常见',
      reason: '存在未整改完毕的验收遗留问题',
      fix: '逐条整改并取得复查确认，问题清零后再申请备案',
      avoid: '联合验收时列一张"遗留问题跟踪表"，闭环一条划掉一条' },
    { id: 'r-026', category: '形式类', appliesTo: ['jg-5', 'jg-6'], freq: '偶发',
      reason: '备案表填写内容与各专项验收结论不符',
      fix: '以各专项验收文件为准重填备案表，逐字核对结论与日期',
      avoid: '备案表由一个人统稿，避免多人各填一段' },
    { id: 'r-027', category: '内容类', appliesTo: ['jg-6'], freq: '偶发',
      reason: '档案验收未通过导致备案链条中断',
      fix: '按城建档案要求补齐工程档案并通过档案专项验收后再报备案',
      avoid: '施工期间就按档案归档要求同步整理，不要等到竣工' },
  ];

  function listReasons() { return REASONS.slice(); }

  function reasonsFor(procedureId) {
    var all = REASONS.filter(function (x) { return x.appliesTo === 'ALL'; });
    var own = REASONS.filter(function (x) { return Array.isArray(x.appliesTo) && x.appliesTo.indexOf(procedureId) >= 0; });
    return all.concat(own);
  }

  function byCategory() {
    var g = {};
    CATEGORIES.forEach(function (c) { g[c] = []; });
    REASONS.forEach(function (x) { if (g[x.category]) g[x.category].push(x); });
    return g;
  }

  function highFrequencyFor(procedureId) {
    return reasonsFor(procedureId).filter(function (x) { return x.freq === '常见'; });
  }

  function validateReasons(list, knownProcedureIds) {
    var errs = [];
    var known = knownProcedureIds ? knownProcedureIds.reduce(function (m, id) { m[id] = true; return m; }, {}) : null;
    (list || REASONS).forEach(function (x) {
      if (!x.id) errs.push('条目缺 id');
      if (CATEGORIES.indexOf(x.category) < 0) errs.push(x.id + ' 类目非法: ' + x.category);
      if (['常见', '偶发'].indexOf(x.freq) < 0) errs.push(x.id + ' freq 非法: ' + x.freq);
      if (!x.reason) errs.push(x.id + ' 缺 reason');
      if (!x.fix) errs.push(x.id + ' 缺 fix');
      // 'ALL' 是合法值（接口契约：通用原因用字符串 'ALL' 标注）
      if (x.appliesTo !== 'ALL' && (!Array.isArray(x.appliesTo) || !x.appliesTo.length)) errs.push(x.id + ' appliesTo 为空');
      if (known && Array.isArray(x.appliesTo)) {
        x.appliesTo.forEach(function (id) { if (!known[id]) errs.push(x.id + ' 指向未知手续 ' + id); });
      }
    });
    return errs;
  }

  return {
    CATEGORIES: CATEGORIES, REASONS: REASONS,
    listReasons: listReasons, reasonsFor: reasonsFor, byCategory: byCategory,
    highFrequencyFor: highFrequencyFor, validateReasons: validateReasons,
  };
});
