/* tests/checklist.test.js —— v-checklist 纯函数（buildRows / checklistRowId） */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const vc = require('../js/views/v-checklist.js');
const c = require('../js/data/conditions.js');

const LIST = [
  ...H.req('js/data/procedures-01-lixiang.js'), ...H.req('js/data/procedures-02-yongdi.js'),
  ...H.req('js/data/procedures-03-guihua.js'),  ...H.req('js/data/procedures-04-pingjia.js'),
  ...H.req('js/data/procedures-05-zhaobiao.js'), ...H.req('js/data/procedures-06-shigong.js'),
  ...H.req('js/data/procedures-07-jungong.js')
];

test('buildRows 本期输出 40 行', () => {
  const rows = vc.buildRows(LIST, {}, c.FIXED_VALUES);
  assert.equal(rows.length, 40);
  assert.equal(rows[0].no, 1);
  assert.equal(rows[39].no, 40);
});

test('buildRows 每行带"为什么你要办这一项"的依据', () => {
  const rows = vc.buildRows(LIST, {}, c.FIXED_VALUES);
  const r = rows.find((x) => x.id === 'yd-7');
  assert.ok(r.why.length > 0);
  assert.ok(r.why.some((w) => w.includes('新建')));
});

test('buildRows 标出被前置阻塞的项', () => {
  const rows = vc.buildRows(LIST, {}, c.FIXED_VALUES);
  // lx-2 只被 lx-1 挡住（2026-10-08 更正：第2项与第15项无关）
  assert.deepEqual(rows.find((x) => x.id === 'lx-2').blocked, ['lx-1']);
  // lx-3 被 lx-2 与 gh-1 挡住
  assert.ok(rows.find((x) => x.id === 'lx-3').blocked.includes('gh-1'));
  assert.deepEqual(rows.find((x) => x.id === 'lx-1').blocked, []);
  assert.deepEqual(rows.find((x) => x.id === 'gh-1').blocked, [], 'gh-1 无前置，不应被阻塞');
});

test('buildRows 带出状态', () => {
  const rows = vc.buildRows(LIST, { 'p-1::lx-1': { status: 'done' } }, c.FIXED_VALUES, null, 'p-1');
  assert.equal(rows.find((x) => x.id === 'lx-1').status, 'done');
  assert.equal(rows.find((x) => x.id === 'lx-2').status, 'idle');
});

test('buildRows 未知状态归 idle', () => {
  const rows = vc.buildRows(LIST, { 'p-1::lx-1': { status: '瞎写' } }, c.FIXED_VALUES, null, 'p-1');
  assert.equal(rows.find((x) => x.id === 'lx-1').status, 'idle');
});

test('checklistRowId 规则稳定', () => {
  assert.equal(vc.checklistRowId('p-1', 'lx-1'), 'p-1::lx-1');
});

/* —— M3 深链聚焦：#/checklist?focus=<procedureId> —— */
test('focusPid 解析 params.focus，缺省为空串', () => {
  assert.equal(vc.focusPid({ focus: ' lx-1 ' }), 'lx-1');
  assert.equal(vc.focusPid({}), '');
  assert.equal(vc.focusPid(null), '');
});

test('pickFocusRow 在清单行里定位聚焦目标（找不到返回 null）', () => {
  const rows = vc.buildRows(LIST, {}, c.FIXED_VALUES);
  assert.equal(vc.pickFocusRow(rows, 'lx-2').id, 'lx-2');
  assert.equal(vc.pickFocusRow(rows, 'no-such'), null);
  assert.equal(vc.pickFocusRow(rows, ''), null);
});
