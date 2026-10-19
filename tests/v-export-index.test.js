/* tests/v-export-index.test.js —— 导出中心 ctx 取手续索引的接线（G 根因修复）
 *
 * 缺陷：v-export.js 的 ctxOf() 读的是 window.SJSQ.data.proceduresIndex，
 * 但全项目从未给这个键赋值 —— procedures-index.js 挂的是 SJSQ.data.index，
 * 而 boot 后的运行时索引在 SJSQ.app.procedures。结果 index === undefined：
 *   · flow-image  → flowLayout(undefined) 得 0 节点，导出「一张白纸」（用户报的空图）
 *   · procedure-word / all-csv / report-pptx / report-html → 抛错被兜住，显示「导出失败」
 *   · schedule-word → scheduleView 取不到，报「还没有排期结果」
 * 与「有没有填写信息」无关，是接线错误。
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { req, loadAllProcedures } = require('./_helpers.js');

const SRC = fs.readFileSync(path.join(__dirname, '../js/views/v-export.js'), 'utf8');

// —— 装配：模拟浏览器 boot 后的真实全局形态 ——
function makeEl(tag) {
  const el = {
    tagName: tag, children: [], parentNode: null, className: '', textContent: '', innerHTML: '',
    listeners: {}, dataset: {}, disabled: false, style: {},
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    get firstChild() { return el.children[0] || null; },
    setAttribute(k, v) { el[k] = v; },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    querySelectorAll() { return []; }, querySelector() { return null; },
    closest() { return null; }, contains() { return false; },
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } }
  };
  return el;
}

global.document = { createElement: makeEl, createTextNode(s) { const t = makeEl('#text'); t.textContent = s; return t; } };
global.window = global;

global.SJSQ = { core: {}, data: {}, logic: {}, views: {}, rawData: [], app: {} };
const dom = req('js/core/dom.js');
SJSQ.core.dom = dom;
SJSQ.core.util = req('js/core/util.js');
SJSQ.views.ui = req('js/views/ui.js');

const idx = req('js/data/procedures-index.js');
const idxOut = idx.buildIndex([loadAllProcedures()]);
SJSQ.data.index = idx;                                  // procedures-index.js 挂的键
SJSQ.app.procedures = {                                // main.js registerProcedures 挂的键
  list: idxOut.list, byId: idxOut.byId, bySection: idxOut.bySection,
  counts: idx.getCounts(), errors: idxOut.errors
};
SJSQ.logic.exporters = req('js/logic/exporters.js');
SJSQ.logic.flow = req('js/logic/flow.js');
SJSQ.logic.schedule = req('js/logic/schedule.js');
SJSQ.logic.progress = req('js/logic/progress.js');
SJSQ.logic.backup = req('js/logic/backup.js');
SJSQ.views.vSchedule = req('js/views/v-schedule.js');

const vx = req('js/views/v-export.js');

test('装配前提：data.proceduresIndex 确实不存在（这就是缺陷本身）', () => {
  assert.equal(SJSQ.data.proceduresIndex, undefined, '若此键将来被补上，本测试需重写');
  assert.equal(SJSQ.app.procedures.list.length, 40, '运行时索引应有 40 条');
});

test('resolveIndex 取的是 SJSQ.app.procedures（40 条），不是空索引', () => {
  const index = vx.resolveIndex();
  assert.ok(index, '必须返回索引');
  assert.equal(index.list.length, 40, '应取到全部 40 条手续');
});

test('流程图导出：resolveIndex 的结果能画出 40 个节点，而非空白', () => {
  const layout = F_flow(vx.resolveIndex(), {});
  assert.equal(layout.nodes.length, 40, '流程图节点数应为 40');
  assert.equal(layout.bands.length, 7, '应有 7 个板块');
  assert.ok(layout.width > 500 && layout.height > 300, '画布尺寸不应退化成空白小图');
});

function F_flow(index, opts) { return SJSQ.logic.flow.flowLayout(index, opts); }

test('手续清单 Word：不再抛错，能生成含 40 行的文档', () => {
  const doc = SJSQ.logic.exporters.buildProcedureListDoc(vx.resolveIndex(), {}, '测试工程');
  assert.match(doc, /共 40 项/);
});

test('全量 CSV：含 40 条数据行 + 表头', () => {
  const csv = SJSQ.logic.exporters.buildAllCsv(vx.resolveIndex(), {});
  assert.equal(csv.trim().split(/\r\n/).length, 41, '表头 1 行 + 数据 40 行');
});

test('源码层面：v-export.js 不得再读从未被赋值的 data.proceduresIndex', () => {
  assert.equal(SRC.indexOf('data.proceduresIndex'), -1,
    'v-export.js 仍读 data.proceduresIndex —— 该键从未赋值，会让导出全部拿到 undefined');
});

test('流程图板块标题显示中文标签，而非 lixiang 这类英文键', () => {
  const layout = SJSQ.logic.flow.flowLayout(vx.resolveIndex(), {
    sectionLabels: req('js/data/schema.js').SECTIONS,
  });
  assert.equal(layout.bands.length, 7);
  layout.bands.forEach((b) => {
    assert.ok(/[一-龥]/.test(b.title), '板块标题应含中文：' + b.title);
    assert.equal(/^(lixiang|yongdi|guihua|pingjia|zhaobiao|shigong|jungong)/.test(b.title), false,
      '板块标题不应以英文键开头：' + b.title);
  });
  assert.match(layout.bands[0].title, /前期立项/);
});

test('flow 模块自带兜底标签，未注入 sectionLabels 也不显示英文键', () => {
  const layout = SJSQ.logic.flow.flowLayout(vx.resolveIndex(), {});
  assert.match(layout.bands[0].title, /前期立项/);
});

test('v-advice.js 同样不得读 data.proceduresIndex（避免同类缺陷复发）', () => {
  const src = fs.readFileSync(path.join(__dirname, '../js/views/v-advice.js'), 'utf8');
  assert.equal(src.indexOf('data.proceduresIndex'), -1,
    'v-advice.js 仍读 data.proceduresIndex');
});