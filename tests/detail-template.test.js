/* tests/detail-template.test.js —— 详情页挂接模板（Task 35） */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const detail = require('../js/views/v-detail.js');

test('buildTemplateSection 带出该手续的模板', () => {
  const t = H.req('js/data/templates.js');
  t.build();
  const p = H.req('js/data/procedures-07-jungong.js').find((x) => x.id === 'jg-1');
  const s = detail.buildTemplateSection(p, t);
  assert.ok(s.items.length >= 2, '档案验收应有 2 个模板');
  assert.ok(s.items.every((x) => typeof x.editable === 'boolean'));
});

test('buildTemplateSection 对手续无模板时返回空数组', () => {
  const t = H.req('js/data/templates.js');
  t.build();
  const p = H.req('js/data/procedures-05-zhaobiao.js').find((x) => x.id === 'zb-3');
  assert.deepEqual(detail.buildTemplateSection(p, t).items, []);
});

test('filledDemo 含项目名称占位符', () => {
  const t = H.req('js/data/templates.js');
  t.build();
  const p = H.req('js/data/procedures-01-lixiang.js').find((x) => x.id === 'lx-7');
  assert.ok(detail.buildTemplateSection(p, t).filledDemo.includes('{{项目名称}}') === false);
});
