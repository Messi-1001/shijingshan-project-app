/* tests/ui.test.js —— 通用组件层：statusMeta / STATUS 纯函数部分 */
const test = require('node:test');
const assert = require('node:assert/strict');

// ui.js 依赖 DOM，但 statusMeta 是纯函数：用最小 document 桩载入
global.document = undefined;
const ui = require('../js/views/ui.js');

test('statusMeta 已知状态', () => {
  assert.deepEqual(ui.statusMeta('idle'),  { code: 'idle',  label: '未开始', tone: 'idle' });
  assert.deepEqual(ui.statusMeta('doing'), { code: 'doing', label: '办理中', tone: 'doing' });
  assert.deepEqual(ui.statusMeta('done'),  { code: 'done',  label: '已办结', tone: 'done' });
});

test('statusMeta 未知状态归 idle', () => {
  assert.equal(ui.statusMeta('乱七八糟').tone, 'idle');
  assert.equal(ui.statusMeta(undefined).code, 'idle');
});

test('STATUS 只有三种', () => {
  assert.deepEqual(Object.keys(ui.STATUS).sort(), ['doing', 'done', 'idle']);
});
