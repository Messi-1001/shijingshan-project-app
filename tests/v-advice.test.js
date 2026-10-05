/* tests/v-advice.test.js —— 建议页：adviceTone 三档映射 + collectInput 组装入参 */
const test = require('node:test');
const assert = require('node:assert/strict');
global.document = { createElement: () => ({ style: {}, classList: { add() {} }, appendChild() {}, setAttribute() {} }) };
global.window = global;
window.SJSQ = { core: { store: { get: () => null, set() {} }, dom: { h: () => ({ appendChild() {} }) } } };
const va = require('../js/views/v-advice.js');

test('adviceTone 三档映射', () => {
  assert.equal(va.adviceTone('block'), 'advice-block');
  assert.equal(va.adviceTone('warn'), 'advice-warn');
  assert.equal(va.adviceTone('info'), 'advice-info');
  assert.equal(va.adviceTone('乱写'), 'advice-info');
});

// G21：Store 是「表 + id」接口，这里的最小 mock 与 Task 5 的契约保持一致。
function mockStore(meta) {
  const m = meta || {};
  return {
    get: async (table, id) => (table === 'meta' && id in m ? { id: id, value: m[id] } : null),
    list: async () => [],
  };
}

test('collectInput 从空 store 也能组装出合法入参', async () => {
  const inp = await va.collectInput(mockStore());
  assert.ok(inp.checklist && typeof inp.checklist === 'object');
  assert.ok(inp.scheduleInput && inp.scheduleInput.mode);
  assert.equal(inp.hasEstimate, false);
});

test('collectInput 在 meta 表有估算时置 hasEstimate', async () => {
  const inp = await va.collectInput(mockStore({ estimateInput: { 工程费用: 20000 } }));
  assert.equal(inp.hasEstimate, true);
});

test('collectInput 把 checklist 行表聚成 map', async () => {
  const s = {
    get: async () => null,
    list: async (t) => (t === 'checklist' ? [{ id: 'lx-1', status: 'done' }, { id: 'yd-1', status: 'todo' }] : []),
  };
  const inp = await va.collectInput(s);
  assert.equal(inp.checklist['lx-1'].status, 'done');
  assert.equal(Object.keys(inp.checklist).length, 2);
});
