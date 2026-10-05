/* tests/util.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const ns = require('../js/core/ns.js');

test('ns.createModule 返回约定结构', () => {
  const r = ns.createModule('demo', () => ({}));
  assert.equal(r.ok, true);
  assert.equal(r.version, 1);
});
