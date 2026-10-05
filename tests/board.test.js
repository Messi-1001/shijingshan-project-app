/* tests/board.test.js —— Task 30：状态看板与完成率分项 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const vc = require('../js/views/v-checklist.js');

const LIST = [
  ...H.req('js/data/procedures-01-lixiang.js'), ...H.req('js/data/procedures-02-yongdi.js'),
  ...H.req('js/data/procedures-03-guihua.js'),  ...H.req('js/data/procedures-04-pingjia.js'),
  ...H.req('js/data/procedures-05-zhaobiao.js'), ...H.req('js/data/procedures-06-shigong.js'),
  ...H.req('js/data/procedures-07-jungong.js')
];

test('buildBoard 输出七个板块', () => {
  const b = vc.buildBoard(LIST, {}, 'p-1');
  assert.equal(b.length, 7);
  assert.equal(b[0].total, 7);
});

test('tone 随完成率变化', () => {
  const b0 = vc.buildBoard(LIST, {}, 'p-1');
  assert.equal(b0[0].tone, 'idle');

  const done = {}; let i = 0;
  LIST.filter((p) => p.section === 'lixiang').forEach((p) => {
    done['p-1::' + p.id] = { id: 'p-1::' + p.id, projectId: 'p-1', procedureId: p.id, status: i++ < 3 ? 'done' : 'idle' };
  });
  const b1 = vc.buildBoard(LIST, done, 'p-1');
  assert.equal(b1[0].tone, 'doing');

  const allDone = {};
  LIST.filter((p) => p.section === 'lixiang').forEach((p) => {
    allDone['p-1::' + p.id] = { id: 'p-1::' + p.id, projectId: 'p-1', procedureId: p.id, status: 'done' };
  });
  assert.equal(vc.buildBoard(LIST, allDone, 'p-1')[0].tone, 'done');
});

test('buildBoard 只统计本项目的状态', () => {
  const other = { 'p-2::lx-1': { id: 'p-2::lx-1', projectId: 'p-2', procedureId: 'lx-1', status: 'done' } };
  const b = vc.buildBoard(LIST, other, 'p-1');
  assert.equal(b[0].done, 0);
});
