/* tests/dep-rewrite.test.js —— 依赖倒挂修正契约（2026-10-08 业务口径修正）
 *
 * 修正缘由：原数据把「多规合一初审意见（gh-1，第15项）」设成「用地预审与选址意见书
 * （yd-3，第10项）」的前置，与实际业务口径相反。业务上应当是：
 *   1A方案：gh-1 无前置（可先行启动）
 *   yd-3（第10项）必须在 gh-1（第15项）之后办理
 *   lx-2（第2项 评审公司评审）必须在 gh-1（第15项）之后办理
 *   lx-3（第3项 上市发改委主任会）显式挂 gh-1，让清单上一眼可见而非靠转手推导
 *
 * 注意：gh-1 的前置必须清空。否则 yd-3 与 gh-1 互为前置 → 成环 →
 * schema 校验报错、拓扑序返回空、排期直接抛错。
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

// —— 用户口径的三条 + 一条显式化 ——

test('1A：第15项 多规合一初审意见 前置已清空（不再被第10项卡住）', () => {
  assert.deepEqual(byId['gh-1'].prev, [], 'gh-1 必须无前置，否则与 yd-3 互为前置成环');
});

test('第10项 用地预审与选址意见书 前置包含第15项 gh-1', () => {
  assert.ok(byId['yd-3'].prev.includes('gh-1'), 'yd-3 必须等 gh-1 办完');
  assert.ok(byId['yd-3'].prev.includes('yd-2'), 'yd-3 仍须保留原有的 yd-2');
  assert.equal(byId['yd-3'].prev.length, 2);
});

test('第2项 评审公司评审 不依赖第15项（2026-10-08 用户更正）', () => {
  // 用户更正：第15项与第2项无关系，只有第3项要等第15项。
  // 之前误给 lx-2 加了 gh-1，此处断言它已被移除。
  assert.equal(byId['lx-2'].prev.includes('gh-1'), false,
    'lx-2 不应依赖 gh-1 —— 第15项与评审公司评审无关');
  assert.deepEqual(byId['lx-2'].prev, ['lx-1'], 'lx-2 只须等 lx-1');
});

test('第3项 上市发改委主任会 显式挂第15项 gh-1（清单上一眼可见，不靠转手）', () => {
  assert.ok(byId['lx-3'].prev.includes('gh-1'), 'lx-3 须显式声明对 gh-1 的依赖');
  assert.ok(byId['lx-3'].prev.includes('lx-2'), 'lx-3 仍须保留原有的 lx-2');
});

test('原有依赖未被误删：① A/B 段严格先后 1→7 仍在', () => {
  const chain = ['lx-1', 'lx-2', 'lx-3', 'lx-4', 'lx-5', 'lx-6', 'lx-7'];
  chain.forEach((id, i) => {
    if (i === 0) return;                       // lx-1 是起点，无前置
    assert.ok(byId[id].prev.includes(chain[i - 1]), id + ' 须等 ' + chain[i - 1]);
  });
  assert.deepEqual(byId['lx-1'].prev, [], 'lx-1 仍应是起点');
});

test('原有依赖未被误删：③ 规划报建 gh-1→gh-6 仍严格串联', () => {
  ['gh-2', 'gh-3', 'gh-4', 'gh-5', 'gh-6'].forEach((id, i) => {
    const prev = 'gh-' + (i + 1);
    assert.ok(byId[id].prev.includes(prev), id + ' 须等 ' + prev);
  });
});

test('原有依赖未被误删：④ 招标 zb-1 仍以 gh-1 为前置', () => {
  assert.ok(byId['zb-1'].prev.includes('gh-1'), 'zb-1 须等 gh-1');
});

// —— 成环与完整性：这是本次修正最大的风险点，必须锁死 ——

test('修正后无环环：schema.hasCycle 为 false', () => {
  assert.equal(schema.hasCycle(out.list), false, '依赖成环会让排期与拓扑序全部失效');
});

test('修正后全量 schema 校验零错误', () => {
  assert.deepEqual(schema.validateProcedureSet(out.list), []);
});

test('修正后拓扑序完整：40 项全部可达', () => {
  const order = graph.topoOrder(out.list);
  assert.equal(order.length, 40, '拓扑序必须含全部手续');
  assert.equal(new Set(order).size, 40, '不得有重复');
});

test('拓扑序确实把 gh-1 排在 yd-3 与 lx-3 之前', () => {
  const order = graph.topoOrder(out.list);
  const at = (id) => order.indexOf(id);
  assert.ok(at('gh-1') < at('yd-3'), 'gh-1 必须早于 yd-3');
  assert.ok(at('gh-1') < at('lx-3'), 'gh-1 必须早于 lx-3');
  assert.ok(at('lx-2') < at('lx-3'), 'lx-2 必须早于 lx-3');
  // 更正：lx-2 与 gh-1 无先后关系，拓扑序不强制谁先
});

test('排期可算：正排不抛错，且总天数为正', () => {
  const s = schedule.buildSchedule(out.list, { mode: 'forward', startDate: '2026-10-01' });
  assert.equal(s.rows.length, 40);
  assert.ok(s.totalDays > 0, '总天数应为正');
});

test('排期可算：倒排与关键路径均不抛错', () => {
  const back = schedule.buildSchedule(out.list, { mode: 'backward', targetEndDate: '2027-10-01' });
  assert.equal(back.rows.length, 40);
  const cp = schedule.criticalPath(out.list, '2026-10-01');
  assert.ok(cp.chain.length > 0, '关键路径不应为空');
});

test('就绪判定：gh-1 一开始就可启动（无前置）', () => {
  const ready = graph.readyToStart(out.list, {});
  assert.ok(ready.includes('gh-1'), 'gh-1 无前置，应立刻可办');
});

test('阻塞判定：gh-1 未办结时 yd-3 / lx-3 被挡住；lx-2 不受其影响', () => {
  const none = {};
  assert.ok(graph.blockedBy(out.list, 'yd-3', none).includes('gh-1'), '第10项须等 gh-1');
  assert.ok(graph.blockedBy(out.list, 'lx-3', none).includes('gh-1'), '第3项须等 gh-1');
  // 更正：第2项与第15项无关，不该被 gh-1 挡住
  assert.equal(graph.blockedBy(out.list, 'lx-2', none).indexOf('gh-1'), -1,
    '第2项不应被 gh-1 挡住');

  const gh1Done = { 'gh-1': 'done' };
  assert.equal(graph.blockedBy(out.list, 'yd-3', gh1Done).indexOf('gh-1'), -1,
    'gh-1 办结后，第10项不应再被它挡住');
});
// —— 流程图复核（2026-10-08 用户决策后重做）——
// 决策：① 跨板块前置关系不画连线，改在节点文字里写明；② 板块内跳格也不画连线。
// 依据：一条跨板块线最长横跨1600px，是正常连线(23px)的 78 倍，视觉上比"没有线"更易误读。

test('流程图：节点 40、板块 7、画布非退化', () => {
  const layout = flow.flowLayout(out, {});
  assert.equal(layout.nodes.length, 40);
  assert.equal(layout.bands.length, 7);
  assert.ok(layout.width > 500 && layout.height > 300);
});

test('流程图：只画「板块内且相邻」的前置连线，其余一律不画', () => {
  const layout = flow.flowLayout(out, {});
  const pos = {};
  layout.nodes.forEach((n) => { pos[n.id] = n; });
  const step = layout.NODE.w + layout.NODE.gapX;
  layout.edges.forEach((e) => {
    const a = pos[e.from], b = pos[e.to];
    assert.equal(a.section, b.section,
      e.from + '→' + e.to + ' 是跨板块关系，不应画连线（应在文字里说明）');
    const jump = Math.abs(Math.round((b.x - a.x) / step));
    assert.equal(jump, 1,
      e.from + '→' + e.to + ' 跳了 ' + jump + ' 格，不应画连线（靠编号顺序理解）');
  });
});

test('流程图：连线全部为实线，且总数大幅减少', () => {
  const layout = flow.flowLayout(out, {});
  assert.ok(layout.edges.length <= 20,
    '连线数应大幅减少（实际 ' + layout.edges.length + '），不该再有绕圈虚线');
  layout.edges.forEach((e) => {
    assert.equal(!!e.dashed, false, '不应再有虚线：' + e.from + '→' + e.to);
  });
});

test('流程图：跨板块前置关系写进节点 depNote，不再靠连线表达', () => {
  const layout = flow.flowLayout(out, {});
  const at = (id) => layout.nodes.find((n) => n.id === id);
  assert.match(at('yd-3').depNote, /15/, '第10项应标明要等第15项');
  assert.match(at('lx-3').depNote, /15/, '第3项应标明要等第15项');
  // 更正：第2项与第15项无关，不能出现 15
  assert.equal(/15/.test(at('lx-2').depNote || ''), false,
    '第2项与第15项无关，不应标注第15项');
});

test('流程图：depNote 只标跨板块前置，同板块内不标（避免冗余）', () => {
  const layout = flow.flowLayout(out, {});
  const pos = {};
  layout.nodes.forEach((n) => { pos[n.id] = n; });
  layout.nodes.forEach((n) => {
    const src = out.list.find((p) => p.id === n.id);
    const prev = (src && src.prev) || [];
    const cross = prev.filter((pid) => pos[pid] && pos[pid].section !== n.section);
    if (!cross.length) {
      assert.equal(n.depNote, '', n.id + ' 无跨板块前置，不该有 depNote：' + n.depNote);
    }
  });
});

test('流程图：旧的倒挂边 yd-3 → gh-1 已不存在', () => {
  const layout = flow.flowLayout(out, {});
  assert.equal(layout.edges.find((e) => e.from === 'yd-3' && e.to === 'gh-1'), undefined);
});

test('流程图：SVG 含板块中文标签与前置文字说明，且无 NaN', () => {
  const layout = flow.flowLayout(out, { sectionLabels: schema.SECTIONS });
  const svg = flow.buildFlowSvg(layout, { statusOf: () => 'idle' });
  assert.match(svg, /^<svg/);
  assert.match(svg, /前期立项/, '板块标题应为中文标签');
  assert.match(svg, /前置/, '应渲染出跨板块依赖的文字说明');
  assert.ok(!/NaN|undefined/.test(svg));
  assert.equal(/stroke-dasharray/.test(svg), false, '不应再有虚线');
});

test('文案：gh-1 / yd-3 / lx-3 的 notes 均说明了这层依赖依据', () => {
  ['gh-1', 'yd-3', 'lx-3'].forEach((id) => {
    assert.ok(byId[id].notes && byId[id].notes.length > 0, id + ' 缺 notes');
    assert.ok(byId[id].notes.includes('多规合一'), id + ' 的 notes 应点明依赖的是多规合一初审意见');
  });
});
test('文案：gh-1 / yd-3 / lx-3 的 notes 均说明了这层依赖依据', () => {
  ['gh-1', 'yd-3', 'lx-3'].forEach((id) => {
    assert.ok(byId[id].notes && byId[id].notes.length > 0, id + ' 缺 notes');
    assert.ok(byId[id].notes.includes('多规合一'), id + ' 的 notes 应点明依赖的是多规合一初审意见');
  });
});
