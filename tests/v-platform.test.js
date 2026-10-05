/* tests/v-platform.test.js —— 平台导航页：纯函数（resolvePlatformId / buildPlatformView / stepToRows） */
const test = require('node:test');
const assert = require('node:assert/strict');
global.document = { createElement: () => ({ style: {}, classList: { add() {} }, appendChild() {}, setAttribute() {} }) };
global.window = global;
const vp = require('../js/views/v-platform.js');
const platforms = require('../js/data/platforms.js');

const INDEX = {
  list: [
    { id: 'lx-1', no: '1', name: '项目建议书', dept: '区发改委' },
    { id: 'sg-1', no: '20', name: '建筑工程施工许可证', dept: '区住建委' },
  ],
  byId: { 'lx-1': { id: 'lx-1', no: '1', name: '项目建议书', dept: '区发改委' }, 'sg-1': { id: 'sg-1', no: '20', name: '建筑工程施工许可证', dept: '区住建委' } },
};

test('buildPlatformView 把 covers 解析成手续对象', () => {
  const v = vp.buildPlatformView(platforms.getPlatform('zxsb'), INDEX);
  assert.ok(v.relatedProcedures.length > 0);
  assert.ok(v.relatedProcedures.every((p) => p && p.id));
  assert.equal(v.relatedProcedures[0].id, 'lx-1');
});

test('covers 里不属于本索引的 id 被安静跳过', () => {
  const v = vp.buildPlatformView(platforms.getPlatform('gctj'), INDEX);
  const ids = v.relatedProcedures.map((p) => p.id);
  assert.deepEqual(ids, ['sg-1']);
});

test('stepToRows 输出 5 列', () => {
  const rows = vp.stepToRows(platforms.getPlatform('zxsb').steps);
  assert.equal(rows[0].length, 5);
  assert.equal(rows.length, platforms.getPlatform('zxsb').steps.length);
  assert.match(rows[0][4], /./); // 最容易错在哪非空
});

test('paramId 非法时回落到第一个平台', () => {
  assert.equal(vp.resolvePlatformId('不存在'), 'zxsb');
  assert.equal(vp.resolvePlatformId('gctj'), 'gctj');
  assert.equal(vp.resolvePlatformId(), 'zxsb');
});
