/* tests/schemes.test.js —— 方案与效果图页（Task 63）：数据层 + buildCards 纯函数 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.document = { createElement: () => ({ style: {}, classList: { add() {} }, appendChild() {}, setAttribute() {} }) };
global.window = global;
const s = require('../js/data/schemes.js');
const vs = require('../js/views/v-scheme.js');

test('两版方案且 id 唯一', () => {
  assert.equal(s.SCHEMES.length, 2);
  assert.equal(new Set(s.SCHEMES.map((x) => x.id)).size, 2);
});

test('每版方案字段齐全', () => {
  s.SCHEMES.forEach((x) => {
    assert.ok(x.name && x.concept, x.id);
    assert.ok(Array.isArray(x.features) && x.features.length >= 3, x.id + ' features 不足');
    assert.ok(Array.isArray(x.pros) && x.pros.length >= 2, x.id + ' pros 不足');
    assert.ok(Array.isArray(x.cons) && x.cons.length >= 1, x.id + ' cons 不足');
    assert.ok(x.area && typeof x.area === 'object', x.id + ' 缺 area');
  });
});

test('图片路径都在 assets 下', () => {
  s.SCHEMES.forEach((x) => assert.match(x.image, /^assets\//));
});

test('效果图文件真实存在且非空（Task 64 静态自检）', () => {
  s.SCHEMES.forEach((x) => {
    const p = path.join(__dirname, '..', x.image);
    assert.ok(fs.existsSync(p), x.image + ' 不存在');
    assert.ok(fs.statSync(p).size > 10 * 1024, x.image + ' 体积过小，疑似占位文件');
  });
});

test('validateSchemes 对良好数据返回空', () => {
  assert.deepEqual(s.validateSchemes(), []);
});

test('validateSchemes 对缺字段数据逐条报错', () => {
  const errs = s.validateSchemes([{ id: 'x', name: '', image: '', concept: '', features: ['a'], pros: [], cons: [] }]);
  assert.ok(errs.length >= 4, '至少报 concept/features/pros/cons/image 缺失');
});

test('getScheme / listSchemes', () => {
  assert.equal(s.getScheme('scheme-a').id, 'scheme-a');
  assert.equal(s.getScheme('nope'), null);
  assert.equal(s.listSchemes().length, 2);
});

test('buildCards 输出结构完整', () => {
  const cards = vs.buildCards(s.SCHEMES);
  assert.equal(cards.length, 2);
  assert.ok(cards[0].areaRows.length > 0);
  assert.equal(cards[0].placeholder, s.PLACEHOLDER);
});

test('buildCards 传入 exists 集合时正确标记', () => {
  const cards = vs.buildCards(s.SCHEMES, { exists: { 'scheme-a': true } });
  assert.equal(cards[0].exists, true);
  assert.equal(cards[1].exists, false);
});

test('buildCards 缺省时 exists 视为存在（占位图由 img onerror 兜底）', () => {
  const cards = vs.buildCards(s.SCHEMES);
  assert.equal(cards[0].exists, true);
  assert.equal(cards[1].exists, true);
});
