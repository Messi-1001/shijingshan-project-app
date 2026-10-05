/* tests/detail.test.js —— v-detail 纯辅助函数 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const detail = require('../js/views/v-detail.js');

function prepare() {
  const idx = H.req('js/data/procedures-index.js');
  idx.buildIndex([
    H.req('js/data/procedures-01-lixiang.js'), H.req('js/data/procedures-02-yongdi.js'),
    H.req('js/data/procedures-03-guihua.js'),  H.req('js/data/procedures-04-pingjia.js'),
    H.req('js/data/procedures-05-zhaobiao.js'), H.req('js/data/procedures-06-shigong.js'),
    H.req('js/data/procedures-07-jungong.js')
  ]);
  return idx;
}

test('buildDetailModel 返回手续本体与上下游', () => {
  const idx = prepare();
  const m = detail.buildDetailModel('lx-1', idx);
  assert.equal(m.proc.name, '线下沟通');
  assert.deepEqual(m.prevProcs, []);
  assert.ok(m.nextProcs.some((p) => p.id === 'lx-2'));
});

test('buildDetailModel 对不存在 id 返回 null', () => {
  const idx = prepare();
  assert.equal(detail.buildDetailModel('不存在', idx), null);
});

test('buildDetailModel 带出评价类提示', () => {
  const idx = prepare();
  const m = detail.buildDetailModel('pj-1', idx);
  assert.ok(m.hint.includes('建筑面积'));
});

test('buildDetailModel 列出引用了但尚未存在的模板 id', () => {
  const idx = prepare();
  const m = detail.buildDetailModel('lx-7', idx);
  assert.deepEqual(m.missingTemplateIds.sort(),
    ['tpl-gaisuan-moban', 'tpl-gaisuan-qingshi', 'tpl-gaisuan-wenben']);
});
