/* js/views/v-scheme.js —— 页面 14：方案与效果图（2 版切换 + 占位图降级 + 横向对比） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../data/schemes.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.vScheme = factory(root.SJSQ.data.schemes);
  }
})(typeof self !== 'undefined' ? self : this, function (schemes) {
  'use strict';

  // 纯函数（Node 可测）：把方案数据转成卡片视图模型
  function buildCards(list, opts) {
    opts = opts || {};
    var exists = opts.exists || null;
    return list.map(function (x) {
      return {
        id: x.id, name: x.name, img: x.image,
        exists: exists ? !!exists[x.id] : true,
        placeholder: schemes.PLACEHOLDER,
        concept: x.concept,
        features: (x.features || []).slice(),
        areaRows: Object.keys(x.area || {}).map(function (k) { return [k, x.area[k]]; }),
        pros: (x.pros || []).slice(),
        cons: (x.cons || []).slice(),
      };
    });
  }

  function render(params) {
    var ui = window.SJSQ.views.ui, h = window.SJSQ.core.dom.h, router = window.SJSQ.core.router;
    var cur = (params && params.id) || schemes.SCHEMES[0].id;
    if (!schemes.getScheme(cur)) cur = schemes.SCHEMES[0].id;
    var wrap = h('div', { class: 'view view-scheme' });

    // G24：页面内一切链接一律走 router.buildHash
    wrap.appendChild(h('div', { class: 'tabs' }, schemes.SCHEMES.map(function (s) {
      return h('a', { class: 'tab' + (s.id === cur ? ' active' : ''), href: router.buildHash('scheme', { id: s.id }) }, s.name);
    })));

    var cards = buildCards(schemes.SCHEMES);
    var c = cards.filter(function (x) { return x.id === cur; })[0];

    // 图片加载失败时 onerror 换占位图，不出现破图图标（Task 64 用真图替换）
    var img = h('img', { class: 'scheme-img', src: c.img, alt: c.name + ' 鸟瞰效果图' });
    var tag = h('span', { class: 'scheme-tag' }, c.exists ? '效果图（概念示意）' : '效果图待生成（当前为占位图）');
    img.addEventListener('error', function () {
      img.src = c.placeholder;
      tag.textContent = '效果图待生成（当前为占位图）';
    });

    wrap.appendChild(ui.card(c.name, [
      h('div', { class: 'scheme-figure' }, [img, tag]),
      h('p', { class: 'scheme-concept' }, c.concept),
    ]));

    wrap.appendChild(ui.card('方案要点', h('ul', { class: 'scheme-list' },
      c.features.map(function (f) { return h('li', {}, f); }))));

    // G15 口径纪律：示意指标必须显式声明非正式设计成果
    wrap.appendChild(ui.card('主要指标（示意）', [
      ui.table(['指标', '数值'], c.areaRows),
      h('p', { class: 'notice' }, '上述指标为概念方案示意值，用于说明两种布局取向的差异，不构成正式设计成果。'),
    ]));

    wrap.appendChild(ui.card('优劣势对比', ui.table(['项目', c.name], [
      ['优势', c.pros.join('；')],
      ['制约', c.cons.join('；')],
    ])));

    wrap.appendChild(ui.card('两方案横向对比', ui.table(
      ['对比项'].concat(cards.map(function (x) { return x.name; })),
      Object.keys(schemes.SCHEMES[0].area).map(function (k) {
        return [k].concat(cards.map(function (x) {
          var r = x.areaRows.filter(function (a) { return a[0] === k; })[0];
          return r ? r[1] : '—';
        }));
      }).concat([
        ['布局特点'].concat(cards.map(function (x) { return x.concept.slice(0, 18) + '…'; })),
      ])
    )));

    wrap.appendChild(h('div', { class: 'actions' }, [
      ui.button('打印本页', { onClick: function () { window.print(); } }),
      ui.button('返回导出中心', { onClick: function () { location.hash = router.buildHash('export'); } }),
    ]));

    return wrap;
  }

  return { buildCards: buildCards, render: render };
});
