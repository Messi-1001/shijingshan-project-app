/* tests/integration-phase4.test.js —— 阶段四集成验收（Task 39） */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');

const LIST = [
  ...H.req('js/data/procedures-01-lixiang.js'), ...H.req('js/data/procedures-02-yongdi.js'),
  ...H.req('js/data/procedures-03-guihua.js'),  ...H.req('js/data/procedures-04-pingjia.js'),
  ...H.req('js/data/procedures-05-zhaobiao.js'), ...H.req('js/data/procedures-06-shigong.js'),
  ...H.req('js/data/procedures-07-jungong.js')
];
const idx = H.req('js/data/procedures-index.js');
const tpl = H.req('js/data/templates.js');
const mat = H.req('js/logic/materials.js');
idx.buildIndex([LIST]);

test('模板索引 34 条、零错误（终审 I-1 剔除身份证条目后）', () => {
  tpl.build();
  assert.equal(tpl.allIds().length, 34);
  assert.deepEqual(tpl.validate(), []);
});

test('模板挂靠的手续全部存在', () => {
  const bad = [];
  tpl.build().list.forEach((t) => (t.procedureIds || []).forEach((pid) => {
    if (!idx.getById(pid)) bad.push(t.id + '→' + pid);
  }));
  assert.deepEqual(bad, []);
});

test('扫描件已标 editable:false（不得全部标成可复制）', () => {
  const list = tpl.build().list;
  assert.ok(list.filter((x) => !x.editable).length >= 10);
});

test('材料汇总：每条有效手续的材料都能被收集', () => {
  const rows = mat.collect(LIST);
  assert.ok(rows.length > 60, '实际 ' + rows.length + ' 条');
});

test('材料汇总：同名合并后条数明显减少', () => {
  const s = mat.summarize(mat.collect(LIST));
  assert.ok(s.mergedCount < s.rawCount);
  assert.ok(s.totalCopies > 0);
});

test('每个提供方分组都非空', () => {
  const g = mat.groupByProvider(mat.mergeDuplicates(mat.collect(LIST)));
  assert.ok(g.length >= 4, '实际 ' + g.length + ' 组');
  assert.ok(g.every((x) => x.items.length > 0));
});

test('验收标准 3：模板能被 ≤1 秒调出（索引为 O(1) 查表）', () => {
  tpl.build();
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) tpl.getById('tpl-gaisuan-moban');
  assert.ok(Date.now() - t0 < 1000, '1000 次查表耗时 ' + (Date.now() - t0) + 'ms');
});

test('验收标准 8：材料清单可导出 HTML 表格', () => {
  const exp = H.req('js/logic/exporters.js');
  const rows = mat.mergeDuplicates(mat.collect(LIST));
  const html = exp.buildDocHtml({ title: '材料清单', sections: [
    { h: '一、清单', html: exp.buildTableHtml(['材料'], rows.map((r) => [r.name])) }
  ]});
  assert.ok(html.includes('<table'));
  assert.ok(html.includes('材料清单'));
});

test('携带修复：自定义模板生成条目带 custom 标记（打开文件按钮据其置灰）', () => {
  const ct = H.req('js/views/v-templates-custom.js');
  const t = ct.buildCustomTemplate({ fileName: '验证自定义.pdf', category: '招标与合同', type: '可复用' });
  assert.equal(t.custom, true);
  // 视图层依据 t.custom 置灰「打开文件」（v-templates.js 渲染逻辑），无头浏览器实测见 verify-phase4.js
  const v = H.req('js/views/v-templates.js');
  assert.equal(typeof v.searchCustom, 'function');
  assert.equal(v.searchCustom([t], '验证自定义').length, 1);
});

test('携带修复：中文文件名不同的自定义模板不得撞 id（\W 剥离 + seq 刷新归零曾致去重丢失）', () => {
  const ct = H.req('js/views/v-templates-custom.js');
  const a = ct.buildCustomTemplate({ fileName: '施工招标文件（空白）.pdf' });
  const b = ct.buildCustomTemplate({ fileName: '施工许可申请表（自制）.pdf' });
  assert.notEqual(a.id, b.id, '两条中文命名模板 id 撞车：' + a.id);
  const merged = ct.mergeCustom([a], [b]);
  assert.equal(merged.length, 2);
});
