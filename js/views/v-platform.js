/* js/views/v-platform.js —— 平台办事导航页：双平台 Tab + 外层流程卡 + 平台内步骤 + 关联手续 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../data/platforms.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.vPlatform = factory(root.SJSQ.data.platforms);
  }
})(typeof self !== 'undefined' ? self : this, function (platforms) {
  'use strict';

  // hash 里的 id 非法 / 缺失时回落到第一个平台（zxsb）
  function resolvePlatformId(id) {
    var p = id && platforms.getPlatform(id);
    return p ? p.id : platforms.PLATFORMS[0].id;
  }

  // 纯函数：把 covers 解析成手续对象数组（索引里没有的 id 安静跳过）
  function buildPlatformView(platform, index) {
    var byId = (index && index.byId) || {};
    var related = (platform.covers || []).map(function (id) { return byId[id]; }).filter(Boolean);
    return {
      id: platform.id, name: platform.name, short: platform.short,
      url: platform.url, account: platform.account, scope: platform.scope,
      steps: platform.steps.slice(), relatedProcedures: related,
    };
  }

  // 纯函数：步骤 → 表格行 [序号, 动作, 在平台哪做, 大概天数, 最容易错在哪]
  function stepToRows(steps) {
    return steps.map(function (s, i) {
      return [String(i + 1), s.title, s.body, s.days + ' 天', s.tips.join('；')];
    });
  }

  function render(params) {
    var ui = window.SJSQ.views.ui, h = window.SJSQ.core.dom.h, router = window.SJSQ.core.router;
    // 运行时手续索引：boot 后挂在 SJSQ.app.procedures（{ list, byId, ... }）
    var index = window.SJSQ.app && window.SJSQ.app.procedures;
    var cur = resolvePlatformId(params && params.id);
    var wrap = h('div', { class: 'view view-platform' });

    // 顶部 Tab：当前平台写进 hash（#/platform/zxsb），刷新后仍停在原平台
    var tabs = h('div', { class: 'tabs' }, platforms.PLATFORMS.map(function (p) {
      return h('a', { class: 'tab' + (p.id === cur ? ' active' : ''), href: router.buildHash('platform', { id: p.id }) }, p.short);
    }));
    wrap.appendChild(tabs);

    var pl = platforms.getPlatform(cur);
    var v = buildPlatformView(pl, index);

    // 平台之外的外层流程（线下沟通 / 评审 / 主任会 / 签批 …）放最上面，先看懂"外面一圈"
    var diagram = (platforms.STEP_DIAGRAM.filter(function (d) { return d.platform === cur; })[0] || { steps: [] });
    if (diagram.steps && diagram.steps.length) {
      wrap.appendChild(ui.card(diagram.title + '（平台之外，先走这圈）', ui.stepCards(diagram.steps.map(function (s) {
        return { title: s.name, body: s.body };
      }))));
    }

    // 平台信息卡：入口用 <a target="_blank" rel="noopener noreferrer">，不用 window.open
    wrap.appendChild(ui.card(v.name, [
      h('p', { class: 'plat-scope' }, v.scope),
      h('ul', { class: 'plat-meta' }, [
        h('li', {}, [h('b', {}, '入口：'), h('a', { href: v.url, target: '_blank', rel: 'noopener noreferrer' }, v.url)]),
        h('li', {}, [h('b', {}, '账号：'), v.account]),
        h('li', {}, [h('b', {}, '需办账号：'), '法人一证通（由项目单位法定代表人办理，1 主 1 备经办人）']),
      ]),
    ]));

    // 平台内步骤卡：说明 + 大概天数 + 易错点
    wrap.appendChild(ui.card('平台内 ' + v.steps.length + ' 步（按顺序做）', ui.stepCards(v.steps.map(function (s, i) {
      return { title: '第 ' + (i + 1) + ' 步 · ' + s.title, body: s.body + '（约 ' + s.days + ' 天）\n易错：' + s.tips.join('；') };
    }))));

    wrap.appendChild(ui.card('步骤速查表', ui.table(['序号', '动作', '在平台做什么', '参考天数', '最容易错在哪'], stepToRows(v.steps))));

    wrap.appendChild(ui.card('本平台涉及的手续（' + v.relatedProcedures.length + ' 项）', ui.table(
      ['编号', '名称', '主管部门'],
      v.relatedProcedures.map(function (p) { return [p.no, p.name, p.dept]; }),
      { empty: '本平台未关联到已登记手续' }
    )));

    wrap.appendChild(ui.card('提示', h('p', { class: 'notice' },
      '平台界面与事项名称可能随政策调整。本页步骤与天数为经验参考值，办理前请在平台"办事指南"栏目核对当前事项清单。')));

    return wrap;
  }

  return { resolvePlatformId: resolvePlatformId, buildPlatformView: buildPlatformView, stepToRows: stepToRows, render: render };
});
