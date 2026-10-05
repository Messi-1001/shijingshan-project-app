/* js/data/procedures-06-shigong.js —— ⑤ 施工许可（1 项） */
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
      id: 'sg-1', no: 34, name: '建筑工程施工许可证', section: 'shigong',
      dept: '住房和城乡建设部门', duration: '', durationDays: null, prev: ['zb-5'],
      notes: '**本板块只办施工许可证一项**（质量监督登记、安全监督登记不做）。参考真实文号：[2024] 施 [石] 建字 0022 号（110107202403110301）。**装修改造类项目走的"城市更新"路径本期不覆盖** —— 当项目"建设性质 = 装修改造"时，本项在专属清单中显示为「本期未覆盖」而非静默隐藏。',
      basis: '建筑法；建筑工程施工许可管理办法',
      materials: [
        { name: '施工合同协议书', copies: 2, seal: '双方盖章', provider: '施工单位 / 建设单位' },
        { name: '中标通知书', copies: 1, seal: '加盖招标人公章', provider: '招标代理机构' },
        { name: '建设项目法人承诺书', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '授权情况说明', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '同意装修情况说明（仅装修类）', copies: 1, seal: '加盖产权单位公章', provider: '产权单位' },
        { name: '施工现场照片', copies: 1, seal: '', provider: '建设单位' },
        { name: '门楼牌编号确认材料', copies: 1, seal: '加盖相关部门章', provider: '属地派出所' }
      ],
      templates: ['tpl-shigong-xukezheng', 'tpl-faren-chengnuoshu', 'tpl-shouquan-shuoming'],
      platform: 'tzxm', source: '🆕'
    })
  ];
});
