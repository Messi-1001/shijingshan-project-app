/* tests/platforms.test.js —— 两申报平台步骤数据契约 + covers 与 40 条手续清单一致性（G15） */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAllProcedures } = require('./_helpers.js');
const p = require('../js/data/platforms.js');

test('两个平台', () => {
  assert.equal(p.PLATFORMS.length, 2);
  assert.deepEqual(p.PLATFORMS.map((x) => x.id), ['zxsb', 'gctj']);
});

test('平台 url 均为官方域名且 https', () => {
  p.PLATFORMS.forEach((pl) => {
    assert.match(pl.url, /^https:\/\//);
    assert.match(pl.url, /beijing\.gov\.cn/);
  });
});

test('每个平台 5–7 个步骤且字段齐全', () => {
  p.PLATFORMS.forEach((pl) => {
    assert.ok(pl.steps.length >= 5 && pl.steps.length <= 7, pl.id + ' 步骤数 ' + pl.steps.length);
    pl.steps.forEach((s) => {
      assert.ok(s.title && s.body, pl.id + ' 步骤缺 title/body');
      assert.equal(typeof s.days, 'number');
      assert.ok(Array.isArray(s.tips) && s.tips.length >= 1, s.title + ' 缺 tips');
    });
  });
});

test('getPlatform / platformsCovering', () => {
  assert.equal(p.getPlatform('zxsb').short, '在线平台');
  assert.equal(p.getPlatform('不存在'), null);
  assert.ok(p.platformsCovering('sg-1').some((x) => x.id === 'gctj'));
});

test('covers 覆盖全部手续清单中的平台办理项', () => {
  const all = p.PLATFORMS.reduce((a, x) => a.concat(x.covers), []);
  assert.equal(new Set(all).size, all.length, 'covers 有重复');
  assert.ok(all.length >= 15);
});

test('covers 里的 id 必须在阶段二全量清单里存在（G15 素材红线，测试锁死）', () => {
  const all = loadAllProcedures();
  assert.ok(all.length >= 40, '全量清单应为 40 条，实际 ' + all.length);
  const known = new Set(all.map((x) => x.id));
  p.PLATFORMS.forEach((pl) => {
    pl.covers.forEach((id) => assert.ok(known.has(id), pl.id + ' covers 指向未知手续 ' + id));
  });
});

test('STEP_FIELDS / STEP_DIAGRAM 契约', () => {
  assert.deepEqual(p.STEP_FIELDS, ['title', 'body', 'days', 'tips']);
  assert.deepEqual(p.STEP_DIAGRAM.map((d) => d.platform), ['zxsb', 'gctj']);
  p.STEP_DIAGRAM.forEach((d) => {
    assert.ok(d.title, '外层流程缺标题');
    assert.ok(d.steps.length >= 4, d.platform + ' 外层流程步骤过少');
    d.steps.forEach((s) => assert.ok(s.name && s.body, '外层流程步骤缺 name/body'));
  });
});

test('listPlatforms 返回拷贝，外部改动不污染源数据', () => {
  const a = p.listPlatforms();
  a.pop();
  assert.equal(p.PLATFORMS.length, 2);
});

test('validatePlatformSteps 对良好数据返回空数组', () => {
  assert.deepEqual(p.validatePlatformSteps(p.PLATFORMS), []);
});

test('validatePlatformSteps 能抓出缺损步骤', () => {
  const bad = [{ id: 'x', name: 'X', url: 'https://a.beijing.gov.cn/', short: 'X', scope: '', account: '', covers: [], steps: [{ title: 'T' }] }];
  const errs = p.validatePlatformSteps(bad);
  assert.ok(errs.length >= 2);
});

test('validatePlatformSteps 能抓出 covers 指向未知手续（传入已知清单上下文）', () => {
  const knownCtx = { list: [{ id: 'sg-1' }] };
  const bad = [{ id: 'x', name: 'X', url: 'https://a.beijing.gov.cn/', short: 'X', scope: 'S', account: 'A', covers: ['no-such-1'], steps: [{ title: 'T', body: 'B', days: 1, tips: ['t'] }] }];
  const errs = p.validatePlatformSteps(bad, knownCtx);
  assert.ok(errs.some((e) => e.indexOf('no-such-1') >= 0), '应报出未知手续 ' + errs.join(' | '));
});
