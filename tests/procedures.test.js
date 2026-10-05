/* tests/procedures.test.js —— 手续总索引与全量一致性 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const idx = require('../js/data/procedures-index.js');

const lists = [
  H.req('js/data/procedures-01-lixiang.js'),
  H.req('js/data/procedures-02-yongdi.js'),
  H.req('js/data/procedures-03-guihua.js'),
  H.req('js/data/procedures-04-pingjia.js'),
  H.req('js/data/procedures-05-zhaobiao.js'),
  H.req('js/data/procedures-06-shigong.js'),
  H.req('js/data/procedures-07-jungong.js')
];

test('全量 40 条登记，编号 1..40 连续', () => {
  const out = idx.buildIndex(lists);
  assert.deepEqual(out.errors, [], out.errors.join('\n'));
  assert.equal(out.list.length, 40);
  assert.equal(out.list[0].no, 1);
  assert.equal(out.list[39].no, 40);
});

test('有效 37 + 预留 3', () => {
  const c = idx.buildIndex(lists).list;
  const reserved = c.filter((p) => p.reserved).length;
  assert.equal(reserved, 3);
  assert.equal(c.length - reserved, 37);
});

test('板块条数符合 spec：①7 ②7 ③6 ④′8 ④5 ⑤1 ⑦6', () => {
  const out = idx.buildIndex(lists);
  assert.equal(out.bySection.lixiang.length, 7);
  assert.equal(out.bySection.yongdi.length, 7);
  assert.equal(out.bySection.guihua.length, 6);
  assert.equal(out.bySection.pingjia.length, 8);
  assert.equal(out.bySection.zhaobiao.length, 5);
  assert.equal(out.bySection.shigong.length, 1);
  assert.equal(out.bySection.jungong.length, 6);
});

test('编号 34 是施工许可证，35 是档案验收', () => {
  const out = idx.buildIndex(lists);
  assert.equal(out.list[33].name, '建筑工程施工许可证');
  assert.equal(out.list[34].name, '档案验收');
});

test('不包含施工许可的质监/安监（v1.1 收窄）', () => {
  const names = idx.buildIndex(lists).list.map((p) => p.name).join('|');
  assert.equal(names.includes('质量监督登记'), false);
  assert.equal(names.includes('安全监督登记'), false);
});

test('不包含 ⑧ 收尾结算手续项（它只是说明）', () => {
  const names = idx.buildIndex(lists).list.map((p) => p.name).join('|');
  assert.equal(names.includes('结算汇总表'), false);
});

test('⑦ 的并联与串联关系正确', () => {
  const byId = idx.buildIndex(lists).byId;
  ['jg-1', 'jg-2', 'jg-3', 'jg-4'].forEach((id) => assert.equal(byId[id].parallel, true, id));
  assert.deepEqual(byId['jg-5'].prev.sort(), ['jg-1', 'jg-2', 'jg-3', 'jg-4']);
  assert.deepEqual(byId['jg-6'].prev, ['jg-5']);
});

test('① 的 A 段与 B 段严格先后', () => {
  const byId = idx.buildIndex(lists).byId;
  assert.deepEqual(byId['lx-1'].prev, []);
  assert.deepEqual(byId['lx-2'].prev, ['lx-1']);
  assert.deepEqual(byId['lx-3'].prev, ['lx-2']);
  assert.deepEqual(byId['lx-4'].prev, ['lx-3']);
  assert.deepEqual(byId['lx-5'].prev, ['lx-4']);   // B 段必须等 A 段
  assert.deepEqual(byId['lx-6'].prev, ['lx-5']);
  assert.deepEqual(byId['lx-7'].prev, ['lx-6']);
});

test('③ 勘察图纸备案排在规证之后、消防审图之前', () => {
  const byId = idx.buildIndex(lists).byId;
  assert.deepEqual(byId['gh-4'].prev, ['gh-3']);
  assert.deepEqual(byId['gh-5'].prev, ['gh-4']);
});

test('getById / getBySection / getCounts', () => {
  idx.buildIndex(lists);
  assert.equal(idx.getById('sg-1').no, 34);
  assert.equal(idx.getById('不存在'), null);
  assert.equal(idx.getBySection('jungong').length, 6);
  const c = idx.getCounts();
  assert.equal(c.total, 40);
  assert.equal(c.effective, 37);
  assert.equal(c.reserved, 3);
  assert.equal(c.bySection.shigong, 1);
});

test('searchProcedures 命中名称、部门与说明', () => {
  idx.buildIndex(lists);
  assert.ok(idx.searchProcedures('划拨').some((p) => p.id === 'yd-7'));
  assert.ok(idx.searchProcedures('规自').length >= 3);
  assert.ok(idx.searchProcedures('副市长').some((p) => p.id === 'lx-4'));
});

test('searchProcedures 空白与大小写不敏感，空串返回全量', () => {
  idx.buildIndex(lists);
  assert.equal(idx.searchProcedures('   ').length, 40);
  assert.equal(idx.searchProcedures('').length, 40);
});

test('closingNote 含"不单列"字样', () => {
  assert.ok(idx.closingNote().includes('不单列'));
});
