/* tests/guidance.test.js —— 文字说明与口径备忘 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const guidance = H.req('js/data/guidance.js');
const schema = H.req('js/data/schema.js');

test('EXCLUDED：6 条排除口径，每条都有 name 与 reason', () => {
  assert.equal(guidance.EXCLUDED.length, 6);
  const names = guidance.EXCLUDED.map((e) => e.name);
  assert.ok(names.includes('建设用地规划许可证'));
  assert.ok(names.includes('办理产权证'));
  assert.ok(names.includes('质量监督登记 / 安全监督登记'));
  guidance.EXCLUDED.forEach((e) => {
    assert.equal(typeof e.name, 'string');
    assert.ok(e.name.length > 0);
    assert.equal(typeof e.reason, 'string');
    assert.ok(e.reason.length > 0);
  });
});

test('EVALUATION_HINTS：pj-1..pj-8 全覆盖，pj-6..pj-8 为预留', () => {
  for (let i = 1; i <= 8; i++) {
    const key = 'pj-' + i;
    assert.ok(guidance.EVALUATION_HINTS[key], '缺少 ' + key);
    assert.equal(typeof guidance.EVALUATION_HINTS[key], 'string');
  }
  for (let i = 6; i <= 8; i++) {
    assert.ok(guidance.EVALUATION_HINTS['pj-' + i].indexOf('预留') >= 0);
  }
  // pj-4 提示应指向环评分类管理名录
  assert.ok(guidance.EVALUATION_HINTS['pj-4'].indexOf('分类管理名录') >= 0);
});

test('closingNote() 与 schema.CLOSING_NOTE 同源', () => {
  assert.equal(guidance.closingNote(), schema.CLOSING_NOTE);
  assert.ok(guidance.closingNote().length > 0);
});

test('NEW_CITY_UPDATE_NOTE：说明装修改造「城市更新」路径本期不覆盖', () => {
  assert.equal(typeof guidance.NEW_CITY_UPDATE_NOTE, 'string');
  assert.ok(guidance.NEW_CITY_UPDATE_NOTE.length > 0);
  assert.ok(guidance.NEW_CITY_UPDATE_NOTE.indexOf('城市更新') >= 0);
  assert.ok(guidance.NEW_CITY_UPDATE_NOTE.indexOf('不覆盖') >= 0);
});

test('浏览器启动自检的静态等价：rawData → buildIndex → counts 与预期一致且零错误', () => {
  const idx = H.req('js/data/procedures-index.js');
  // 浏览器端 S.rawData 是「数组的数组」：七个 procedures-*.js 各自 push 一个板块数组
  const rawData = [
    'procedures-01-lixiang', 'procedures-02-yongdi', 'procedures-03-guihua',
    'procedures-04-pingjia', 'procedures-05-zhaobiao', 'procedures-06-shigong',
    'procedures-07-jungong'
  ].map((f) => H.req('js/data/' + f + '.js'));
  const out = idx.buildIndex(rawData);
  assert.deepEqual(out.errors, [], out.errors.join('\n'));
  const counts = idx.getCounts();
  assert.deepEqual(counts, {
    total: 40, effective: 37, reserved: 3,
    bySection: { lixiang: 7, yongdi: 7, guihua: 6, pingjia: 8, zhaobiao: 5, shigong: 1, jungong: 6 }
  });
  // buildIndex 产出应可直接挂到 SJSQ.app.procedures
  assert.equal(typeof out.byId, 'object');
  assert.equal(typeof out.bySection, 'object');
  assert.ok(Array.isArray(out.list));
});
