/* js/data/procedures-03-guihua.js —— ③ 规划报建（6 项，严格串联） */
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
      id: 'gh-1', no: 15, name: '多规合一初审意见', section: 'guihua',
      dept: '规划和自然资源部门（多规合一协同平台）', duration: '3 个月', durationDays: 66, prev: ['yd-3'],
      notes: '通过"多规合一"协同平台推送项目，取得初审意见函。参考真实文号：京规自（石）初审函〔2023〕0003 号。**前置为用地预审与选址意见书（yd-3）**。',
      basis: '北京市"多规合一"协同平台运行管理办法',
      materials: [
        { name: '多规合一协同平台推送申请表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '规划综合实施方案', copies: 3, seal: '加盖设计单位章', provider: '设计单位' }
      ],
      templates: ['tpl-duogui-tuisong', 'tpl-duogui-chushen'],
      platform: 'tzxm', source: '✅'
    }),
    mk({
      id: 'gh-2', no: 16, name: '综合会商意见', section: 'guihua',
      dept: '区规自牵头，多部门会商', duration: '2 个月', durationDays: 44, prev: ['gh-1'],
      notes: '取得多规合一协同平台会商意见。参考真实文号：2023 规自（石）综审字 0014 号。',
      basis: '北京市"多规合一"协同平台运行管理办法',
      materials: [{ name: '会商申请材料', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' }],
      templates: ['tpl-duogui-huishang'],
      platform: 'tzxm', source: '✅'
    }),
    mk({
      id: 'gh-3', no: 17, name: '建设工程规划许可证（规证）', section: 'guihua',
      dept: '规划和自然资源部门', duration: '20 工作日', durationDays: 20, prev: ['gh-2'],
      notes: '取得建设工程规划许可证。参考真实文号：2024 规自（石）建字 0002 号（建字第 110107202400002 号）。**注意：本项目不要求办理产权证。**',
      basis: '城乡规划法',
      materials: [
        { name: '建设工程规划许可证申请表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '施工图设计文件（总平面、单体）', copies: 3, seal: '加盖设计单位章', provider: '设计单位' },
        { name: '多规合一协同平台会商意见', copies: 1, seal: '', provider: '规自部门' }
      ],
      templates: ['tpl-guizheng-zhengwen'],
      platform: 'tzxm', source: '✅'
    }),
    mk({
      id: 'gh-4', no: 18, name: '勘察图纸备案', section: 'guihua',
      dept: '住房和城乡建设部门', duration: '10 工作日', durationDays: 10, prev: ['gh-3'],
      notes: '**顺序要点：本项排在规证之后、消防审图之前**（v2.1 已修正顺序，不得调整）。',
      basis: '建设工程勘察设计管理条例',
      materials: [
        { name: '勘察报告', copies: 2, seal: '加盖勘察单位资质章', provider: '勘察单位' },
        { name: '备案申请表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      source: '✅'
    }),
    mk({
      id: 'gh-5', no: 19, name: '消防审图（消防设计审查）', section: 'guihua',
      dept: '住房和城乡建设部门', duration: '1 个月', durationDays: 22, prev: ['gh-4'],
      notes: '特殊建设工程需取得《特殊建设工程消防设计审查意见书》。参考真实文号：京规自（石）消审字〔2024〕第 0007 号。',
      basis: '建设工程消防设计审查验收管理暂行规定',
      materials: [
        { name: '消防设计文件', copies: 3, seal: '加盖设计单位章', provider: '设计单位' },
        { name: '消防设计审查申请表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      templates: ['tpl-xiaofang-shencha'],
      source: '✅'
    }),
    mk({
      id: 'gh-6', no: 20, name: '施工图备案', section: 'guihua',
      dept: '施工图审查机构 + 住房和城乡建设部门', duration: '1 个月', durationDays: 22, prev: ['gh-5'],
      notes: '施工图审查合格后办理备案。备案完成即可进入招标与施工许可阶段。',
      basis: '房屋建筑和市政基础设施工程施工图设计文件审查管理办法',
      materials: [
        { name: '施工图审查合格书', copies: 2, seal: '加盖审图机构章', provider: '施工图审查机构' },
        { name: '施工图设计文件', copies: 3, seal: '加盖设计单位章', provider: '设计单位' }
      ],
      source: '✅'
    })
  ];
});
