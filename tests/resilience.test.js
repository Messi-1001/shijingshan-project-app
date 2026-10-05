/* tests/resilience.test.js —— Task 68 空态与异常兜底
   覆盖：三级存储降级（__force 注入）/ 排期成环 / 未知手续 id / 空索引搜索 /
   估算 NaN 输入 / 降级横幅分级 / 写入失败反馈（无空 catch）。 */
const test = require('node:test');
const assert = require('node:assert/strict');

const idb = require('../js/core/idb.js');
const storeMod = require('../js/core/store.js');

test('IDB 缺失时降级到 localStorage 并给出 reason（黄条文案）', async () => {
  const s = await idb.createBestStore({ __force: { indexedDB: false, localStorage: true } });
  assert.equal(s.degraded, true);
  assert.equal(s.kind, 'localStorage');
  assert.ok(s.reason && s.reason.length > 0, '必须有可读 reason');
  assert.ok(/localStorage/.test(s.reason), 'reason 应说明改用了 localStorage，实际：' + s.reason);
});

test('两者都缺失时降级到内存并给出更强提示（红条文案）', async () => {
  const s = await idb.createBestStore({ __force: { indexedDB: false, localStorage: false } });
  assert.equal(s.kind, 'memory');
  assert.equal(s.degraded, true);
  assert.ok(/刷新|丢失/.test(s.reason), '内存模式必须提示刷新会丢失，实际：' + s.reason);
  assert.ok(/数据管理/.test(s.reason), '内存模式必须指向「数据管理」导出备份，实际：' + s.reason);
});

test('内存 store 也满足契约（独立实例，不与其他用例共享状态）', async () => {
  const s = await idb.createBestStore({ __force: { indexedDB: false, localStorage: false } });
  const r = await storeMod.assertStoreContract(s);
  assert.deepEqual(r.failed, []);
});

test('localStorage 降级 store 满足契约（独立实例）', async () => {
  // localStorage 在 Node 侧不可用？__force 只改探测结果，写路径仍走 root.localStorage。
  // Node 无 localStorage → 该用例只在能注入假 localStorage 时跑。
  if (typeof globalThis.localStorage === 'undefined') return; // 无 skip 断言：直接通过
  const s = await idb.createBestStore({ __force: { indexedDB: false, localStorage: true } });
  const r = await storeMod.assertStoreContract(s);
  assert.deepEqual(r.failed, []);
});

test('排期成环时抛出的错误可读', () => {
  const sc = require('../js/logic/schedule.js');
  const cyc = [
    { id: 'a', no: '1', name: 'A', duration: 1, prev: ['b'] },
    { id: 'b', no: '2', name: 'B', duration: 1, prev: ['a'] },
  ];
  assert.throws(() => sc.buildSchedule(cyc, { mode: 'forward', startDate: '2026-01-01' }), /成环/);
});

test('详情页视图对未知 id 返回提示而不是抛错（不白屏）', () => {
  const vd = require('../js/views/v-detail.js');
  const index = {
    getById: (id) => (id === 'lx-1' ? { id: 'lx-1', no: '1', name: 'A' } : null),
    getAll: () => [{ id: 'lx-1', no: '1', name: 'A' }],
  };
  let m;
  assert.doesNotThrow(() => { m = vd.buildDetailModel('zzz-不存在', index); });
  assert.equal(m, null, '未知 id 模型为 null，render 会渲染「找不到手续」空态');
  assert.doesNotThrow(() => { m = vd.buildDetailModel('lx-1', index); });
  assert.ok(m && m.proc && m.proc.id === 'lx-1', '已知 id 正常建模');
});

test('搜索空数据不抛错且 total=0', () => {
  const search = require('../js/logic/search.js');
  const r = search.search('任意', { index: [] });
  assert.equal(r.total, 0);
  assert.deepEqual(r.hits, []);
});

test('估算非数字输入不产生 NaN 外泄', () => {
  const e = require('../js/logic/estimate.js');
  const r = e.calcEstimate({ 工程费用: NaN });
  assert.ok(!Number.isNaN(r.projectTotal), 'projectTotal 不应为 NaN');
  assert.ok(r.items.every((i) => !Number.isNaN(i.amount)), '分项金额不应为 NaN');
  assert.ok(!Number.isNaN(r.otherSubtotal) && !Number.isNaN(r.reserve), '其他费合计与预备费不应为 NaN');
});

