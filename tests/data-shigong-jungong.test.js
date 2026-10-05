/* tests/data-shigong-jungong.test.js —— ⑤ 施工许可 1 项 + ⑦ 竣工验收 6 项数据契约 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req } = require('./_helpers.js');
const schema = req('js/data/schema.js');

const shigong = req('js/data/procedures-06-shigong.js');
const jungong = req('js/data/procedures-07-jungong.js');

test('⑤ 施工许可：只办施工许可证 1 项，编号 34', () => {
  assert.equal(shigong.length, 1);
  assert.equal(shigong[0].id, 'sg-1');
  assert.equal(shigong[0].no, 34);
  assert.equal(shigong[0].name, '建筑工程施工许可证');
  assert.equal(shigong[0].section, 'shigong');
  const s = JSON.stringify(shigong);
  assert.equal(s.includes('质量监督登记手续'), false);
  assert.equal(s.includes('安全监督登记手续'), false);
  assert.ok(shigong[0].notes.includes('质量监督登记、安全监督登记不做'));
  assert.ok(shigong[0].notes.includes('本期未覆盖'));
  assert.deepEqual(shigong[0].prev, ['zb-5']);
  assert.equal(shigong[0].platform, 'tzxm');
});

test('⑦ 竣工验收：共 6 条，编号 35–40', () => {
  assert.equal(jungong.length, 6);
  assert.deepEqual(jungong.map((p) => p.id), ['jg-1', 'jg-2', 'jg-3', 'jg-4', 'jg-5', 'jg-6']);
  assert.deepEqual(jungong.map((p) => p.no), [35, 36, 37, 38, 39, 40]);
  jungong.forEach((p) => assert.equal(p.section, 'jungong'));
});

test('⑦ jg-1～jg-4 并联，jg-5 汇聚，jg-6 收尾（第 40 条终点）', () => {
  [0, 1, 2, 3].forEach((i) => {
    assert.equal(jungong[i].parallel, true);
    assert.deepEqual(jungong[i].prev, ['sg-1']);
  });
  assert.equal(jungong[4].parallel, false);
  assert.deepEqual(jungong[4].prev, ['jg-1', 'jg-2', 'jg-3', 'jg-4']);
  assert.deepEqual(jungong[5].prev, ['jg-5']);
  assert.equal(jungong[5].name, '竣工验收备案（竣工质量备案）');
  assert.ok(jungong[5].notes.includes('第 40 条'));
});

test('全量 40 条通过 schema.validateProcedureSet 契约（编号 1–40 连续）', () => {
  const all = shigong.concat(jungong)
    .concat(req('js/data/procedures-01-lixiang.js'))
    .concat(req('js/data/procedures-02-yongdi.js'))
    .concat(req('js/data/procedures-03-guihua.js'))
    .concat(req('js/data/procedures-04-pingjia.js'))
    .concat(req('js/data/procedures-05-zhaobiao.js'));
  assert.equal(all.length, 40);
  assert.deepEqual(schema.validateProcedureSet(all), []);
  assert.equal(schema.CLOSING_NOTE.length > 10, true);
});
