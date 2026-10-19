/* tests/yd1-rename.test.js —— 第8项改名为「与土地开发单位签订土地移交协议」
 *
 * 2026-10-08 用户指示：第8项改为「与土地开发单位签订土地移交协议」。
 * 连带口径（用户两项确认）：
 *   ① 名称/文案用「土地开发单位」，但**法定术语「一级开发单位」在别处保留**（如依据、材料提供方）；
 *   ② 驳回理由 r-012（用地范围坐标）、r-013（用地权属证明）与「签协议」对不上，
 *      **从第8项移除**，另加一条协议类驳回理由。
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req, loadAllProcedures } = require('./_helpers.js');

const idx = require('../js/data/procedures-index.js');
const out = idx.buildIndex([loadAllProcedures()]);
const byId = out.byId;
const yd1 = byId['yd-1'];

const rr = req('js/data/reject-reasons.js');

// —— 名称改动 ——

test('第8项 名称已改为「与土地开发单位签订土地移交协议」', () => {
  assert.equal(yd1.name, '与土地开发单位签订土地移交协议');
  assert.equal(yd1.no, 8, '编号仍是第8项');
  assert.equal(yd1.section, 'yongdi', '仍在② 用地手续板块');
  assert.equal(yd1.id, 'yd-1', 'id 不变（避免破坏既有引用）');
});

test('第8项 旧名称在全库已无残留', () => {
  const dump = JSON.stringify(out.list);
  assert.equal(dump.includes('取得一级开发单位划拨土地'), false,
    '旧名称「取得一级开发单位划拨土地」仍残留在数据中');
});

test('第8项 文案已围绕「签订移交协议」重写', () => {
  assert.ok(yd1.notes.includes('协议'), 'notes 应点明协议：' + yd1.notes);
  assert.ok(yd1.notes.includes('移交'), 'notes 应点明移交：' + yd1.notes);
  assert.equal(yd1.notes.includes('划拨土地'), false,
    'notes 不应再提「划拨土地」（那是取得结果，不是签约动作）');
});

test('第8项 材料改为协议类文件', () => {
  const names = yd1.materials.map((m) => m.name).join('|');
  assert.match(names, /协议/, '材料应为协议类文件，实际：' + names);
  assert.equal(names.includes('一级开发土地移交确认单'), false,
    '材料名应从「确认单」改为「协议」');
});

test('第8项 法定术语「一级开发单位」在依据/提供方中保留', () => {
  // 用户口径：名称用「土地开发单位」，但法定术语在依据等处保留
  assert.ok(yd1.basis.includes('一级开发'), '依据应保留法定术语「一级开发」：' + yd1.basis);
  assert.ok(yd1.materials.some((m) => m.provider.includes('一级开发单位')),
    '材料提供方应保留「一级开发单位」');
});

// —— 连带冲突：驳回理由 ——

test('r-012（用地范围坐标）已从第8项移除', () => {
  const r12 = rr.REASONS.find((r) => r.id === 'r-012');
  assert.ok(r12, 'r-012 应仍存在（yd-2/yd-3/yd-4/gh-1/gh-2 还需它）');
  assert.equal(r12.appliesTo.includes('yd-1'), false,
    '「用地范围坐标」与签订移交协议无关，不应挂在第8项');
  // 其他项仍需保留
  ['yd-2', 'yd-3', 'yd-4'].forEach((id) =>
    assert.ok(r12.appliesTo.includes(id), 'r-012 仍应适用于 ' + id));
});

test('r-013（用地权属证明）已从第8项移除', () => {
  const r13 = rr.REASONS.find((r) => r.id === 'r-013');
  assert.ok(r13, 'r-013 应仍存在');
  assert.equal(r13.appliesTo.includes('yd-1'), false,
    '「用地权属证明」属审批事项，不应挂在签订协议这一步');
  ['yd-2', 'yd-3', 'yd-4'].forEach((id) =>
    assert.ok(r13.appliesTo.includes(id), 'r-013 仍应适用于 ' + id));
});

test('新增协议类驳回理由并适用于第8项', () => {
  const proto = rr.REASONS.filter((r) => r.appliesTo.includes('yd-1'));
  assert.ok(proto.length >= 1, '第8项应至少挂1 条驳回理由，实际 ' + proto.length);
  proto.forEach((p) => {
    assert.match(p.reason, /协议|移交/, '理由应与协议/移交相关：' + p.reason);
    assert.ok(p.fix && p.avoid, p.id + ' 须含 fix 与 avoid');
    assert.ok(p.category, p.id + ' 须填 category');
  });
  // 覆盖签约的两个主要风险面：内容（范围面积）与材料（盖章附件）
  const cats = proto.map((p) => p.category);
  assert.ok(cats.includes('内容类') && cats.includes('材料类'),
    '应同时覆盖内容类与材料类，实际：' + cats.join('、'));
  // 新增的这两条不得挂在其他手续上（避免连带影响）
  proto.forEach((p) => assert.deepEqual(p.appliesTo, ['yd-1'],
    p.id + ' 应仅适用于第8项，实际 ' + JSON.stringify(p.appliesTo)));
});

// —— 全库一致性：改名后不得留下自相矛盾的表述 ——

test('矛盾自检：第8项材料口径一致（协议正本 + 附件）', () => {
  assert.match(yd1.name, /协议/);
  // 主件必须是协议；附件（如验收意见）不必含「协议」二字
  const names = yd1.materials.map((m) => m.name);
  assert.ok(names.some((n) => /协议/.test(n)), '须有协议正本：' + names.join('|'));
  assert.equal(names.indexOf('一级开发土地移交确认单'), -1, '旧「确认单」应已替换');
});

test('矛盾自检：第9项的前置仍指向第8项（链条未断）', () => {
  assert.ok(byId['yd-2'].prev.includes('yd-1'), '第9项钉桩须等第8项');
});

test('矛盾自检：第8项仍是起点（无前置）', () => {
  assert.deepEqual(yd1.prev, []);
});

test('矛盾自检：全库无「一级开发单位划拨土地」这一旧表述残留', () => {
  const dump = JSON.stringify(out.list);
  ['取得一级开发单位划拨土地', '一级开发土地移交确认单'].forEach((s) =>
    assert.equal(dump.includes(s), false, '旧表述「' + s + '」仍在库中'));
});

test('矛盾自检：数据校验零错误、拓扑完整、排期可算', () => {
  const schema = req('js/data/schema.js');
  const graph = req('js/logic/graph.js');
  const schedule = req('js/logic/schedule.js');
  assert.equal(schema.hasCycle(out.list), false);
  assert.deepEqual(schema.validateProcedureSet(out.list), []);
  assert.equal(graph.topoOrder(out.list).length, 40);
  const s = schedule.buildSchedule(out.list, { mode: 'forward', startDate: '2026-10-01' });
  assert.equal(s.rows.length, 40);
  assert.ok(s.totalDays > 0);
});