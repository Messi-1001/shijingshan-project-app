/* js/views/shell.js —— 页面壳层：导航 + 顶栏 + 路由挂载 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.shell = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // 导航分组：与 spec 第 6 节「页面结构」12 个页面一一对应
  var NAV_GROUPS = [
    { title: '办理', items: [
      { key: 'projects',  label: '项目管理' },
      { key: 'checklist', label: '我的项目专属清单' }
    ]},
    { title: '查阅', items: [
      { key: 'library',   label: '全量手续库' },
      { key: 'templates', label: '模板库' },
      { key: 'platform',  label: '平台办事导航' }
    ]},
    { title: '筹划', items: [
      { key: 'tender',    label: '招标工作时间计划' },
      { key: 'schedule',  label: '进度计划与倒排' },
      { key: 'estimate',  label: '投资估算计算器' }
    ]},
    { title: '输出', items: [
      { key: 'advice', label: '建议引擎' },
      { key: 'scheme', label: '方案与效果图' },
      { key: 'export', label: '导出中心' }
    ]}
  ];

  function createShell(opts) {
    var dom = root.SJSQ.core.dom;
    var router = root.SJSQ.core.router;
    var storeInfo = opts.storeInfo || { reason: '' };

    var mainEl = dom.h('main', { class: 'app-main' });

    // 降级提示独立容器：位于顶栏与 main 之间。router 的 render 只清 mainEl，
    // 永不触碰此容器，保证黄条不会被首次渲染冲掉（修复 F1）。
    var bannerZone = dom.h('div', { class: 'app-banner-zone' });

    var side = dom.h('aside', { class: 'app-side' }, [
      dom.h('div', { class: 'app-side__brand' }, [
        '学校工程手续辅助',
        dom.h('small', { text: '前期 → 竣工验收 · 石景山区' })
      ])
    ].concat(NAV_GROUPS.map(function (g) {
      return dom.h('div', { class: 'app-side__group' }, [
        dom.h('div', { class: 'app-side__group-title', text: g.title }),
        dom.h('ul', { class: 'app-nav' }, g.items.map(function (it) {
          return dom.h('li', {
            class: 'app-nav__item', dataset: { key: it.key }, text: it.label
          });
        }))
      ]);
    })));

    var top = dom.h('header', { class: 'app-top' }, [
      dom.h('span', { class: 'app-top__title', text: '石景山区学校工程「前期手续 → 竣工验收」辅助系统' })
    ]);

    var shellRoot = dom.h('div', { class: 'app' }, [side, top, bannerZone, mainEl]);

    var r = router.createRouter({
      routes: opts.routes,
      mount: mainEl,
      fallback: 'projects'
    });

    r.onChange(function (cur) {
      var items = side.querySelectorAll('.app-nav__item');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('is-active', items[i].dataset.key === cur.name);
      }
    });

    dom.on(side, 'click', '.app-nav__item', function (e, el) {
      r.go(el.dataset.key);
    });

    if (storeInfo.reason) {
      bannerZone.appendChild(dom.h('div', { class: 'app-banner' }, [
        '⚠ ', storeInfo.reason
      ]));
    }

    shellRoot.__router = r;
    return shellRoot;
  }

  return { NAV_GROUPS: NAV_GROUPS, createShell: createShell };
});
