/* tests/flow.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const flow = require('../js/logic/flow.js');

const INDEX = {
  list: [
    { id: 'lx-1', no: '1', name: '项目建议书', section: '① 立项', prev: [] },
    { id: 'lx-2', no: '2', name: '项目建议书批复', section: '① 立项', prev: ['lx-1'] },
    { id: 'yd-1', no: '3', name: '用地预审', section: '② 用地', prev: ['lx-2'] },
  ],
};

test('三个节点各就位', () => {
  const l = flow.flowLayout(INDEX);
  assert.equal(l.nodes.length, 3);
  assert.ok(l.nodes.every((n) => n.x >= 0 && n.y >= 0 && n.w > 0 && n.h > 0));
});

test('节点都在画布内', () => {
  const l = flow.flowLayout(INDEX);
  l.nodes.forEach((n) => {
    assert.ok(n.x + n.w <= l.width, n.id + ' 右越界');
    assert.ok(n.y + n.h <= l.height, n.id + ' 下越界');
  });
});

test('同一板块 Y 相同、不同板块 Y 不同', () => {
  const l = flow.flowLayout(INDEX);
  const m = Object.fromEntries(l.nodes.map((n) => [n.id, n]));
  assert.equal(m['lx-1'].y, m['lx-2'].y);
  assert.notEqual(m['lx-1'].y, m['yd-1'].y);
});

test('板块内按编号从左到右', () => {
  const l = flow.flowLayout(INDEX);
  const m = Object.fromEntries(l.nodes.map((n) => [n.id, n]));
  assert.ok(m['lx-2'].x > m['lx-1'].x);
});

test('只画「同板块且相邻」的连线：跨板块/ 跳格一律不画', () => {
  const l = flow.flowLayout(INDEX);
  // INDEX：lx-2(prev lx-1，同板块相邻) + yd-1(prev lx-2，跨板块) → 只应画1 条
  assert.equal(l.edges.length, 1);
  assert.equal(l.edges[0].from, 'lx-1');
  assert.equal(l.edges[0].to, 'lx-2');
  assert.ok(l.edges.every((e) => e.d.startsWith('M')));
  assert.ok(l.edges.every((e) => !e.dashed), '不再有虚线');
});

test('bands 与板块一一对应', () => {
  const l = flow.flowLayout(INDEX);
  assert.deepEqual(l.bands.map((b) => b.section), ['① 立项', '② 用地']);
});

test('跨板块前置关系写进 depNote 文字，不画连线', () => {
  const l = flow.flowLayout(INDEX);
  const yd1 = l.nodes.find((n) => n.id === 'yd-1');
  assert.match(yd1.depNote, /前置.*第/);
  assert.match(yd1.depNote, /lx|立项|项目建议书|批复/);
});

test('edgePath 只产出一条水平线段', () => {
  const d = flow.edgePath({ x: 0, y: 10, w: 100, h: 40 }, { x: 200, y: 10, w: 100, h: 40 });
  assert.equal(typeof d, 'string', 'edgePath 现在直接返回路径字符串');
  assert.ok(!d.includes('V'), '不应有竖段');
  assert.ok(d.startsWith('M100 30'), '应从起点右缘出发：' + d);
});

test('buildFlowSvg 产出合法 SVG 根元素与 viewBox', () => {
  const svg = flow.buildFlowSvg(flow.flowLayout(INDEX));
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox="0 0 '));
  assert.ok(svg.includes('</svg>'));
  assert.ok(!svg.includes('foreignObject'), '禁用 foreignObject');
});

test('buildFlowSvg 按状态上色', () => {
  const svg = flow.buildFlowSvg(flow.flowLayout(INDEX), { statusOf: (id) => (id === 'lx-1' ? 'done' : 'idle') });
  assert.ok(svg.includes(flow.TONE.done));
});

test('SVG 文本已转义', () => {
  const idx = { list: [{ id: 'x', no: '1', name: 'A & B <C>', section: 'S', prev: [] }] };
  const svg = flow.buildFlowSvg(flow.flowLayout(idx));
  assert.ok(svg.includes('A &amp; B &lt;C&gt;'));
});