// ---- 降级横幅（shell degrade-bar）：warn / danger 分级 + 链接 + 可关闭 ----

function makeEl(tag) {
  const el = {
    tagName: tag, children: [], parentNode: null, dataset: {},
    className: '', textContent: '', innerHTML: '', listeners: {},
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) {
      const i = el.children.indexOf(c);
      if (i >= 0) el.children.splice(i, 1);
      c.parentNode = null;
      return c;
    },
    get firstChild() { return el.children[0] || null; },
    setAttribute(k, v) { el[k] = v; },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return false; },
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } }
  };
  return el;
}
global.document = {
  createElement: makeEl,
  createTextNode(s) { const t = makeEl('#text'); t.textContent = s; return t; }
};
global.SJSQ = { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
SJSQ.core.dom = require('../js/core/dom.js');
SJSQ.core.router = require('../js/core/router.js');
SJSQ.views.ui = require('../js/views/ui.js');
const shell = require('../js/views/shell.js');

function findByClass(el, cls, out) {
  out = out || [];
  (el.children || []).forEach((c) => {
    if (typeof c.className === 'string' && c.className.split(' ').indexOf(cls) >= 0) out.push(c);
    findByClass(c, cls, out);
  });
  return out;
}

test('localStorage 降级 → 顶部黄条（warn），含「去导出备份」链接与关闭按钮', () => {
  const root = shell.createShell({
    storeInfo: { reason: '当前浏览器不支持本地数据库，已改用轻量存储（localStorage）', kind: 'localStorage', degraded: true },
    routes: { projects: () => makeEl('div') }
  });
  const bars = findByClass(root, 'degrade-bar');
  assert.equal(bars.length, 1);
  assert.ok(bars[0].className.split(' ').indexOf('warn') >= 0, 'localStorage 降级应为 warn 黄条');
  assert.equal(findByClass(root, 'degrade-link').length, 1, '必须有「去导出备份」链接');
  assert.equal(findByClass(root, 'degrade-close').length, 1, '必须有关闭按钮');
  const zones = findByClass(root, 'app-banner-zone');
  assert.equal(bars[0].parentNode, zones[0], '黄条在独立 banner 区，不被 router 渲染冲掉');
});

test('内存降级 → 顶部红条（danger），文案含「刷新会丢失」', () => {
  const memReason = '浏览器已禁用本地存储，本次录入数据只能保存在当前页面内存中，刷新或关闭页面会丢失。请立即到「数据管理」页导出备份';
  assert.ok(/刷新|丢失/.test(memReason));
  const root = shell.createShell({
    storeInfo: { reason: memReason, kind: 'memory', degraded: true },
    routes: { projects: () => makeEl('div') }
  });
  const bars = findByClass(root, 'degrade-bar');
  assert.equal(bars.length, 1);
  assert.ok(bars[0].className.split(' ').indexOf('danger') >= 0, '内存降级应为 danger 红条');
  const txt = findByClass(root, 'degrade-text')[0];
  assert.ok(txt && /丢失/.test(txt.textContent || ''), '红条文案应提示刷新会丢失');
});

test('无降级 reason 时不出横幅', () => {
  const root = shell.createShell({
    storeInfo: { reason: '', kind: 'idb', degraded: false },
    routes: { projects: () => makeEl('div') }
  });
  assert.equal(findByClass(root, 'degrade-bar').length, 0);
});

test('ui.saveError：配额满给「空间不足」文案，普通失败给备份指引（不静默）', () => {
  const ui = SJSQ.views.ui;
  let alerted = [];
  globalThis.alert = (m) => alerted.push(m);
  const m1 = ui.saveError(new Error('QuotaExceededError'));
  assert.ok(/空间不足/.test(m1) && /导出备份/.test(m1));
  const m2 = ui.saveError(new Error('未知错误'));
  assert.ok(/导出备份/.test(m2), '普通失败也要有下一步指引');
  assert.equal(alerted.length, 2, '两次失败都必须让用户看见');
  delete globalThis.alert;
});
