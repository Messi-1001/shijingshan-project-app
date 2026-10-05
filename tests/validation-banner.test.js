/* tests/validation-banner.test.js —— 终审 #1 回归防护：
   校验错误条必须挂在 router mount（mainEl）之外，且不被 boot 清空 #app 的路径抹掉 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req, loadAllProcedures } = require('./_helpers.js');

// —— 极简 DOM shim：覆盖 dom.js / shell.js / router.js / main.js 用到的 API ——
function makeEl(tag) {
  const el = {
    tagName: tag, children: [], parentNode: null, dataset: {},
    className: '', textContent: '', innerHTML: '', style: {}, listeners: {},
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) {
      const i = el.children.indexOf(c);
      if (i >= 0) el.children.splice(i, 1);
      c.parentNode = null;
      return c;
    },
    insertBefore(c, ref) {
      const i = ref ? el.children.indexOf(ref) : -1;
      if (i < 0) { el.children.push(c); } else { el.children.splice(i, 0, c); }
      c.parentNode = el;
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

global.SJSQ = { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
SJSQ.core.dom = req('js/core/dom.js');
SJSQ.core.router = req('js/core/router.js');
SJSQ.data.schema = req('js/data/schema.js');
SJSQ.data.index = req('js/data/procedures-index.js');
const shellMod = req('js/views/shell.js');
// main.js 在 Node 侧只导出 mountValidationErrorBar，不执行 boot
const main = req('js/main.js');

function findByClass(el, cls, out) {
  out = out || [];
  (el.children || []).forEach((c) => {
    if (typeof c.className === 'string' && c.className.split(' ').indexOf(cls) >= 0) {
      out.push(c);
    }
    findByClass(c, cls, out);
  });
  return out;
}

// 构造含重复 id 的坏数据（复制一条真实手续），走真实 buildIndex 拿到校验错误
function buildIndexWithDupId() {
  const good = loadAllProcedures();
  const bad = good.concat([Object.assign({}, good[0])]);
  const out = SJSQ.data.index.buildIndex([bad]);
  assert.ok(out.errors.length >= 1, '注入重复 id 后校验必须报错');
  assert.ok(out.errors.some((e) => e.indexOf('id 重复') >= 0));
  return out.errors;
}

test('校验错误条挂在 banner 区（router mount 之外），router.start() 渲染后仍存活', () => {
  const errors = buildIndexWithDupId();

  // 完整复刻 boot 的挂载时序：清空 #app → 挂壳层 → 挂错误条 → 路由启动
  const rootEl = makeEl('div');
  Object.defineProperty(rootEl, 'innerHTML', {
    get() { return ''; },
    set() { // 模拟浏览器 innerHTML='' 的清子节点语义
      rootEl.children.slice().forEach((c) => { c.parentNode = null; });
      rootEl.children.length = 0;
    }
  });

  const shellEl = shellMod.createShell({
    routes: { projects: () => makeEl('div') } // Node 下无 location，start() 渲染 fallback
  });

  rootEl.innerHTML = '';           // boot 清空路径（曾被此步抹掉错误条）
  rootEl.appendChild(shellEl);
  const bar = main.mountValidationErrorBar(shellEl, errors);
  assert.ok(bar, '校验失败必须产出错误条');
  assert.ok(bar.textContent.indexOf('1 处') >= 0 || bar.textContent.indexOf('共 ') >= 0,
    '错误条文案须包含错误数');

  const zones = findByClass(rootEl, 'app-banner-zone');
  const mains = findByClass(rootEl, 'app-main');
  assert.equal(zones.length, 1);
  assert.equal(mains.length, 1);
  // 关键断言：错误条挂载点是 main 的兄弟节点，位于 router mount 之外
  assert.equal(bar.parentNode, zones[0], '错误条必须挂在 shell 的 banner 区');
  assert.equal(zones[0].parentNode, mains[0].parentNode, 'banner 区与 main 必须是兄弟节点');
  assert.equal(findByClass(mains[0], 'app-banner').length, 0, 'mainEl 内不得出现错误条');

  shellEl.__router.start();
  assert.equal(bar.parentNode, zones[0], 'router.start() 渲染后错误条必须仍然存在');
  assert.equal(findByClass(mains[0], 'app-banner').length, 0, 'render 清空 mainEl 不得带走错误条');
  assert.ok(findByClass(rootEl, 'app-banner').indexOf(bar) >= 0, '清屏后整棵壳层树里错误条仍在');
});

test('无校验错误时不产出错误条，banner 区保持为空', () => {
  SJSQ.data.index.buildIndex([loadAllProcedures()]); // 真实数据零错误
  const rootEl = makeEl('div');
  const shellEl = shellMod.createShell({
    routes: { projects: () => makeEl('div') }
  });
  rootEl.appendChild(shellEl);
  const bar = main.mountValidationErrorBar(shellEl, []);
  assert.equal(bar, null, '无错误不得产出错误条');
  const zones = findByClass(shellEl, 'app-banner-zone');
  assert.equal(zones.length, 1);
  assert.equal(zones[0].children.length, 0);
});
