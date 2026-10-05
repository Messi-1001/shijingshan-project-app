/* tests/shell.test.js —— shell 结构测试：banner 区在 main 之外（修复 F1 回归防护） */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req } = require('./_helpers.js');

// —— 极简 DOM shim：只覆盖 dom.js / shell.js / router.js 在 Node 侧用到的 API ——
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
    classList: {
      toggle() {}, add() {}, remove() {}, contains() { return false; }
    }
  };
  return el;
}

global.document = {
  createElement: makeEl,
  createTextNode(s) { const t = makeEl('#text'); t.textContent = s; return t; }
};

// shell.js 工厂内部读 root.SJSQ.core.dom / core.router，先装配再加载
global.SJSQ = { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
SJSQ.core.dom = req('js/core/dom.js');
SJSQ.core.router = req('js/core/router.js');
const shell = req('js/views/shell.js');

// 按 className 深度优先查找
function findByClass(el, cls, out) {
  out = out || [];
  (el.children || []).forEach((c) => {
    if (c.className === cls || (typeof c.className === 'string' && c.className.split(' ').indexOf(cls) >= 0)) {
      out.push(c);
    }
    findByClass(c, cls, out);
  });
  return out;
}

test('createShell 存在 banner 区容器，且与 main 是兄弟节点、位于其前', () => {
  const root = shell.createShell({
    storeInfo: { reason: 'IndexedDB 不可用，已降级为 localStorage' },
    routes: { projects: () => makeEl('div') }
  });
  const zones = findByClass(root, 'app-banner-zone');
  const mains = findByClass(root, 'app-main');
  assert.equal(zones.length, 1);
  assert.equal(mains.length, 1);
  assert.equal(zones[0].parentNode, mains[0].parentNode, 'banner 区与 main 必须是兄弟节点');
  assert.ok(
    zones[0].parentNode.children.indexOf(zones[0]) < zones[0].parentNode.children.indexOf(mains[0]),
    'banner 区必须位于 main 之前（顶栏与主内容之间）'
  );
});

test('降级黄条在 banner 区内，绝不在 mainEl 内', () => {
  const root = shell.createShell({
    storeInfo: { reason: '浏览器已禁用本地存储' },
    routes: { projects: () => makeEl('div') }
  });
  const banners = findByClass(root, 'app-banner');
  const zones = findByClass(root, 'app-banner-zone');
  const mains = findByClass(root, 'app-main');
  assert.equal(banners.length, 1);
  assert.equal(banners[0].parentNode, zones[0], '黄条必须挂在独立 banner 区');
  assert.equal(findByClass(mains[0], 'app-banner').length, 0, 'mainEl 内不得出现黄条');
});

test('无 reason 时 banner 区为空', () => {
  const root = shell.createShell({
    routes: { projects: () => makeEl('div') }
  });
  const zones = findByClass(root, 'app-banner-zone');
  assert.equal(zones.length, 1);
  assert.equal(zones[0].children.length, 0);
  assert.equal(findByClass(root, 'app-banner').length, 0);
});

test('router render 清空 mainEl 后，黄条仍保留在 banner 区', () => {
  const root = shell.createShell({
    storeInfo: { reason: 'IndexedDB 打开失败，已降级为 localStorage' },
    routes: { projects: () => makeEl('div') } // Node 下无 location，start() 渲染 fallback
  });
  root.__router.start();
  const banners = findByClass(root, 'app-banner');
  const zones = findByClass(root, 'app-banner-zone');
  const mains = findByClass(root, 'app-main');
  assert.equal(banners.length, 1, 'start() 渲染后黄条必须仍然存在');
  assert.equal(banners[0].parentNode, zones[0]);
  assert.equal(findByClass(mains[0], 'app-banner').length, 0, 'render 清空 mainEl 不得带走黄条');
});
