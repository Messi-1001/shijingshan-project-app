/* tests/exporters.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const e = require('../js/logic/exporters.js');

// v-estimate 在 Node 下 require 需要 document/window 桩（buildRows 用）
function makeEl() {
  return { style: {}, classList: { add() {} }, appendChild() {}, setAttribute() {} };
}
global.document = { createElement: () => makeEl() };
global.window = global;
const ve = require('../js/views/v-estimate.js');

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

/* —— Task 48：两页纸估算表 Word 导出 —— */

test('buildEstimateDoc 产出两页且含项目名', () => {
  const r = ve.buildRows({ 工程费用: 20000 });
  const html = e.buildEstimateDoc(r, '琅山学校新建工程');
  assert.ok(html.includes('琅山学校新建工程'));
  assert.ok(html.includes('投资估算表'));
  assert.equal((html.match(/page-break/g) || []).length >= 1, true);
  assert.ok(html.includes('其他费合计'));
  assert.ok(html.includes('项目总投资'));
});

test('buildEstimateDoc 只用保守表格属性', () => {
  const r = ve.buildRows({ 工程费用: 5000 });
  const html = e.buildEstimateDoc(r, 'X');
  assert.ok(html.includes('border="1"'));
  assert.ok(!html.includes('display:flex'));
  assert.ok(!html.includes('display:grid'));
});

test('buildEstimateDoc 含制表日期与免责备注，金额千分位', () => {
  const r = ve.buildRows({ 工程费用: 20000 });
  const html = e.buildEstimateDoc(r, '某项目');
  assert.ok(/制表日期：\d{4}-\d{2}-\d{2}/.test(html));
  assert.ok(html.includes('财政评审'));
  assert.ok(html.includes('12,000'), '构成行 12000 万应千分位');
});

test('buildEstimateDoc 转义项目名中的 HTML 字符', () => {
  const r = ve.buildRows({ 工程费用: 20000 });
  const html = e.buildEstimateDoc(r, '<b>&x</b>');
  assert.ok(html.includes('&lt;b&gt;&amp;x&lt;/b&gt;'));
  assert.ok(!html.includes('<b>&x</b>'));
});

test('docFileName 带日期后缀', () => {
  const n = e.docFileName('某项目-投资估算表', '2026-09-25');
  assert.equal(n, '某项目-投资估算表-2026-09-25.doc');
});

/* —— Task 60：导出扩展（清单/进度 Word + 全量 CSV + 汇报数据装配）—— */
const X = e;

test('csvCell 处理逗号/引号/换行', () => {
  assert.equal(X.csvCell('a,b'), '"a,b"');
  assert.equal(X.csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(X.csvCell('l1\nl2'), '"l1\nl2"');
  assert.equal(X.csvCell('plain'), 'plain');
});

test('buildAllCsv 表头固定且行数等于清单数', () => {
  const index = { list: [
    { id: 'lx-1', no: '1', name: '项目建议书', dept: '区发改委', duration: 15, prev: [] },
    { id: 'lx-2', no: '2', name: '批复', dept: '区发改委', duration: 5, prev: ['lx-1'] },
  ] };
  const csv = X.buildAllCsv(index, { 'lx-1': { status: 'done' } });
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[0].includes('编号'));
  assert.ok(lines[0].includes('前置'));
  assert.ok(lines[1].includes('项目建议书'));
  assert.ok(lines[1].includes('已办结'));
});

test('buildProcedureListDoc 产出完整 HTML 文档', () => {
  const index = { list: [{ id: 'lx-1', no: '1', name: '项目建议书', dept: '区发改委' }] };
  const html = X.buildProcedureListDoc(index, {}, '琅山学校新建工程');
  assert.ok(html.startsWith('<html'));
  assert.ok(html.includes('琅山学校新建工程'));
  assert.ok(html.includes('border="1"'));
  assert.ok(html.includes('项目建议书'));
});

test('buildReportData 六类内容齐全', () => {
  const ctx = {
    projectName: '测试项目',
    index: { list: [{ id: 'lx-1', no: '1', name: '项目建议书', dept: '区发改委', duration: 15, prev: [] }], byId: { 'lx-1': { id: 'lx-1', no: '1', name: '项目建议书', dept: '区发改委', duration: 15, prev: [] } } },
    checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' },
    estimateInput: null, tenderInput: null,
  };
  const r = X.buildReportData(ctx);
  assert.ok(r.title.includes('测试项目'));
  assert.ok(r.slides.length >= 6);
  const titles = r.slides.map((s) => s.title).join('|');
  ['项目概况', '手续', '进度', '招标', '投资', '建议'].forEach((k) => assert.ok(titles.includes(k), '缺 ' + k));
  assert.equal(r.slides[0].layout, 'title');
});

test('buildReportData 在没有估算时给出提示而不是崩', () => {
  const ctx = { projectName: 'P', index: { list: [], byId: {} }, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } };
  const r = X.buildReportData(ctx);
  assert.ok(r.slides.every((s) => Array.isArray(s.bullets)));
  assert.ok(r.slides.some((s) => s.title.includes('投资')));
});
