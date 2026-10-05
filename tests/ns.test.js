/* tests/ns.test.js —— 从 util.test.js 搬过来 */
const test = require('node:test');
const assert = require('node:assert/strict');
const ns = require('../js/core/ns.js');

test('ns.createModule 返回约定结构', () => {
  assert.deepEqual(ns.createModule('demo', () => ({})), { ok: true, version: 1 });
});

test('ns.createModule 对非法入参抛错', () => {
  assert.throws(() => ns.createModule('', () => ({})), /name 必须是非空字符串/);
  assert.throws(() => ns.createModule('x', null), /fn 必须是函数/);
});
