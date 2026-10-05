/* tests/integration-phase2.test.js —— 阶段二集成验收：锁死 40 条登记硬性数字 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');

const lists = [
  H.req('js/data/procedures-01-lixiang.js'), H.req('js/data/procedures-02-yongdi.js'),
  H.req('js/data/procedures-03-guihua.js'),  H.req('js/data/procedures-04-pingjia.js'),
  H.req('js/data/procedures-05-zhaobiao.js'), H.req('js/data/procedures-06-shigong.js'),
  H.req('js/data/procedures-07-jungong.js')
];
const idx = H.req('js/data/procedures-index.js');
const graph = H.req('js/logic/graph.js');
const guidance = H.req('js/data/guidance.js');
const out = idx.buildIndex(lists);

test('G6：40 条登记 = 37 有效 + 3 预留', () => {
  assert.equal(out.list.length, 40);
  assert.equal(out.list.filter((p) => p.reserved).length, 3);
});

test('G7：七个板块编号区间与 spec 第 4 节完全一致', () => {
  const expect = {
    lixiang: [1, 7], yongdi: [8, 14], guihua: [15, 20],
    pingjia: [21, 28], zhaobiao: [29, 33], shigong: [34, 34], jungong: [35, 40]
  };
  Object.keys(expect).forEach((k) => {
    const nos = out.bySection[k].map((p) => p.no);
    assert.equal(Math.min.apply(null, nos), expect[k][0], k + ' 起点');
    assert.equal(Math.max.apply(null, nos), expect[k][1], k + ' 终点');
  });
});

test('集合校验零错误（编号连续、id 唯一、无环、prev 有效）', () => {
  assert.deepEqual(out.errors, [], out.errors.join('\n'));
});

test('拓扑序长度为 40，且严格满足前置关系', () => {
  const order = graph.topoOrder(out.list);
  assert.equal(order.length, 40);
  const pos = {};
  order.forEach((id, i) => { pos[id] = i; });
  out.list.forEach((p) => (p.prev || []).forEach((pid) => {
    assert.ok(pos[pid] < pos[p.id], p.id + ' 的前置 ' + pid + ' 未排在前');
  }));
});

test('⑤ 施工许可只有 1 项且编号为 34', () => {
  assert.equal(out.bySection.shigong.length, 1);
  assert.equal(out.bySection.shigong[0].no, 34);
  assert.equal(out.bySection.shigong[0].name, '建筑工程施工许可证');
});

test('不列入清单的项目均在 guidance.EXCLUDED 里有据可查', () => {
  const names = out.list.map((p) => p.name).join('|');
  assert.equal(names.includes('建设用地规划许可证'), false);
  assert.equal(names.includes('质量监督登记'), false);
  assert.ok(guidance.EXCLUDED.some((x) => x.name.includes('建设用地规划许可证')));
});

test('每项手续都有 dept 与 notes（不写 notes 的手续是漏项的征兆）', () => {
  const bad = out.list.filter((p) => !p.dept || !p.notes);
  assert.deepEqual(bad.map((p) => p.id), []);
});

test('⑧ 收尾结算只在 CLOSING_NOTE 出现，不在手续列表中', () => {
  assert.ok(idx.closingNote().length > 10);
  assert.equal(out.list.some((p) => (p.name || '').includes('结算')), false);
});

test('串/并联识别：35–38 互为对等并联，39 汇合无对等', () => {
  const jg = out.bySection.jungong;
  const peersOf35 = graph.parallelPeers(out.list, 'jg-1').sort();
  assert.deepEqual(peersOf35, ['jg-2', 'jg-3', 'jg-4'], 'jg-1 的并联对等应为 36/37/38');
  jg.slice(0, 4).forEach((p) => {
    assert.equal(p.parallel, true, p.id + ' 数据应标记 parallel');
    assert.deepEqual(graph.parallelPeers(out.list, p.id).sort(),
      ['jg-1', 'jg-2', 'jg-3', 'jg-4'].filter((x) => x !== p.id), p.id + ' 对等集合');
  });
  assert.deepEqual(graph.parallelPeers(out.list, 'jg-5'), [], 'jg-5 是汇合点，无对等');
  assert.equal(out.bySection.pingjia.every((p) => p.parallel), true, '④′ 评价类全部可并联（spec ④′）');
});

test('七板块条数 = 7/7/6/8/5/1/6（阶段二自检清单）', () => {
  const expect = { lixiang: 7, yongdi: 7, guihua: 6, pingjia: 8, zhaobiao: 5, shigong: 1, jungong: 6 };
  Object.keys(expect).forEach((k) => {
    assert.equal(out.bySection[k].length, expect[k], k + ' 条数');
  });
});
