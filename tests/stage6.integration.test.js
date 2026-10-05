/* tests/stage6.integration.test.js —— 阶段六集成验收（Task 57）：
   平台导航 / 退回原因库 / 建议引擎 / 全局搜索 / 数据备份 五块共用同一份全量清单，必须互相自洽 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');

const platforms = H.req('js/data/platforms.js');
const reasons = H.req('js/data/reject-reasons.js');
const advice = H.req('js/logic/advice.js');
const search = H.req('js/logic/search.js');
const backup = H.req('js/logic/backup.js');
const coreStore = H.req('js/core/store.js');
const vp = H.req('js/views/v-platform.js');

// 用真实数据装配 index（与阶段二同一入口）
const lists = [
  H.req('js/data/procedures-01-lixiang.js'), H.req('js/data/procedures-02-yongdi.js'),
  H.req('js/data/procedures-03-guihua.js'),  H.req('js/data/procedures-04-pingjia.js'),
  H.req('js/data/procedures-05-zhaobiao.js'), H.req('js/data/procedures-06-shigong.js'),
  H.req('js/data/procedures-07-jungong.js')
];
const buildIndex = H.req('js/data/procedures-index.js').buildIndex;
const index = buildIndex(lists);
const templates = H.req('js/data/templates.js').build();

test('平台 covers 指向的手续全部存在', () => {
  const errs = platforms.validatePlatformSteps(platforms.PLATFORMS).filter((e) => /未知手续/.test(e));
  assert.deepEqual(errs, []);
});

test('退回原因库 appliesTo 指向的手续全部存在', () => {
  const known = index.list.map((p) => p.id);
  const errs = reasons.validateReasons(reasons.REASONS, known).filter((e) => /未知手续/.test(e));
  assert.deepEqual(errs, []);
});

test('全量手续都能查到至少一条退回原因（含通用）', () => {
  index.list.forEach((p) => {
    assert.ok(reasons.reasonsFor(p.id).length >= 6, p.id + ' 退回原因太少');
  });
});

test('建议引擎在真实数据上跑得通且非空', () => {
  const list = advice.buildAdvice({
    index: index, checklist: {},
    scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' },
    hasEstimate: false,
  });
  assert.ok(list.length > 0);
  const levels = list.map((x) => x.level);
  const order = { block: 0, warn: 1, info: 2 };
  for (let i = 1; i < levels.length; i++) assert.ok(order[levels[i]] >= order[levels[i - 1]]);
});

test('平台搜索可命中两个平台', () => {
  const idx = search.buildSearchIndex({ platforms: platforms });
  const r = search.search('在线平台', { index: idx });
  assert.ok(r.hits.some((x) => x.kind === 'platform'));
});

test('搜索能覆盖四类数据', () => {
  const idx = search.buildSearchIndex({
    proceduresIndex: index,
    templatesIndex: { list: templates.list },
    rejectReasons: reasons,
    platforms: platforms,
  });
  const kinds = new Set(idx.map((x) => x.kind));
  ['procedure', 'template', 'reason', 'platform'].forEach((k) => assert.ok(kinds.has(k), '缺 ' + k));
});

test('搜索「施工」同时命中手续与模板（混合结果）', () => {
  const idx = search.buildSearchIndex({
    proceduresIndex: index,
    templatesIndex: { list: templates.list },
    rejectReasons: reasons,
    platforms: platforms,
  });
  const r = search.search('施工', { index: idx });
  const kinds = new Set(r.hits.map((x) => x.kind));
  assert.ok(kinds.has('procedure'), '应命中手续');
  assert.ok(kinds.has('template'), '应命中模板');
  // 排序契约：标题命中 > 副标题 > 正文（rank 非降序）；同档内四类固定序。
  // 注意是先 rank 后 kind，所以四类在结果里自然交错，不能断言按类整段分组。
  for (let i = 1; i < r.hits.length; i++) {
    assert.ok(r.hits[i].rank >= r.hits[i - 1].rank, 'rank 排序被打破');
  }
  // 高亮函数在真实关键词上不抛错且包 mark
  const html = search.highlight(r.hits[0].title, '施工');
  assert.ok(/<mark>/.test(html), '应有 <mark> 高亮：' + html);
});

test('备份往返一致（直接跑在真实内存 Store 上，验证表+id 契约）', async () => {
  const s1 = coreStore.createMemoryStore();
  await s1.put('checklist', { id: 'p-1::lx-1', projectId: 'p-1', procedureId: 'lx-1', status: 'done' });
  await s1.put('projects', { id: 'p-1', name: 'A' });
  await s1.put('meta', { id: 'estimateInput', value: { 工程费用: 20000 } });
  await s1.put('meta', { id: 'custom-templates', list: [{ id: 'tpl-custom-1', fileName: 'x.pdf' }] });
  const snap = await backup.exportSnapshot(s1);
  assert.equal(snap.tables.checklist.length, 1);
  assert.equal(snap.tables.projects.length, 1);
  assert.equal(snap.tables.meta.length, 2, 'estimateInput 与 custom-templates 都应带出');

  const s2 = coreStore.createMemoryStore();
  await backup.importSnapshot(s2, JSON.parse(backup.toJson(snap)));
  assert.equal((await s2.get('checklist', 'p-1::lx-1')).status, 'done');
  assert.equal((await s2.get('meta', 'estimateInput')).value.工程费用, 20000);
  assert.deepEqual((await s2.get('meta', 'custom-templates')).list, [{ id: 'tpl-custom-1', fileName: 'x.pdf' }],
    '{id, list} 形态的 custom-templates 原样往返');
});

test('备份文件里不含系统内部表', async () => {
  const s = coreStore.createMemoryStore();
  await s.put('projects', { id: 'p-1', name: 'A' });
  const snap = await backup.exportSnapshot(s);
  assert.deepEqual(Object.keys(snap.tables).sort(), ['projects']);
});

test('replace 导入后 meta 白名单外行保留、白名单内被替换', async () => {
  const s1 = coreStore.createMemoryStore();
  await s1.put('meta', { id: 'scheduleInput', value: { mode: 'forward' } });
  await s1.put('meta', { id: '__internal', value: 1 });
  const snap = await backup.exportSnapshot(s1);
  assert.deepEqual(snap.tables.meta.map((m) => m.id), ['scheduleInput'], '内部字段不导出（G15）');

  const s2 = coreStore.createMemoryStore();
  await s2.put('meta', { id: '__internal', value: 1 });
  await s2.put('meta', { id: 'estimateInput', value: { 工程费用: 1 } });
  await backup.importSnapshot(s2, JSON.parse(backup.toJson(snap)), { mode: 'replace' });
  assert.ok(await s2.get('meta', '__internal'), '白名单外行不被吞');
  assert.equal(await s2.get('meta', 'estimateInput'), null, '白名单内行被替换');
  assert.ok(await s2.get('meta', 'scheduleInput'));
});

test('孤儿清理集成：删项目遗留的 checklist 行在导入时被清掉', async () => {
  const s = coreStore.createMemoryStore();
  await s.put('projects', { id: 'p-2', name: 'B' });
  await s.put('checklist', { id: 'p-1::lx-1', projectId: 'p-1', procedureId: 'lx-1', status: 'done' });
  await s.put('checklist', { id: 'p-2::lx-2', projectId: 'p-2', procedureId: 'lx-2', status: 'doing' });
  const snap = await backup.exportSnapshot(s);
  await backup.importSnapshot(s, JSON.parse(backup.toJson(snap)), { mode: 'replace' });
  assert.equal(await s.get('checklist', 'p-1::lx-1'), null, 'p-1 的孤儿行不应复活');
  assert.equal((await s.get('checklist', 'p-2::lx-2')).status, 'doing');
});

test('平台视图在真实索引上关联到手续', () => {
  platforms.PLATFORMS.forEach((p) => {
    const v = vp.buildPlatformView(p, index);
    assert.ok(v.relatedProcedures.length > 0, p.short + ' 未关联到手续');
  });
});
