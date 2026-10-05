/* tests/dom.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const dom = require('../js/core/dom.js');

test('classNames 拼接真值键', () => {
  assert.equal(dom.classNames({ a: true, b: false, c: 1, d: '' }), 'a c');
  assert.equal(dom.classNames({}), '');
});

test('escapeHtml 转义五个字符', () => {
  assert.equal(dom.escapeHtml('<a href="x">&\'</a>'),
    '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('escapeHtml 对非字符串返回空串', () => {
  assert.equal(dom.escapeHtml(null), '');
  assert.equal(dom.escapeHtml(undefined), '');
});
