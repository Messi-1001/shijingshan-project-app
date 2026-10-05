/* tests/backup.test.js —— Task 57：备份导出 / 校验导入 / 回滚 / 孤儿行清理 */
const test = require('node:test');
const assert = require('node:assert/strict');
const b = require('../js/logic/backup.js');

// G21：与 Task 5 的 Store 契约完全一致——「表 + id」，没有 set/keys。
function mockStore(init) {
  const t = {};
  Object.keys(init || {}).forEach((name) => {
    t[name] = {};
    (init[name] || []).forEach((row) => { t[name][row.id] = row; });
  });
  function tab(n) { t[n] = t[n] || {}; return t[n]; }
  return {
    _t: t,
    get: async (table, id) => tab(table)[id] || null,
    list: async (table) => Object.keys(tab(table)).map((k) => tab(table)[k]),
    put: async (table, obj) => { tab(table)[obj.id] = obj; return obj; },
    remove: async (table, id) => { const had = id in tab(table); delete tab(table)[id]; return had; },
    clear: async (table) => { t[table] = {}; },
  };
}

test('导出快照只含受管表与白名单 meta', async () => {
  const s = mockStore({
    projects: [{ id: 'p-1', name: 'A' }],
    checklist: [{ id: 'p-1::lx-1', status: 'done' }],
    meta: [{ id: 'scheduleInput', value: { mode: 'forward' } }, { id: '__internal', value: 1 }],
    secrets: [{ id: 'x', value: '不应被导出' }],
  });
  const snap = await b.exportSnapshot(s);
  assert.equal(snap.version, b.BACKUP_VERSION);
  assert.equal(snap.tables.projects.length, 1);
  assert.equal(snap.tables.checklist.length, 1);
  assert.equal(snap.tables.checklist[0].id, 'p-1::lx-1');
  assert.equal(snap.tables.meta.length, 1);
  assert.equal(snap.tables.meta[0].id, 'scheduleInput');
  assert.equal('secrets' in snap.tables, false);
  assert.match(snap.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('导出快照兼容 custom-templates 的 {id, list} 顶层形态', async () => {
  const s = mockStore({
    meta: [{ id: 'custom-templates', list: [{ id: 'tpl-custom-1', fileName: 'x.pdf' }] }],
  });
  const snap = await b.exportSnapshot(s);
  assert.equal(snap.tables.meta.length, 1);
  assert.deepEqual(snap.tables.meta[0].list, [{ id: 'tpl-custom-1', fileName: 'x.pdf' }]);
});

test('validateSnapshot 通过合法快照', async () => {
  const s = mockStore({ checklist: [{ id: 'lx-1', status: 'done' }] });
  const snap = await b.exportSnapshot(s);
  assert.deepEqual(b.validateSnapshot(snap), { ok: true, errors: [] });
});

test('validateSnapshot 拒绝版本不符', () => {
  const r = b.validateSnapshot({ version: 999, tables: {} });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /版本/.test(e)));
});

test('validateSnapshot 拒绝非对象 / null', () => {
  assert.equal(b.validateSnapshot(null).ok, false);
  assert.equal(b.validateSnapshot('x').ok, false);
  assert.equal(b.validateSnapshot([]).ok, false);
});

test('validateSnapshot 拒绝缺 tables', () => {
  assert.equal(b.validateSnapshot({ version: b.BACKUP_VERSION }).ok, false);
});

test('validateSnapshot 拒绝未知表名', () => {
  const r = b.validateSnapshot({ version: b.BACKUP_VERSION, tables: { hack: [] } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /未知表/.test(e)));
});

test('importSnapshot merge 逐行覆盖，不删其他行', async () => {
  const s = mockStore({ checklist: [{ id: 'lx-1', status: 'done' }], projects: [{ id: 'p-1', name: 'A' }] });
  const r = await b.importSnapshot(s, { version: b.BACKUP_VERSION, tables: { checklist: [{ id: 'lx-2', status: 'todo' }] } }, { mode: 'merge' });
  assert.equal((await s.list('checklist')).length, 2);
  assert.equal((await s.get('checklist', 'lx-1')).status, 'done');
  assert.equal((await s.get('checklist', 'lx-2')).status, 'todo');
  assert.equal((await s.list('projects')).length, 1);
  assert.deepEqual(r.written, ['checklist']);
});

test('importSnapshot replace 清空受管表后再写', async () => {
  const s = mockStore({ checklist: [{ id: 'lx-1' }], projects: [{ id: 'p-1' }], meta: [{ id: 'scheduleInput', value: { mode: 'forward' } }] });
  await b.importSnapshot(s, { version: b.BACKUP_VERSION, tables: { checklist: [{ id: 'lx-2' }] } }, { mode: 'replace' });
  assert.equal((await s.list('checklist')).length, 1);
  assert.equal(await s.get('checklist', 'lx-1'), null);
  assert.equal((await s.list('projects')).length, 0);
  assert.equal(await s.get('meta', 'scheduleInput'), null);
});

test('importSnapshot replace 不吞掉白名单外的 meta 行', async () => {
  const s = mockStore({ meta: [{ id: 'x-keep', value: 1 }, { id: 'scheduleInput', value: { mode: 'forward' } }] });
  await b.importSnapshot(s, { version: b.BACKUP_VERSION, tables: { meta: [{ id: 'estimateInput', value: { 工程费用: 1 } }] } }, { mode: 'replace' });
  assert.ok(await s.get('meta', 'x-keep'), '白名单外的 meta 行应保留');
  assert.equal(await s.get('meta', 'scheduleInput'), null, '白名单内的 meta 行应被清掉');
  assert.ok(await s.get('meta', 'estimateInput'));
});

test('importSnapshot 遇未知表直接拒绝，绝不部分写入', async () => {
  const s = mockStore({ checklist: [{ id: 'lx-1', status: 'done' }] });
  await assert.rejects(
    () => b.importSnapshot(s, { version: b.BACKUP_VERSION, tables: { checklist: [{ id: 'lx-9' }], secrets: [{ id: 'x' }] } }),
    /未知表/,
  );
  assert.equal((await s.list('checklist')).length, 1, '原有数据不可被改动');
  assert.equal(await s.get('checklist', 'lx-9'), null, '备份里的内容也不得写入');
});

test('importSnapshot 遇非法快照抛错且不写入', async () => {
  const s = mockStore({ checklist: [{ id: 'lx-1' }] });
  await assert.rejects(() => b.importSnapshot(s, { version: 999, tables: {} }), /校验失败/);
  assert.equal((await s.list('checklist')).length, 1);
});

test('importSnapshot 后顺带清理 checklist 孤儿行（携带项②）', async () => {
  // p-1 已不存在，但它的 checklist 行还在（旧版删除路径遗留）——merge 导入时被清掉
  const s = mockStore({
    projects: [{ id: 'p-2', name: 'B' }],
    checklist: [
      { id: 'p-1::lx-1', projectId: 'p-1', procedureId: 'lx-1', status: 'done' },
      { id: 'p-2::lx-2', projectId: 'p-2', procedureId: 'lx-2', status: 'todo' },
    ],
  });
  await b.importSnapshot(s, { version: b.BACKUP_VERSION, tables: { checklist: [] } }, { mode: 'merge' });
  assert.equal(await s.get('checklist', 'p-1::lx-1'), null, '孤儿行应被清理');
  assert.ok(await s.get('checklist', 'p-2::lx-2'), '存活项目的行不动');
});

test('importSnapshot 不误删未知形态的 checklist 行', async () => {
  const s = mockStore({
    projects: [],
    checklist: [{ id: 'lx-1', status: 'done' }], // 无 '::' 且无 projectId：不认识，不动
  });
  await b.importSnapshot(s, { version: b.BACKUP_VERSION, tables: {} }, { mode: 'merge' });
  assert.ok(await s.get('checklist', 'lx-1'), '未知形态宁可保留也不误删');
});

test('pruneOrphanChecklist 点名项目：只删该项目的行（删除路径用）', async () => {
  const s = mockStore({
    projects: [{ id: 'p-1' }],
    checklist: [
      { id: 'p-1::lx-1', projectId: 'p-1', procedureId: 'lx-1' },
      { id: 'p-2::lx-2', projectId: 'p-2', procedureId: 'lx-2' },
    ],
  });
  const removed = await b.pruneOrphanChecklist(s, 'p-1');
  assert.deepEqual(removed, ['p-1::lx-1']);
  assert.ok(await s.get('checklist', 'p-2::lx-2'));
});

test('toJson 可被 JSON.parse 回来', async () => {
  const s = mockStore({ checklist: [{ id: 'lx-1', status: 'done' }] });
  const snap = await b.exportSnapshot(s);
  const back = JSON.parse(b.toJson(snap));
  assert.equal(back.tables.checklist[0].id, 'lx-1');
  assert.equal(back.tables.checklist[0].status, 'done');
});

test('fileStamp 形如 2026-09-25-1530', () => {
  assert.match(b.fileStamp(new Date(2026, 8, 25, 15, 30)), /^2026-09-25-1530$/);
});
