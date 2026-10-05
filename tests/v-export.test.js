/* tests/v-export.test.js —— 导出中心（Task 62）：清单驱动 + runExport 纯分发降级 */
const test = require('node:test');
const assert = require('node:assert/strict');
global.document = { createElement: () => ({ style: {}, classList: { add() {} }, appendChild() {}, setAttribute() {} }) };
global.window = global;
const vx = require('../js/views/v-export.js');

test('EXPORTS 覆盖 spec 3.15 的全部要求', () => {
  const keys = vx.EXPORTS.map((x) => x.key);
  ['procedure-word', 'schedule-word', 'estimate-word', 'all-csv', 'report-pptx', 'flow-image'].forEach((k) => {
    assert.ok(keys.includes(k), '缺导出项 ' + k);
  });
});

test('EXPORTS 聚合备份快照（合同：导出中心收口全部导出）', () => {
  const keys = vx.EXPORTS.map((x) => x.key);
  assert.ok(keys.includes('backup-snapshot'), '缺备份快照导出项');
});

test('每个导出项都有 name 与 desc', () => {
  vx.EXPORTS.forEach((x) => {
    assert.ok(x.name && x.name.length > 0, x.key);
    assert.ok(x.desc && x.desc.length > 0, x.key + ' 缺 desc');
  });
});

test('runExport 未知 key 返回 ok:false 而不抛错', async () => {
  const r = await vx.runExport('不存在', {});
  assert.equal(r.ok, false);
  assert.match(r.reason, /未知|不支持/);
});

test('runExport 内部异常被兜住且返回 reason', async () => {
  const r = await vx.runExport('all-csv', { index: { list: null }, checklist: {}, exporters: { buildAllCsv: () => { throw new Error('boom'); } } });
  assert.equal(r.ok, false);
  assert.match(r.reason, /boom/);
});

test('runExport all-csv 走 exporters 并返回格式', async () => {
  const r = await vx.runExport('all-csv', {
    index: { list: [{ id: 'lx-1', no: '1', name: 'A', dept: 'D' }] },
    checklist: {},
    exporters: { buildAllCsv: () => 'x', downloadCsv: () => {} },
  });
  assert.equal(r.ok, true);
  assert.equal(r.format, 'csv');
});

test('runExport report-pptx 调 buildPptx 与 buildReportData', async () => {
  let called = false;
  const r = await vx.runExport('report-pptx', {
    projectName: 'P', index: { list: [], byId: {} }, checklist: {},
    scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' },
    exporters: { buildReportData: () => ({ slides: [] }) },
    pptx: { buildPptx: () => { called = true; return new Uint8Array([1, 2, 3]); } },
    downloadBinary: () => {},
  });
  assert.equal(r.ok, true);
  assert.equal(called, true);
});

test('runExport report-pptx 缺 pptx 模块时降级为 HTML 演示稿（不抛错）', async () => {
  const r = await vx.runExport('report-pptx', {
    projectName: 'P', index: { list: [], byId: {} }, checklist: {},
    exporters: { buildReportData: () => ({ title: 'T', slides: [{ layout: 'title', title: 'T' }] }) },
    pptx: null,
    downloadText: () => {},
  });
  assert.equal(r.ok, true);
  assert.equal(r.format, 'html');
  assert.match(r.reason, /降级/);
});

test('runExport backup-snapshot 走 backup.exportSnapshot 并返回 json 格式', async () => {
  let snap = false;
  const r = await vx.runExport('backup-snapshot', {
    projectName: 'P',
    store: { list: async () => [], get: async () => null },
    backup: { exportSnapshot: async () => { snap = true; return { tables: {} }; }, toJson: () => '{}' },
    downloadText: () => {},
  });
  assert.equal(r.ok, true);
  assert.equal(r.format, 'json');
  assert.equal(snap, true);
});

test('runExport backup-snapshot 缺 backup/store 时返回 ok:false 与原因', async () => {
  const r = await vx.runExport('backup-snapshot', { projectName: 'P' });
  assert.equal(r.ok, false);
  assert.ok(r.reason && r.reason.length > 0);
});

test('runExport report-html 生成完整独立 HTML', async () => {
  let got = '';
  const r = await vx.runExport('report-html', {
    projectName: 'P', index: { list: [], byId: {} }, checklist: {},
    exporters: { buildReportData: () => ({ title: 'T', slides: [{ layout: 'title', title: 'T', subtitle: 's' }] }) },
    downloadText: (text) => { got = text; },
  });
  assert.equal(r.ok, true);
  assert.equal(r.format, 'html');
  assert.match(got, /^<!DOCTYPE html>/);
  assert.match(got, /@media print/);
});

test('buildReportHtml：封面页带 cover 与分页类，正文 bullets 渲染为 li', () => {
  const html = vx.buildReportHtml({
    title: 'T',
    slides: [
      { layout: 'title', title: 'T', subtitle: 's' },
      { title: 'A', bullets: ['x', 'y'] },
    ],
  });
  assert.match(html, /<section class="slide cover page-break">/);
  assert.match(html, /<li>x<\/li>/);
  assert.match(html, /<li>y<\/li>/);
  assert.ok(html.indexOf('<li>y</li>') < html.indexOf('</body>'));
});

test('buildReportHtml 对标题做 HTML 转义（XSS 防御）', () => {
  const html = vx.buildReportHtml({ title: 'T', slides: [{ title: '<b>坏</b>', bullets: [] }] });
  assert.ok(html.indexOf('<b>坏</b></h2>') < 0, '标题不得以原生 HTML 注入');
  assert.ok(html.indexOf('&lt;b&gt;') >= 0);
});
