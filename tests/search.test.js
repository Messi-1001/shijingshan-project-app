/* tests/search.test.js —— 全局搜索（Task 56）：normalize / buildSearchIndex / search / highlight */
const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../js/logic/search.js');

const DATA = {
  proceduresIndex: { list: [
    { id: 'lx-1', no: '1', name: '项目建议书', dept: '区发改委', remark: '含资金来源说明' },
    { id: 'sg-1', no: '20', name: '建筑工程施工许可证', dept: '区住建委', remark: '' },
  ], byId: {} },
  templatesIndex: { list: [{ id: 't-1', name: '项目建议书模板', category: '立项', fileName: '项目建议书.doc', editable: true }] },
  rejectReasons: { REASONS: [{ id: 'r-001', category: '形式类', appliesTo: 'ALL', freq: '常见', reason: '漏盖公章', fix: '补齐盖章', avoid: '' }] },
  platforms: { PLATFORMS: [{ id: 'zxsb', name: '北京市投资项目在线审批监管平台', short: '在线平台', scope: '立项申报', url: 'https://tzxm.beijing.gov.cn/', covers: [], steps: [{ title: '注册', body: '绑定单位', days: 3, tips: [] }] }] },
};

test('normalize 全角转半角、去空格、小写', () => {
  assert.equal(s.normalize('ＡＢＣ 12'), 'abc12');
  assert.equal(s.normalize('项目 建议书'), '项目建议书');
});

test('buildSearchIndex 四类都进', () => {
  const idx = s.buildSearchIndex(DATA);
  const kinds = new Set(idx.map((x) => x.kind));
  assert.deepEqual([...kinds].sort(), ['platform', 'procedure', 'reason', 'template']);
  assert.ok(idx.every((x) => x.hash.startsWith('#/')));
});

test('search 按名称命中', () => {
  const r = s.search('施工许可', { __data: DATA });
  assert.ok(r.hits.length >= 1);
  assert.equal(r.hits[0].title.includes('施工许可证'), true);
});

test('search 忽略空格与全角', () => {
  const r = s.search('项目 建议书', { __data: DATA });
  assert.ok(r.hits.length >= 1);
});

test('search 空查询返回空结果但结构完整', () => {
  const r = s.search('   ', { __data: DATA });
  assert.equal(r.total, 0);
  assert.deepEqual(r.hits, []);
  assert.ok(r.byKind);
});

test('opts.kinds 限定类别', () => {
  const r = s.search('项目', { __data: DATA, kinds: ['template'] });
  assert.ok(r.hits.every((x) => x.kind === 'template'));
});

test('标题命中排在正文命中之前', () => {
  const r = s.search('项目', { __data: DATA });
  assert.equal(r.hits[0].title.includes('项目'), true);
});

test('highlight 先转义再包 mark', () => {
  const out = s.highlight('<b>项目</b>建议书', '项目');
  assert.ok(out.includes('&lt;b&gt;'));
  assert.ok(out.includes('<mark>项目</mark>'));
});

test('highlight 查询为空时原样转义', () => {
  assert.equal(s.highlight('<x>', ''), '&lt;x&gt;');
});

test('limit 生效', () => {
  const r = s.search('项目', { __data: DATA, limit: 1 });
  assert.ok(r.hits.length <= 1);
  assert.equal(r.total >= 1, true);
});

// —— hash 与 core/router.js 的 buildHash 同构（id 走路径段，focus 走查询串）——
test('索引 hash 与 router.buildHash 产物一致，且可被 parseHash 还原', () => {
  const router = require('../js/core/router.js');
  const idx = s.buildSearchIndex(DATA);
  const expected = {
    procedure: router.buildHash('detail', { id: DATA.proceduresIndex.list[0].id }),
    template: router.buildHash('templates', { focus: DATA.templatesIndex.list[0].id }),
    reason: router.buildHash('reasons', { focus: DATA.rejectReasons.REASONS[0].id }),
    platform: router.buildHash('platform', { id: DATA.platforms.PLATFORMS[0].id }),
  };
  Object.keys(expected).forEach(function (kind) {
    const hit = idx.find((x) => x.kind === kind);
    assert.equal(hit.hash, expected[kind], kind + ' 的 hash 与 buildHash 不一致');
    const parsed = router.parseHash(hit.hash);
    assert.ok(parsed.name, kind + ' 的 hash 解析不出路由名');
    if (kind === 'procedure' || kind === 'platform') assert.equal(parsed.params.id, DATA[kind === 'procedure' ? 'proceduresIndex' : 'platforms'][kind === 'procedure' ? 'list' : 'PLATFORMS'][0].id);
    else assert.equal(parsed.params.focus, DATA[kind === 'template' ? 'templatesIndex' : 'rejectReasons'][kind === 'template' ? 'list' : 'REASONS'][0].id);
  });
});
