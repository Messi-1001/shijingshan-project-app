/* tests/graph.test.js —— 依赖图与拓扑序（纯函数） */
const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../js/logic/graph.js');

function P(id, no, prev, days) {
  return { id, no, prev: prev || [], durationDays: days === undefined ? null : days, name: id };
}

const L = [
  P('a', 1, [], 3),
  P('b', 2, ['a'], 5),
  P('c', 3, ['a'], 2),
  P('d', 4, ['b', 'c'], 1)
];

test('topoOrder 满足所有前置在前', () => {
  const o = g.topoOrder(L);
  assert.equal(o.length, 4);
  assert.ok(o.indexOf('a') < o.indexOf('b'));
  assert.ok(o.indexOf('b') < o.indexOf('d'));
  assert.ok(o.indexOf('c') < o.indexOf('d'));
});

test('topoOrder 有环返回空数组', () => {
  const cyc = [P('x', 1, ['y']), P('y', 2, ['x'])];
  assert.deepEqual(g.topoOrder(cyc), []);
});

test('descendants 找出所有下游', () => {
  assert.deepEqual(g.descendants(L, 'a').sort(), ['b', 'c', 'd']);
  assert.deepEqual(g.descendants(L, 'd'), []);
});

test('readyToStart 前置全完成才算就绪', () => {
  assert.deepEqual(g.readyToStart(L, {}), ['a']);
  assert.deepEqual(g.readyToStart(L, { a: true }).sort(), ['b', 'c']);
  assert.deepEqual(g.readyToStart(L, { a: true, b: true, c: true }), ['d']);
});

test('readyToStart 已完成的不再出现', () => {
  assert.deepEqual(g.readyToStart(L, { a: true, b: true, c: true, d: true }), []);
});

test('blockedBy 给出未满足前置', () => {
  assert.deepEqual(g.blockedBy(L, 'd', { a: true }).sort(), ['b', 'c']);
  assert.deepEqual(g.blockedBy(L, 'd', { a: true, b: true, c: true }), []);
});

test('criticalPath 求最长路径', () => {
  // a(3) → b(5) → d(1) = 9  >  a(3) → c(2) → d(1) = 6
  assert.deepEqual(g.criticalPath(L), ['a', 'b', 'd']);
});

test('buildGraph 输出结构', () => {
  const gr = g.buildGraph(L);
  assert.deepEqual(gr.edges.d, ['b', 'c']);
  assert.equal(gr.byId.c.durationDays, 2);
});
