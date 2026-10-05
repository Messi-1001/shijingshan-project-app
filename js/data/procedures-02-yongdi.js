/* js/data/procedures-02-yongdi.js —— ② 用地手续（7 项） */
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
      id: 'yd-1', no: 8, name: '取得一级开发单位划拨土地', section: 'yongdi',
      dept: '一级开发单位', duration: '', durationDays: null, prev: [],
      notes: '从一级开发单位取得已完成一级开发的划拨土地。需先完成土地一级开发及验收。',
      basis: '土地储备与一级开发管理规定',
      materials: [{ name: '一级开发土地移交确认单', copies: 2, seal: '双方盖章', provider: '一级开发单位' }],
      source: '✅'
    }),
    mk({
      id: 'yd-2', no: 9, name: '钉桩（规划用地测量条件 → 钉桩测量成果报告）', section: 'yongdi',
      dept: '北京市规划和自然资源委员会石景山分局', duration: '30 工作日', durationDays: 30, prev: ['yd-1'],
      notes: '由规划部门出具规划用地测量条件，再由测绘单位实施钉桩并出具钉桩测量成果报告。**此步为 v2.1 遗漏、本次新增**。',
      basis: '建设工程规划用地测量管理规定',
      materials: [
        { name: '规划用地测量条件申请表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '钉桩测量成果报告', copies: 2, seal: '加盖测绘单位资质章', provider: '测绘单位' }
      ],
      source: '🆕'
    }),
    mk({
      id: 'yd-3', no: 10, name: '用地预审与选址意见书', section: 'yongdi',
      dept: '规划和自然资源部门', duration: '20 工作日', durationDays: 20, prev: ['yd-2'],
      notes: '建设项目用地预审与选址意见书，是规划报建的前置条件。',
      basis: '建设项目用地预审管理办法；城乡规划法',
      materials: [
        { name: '用地预审与选址意见书申请表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '项目立项批复文件', copies: 1, seal: '', provider: '发改委' },
        { name: '土地权属证明或说明', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      source: '✅'
    }),
    mk({
      id: 'yd-4', no: 11, name: '土地权属审查（地籍图 / 界址点坐标）', section: 'yongdi',
      dept: '规划和自然资源部门', duration: '15 工作日', durationDays: 15, prev: ['yd-3'],
      notes: '核对地籍图与界址点坐标，确认无土地权属争议。',
      basis: '地籍调查规程',
      materials: [
        { name: '地籍调查表', copies: 2, seal: '加盖测绘单位章', provider: '测绘单位' },
        { name: '界址点坐标成果', copies: 2, seal: '加盖测绘单位章', provider: '测绘单位' }
      ],
      source: '✅'
    }),
    mk({
      id: 'yd-5', no: 12, name: '土地线下传递信息表 + 土地请款 + 支出申报', section: 'yongdi',
      dept: '建设单位内部 / 财政部门', duration: '', durationDays: null, prev: ['yd-4'],
      notes: '内部流程：填土地线下传递信息表 → 提交土地请款 → 支出申报。涉及财政资金拨付（本项目为财政资金，市、区两级各承担 50%）。',
      basis: '财政资金支付管理规定',
      materials: [
        { name: '土地线下传递信息表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '土地请款申请', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' }
      ],
      source: '✅'
    }),
    mk({
      id: 'yd-6', no: 13, name: '出入库手续（网上操作）', section: 'yongdi',
      dept: '土地储备机构 / 规划和自然资源部门', duration: '5 工作日', durationDays: 5, prev: ['yd-5'],
      notes: '在网上办理土地出入库，取得出入库凭证。',
      basis: '土地储备管理办法',
      materials: [{ name: '土地出入库申请表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' }],
      platform: 'tzxm', source: '✅'
    }),
    mk({
      id: 'yd-7', no: 14, name: '国有土地划拨手续', section: 'yongdi',
      dept: '规划和自然资源部门', duration: '20 工作日', durationDays: 20, prev: ['yd-6'],
      notes: '取得《国有建设用地划拨决定书》。参考真实文号：京规自石划字〔2023〕25 号。**注意：本项目不要求办理产权证。**',
      basis: '土地管理法；划拨用地目录',
      materials: [
        { name: '国有土地划拨申请表', copies: 1, seal: '加盖建设单位公章', provider: '建设单位' },
        { name: '项目立项批复文件', copies: 1, seal: '', provider: '发改委' },
        { name: '用地预审与选址意见书', copies: 1, seal: '', provider: '规自部门' }
      ],
      source: '✅'
    })
  ];
});
