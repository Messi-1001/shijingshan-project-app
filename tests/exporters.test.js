/* tests/exporters.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const e = require('../js/logic/exporters.js');

test('buildTableHtml 转义单元格', () => {
  const html = e.buildTableHtml(['A'], [['<b>x</b>&y']]);
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;&amp;y'));
  assert.ok(html.includes('<table'));
});

test('buildTableHtml 空表格也能生成', () => {
  const html = e.buildTableHtml(['A'], []);
  assert.ok(html.includes('<tbody>'));
});

test('buildDocHtml 含标题与各节', () => {
  const html = e.buildDocHtml({
    title: '测试清单', meta: '生成时间：2026-09-25',
    sections: [{ h: '一、概况', html: '<p>内容</p>' }]
  });
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('测试清单'));
  assert.ok(html.includes('生成时间：2026-09-25'));
  assert.ok(html.includes('一、概况'));
  assert.ok(html.includes('<meta charset="utf-8">'));
});

test('docFileName 带日期与 .doc 后缀', () => {
  assert.match(e.docFileName('项目清单', '2026-09-25'), /^项目清单-2026-09-25\.doc$/);
});

test('wordMime 正确', () => {
  assert.equal(e.wordMime(), 'application/msword');
});

test('escapeCell 空值返回空串', () => {
  assert.equal(e.escapeCell(null), '');
  assert.equal(e.escapeCell(undefined), '');
  assert.equal(e.escapeCell(0), '0');
});

test('downloadDoc 与数据构建分离，Node 环境下安全返回 false', () => {
  assert.equal(typeof e.downloadDoc, 'function');
  // Node 无 Blob/URL：下载触发不可测，但不得抛错
  assert.equal(e.downloadDoc('<p>x</p>', 'a.doc'), false);
});
