/* tests/render-template.test.js —— 模板占位符渲染（Task 34） */
const test = require('node:test');
const assert = require('node:assert/strict');
const rt = require('../js/logic/render-template.js');

const P = { name: '某学校工程', unit: '某代建单位', landArea: '12000', buildArea: '15000',
  investEstimate: '210000000', startDate: '2026-10-01' };

test('renderText 替换已知占位符', () => {
  const out = rt.renderText('项目：{{项目名称}}，建设单位：{{建设单位}}', P, '2026-09-25');
  assert.equal(out, '项目：某学校工程，建设单位：某代建单位');
});

test('renderText 未填字段替换为下划线', () => {
  const out = rt.renderText('高度：{{建筑高度}}', P, '2026-09-25');
  assert.ok(out.includes('＿＿'));
  assert.equal(out.includes('{{'), false);
});

test('renderText 支持 {{今日}}', () => {
  assert.equal(rt.renderText('{{今日}}', P, '2026-09-25'), '2026-09-25');
});

test('fillMissing 清掉所有残留占位符', () => {
  const out = rt.fillMissing('{{不存在的字段}} 与 {{项目名称}}');
  assert.equal(out.includes('{{'), false);
});

test('listPlaceholders 返回全部占位符', () => {
  const list = rt.listPlaceholders();
  assert.ok(list.includes('{{项目名称}}'));
  assert.equal(list.length, Object.keys(rt.PLACEHOLDERS).length);
});

test('buildFilledDoc 产出完整 HTML', () => {
  const html = rt.buildFilledDoc('测试函', '致：{{建设单位}}', P);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('某代建单位'));
});

test('金额自动加千分位', () => {
  const out = rt.renderText('{{投资估算}}', P, '2026-09-25');
  assert.equal(out, '210,000,000');
});

// ── 终审 I-2：buildCopyText（复制/导出的文本构建层） ──

test('buildCopyText 无项目时保持占位清单现状', () => {
  const out = rt.buildCopyText({ fileName: '某模板.pdf' }, null, '');
  assert.ok(out.includes('【某模板.pdf】'));
  assert.ok(out.includes('{{项目名称}}'), '应保留占位符清单');
  assert.ok(out.includes('＿＿＿＿'));
});

test('buildCopyText 有项目时把 12 个占位符填成真实值（含项目名）', () => {
  const out = rt.buildCopyText({ fileName: '某模板.pdf' }, P, '2026-09-25');
  assert.ok(out.includes('某学校工程'), '应含项目名称真实值');
  assert.ok(out.includes('某代建单位'), '应含建设单位真实值');
  assert.equal(out.includes('{{'), false, '不应残留任何占位符');
});

test('buildCopyText 显示名优先用 label（终审 I-1 联动）', () => {
  const out = rt.buildCopyText(
    { fileName: '关于XX项目建议书的批复.pdf', label: '项目建议书批复（样例）' }, null, '');
  assert.ok(out.includes('【项目建议书批复（样例）】'));
  assert.equal(out.includes('关于XX项目建议书的批复'), false, 'fileName 不得进显示文本');
});

test('buildFilledDoc 导出路径：有项目时 meta 与正文含项目名', () => {
  const html = rt.buildFilledDoc('测试函', rt.listPlaceholders().join('\n'), P);
  assert.ok(html.includes('某学校工程'));
  assert.equal(html.includes('{{'), false);
});
