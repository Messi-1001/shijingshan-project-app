/* tests/store.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../js/core/store.js');

test('MemoryStore 基本读写', async () => {
  const s = store.createMemoryStore();
  assert.equal(s.kind, 'memory');
  assert.equal(await s.get('projects', 'p-1'), null);
  const saved = await s.put('projects', { id: 'p-1', name: 'A' });
  assert.equal(saved.name, 'A');
  assert.equal((await s.get('projects', 'p-1')).name, 'A');
});

test('MemoryStore put 返回深拷贝，外部改动不影响仓内', async () => {
  const s = store.createMemoryStore();
  const obj = { id: 'p-1', name: 'A' };
  await s.put('projects', obj);
  obj.name = '改过了';
  assert.equal((await s.get('projects', 'p-1')).name, 'A');
});

test('MemoryStore list / remove / clear', async () => {
  const s = store.createMemoryStore();
  await s.put('projects', { id: 'p-1' });
  await s.put('projects', { id: 'p-2' });
  assert.equal((await s.list('projects')).length, 2);
  assert.equal(await s.remove('projects', 'p-1'), true);
  assert.equal(await s.remove('projects', 'p-1'), false);
  assert.equal((await s.list('projects')).length, 1);
  await s.clear('projects');
  assert.deepEqual(await s.list('projects'), []);
});

test('put 缺 id 抛错', async () => {
  const s = store.createMemoryStore();
  await assert.rejects(() => s.put('projects', { name: '无 id' }), /id/);
});

test('assertStoreContract 对合规实现全通过', async () => {
  const r = await store.assertStoreContract(store.createMemoryStore());
  assert.deepEqual(r.failed, []);
  assert.ok(r.passed.length >= 6);
});
