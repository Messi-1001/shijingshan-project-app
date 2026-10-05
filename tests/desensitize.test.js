/* tests/desensitize.test.js —— 终审 I-1（G15 红线）：渲染与导出路径的显示文本脱敏
 * 规则：「邓斌」「首钢」「琅山苗圃」等真实人名/项目名不得出现在任何用户可见文本中。
 * fileName 仅用于打开文件的真实路径（window.open），不进 UI / 导出 meta / 导出文件名。
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req, loadAllProcedures } = require('./_helpers.js');

const FORBIDDEN = ['邓斌', '首钢', '琅山苗圃'];

// —— 极简 DOM shim（同 shell.test.js 模式） ——
function makeEl(tag) {
  const el = {
    tagName: tag, children: [], parentNode: null, dataset: {},
    className: '', textContent: '', innerHTML: '', listeners: {}, disabled: false,
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); c.parentNode = null; return c; },
    get firstChild() { return el.children[0] || null; },
    setAttribute(k, v) { el[k] = v; },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    querySelectorAll() { return []; }, querySelector() { return null; },
    closest() { return null; }, contains() { return false; },
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } }
  };
  return el;
}
global.document = {
  createElement: makeEl,
  createTextNode(s) { const t = makeEl('#text'); t.textContent = s; return t; }
};

// —— 装配 SJSQ（同 .superpowers/sdd/04 check-*.js 模式） ——
global.SJSQ = { core: {}, data: {}, logic: {}, views: {}, rawData: [], app: {} };
SJSQ.core.dom = req('js/core/dom.js');
SJSQ.core.util = req('js/core/util.js');
SJSQ.views.ui = req('js/views/ui.js');
SJSQ.logic.renderTemplate = req('js/logic/render-template.js');
SJSQ.logic.exporters = req('js/logic/exporters.js');

const idx = req('js/data/procedures-index.js');
const idxOut = idx.buildIndex([loadAllProcedures()]);
SJSQ.data.index = idx;
SJSQ.data.guidance = req('js/data/guidance.js');

const tpl = req('js/data/templates.js');
const tplOut = tpl.build();
SJSQ.data.templates = tpl;
SJSQ.app.procedures = { list: idxOut.list, byId: idxOut.byId, bySection: idxOut.bySection, errors: [] };
SJSQ.app.templates = { list: tplOut.list, byId: tplOut.byId, errors: tplOut.errors };
SJSQ.app.state = req('js/core/state.js').createState(); // 无 currentId → 视图走无项目分支

const vTemplates = req('js/views/v-templates.js');
const vDetail = req('js/views/v-detail.js');
const rt = req('js/logic/render-template.js');

function allText(el, out) {
  out = out || [];
  if (el.textContent) out.push(el.textContent);
  (el.children || []).forEach((c) => allText(c, out));
  return out.join(' ');
}

function assertClean(text, where) {
  FORBIDDEN.forEach((w) => {
    assert.equal(text.indexOf(w), -1, where + ' 的可见文本出现违禁词「' + w + '」');
  });
}

test('模板库页渲染：全部 34 条模板的可见文本不含真实人名/项目名', () => {
  const page = vTemplates.render({ sub: '' });
  assertClean(allText(page), 'v-templates');
});

test('详情页渲染：所有手续的关联模板块可见文本脱敏', () => {
  SJSQ.app.procedures.list.forEach((p) => {
    const page = vDetail.render({ id: p.id });
    assert.ok(page, '详情页应能渲染：' + p.id);
    assertClean(allText(page), 'v-detail/' + p.id);
  });
});

test('导出路径：buildFilledDoc / buildCopyText 对全部模板条目脱敏', () => {
  tplOut.list.forEach((t) => {
    const name = tpl.displayName(t);
    assert.ok(name, t.id + ' 应有显示名');
    assertClean(name, 'displayName/' + t.id);
    // 有项目导出（Word HTML）：标题/meta/正文全部走显示名
    const html = rt.buildFilledDoc(name, rt.listPlaceholders().join('\n'),
      { name: '测试学校工程', unit: '测试单位' });
    assert.ok(html.includes('测试学校工程'));
    assertClean(html, 'buildFilledDoc/' + t.id);
    // 复制文本（无项目与有项目两种）
    assertClean(rt.buildCopyText(t, null, ''), 'buildCopyText无项目/' + t.id);
    assertClean(rt.buildCopyText(t, { name: '测试学校工程' }, ''), 'buildCopyText有项目/' + t.id);
  });
});

test('三条真实项目名条目均已挂通用化 label 且 label 脱敏', () => {
  const cases = [
    ['tpl-huabo-jueding', '国有建设用地划拨决定书（样例）'],
    ['tpl-duogui-chushen', '多规合一初审意见函（样例）'],
    ['tpl-xiangmu-jianyi-pifu', '项目建议书批复（样例）']
  ];
  cases.forEach(([id, label]) => {
    const t = tpl.getById(id);
    assert.ok(t, id + ' 应存在');
    assert.equal(t.label, label);
    assert.equal(tpl.displayName(t), label);
    assert.notEqual(t.fileName.indexOf('首钢'), -1, id + ' 的 fileName 保留真实值供打开文件');
  });
});
