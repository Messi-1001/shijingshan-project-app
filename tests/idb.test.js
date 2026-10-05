/* tests/idb.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const idb = require('../js/core/idb.js');

test('有 IndexedDB 用 idb', () => {
  assert.equal(idb.chooseFallback({ indexedDb: true, localStorage: true }), 'idb');
});
test('无 IndexedDB 有 localStorage 用 localStorage', () => {
  assert.equal(idb.chooseFallback({ indexedDb: false, localStorage: true }), 'localStorage');
});
test('都没有则用 memory', () => {
  assert.equal(idb.chooseFallback({ indexedDb: false, localStorage: false }), 'memory');
});
test('有 IndexedDB 时即使 localStorage 不可用也用 idb', () => {
  assert.equal(idb.chooseFallback({ indexedDb: true, localStorage: false }), 'idb');
});

test('__force 强制走内存路径并给出"刷新会丢失"提示', async () => {
  const store = await idb.createBestStore({ __force: { indexedDB: false, localStorage: false } });
  assert.equal(store.degraded, true);
  assert.ok(/刷新|丢失/.test(store.reason), '内存降级必须提示刷新会丢失，实际：' + store.reason);
  assert.ok(store.reason.includes('数据管理'), '提示里应指向导出备份的入口');
});

test('__force 强制走 localStorage 路径', async () => {
  const store = await idb.createBestStore({ __force: { indexedDB: false, localStorage: true } });
  assert.equal(store.kind, 'localStorage');
});

test('__force 降级出的 store 仍满足契约', async () => {
  const store = await idb.createBestStore({ __force: { indexedDB: false, localStorage: false } });
  const r = await require('../js/core/store.js').assertStoreContract(store);
  assert.deepEqual(r.failed, []);
});
