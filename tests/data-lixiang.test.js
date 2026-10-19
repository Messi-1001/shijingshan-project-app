/* tests/data-lixiang.test.js —— ① 前期立项 7 步数据契约 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req } = require('./_helpers.js');
const schema = req('js/data/schema.js');

const lixiang = req('js/data/procedures-01-lixiang.js');

test('① 前期立项：共 7 条，id 与编号连续', () => {
  assert.equal(lixiang.length, 7);
  assert.deepEqual(lixiang.map((p) => p.id), ['lx-1', 'lx-2', 'lx-3', 'lx-4', 'lx-5', 'lx-6', 'lx-7']);
  assert.deepEqual(lixiang.map((p) => p.no), [1, 2, 3, 4, 5, 6, 7]);
  lixiang.forEach((p) => assert.equal(p.section, 'lixiang'));
});

test('① A 段（1–4）与 B 段（5–6）严格先后：prev 逐条串联', () => {
  assert.deepEqual(lixiang[0].prev, []);
  // lx-2 / lx-3 除紧跟前项外，另显式挂 gh-1（多规合一初审意见，2026-10-08 修正），
  // 故用 includes 而非 deepEqual 断言；关键在于「紧跟前项」这一条没被破坏。
  for (let i = 1; i < 6; i++) {
    assert.ok(lixiang[i].prev.includes(lixiang[i - 1].id),
      lixiang[i].id + ' 必须紧跟 ' + lixiang[i - 1].id);
  }
  assert.deepEqual(lixiang[6].prev, ['lx-6']);
});

test('① lx-3 显式依赖 gh-1；lx-2 不依赖（2026-10-08 用户更正）', () => {
  assert.ok(lixiang[2].prev.includes('gh-1'), 'lx-3 上主任会须显式挂 gh-1');
  assert.equal(lixiang[1].prev.includes('gh-1'), false,
    'lx-2 评审公司评审与第15项无先后关系');
  assert.deepEqual(lixiang[1].prev, ['lx-1']);
  assert.ok(lixiang[1].notes.includes('无先后关系'), 'lx-2 的 notes 应说明与第15项无关');
  assert.ok(lixiang[2].notes.includes('多规合一'));
});

test('① A 段为线下实操口径（非正式环节），不得出现「项目储备入库」', () => {
  assert.equal(lixiang[0].basis.includes('实操惯例'), true);
  assert.equal(JSON.stringify(lixiang).includes('项目储备入库'), false);
});

test('① 关键形态字段', () => {
  const lx5 = lixiang[4];
  assert.equal(lx5.name, '区发改委批复');
  assert.equal(lx5.platform, 'tzxm');
  assert.ok(lx5.templates.includes('tpl-lixiang-shiqing'));
  const lx7 = lixiang[6];
  assert.equal(lx7.name, '初步设计概算审批');
  assert.equal(lx7.durationDays, 44);
  assert.deepEqual(lx7.templates, ['tpl-gaisuan-qingshi', 'tpl-gaisuan-wenben', 'tpl-gaisuan-moban']);
  lixiang.forEach((p) => assert.equal(p.source, '✅'));
  lixiang.forEach((p) => assert.ok(p.notes.length > 0));
  lixiang.forEach((p) => p.materials.forEach((m) => assert.ok(m.name && m.copies >= 1)));
});

test('① 通过 schema.validateProcedureSet 契约（当前已录板块累计 1–7）', () => {
  // 本板块现在引用了外部 id（gh-1），validateProcedureSet 会报「前置手续不存在」，
  // 故只断言本板块内部契约（编号/环/字段），对外引用在全套校验里覆盖。
  const errs = schema.validateProcedureSet(lixiang);
  assert.deepEqual(errs.filter((e) => e.indexOf('前置手续不存在') === -1), [],
    'lixiang 板块不得有编号/环/字段类错误');
  // 全量清单（1–40 编号连续）必须零错误——这是对外引用的真正校验
  assert.deepEqual(schema.validateProcedureSet(
    require('./_helpers.js').loadAllProcedures()), []);
});
