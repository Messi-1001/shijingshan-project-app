/* tests/conditions.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const c = require('../js/data/conditions.js');

const ids = [
  ...H.req('js/data/procedures-01-lixiang.js'), ...H.req('js/data/procedures-02-yongdi.js'),
  ...H.req('js/data/procedures-03-guihua.js'),  ...H.req('js/data/procedures-04-pingjia.js'),
  ...H.req('js/data/procedures-05-zhaobiao.js'), ...H.req('js/data/procedures-06-shigong.js'),
  ...H.req('js/data/procedures-07-jungong.js')
].map((p) => p.id);

test('本期固定值符合 G8', () => {
  assert.deepEqual(c.FIXED_VALUES, {
    buildNature: '新建', investScale: '3000万以上',
    fundSource: '财政资金', approvalLevel: '市级'
  });
});

test('四个维度的合法取值与 spec 一致', () => {
  assert.deepEqual(c.DIMENSIONS.buildNature, ['新建', '改扩建', '装修改造']);
  assert.deepEqual(c.DIMENSIONS.investScale, ['1000万以下', '1000-3000万', '3000万以上']);
  assert.deepEqual(c.DIMENSIONS.fundSource, ['财政资金', '专项债', '社会投资']);
  assert.deepEqual(c.DIMENSIONS.approvalLevel, ['区级', '市级']);
});

test('40 项手续全部有条件值，零缺失、零非法取值', () => {
  assert.deepEqual(c.validateConditions(ids), [], c.validateConditions(ids).join('\n'));
});

test('getConditions 对未知 id 返回四维不限', () => {
  const g = c.getConditions('不存在');
  assert.deepEqual(g.buildNature, ['不限']);
  assert.deepEqual(g.approvalLevel, ['不限']);
});

test('国有土地划拨手续仅新建适用', () => {
  assert.deepEqual(c.getConditions('yd-7').buildNature, ['仅新建']);
});

test('⑤ 施工许可仅新建适用', () => {
  assert.deepEqual(c.getConditions('sg-1').buildNature, ['仅新建']);
});

test('本期的固定取值能在每一项上全部命中', () => {
  const miss = ids.filter((id) => {
    const g = c.getConditions(id);
    return Object.keys(c.FIXED_VALUES).some((dim) => {
      const allowed = g[dim];
      if (allowed.indexOf('不限') >= 0) return false;
      const want = c.FIXED_VALUES[dim];
      return allowed.indexOf(want) < 0 && allowed.indexOf('仅新建') < 0;
    });
  });
  assert.deepEqual(miss, [], miss.join(','));
});
