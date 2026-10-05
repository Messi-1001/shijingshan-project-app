/* js/data/templates-index.js —— 存量模板库索引（34 个文件） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.data = root.SJSQ.data || {};
    root.SJSQ.data.templatesRaw = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DIR = '文件模板';
  // label：通用化显示名（UI 与导出 meta 一律显示它）；fileName 只用于打开文件的真实路径，
  // 不进任何用户可见文本（终审 I-1：真实项目名/人名脱敏，G15）。
  function T(id, fileName, dir, category, type, editable, procedureIds, placeholderId, label) {
    var o = { id: id, fileName: fileName, dir: dir || DIR, category: category,
      type: type, editable: !!editable, procedureIds: procedureIds || [], placeholderId: placeholderId || '' };
    if (label) o.label = label;
    return o;
  }

  var RAW = [
    // ── 土地手续（2） ─────────────────────────────
    T('tpl-tudi-qingshi', '土地的请示函模板.pdf', DIR, '土地手续', '可复用', true, ['yd-7'], 'TUDI_QINGSHI'),
    T('tpl-huabo-jueding', '首钢东南区配套学校建设工程国有建设用地划拨决定书-京规自石划字〔2023〕25 号.pdf', DIR, '土地手续', '参考', false, ['yd-7'], '', '国有建设用地划拨决定书（样例）'),

    // ── 规划手续（6） ─────────────────────────────
    T('tpl-duogui-tuisong', '规划综合实施方案多规合一平台推送情况说明书.pptx', DIR, '规划手续', '可复用', true, ['gh-1'], 'DUOGUI_TUISONG'),
    T('tpl-duogui-chushen', '北京市规划和自然资源委员会石景山分局《关于首钢东南区配套学校建设工程项目“多规合一”协同平台初审意见的函》（京规自（石）初审函〔2023〕0003号）.pdf', DIR, '规划手续', '参考', false, ['gh-1'], '', '多规合一初审意见函（样例）'),
    T('tpl-duogui-huishang', '会商批复-北京市规划和自然资源委员会石景山分局多规合一协同平台会商意见-2023规自（石）综审字0014号.pdf', DIR, '规划手续', '参考', false, ['gh-2']),
    T('tpl-guizheng-zhengwen', '规证正文-建字第 110107202400002 号2024规自（石）建字0002号.pdf', DIR, '规划手续', '参考', false, ['gh-3']),
    T('tpl-xiaofang-shencha', '特殊建设工程消防设计审査意见书--京规自（石）消审字[2024]第 0007 号7.29.pdf', DIR, '规划手续', '参考', false, ['gh-5']),
    T('tpl-beijing-liucheng', '北京办理流程.pdf', DIR, '规划手续', '参考', false, ['gh-1', 'gh-2', 'gh-3', 'gh-4', 'gh-5', 'gh-6']),

    // ── 发改委手续（6） ───────────────────────────
    T('tpl-lixiang-baogao', '立项报告模板（包括投资预算）.pdf', DIR, '发改委手续', '可复用', true, ['lx-5', 'lx-6'], 'LIXIANG_BAOGAO'),
    T('tpl-gaisuan-qingshi', '发改委初审设计概算的请示函模版.pdf', DIR, '发改委手续', '可复用', true, ['lx-7'], 'GAISUAN_QINGSHI'),
    T('tpl-gaisuan-wenben', '初步设计概算的设计文本模版.pdf', DIR, '发改委手续', '可复用', true, ['lx-7'], 'GAISUAN_WENBEN'),
    T('tpl-gaisuan-moban', '初步设计概算模板.pdf', DIR, '发改委手续', '可复用', true, ['lx-7'], 'GAISUAN_MOBAN'),
    T('tpl-xiangmu-jianyi-pifu', '关于首钢东南区配套学校建设工程项目建议书（代可行性研究报告）的批复--京发改（审）〔2023〕477号.pdf', DIR, '发改委手续', '参考', false, ['lx-5', 'lx-6'], '', '项目建议书批复（样例）'),
    T('tpl-gaisuan-pifu', '初步设计概算批复-京发改（审）〔2024〕224号.pdf', DIR, '发改委手续', '参考', false, ['lx-7']),

    // ── 各类评价（2） ─────────────────────────────
    T('tpl-jiaoping-baogao', '交评报告.pdf', DIR, '各类评价', '参考', false, ['pj-1']),
    T('tpl-jiaoping-shencha', '交评审查意见-京交函[2023]1318号.pdf', DIR, '各类评价', '参考', false, ['pj-1']),

    // ── 联合验收（19） ────────────────────────────
    T('tpl-guihua-heshi-shenbao', '1事项申报表.pdf', DIR + '/联合验收资料模板/1规划验收申报资料', '联合验收', '可复用', true, ['jg-4'], 'HESHI_SHENBAO'),
    T('tpl-faren-shouquan', '2.1法人授权委托书.pdf', DIR + '/联合验收资料模板/1规划验收申报资料', '联合验收', '可复用', true, ['jg-4'], 'FAREN_SHOUQUAN'),
    // 终审 I-1（G15 红线）：身份证复印件属明令禁入素材，整条剔除（即使改名也不进索引）
    T('tpl-jungong-celiang', '3竣工测量成果文件202602021终.pdf', DIR + '/联合验收资料模板/1规划验收申报资料', '联合验收', '参考', false, ['jg-4']),
    T('tpl-junguitu', '4竣规图.pdf', DIR + '/联合验收资料模板/1规划验收申报资料', '联合验收', '参考', false, ['jg-4']),
    T('tpl-heshi-han', '5.1申请核验的函.pdf', DIR + '/联合验收资料模板/1规划验收申报资料', '联合验收', '可复用', true, ['jg-4'], 'HESHI_HAN'),
    T('tpl-sheji-shuoming', '5.2设计说明.pdf', DIR + '/联合验收资料模板/1规划验收申报资料', '联合验收', '参考', false, ['jg-4']),
    T('tpl-dangan-zijian', '北京市建设工程档案验收自检报告.pdf', DIR + '/联合验收资料模板/2档案验收申报资料', '联合验收', '可复用', true, ['jg-1'], 'DANGAN_ZIJIAN'),
    T('tpl-dangan-yijiao', '城建档案移交资料26.5.25.pdf', DIR + '/联合验收资料模板/2档案验收申报资料', '联合验收', '参考', false, ['jg-1']),
    T('tpl-renfang-yanshou', '人防工程质量竣工验收记录.pdf', DIR + '/联合验收资料模板/3人防验收申报资料', '联合验收', '可复用', true, ['jg-2'], 'RENFANG_YANSHOU'),
    T('tpl-renfang-shouli', '受理单.jpg', DIR + '/联合验收资料模板/3人防验收申报资料', '联合验收', '参考', false, ['jg-2']),
    T('tpl-jungong-baogao', '《北京市建设工程竣工验收报告（综合）》.pdf', DIR + '/联合验收资料模板/4质量监督及消防', '联合验收', '可复用', true, ['jg-3', 'jg-5'], 'JUNGONG_BAOGAO'),
    T('tpl-lianhe-gaozhi', '北京市建设工程竣工联合验收综合告知承诺书（范本）.pdf', DIR + '/联合验收资料模板/4质量监督及消防', '联合验收', '可复用', true, ['jg-5'], 'LIANHE_GAOZHI'),
    T('tpl-dangan-yijianshu', '2档案验收意见书-2026建档验字0007号.pdf', DIR + '/联合验收资料模板/5验收成果文件', '联合验收', '参考', false, ['jg-1']),
    T('tpl-renfang-tongzhidan', '人防竣备通知单-(2026)京防(石)竣备字0006号.pdf', DIR + '/联合验收资料模板/5验收成果文件', '联合验收', '参考', false, ['jg-2']),
    T('tpl-dangan-yijiao-cg', '城建档案移交资料26.5.25.pdf', DIR + '/联合验收资料模板/5验收成果文件', '联合验收', '参考', false, ['jg-1']),
    T('tpl-lianhe-yijian', '联合验收意见-京竣联验（石）字【2026】0343 号-2026.2.10.pdf', DIR + '/联合验收资料模板/5验收成果文件', '联合验收', '参考', false, ['jg-6']),
    T('tpl-guihua-yanshou-yijian', '规划验收意见-2026规自（石）竣字0007号—正本.pdf', DIR + '/联合验收资料模板/5验收成果文件', '联合验收', '参考', false, ['jg-4']),
    T('tpl-shigong-xukezheng', '施工许可证-110107202403110301-[2024]施[石]建字 0022 号.pdf', DIR, '联合验收', '参考', false, ['sg-1'])
  ];

  return { RAW: RAW, DIR: DIR };
});
