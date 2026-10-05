/* js/data/platforms.js —— 两申报平台的平台内步骤数据 + 外层（线下）流程 + 校验 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.data = root.SJSQ.data || {}; root.SJSQ.data.platforms = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 步骤卡字段名：pageUrl 为可选深链（不强制，避免第三方转载与失效链接，数据纪律）
  var STEP_FIELDS = ['title', 'body', 'days', 'tips'];

  var PLATFORMS = [
    {
      id: 'zxsb',
      name: '北京市投资项目在线审批监管平台',
      short: '在线平台',
      url: 'https://tzxm.beijing.gov.cn/',
      account: '项目单位账号（需先办"法人一证通"并绑定项目单位）',
      scope: '项目建议书 → 可行性研究报告 → 初步设计概算 的申报、受理与批复取件',
      covers: ['lx-1', 'lx-2', 'lx-3', 'lx-4', 'lx-6', 'pj-1', 'pj-2', 'pj-3'],
      steps: [
        { title: '注册并绑定项目单位', days: 3,
          body: '用"法人一证通"登录在线平台，完善项目单位信息，指定经办人并开通"投资项目申报"权限。',
          tips: ['一证通需先把法定代表人实名信息补全，否则绑定会被退回', '经办人变更要重新授权，建议固定 1 主 1 备'] },
        { title: '录入项目基本信息并申请"项目代码"', days: 2,
          body: '在"项目储备/申报"菜单录入项目名称、建设地点、建设性质、总投资、资金来源，提交后自动生成项目代码。',
          tips: ['总投资要与后续可研批复口径一致，单位是"万元"', '建设性质选"新建"，与本系统固定口径一致'] },
        { title: '申报项目建议书', days: 5,
          body: '在"项目建议书"事项下上传正文与附件（项目建议书文本、资金来源说明、拟用地位置图），提交至区发改委。',
          tips: ['正文必须盖项目单位公章并骑缝章', '附件缺"资金来源说明"是最常见退回原因'] },
        { title: '跟进区发改委受理与批复', days: 10,
          body: '提交后在"我的申报"里看状态；被退回时按退回意见补正后重新提交，通过后下载电子批复。',
          tips: ['退回意见要在 5 个工作日内补正，逾期可能需重新申报', '电子批复要归档，后续环节要反复引用批复文号'] },
        { title: '申报可行性研究报告', days: 8,
          body: '在"可行性研究报告"事项上传可研文本、评审意见、投资估算表，提交至区发改委转报市发改委。',
          tips: ['可研投资估算直接引用本系统"投资估算"页导出结果', '评审公司意见要作为附件一并上传'] },
        { title: '申报初步设计概算审批', days: 12,
          body: '在"初步设计及概算"事项上传初步设计文件、概算书、施工图审查合格书，走"市发改委上主任会 → 分管副市长签批"。',
          tips: ['概算超过可研批复 10% 要重新报可研', '主任会排期有周期，需预留 2–3 周等待'] },
        { title: '取件与归档', days: 2,
          body: '全部批复完成后在平台"电子证照/批复下载"批量取件，按手续编号归档到本系统详情页附件位。',
          tips: ['批复文号要逐个录入本系统，建议用详情页"备注"字段', '建议同时保存 PDF 与截图，防止平台改版后取件失效'] },
      ],
    },
    {
      id: 'gctj',
      name: '北京市工程建设项目审批管理系统',
      short: '工改系统',
      url: 'https://gctj.beijing.gov.cn/',
      account: '建设单位账号（法人一证通），需先关联已立项的项目代码',
      scope: '规划意见 → 用地规划许可 → 工程规划许可 → 施工许可 → 联合验收 → 竣工验收备案',
      covers: ['gh-1', 'gh-2', 'gh-3', 'gh-4', 'gh-5', 'zb-1', 'zb-2', 'sg-1', 'jg-1', 'jg-5', 'jg-6'],
      steps: [
        { title: '关联项目代码并选择"并联审批"路径', days: 2,
          body: '用在线平台生成的项目代码在工改系统"项目登记"关联，勾选"社会投资/政府投资"与"一般工程建设项目"类型。',
          tips: ['项目类型选错会走错审批流程，返工成本极高', '关联前先确认立项批复已生效'] },
        { title: '申报规划意见（选址与用地预审）', days: 10,
          body: '在"规划许可阶段"上传用地范围、现状地形图、规划条件申请，取得规划意见函。',
          tips: ['用地范围坐标必须是 2000 国家大地坐标系的闭合面', '未取得规划意见前不要做施工图'] },
        { title: '申报建设用地规划许可与工程规划许可', days: 15,
          body: '分两次申报：先用地规划许可，取得后申报工程规划许可，上传总平面图、建筑方案图、消防设计文件。',
          tips: ['工程规划许可前需完成"勘察图纸备案"，两件事顺序不能颠倒', '总平面图指标（容积率/绿地率）要与规划条件一致'] },
        { title: '申报建设工程施工许可', days: 10,
          body: '在"施工许可阶段"上传施工图审查合格书、施工合同、监理合同、资金落实情况说明，申领建筑工程施工许可证。',
          tips: ['本期只办"建筑工程施工许可证"，不办质监登记与安监登记', '施工合同与中标通知书的金额、工期必须一致'] },
        { title: '发起竣工联合验收（多事项并联）', days: 20,
          body: '在"竣工验收阶段"一次性勾选规划核实、消防验收、人防验收、档案验收等事项，平台分发至各验收部门并联办理。',
          tips: ['联合验收四项可并行，但都要等施工完成且各专项资料齐备', '任一专项不通过要单独整改后重新发起，会整批延后'] },
        { title: '办理竣工验收备案', days: 7,
          body: '联合验收全部通过后，上传各专项验收合格文件与竣工验收报告，申请竣工验收备案，取得备案表。',
          tips: ['备案表是所有前置齐全后才发的"总收口"文件', '备案后即可办理房屋产权登记，属本系统范围之外'] },
      ],
    },
  ];

  // 平台之外的外层流程：线下沟通 / 评审 / 主任会 / 签批等，不混进平台步骤。
  // 供 v-platform 用 ui.stepCards 渲染，让用户先看懂"外面还有一圈"。
  var STEP_DIAGRAM = [
    { platform: 'zxsb', title: '立项阶段外层流程', steps: [
      { name: '线下沟通', body: '与区发改委、区教委前期沟通，明确建设规模与资金来源（市、区各承担 50%）。' },
      { name: '评审公司评审', body: '委托第三方评审公司对项目建议书与可研进行评审，出具评审意见。' },
      { name: '市发改委上主任会', body: '可研与概算经市发改委主任会审议，排期有周期，需预留 2–3 周。' },
      { name: '副市长签批', body: '主任会通过后报分管副市长签批，取得最终批复文件。' },
      { name: '正式申报与批复', body: '在线平台走"区发改委批复 → 市发改委批复"，两端批复文号都要归档。' },
    ] },
    { platform: 'gctj', title: '规划与施工许可外层流程', steps: [
      { name: '规划意见前置', body: '先取得规划意见函，再启动方案设计与施工图设计。' },
      { name: '图纸备案与规划许可', body: '勘察图纸备案 → 用地规划许可 → 工程规划许可，顺序严格固定。' },
      { name: '招标与施工许可', body: '施工招标定标后签施工合同，再凭合同与审图合格书申领施工许可证。' },
      { name: '并联验收', body: '施工完成后一次性发起联合验收，多专项并联，通过后办备案。' },
    ] },
  ];

  function listPlatforms() { return PLATFORMS.slice(); }

  function getPlatform(id) {
    for (var i = 0; i < PLATFORMS.length; i++) if (PLATFORMS[i].id === id) return PLATFORMS[i];
    return null;
  }

  function platformsCovering(procedureId) {
    return PLATFORMS.filter(function (p) { return (p.covers || []).indexOf(procedureId) >= 0; });
  }

  // 运行时手续清单上下文：浏览器读 boot 后挂好的 SJSQ.app.procedures；
  // Node / 未 boot 时为 null（covers 一致性由测试与调用方传入 ctx 锁死）。
  function knownContext(ctx) {
    if (ctx && ctx.list) return ctx;
    if (typeof window !== 'undefined' && window.SJSQ && window.SJSQ.app && window.SJSQ.app.procedures) {
      return window.SJSQ.app.procedures;
    }
    return null;
  }

  // list 缺字段、covers 指向未知手续都报出；ctx 可显式传 { list: [...] }
  function validatePlatformSteps(list, ctx) {
    var errs = [];
    var pls = list || PLATFORMS;
    var src = knownContext(ctx);
    var known = null;
    if (src) {
      known = {};
      src.list.forEach(function (p) { known[p.id] = true; });
    }
    pls.forEach(function (p) {
      ['id', 'name', 'short', 'url', 'account', 'scope'].forEach(function (f) {
        if (!p[f]) errs.push(p.id + ' 缺字段 ' + f);
      });
      if (!Array.isArray(p.steps) || !p.steps.length) { errs.push(p.id + ' 无步骤'); return; }
      p.steps.forEach(function (s, i) {
        STEP_FIELDS.forEach(function (f) {
          if (s[f] == null || s[f] === '') errs.push(p.id + ' 步骤 ' + (i + 1) + ' 缺 ' + f);
        });
        if (!Array.isArray(s.tips) || !s.tips.length) errs.push(p.id + ' 步骤 ' + (i + 1) + ' 缺 tips');
      });
      (p.covers || []).forEach(function (id) {
        if (known && !known[id]) errs.push(p.id + ' covers 指向未知手续 ' + id);
      });
    });
    return errs;
  }

  return {
    PLATFORMS: PLATFORMS, STEP_FIELDS: STEP_FIELDS, STEP_DIAGRAM: STEP_DIAGRAM,
    listPlatforms: listPlatforms, getPlatform: getPlatform,
    platformsCovering: platformsCovering, validatePlatformSteps: validatePlatformSteps,
  };
});
