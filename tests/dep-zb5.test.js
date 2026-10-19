/* tests/dep-zb5.test.js —— 第33项施工招标前置改为第7项初步设计概算审批
 *
 * 2026-10-08 用户指示：「33前置修改为7」，并确认是**只保留**第7项
 * （原前置 zb-1 招标方案审查、gh-6 施工图备案 一并去掉）。
 *
 * 连带影响需一并核查（本文件后半段即「系统冲突与矛盾」的自检清单）：
 *   · zb-1 的 prev 原本含 gh-1，zb-5 去掉 zb-1 后，zb-1 的后继变少
 *   · sg-1施工许可证 原本 prev=zb-5，zb-5 改挂 lx-7 后关键路径可能变化
 *   · 删掉 gh-6 前置后，「施工图备案 → 施工招标」这条业务约束会消失，需确认是否矛盾
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req, loadAllProcedures } = require('./_helpers.js');

const schema = req('js/data/schema.js');
const graph = req('js/logic/graph.js');
const schedule = req('js/logic/schedule.js');
const flow = req('js/logic/flow.js');
const idx = require('../js/data/procedures-index.js');
const out = idx.buildIndex([loadAllProcedures()]);
const byId = out.byId;

// —— 改动本身 ——

test('第33项 施工招标 前置只有第7项 lx-7', () => {
  assert.deepEqual(byId['zb-5'].prev, ['lx-7'],
    '第33项前置应恰为 [lx-7]，旧的 zb-1 与 gh-6 已移除');
});

test('第7项 初步设计概算审批 的前置未被误删（仍等 lx-6）', () => {
  assert.deepEqual(byId['lx-7'].prev, ['lx-6']);
});

test('第33项 的 notes 已说明新的前置依据', () => {
  assert.ok(byId['zb-5'].notes.includes('概算'), 'notes 应点明依赖初步设计概算审批：' + byId['zb-5'].notes);
});

// —— 依赖图自检：成环 / 完整性 / 可排序 / 可排期 ——

test('依赖图无环', () => {
  assert.equal(schema.hasCycle(out.list), false);
});

test('schema 全量校验零错误', () => {
  assert.deepEqual(schema.validateProcedureSet(out.list), []);
});

test('拓扑序完整（40 项全部可达）', () => {
  assert.equal(graph.topoOrder(out.list).length, 40);
});

test('拓扑序把第7项排在第33项之前', () => {
  const order = graph.topoOrder(out.list);
  assert.ok(order.indexOf('lx-7') < order.indexOf('zb-5'));
});

test('阻塞判定：第7项未办结时第33项被挡住，办结后解锁', () => {
  assert.ok(graph.blockedBy(out.list, 'zb-5', {}).includes('lx-7'));
  assert.equal(graph.blockedBy(out.list, 'zb-5', { 'lx-7': 'done' }).indexOf('lx-7'), -1);
});

// —— 矛盾自检：改动后是否出现「业务上讲不通」的依赖 ——

test('矛盾自检：第34项施工许可证仍以第33项为前置（链路未被误断）', () => {
  assert.ok(byId['sg-1'].prev.includes('zb-5'), '施工许可证须等施工招标');
});

test('矛盾自检：第33项不再被 zb-1 / gh-6 挡住', () => {
  const blocked = graph.blockedBy(out.list, 'zb-5', {});
  assert.equal(blocked.includes('zb-1'), false, '不应再等 zb-1');
  assert.equal(blocked.includes('gh-6'), false, '不应再等 gh-6');
});

test('矛盾自检：zb-1 仍是 gh-1 的后继（跨板块约束未被破坏）', () => {
  assert.ok(byId['zb-1'].prev.includes('gh-1'), 'zb-1 仍须等第15项');
});

test('矛盾自检：不存在「A 等 B，而 B 又等 A」的隐性环', () => {
  // 逐项验证每条边的两端在拓扑序中确实有序，防止漏网的环
  const order = graph.topoOrder(out.list);
  const at = (id) => order.indexOf(id);
  out.list.forEach((p) => {
    (p.prev || []).forEach((pid) => {
      assert.ok(at(pid) >= 0 && at(p.id) >= 0, '拓扑序缺 ' + pid + ' 或 ' + p.id);
      assert.ok(at(pid) < at(p.id), pid + ' 必须早于 ' + p.id + '（否则成环）');
    });
  });
});

test('矛盾自检：没有手续依赖自己', () => {
  out.list.forEach((p) => {
    assert.equal((p.prev || []).includes(p.id), false, p.id + ' 不能依赖自己');
  });
});

// —— 排期自检 ——

test('排期：正排可算且总天数为正', () => {
  const s = schedule.buildSchedule(out.list, { mode: 'forward', startDate: '2026-10-01' });
  assert.equal(s.rows.length, 40);
  assert.ok(s.totalDays > 0);
});

test('排期：倒排与关键路径不抛错', () => {
  const b = schedule.buildSchedule(out.list, { mode: 'backward', targetEndDate: '2027-10-01' });
  assert.equal(b.rows.length, 40);
  const cp = schedule.criticalPath(out.list, '2026-10-01');
  assert.ok(cp.chain.length > 0);
});

test('排期：第33项的开始日不早于第7项的完成日', () => {
  const s = schedule.buildSchedule(out.list, { mode: 'forward', startDate: '2026-10-01' });
  const m = {};
  s.rows.forEach((r) => { m[r.id] = r; });
  assert.ok(m['zb-5'].est > m['lx-7'].eft,
    '第33项须在第7项办结后才开始（实际 ' + m['zb-5'].est + ' vs ' + m['lx-7'].eft + '）');
});

// —— 流程图自检 ——

test('流程图：只画同板块相邻连线，无虚线', () => {
  const layout = flow.flowLayout(out, {});
  layout.edges.forEach((e) => assert.equal(!!e.dashed, false, e.from + '→' + e.to + ' 不该是虚线'));
});

test('流程图：第33项因跨板块前置（等第7项）出现 depNote', () => {
  const layout = flow.flowLayout(out, {});
  const n = layout.nodes.find((x) => x.id === 'zb-5');
  assert.ok(n.depNote && /7/.test(n.depNote), '第33项应标注前置第7项：' + n.depNote);
});

test('流程图：SVG 正常生成，无 NaN', () => {
  const svg = flow.buildFlowSvg(flow.flowLayout(out, {}), { statusOf: () => 'idle' });
  assert.ok(!/NaN|undefined/.test(svg));
  assert.equal(/stroke-dasharray/.test(svg), false, '不应有虚线');
});

// —— 文案自检：受影响手续都应说明清楚 ——

test('文案：第33项 notes 点明依赖第7项初步设计概算审批', () => {
  assert.ok(byId['zb-5'].notes.includes('概算'));
});