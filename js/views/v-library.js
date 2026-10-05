/* js/views/v-library.js —— 页面 3：全量手续库（spec 3.3） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views['v-library'] = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function schema() {
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.schema) return root.SJSQ.data.schema;
    if (typeof module !== 'undefined' && module.exports) return require('../data/schema.js');
    return null;
  }

  /** 纯函数：把手续列表整理成"按板块分组"的展示结构，空板块保留 */
  function groupForDisplay(list) {
    var sch = schema();
    var order = sch.SECTION_ORDER;
    return order.map(function (key) {
      var items = (list || []).filter(function (p) { return p.section === key; })
        .sort(function (a, b) { return (a.no || 0) - (b.no || 0); });
      return { section: key, meta: sch.SECTIONS[key], items: items, empty: items.length === 0 };
    });
  }

  function render() {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var idx = root.SJSQ.data.index;
    var guidance = root.SJSQ.data.guidance;
    var counts = root.SJSQ.app.procedures.counts;

    var page = dom.h('div', { class: 'page' }, [
      dom.h('div', { class: 'page__head' }, [
        dom.h('h1', { text: '全量手续库' }),
        dom.h('p', { text: '新建学校工程从前期立项到竣工验收的全部手续，共 ' + counts.total +
          ' 条登记（其中有效 ' + counts.effective + ' 项、预留 ' + counts.reserved + ' 项）。' })
      ])
    ]);

    var searchInput = dom.h('input', {
      class: 'lib-search', type: 'search',
      placeholder: '搜索手续名称、办理部门、依据或说明（如：划拨 / 规自 / 副市长）'
    });

    var body = dom.h('div', {});

    function paint(keyword) {
      dom.clear(body);
      var list = idx.searchProcedures(keyword);
      var groups = groupForDisplay(list);

      groups.forEach(function (g) {
        var rows = g.items.map(function (p) {
          return [
            p.no === null ? '—' : String(p.no),
            dom.h('a', {
              href: '#/detail/' + p.id,
              text: p.name
            }),
            p.dept || '—',
            p.duration || '—',
            (p.prev || []).length ? String((p.prev || []).length) + ' 项' : '无',
            ui.tag(p.reserved ? '预留' : (p.source || '✅'), p.reserved ? 'idle' : 'info')
          ];
        });

        var block = ui.section(g.meta.no + ' ' + g.meta.name + '（' + g.items.length + ' 项）', [
          g.empty
            ? ui.empty('本板块暂无数据')
            : ui.table(['#', '手续名称', '办理部门', '参考时限', '前置', '来源'], rows, { empty: '' })
        ]);
        body.appendChild(block);
      });

      if (idx.closingNote()) {
        body.appendChild(ui.section('⑧ 收尾结算（一句话说明，不编号）', [
          dom.h('div', { class: 'ui-card' }, [
            dom.h('div', { class: 'ui-card__body' }, [dom.h('p', { text: idx.closingNote() })])
          ])
        ]));
      }

      body.appendChild(ui.section('不列入本系统的项目（备忘）', [
        ui.table(['项目', '不列入理由'], (guidance ? guidance.EXCLUDED : []).map(function (x) {
          return [x.name, x.reason];
        }))
      ]));
    }

    var debounced = root.SJSQ.core.util.debounce(function () { paint(searchInput.value); }, 120);
    searchInput.addEventListener('input', debounced);
    searchInput.addEventListener('search', function () { paint(searchInput.value); });

    page.appendChild(dom.h('div', { class: 'page__actions' }, [searchInput]));
    page.appendChild(body);
    paint('');
    return page;
  }

  return { groupForDisplay: groupForDisplay, render: render };
});
