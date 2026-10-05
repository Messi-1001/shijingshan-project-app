/* tests/router.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../js/core/router.js');

test('parseHash 空 hash 返回 fallback 名', () => {
  assert.deepEqual(router.parseHash(''), { name: '', params: {} });
  assert.deepEqual(router.parseHash('#'), { name: '', params: {} });
});

test('parseHash 解析视图名', () => {
  assert.deepEqual(router.parseHash('#/library'), { name: 'library', params: {} });
});

test('parseHash 解析路径参数', () => {
  assert.deepEqual(router.parseHash('#/detail/34'), { name: 'detail', params: { id: '34' } });
});

test('parseHash 解析查询串（搜索页 / 退回原因页要用）', () => {
  assert.deepEqual(router.parseHash('#/search?q=%E6%96%BD%E5%B7%A5'), { name: 'search', params: { q: '施工' } });
  assert.deepEqual(router.parseHash('#/reasons?category=%E7%94%A8%E5%9C%B0&procedureId=yd-1'),
    { name: 'reasons', params: { category: '用地', procedureId: 'yd-1' } });
});

test('parseHash 路径段与查询串可同时出现', () => {
  assert.deepEqual(router.parseHash('#/detail/34?tab=materials'),
    { name: 'detail', params: { id: '34', tab: 'materials' } });
});

test('buildHash 拼接', () => {
  assert.equal(router.buildHash('library'), '#/library');
  assert.equal(router.buildHash('detail', { id: '34' }), '#/detail/34');
});

test('buildHash 把非路径键拼成查询串', () => {
  assert.equal(router.buildHash('search', { q: '施工' }), '#/search?q=%E6%96%BD%E5%B7%A5');
  assert.equal(router.buildHash('reasons', { category: '用地' }), '#/reasons?category=%E7%94%A8%E5%9C%B0');
  assert.equal(router.buildHash('reasons', { category: '用地', procedureId: 'yd-1' }),
    '#/reasons?category=%E7%94%A8%E5%9C%B0&procedureId=yd-1');
});

test('buildHash 忽略空串与 undefined 键', () => {
  assert.equal(router.buildHash('reasons', { category: '' }), '#/reasons');
  assert.equal(router.buildHash('reasons', { category: undefined }), '#/reasons');
});

test('buildHash 与 parseHash 往返一致', () => {
  [{ name: 'detail', params: { id: 'lx-1' } },
   { name: 'search', params: { q: '施工许可' } },
   { name: 'reasons', params: { category: '规划', procedureId: 'gh-2' } }].forEach((c) => {
    assert.deepEqual(router.parseHash(router.buildHash(c.name, c.params)), c);
  });
});
