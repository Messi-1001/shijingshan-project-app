/* js/data/procedures-07-jungong.js —— ⑦ 竣工验收（6 项：4 项并联 + 验收 + 备案） */
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
      id: 'jg-1', no: 35, name: '档案验收', section: 'jungong',
      dept: '城建档案管理部门', duration: '10 工作日', durationDays: 10, prev: ['sg-1'],
      parallel: true,
      notes: '**可与 jg-2 / jg-3 / jg-4 并联推进**。参考真实文号：2026 建档验字 0007 号。',
      basis: '城市建设档案管理规定',
      materials: [
        { name: '北京市建设工程档案验收自检报告', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '城建档案移交资料', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      templates: ['tpl-dangan-zijian', 'tpl-dangan-yijiao'],
      source: '✅'
    }),
    mk({
      id: 'jg-2', no: 36, name: '人防验收', section: 'jungong',
      dept: '人民防空主管部门', duration: '15 工作日', durationDays: 15, prev: ['sg-1'],
      parallel: true,
      notes: '**可与 jg-1 / jg-3 / jg-4 并联推进**。触发前提：项目设有人防工程。参考真实文号：(2026) 京防 (石) 竣备字 0006 号。',
      basis: '人民防空工程建设管理规定',
      materials: [
        { name: '人防工程质量竣工验收记录', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '人防工程竣工图', copies: 2, seal: '加盖设计单位章', provider: '设计单位' }
      ],
      templates: ['tpl-renfang-yanshou'],
      source: '✅'
    }),
    mk({
      id: 'jg-3', no: 37, name: '消防验收', section: 'jungong',
      dept: '住房和城乡建设部门', duration: '15 工作日', durationDays: 15, prev: ['sg-1'],
      parallel: true,
      notes: '**可与 jg-1 / jg-2 / jg-4 并联推进**。',
      basis: '建设工程消防设计审查验收管理暂行规定',
      materials: [
        { name: '建设工程竣工验收报告（综合）', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '消防设施检测报告', copies: 2, seal: '加盖检测机构章', provider: '检测机构' }
      ],
      templates: ['tpl-jungong-baogao'],
      source: '✅'
    }),
    mk({
      id: 'jg-4', no: 38, name: '规划核验', section: 'jungong',
      dept: '规划和自然资源部门', duration: '15 工作日', durationDays: 15, prev: ['sg-1'],
      parallel: true,
      notes: '**可与 jg-1 / jg-2 / jg-3 并联推进**。参考真实文号：2026 规自（石）竣字 0007 号。',
      basis: '城乡规划法；建设工程竣工规划核验规定',
      materials: [
        { name: '事项申报表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '法人授权委托书', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '竣工测量成果文件', copies: 2, seal: '加盖测绘单位章', provider: '测绘单位' },
        { name: '竣规图', copies: 2, seal: '加盖设计单位章', provider: '设计单位' },
        { name: '申请核验的函', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '设计说明', copies: 1, seal: '加盖设计单位章', provider: '设计单位' }
      ],
      templates: ['tpl-guihua-heshi-shenbao', 'tpl-heshi-han'],
      source: '✅'
    }),
    mk({
      id: 'jg-5', no: 39, name: '竣工验收（五方责任主体）', section: 'jungong',
      dept: '建设 / 勘察 / 设计 / 施工 / 监理（五方）', duration: '', durationDays: null,
      prev: ['jg-1', 'jg-2', 'jg-3', 'jg-4'],
      notes: '**必须在 jg-1～jg-4 全部完成后进行**。五方责任主体共同验收并签署竣工验收报告。',
      basis: '建设工程质量管理条例；房屋建筑和市政基础设施工程竣工验收规定',
      materials: [
        { name: '建设工程竣工验收报告（综合）', copies: 3, seal: '五方盖章', provider: '五方责任主体' },
        { name: '竣工联合验收综合告知承诺书', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      templates: ['tpl-jungong-baogao', 'tpl-lianhe-gaozhi'],
      source: '✅'
    }),
    mk({
      id: 'jg-6', no: 40, name: '竣工验收备案（竣工质量备案）', section: 'jungong',
      dept: '住房和城乡建设部门', duration: '5 工作日', durationDays: 5, prev: ['jg-5'],
      notes: '**必须在 jg-5 之后**。取得联合验收意见。参考真实文号：京竣联验（石）字【2026】0343 号。**本项为编号手续清单的终点（第 40 条）**；⑧ 收尾结算不编号，见 `schema.js` 的 `CLOSING_NOTE`。',
      basis: '房屋建筑和市政基础设施工程竣工验收备案管理办法',
      materials: [
        { name: '竣工验收备案表', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '联合验收意见', copies: 1, seal: '加盖验收部门章', provider: '住建部门' }
      ],
      templates: ['tpl-lianhe-yijian'],
      source: '✅'
    })
  ];
});
