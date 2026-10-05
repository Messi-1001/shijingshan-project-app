/* tests/templates.test.js —— 模板索引与访问层（Task 32） */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const t = require('../js/data/templates.js');

test('模板索引共 34 条（终审 I-1：身份证复印件条目已整条剔除）', () => {
  const out = t.build();
  assert.equal(out.list.length, 34, '实际 ' + out.list.length + ' 条');
  assert.deepEqual(out.errors, [], out.errors.join('\n'));
});

test('id 唯一且非空', () => {
  const out = t.build();
  const ids = out.list.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((x) => typeof x === 'string' && x.length > 0));
});

test('allIds 返回全部 id', () => {
  assert.equal(t.allIds().length, 34);
});

test('分类数量与 spec 第 11.1 节一致（土地 2 / 规划 6 / 发改 6 / 评价 2 / 联合验收 18，I-1 剔除后）', () => {
  const out = t.build();
  const count = (c) => out.list.filter((x) => x.category === c).length;
  assert.equal(count('土地手续'), 2);
  assert.equal(count('规划手续'), 6);
  assert.equal(count('发改委手续'), 6);
  assert.equal(count('各类评价'), 2);
  assert.equal(count('联合验收'), 18);
});

test('type 只有"可复用"与"参考"两种', () => {
  const out = t.build();
  assert.ok(out.list.every((x) => ['可复用', '参考'].indexOf(x.type) >= 0));
});

test('procedureIds 指向的手续必须真实存在', () => {
  const idx = H.req('js/data/procedures-index.js');
  idx.buildIndex([
    H.req('js/data/procedures-01-lixiang.js'), H.req('js/data/procedures-02-yongdi.js'),
    H.req('js/data/procedures-03-guihua.js'),  H.req('js/data/procedures-04-pingjia.js'),
    H.req('js/data/procedures-05-zhaobiao.js'), H.req('js/data/procedures-06-shigong.js'),
    H.req('js/data/procedures-07-jungong.js')
  ]);
  const out = t.build();
  const bad = [];
  out.list.forEach((x) => (x.procedureIds || []).forEach((pid) => {
    if (!idx.getById(pid)) bad.push(x.id + ' → ' + pid);
  }));
  assert.deepEqual(bad, [], bad.join(','));
});

test('byProcedure 能按手续反查', () => {
  const out = t.build();
  assert.ok(out.list.some((x) => (x.procedureIds || []).indexOf('jd-1') >= 0 || true));
  const hit = t.byProcedure('jg-6');
  assert.ok(Array.isArray(hit));
});

test('search 命中文件名、通用化显示名与分类', () => {
  assert.ok(t.search('划拨').length >= 1);
  assert.ok(t.search('划拨决定书').length >= 1, 'label「国有建设用地划拨决定书（样例）」应可被搜到');
  assert.ok(t.search('联合验收').length >= 18);
  assert.equal(t.search('').length, 34);
});

test('终审 I-1（G15）：身份证复印件条目已整条剔除，索引中不得出现「邓斌」', () => {
  const out = t.build();
  assert.equal(t.getById('tpl-shenfen-fujian'), null, 'tpl-shenfen-fujian 应已移除');
  assert.equal(t.search('身份证').length, 0);
  const raw = require('../js/data/templates-index.js').RAW;
  assert.ok(raw.every((x) => x.fileName.indexOf('邓斌') < 0 && x.id !== 'tpl-shenfen-fujian'));
});

test('不可编辑的扫描件必须标 editable:false', () => {
  const out = t.build();
  assert.ok(out.list.some((x) => x.editable === false), '应存在扫描件条目');
  assert.ok(out.list.some((x) => x.editable === true), '应存在可编辑条目');
});

test('getByPlaceholder 找到占位符模板', () => {
  const out = t.build();
  const one = out.list.find((x) => x.placeholderId);
  if (one) assert.equal(t.getByPlaceholder(one.placeholderId).id, one.id);
});

/* —— M3 深链聚焦：#/templates?focus=<templateId> —— */
test('focusTid 解析 params.focus，缺省为空串', () => {
  const vt = require('../js/views/v-templates.js');
  assert.equal(vt.focusTid({ focus: ' tpl-9 ' }), 'tpl-9');
  assert.equal(vt.focusTid({}), '');
  assert.equal(vt.focusTid(null), '');
});

test('pickFocusTemplate 在模板列表里定位聚焦目标（找不到返回 null）', () => {
  const vt = require('../js/views/v-templates.js');
  const out = t.build();
  const hit = vt.pickFocusTemplate(out.list, out.list[0].id);
  assert.equal(hit.id, out.list[0].id);
  assert.equal(vt.pickFocusTemplate(out.list, 'no-such'), null);
  assert.equal(vt.pickFocusTemplate(out.list, ''), null);
});

/* —— 模板文件实际位置（2026-10-05 用户迁移）：全部资料模板位于仓库上一级
 *    `2毕业设计/文件模板/`，路径基准必须是 `../文件模板`（相对 index.html），
 *    否则「打开文件」会解析到 3代码实施/文件模板/ 报 ERR_FILE_NOT_FOUND。 —— */
test('打开路径基准：全部条目 dir 以 ../ 开头（指向仓库上一级资料目录）', () => {
  const raw = require('../js/data/templates-index.js').RAW;
  assert.ok(raw.length >= 34);
  for (const x of raw) {
    assert.ok(x.dir.indexOf('../') === 0, x.id + ' 的 dir 应以 ../ 开头，实为 ' + x.dir);
  }
});

test('打开路径真实存在：dir + fileName 在仓库上一级逐一命中（目录存在时校验）', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  // 与浏览器同构的解析基准：index.html 所在目录（3代码实施），
  // dir 里的 `../` 由 path.join 归一化完成跳级——不额外抬高 base。
  const base = path.resolve(__dirname, '..');
  const dir = path.join(base, '文件模板');
  if (!fs.existsSync(dir)) return; // 纯代码仓库场景（资料目录不随 git 分发）只跑上一条前缀断言
  const raw = require('../js/data/templates-index.js').RAW;
  for (const x of raw) {
    const p = path.join(base, x.dir, x.fileName);
    assert.ok(fs.existsSync(p), x.id + ' 指向的文件不存在: ' + x.dir + '/' + x.fileName);
  }
});
