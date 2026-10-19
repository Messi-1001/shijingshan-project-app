/* tests/data-yongdi.test.js —— ② 用地手续 7 项数据契约 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req } = require('./_helpers.js');
const schema = req('js/data/schema.js');

const yongdi = req('js/data/procedures-02-yongdi.js');

test('② 用地：共 7 条，编号 8–14', () => {
  assert.equal(yongdi.length, 7);
  assert.deepEqual(yongdi.map((p) => p.id), ['yd-1', 'yd-2', 'yd-3', 'yd-4', 'yd-5', 'yd-6', 'yd-7']);
  assert.deepEqual(yongdi.map((p) => p.no), [8, 9, 10, 11, 12, 13, 14]);
  yongdi.forEach((p) => assert.equal(p.section, 'yongdi'));
});

test('② 主线串联：yd-1→yd-2→…→yd-7', () => {
  assert.deepEqual(yongdi[0].prev, []);
  // yd-3 除紧跟 yd-2 外，另加 gh-1（2026-10-08 修正：须等多规合一初审意见办结），
  // 故用 includes 断言，紧跟前项这一条仍被严格锁住。
  for (let i = 1; i < yongdi.length; i++) {
    assert.ok(yongdi[i].prev.includes(yongdi[i - 1].id),
      yongdi[i].id + ' 必须紧跟 ' + yongdi[i - 1].id);
  }
});

test('② yd-3 依赖 gh-1（第15项 多规合一初审意见），编号靠前但办理在后', () => {
  assert.ok(yongdi[2].prev.includes('gh-1'), 'yd-3 须等 gh-1 办结');
  assert.ok(yongdi[2].notes.includes('多规合一'));
});

test('② 已确认不列入建设用地规划许可证、不要求产权证，不得自行补回', () => {
  const s = JSON.stringify(yongdi);
  assert.equal(s.includes('建设用地规划许可证'), false);
  assert.equal(s.includes('不动产权'), false);
  assert.ok(yongdi[6].notes.includes('不要求办理产权证'));
});

test('② 新增钉桩（v2.1 遗漏补入），其余形态字段', () => {
  assert.equal(yongdi[1].name, '钉桩（规划用地测量条件 → 钉桩测量成果报告）');
  assert.equal(yongdi[1].source, '🆕');
  assert.equal(yongdi[6].name, '国有土地划拨手续');
  assert.equal(yongdi[5].platform, 'tzxm');
  yongdi.forEach((p) => p.materials.forEach((m) => assert.ok(m.name && m.copies >= 1)));
  yongdi.forEach((p) => assert.ok(p.notes.length > 0));
});

test('② 通过 schema.validateProcedureSet 契约（累计 ①+② = 1–14）', () => {
  // yd-3 的 prev 引用 gh-1（属③ 规划报建板块），故须一并加载该板块才能校验。
  const all = req('js/data/procedures-01-lixiang.js')
    .concat(yongdi)
    .concat(req('js/data/procedures-03-guihua.js'));
  assert.deepEqual(schema.validateProcedureSet(all), []);
});
