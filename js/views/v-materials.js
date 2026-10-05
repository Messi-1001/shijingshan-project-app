/* js/views/v-materials.js —— 页面 6：材料清单一键汇总（spec 3.11） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views['v-materials'] = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function render(params) {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var mat = root.SJSQ.logic.materials;
    var exp = root.SJSQ.logic.exporters;
    var app = root.SJSQ.app;
    var state = app.state;

    var projectId = (params && params.id) || state.get().currentId;
    var list = app.procedures.list;

    var page = dom.h('div', { class: 'page' }, [
      dom.h('div', { class: 'page__head' }, [
        dom.h('h1', { text: '材料清单一键汇总' }),
        dom.h('p', { text: '按项目专属清单里的全部手续，汇总成一份带去办事的材料清单。同名材料自动合并份数。' })
      ])
    ]);

    var viewMode = 'flat'; // flat | byProvider
    var body = dom.h('div', {});
    var headInfo = dom.h('div', {});
    // 备料勾选（终审 I-3）：内存态即可，不持久化；键为合并后材料名
    var checkedMap = {};

    function currentRows() {
      var rows = mat.collect(list);
      if (!projectId) return rows;
      return rows; // 本期四维固定，专属清单=全量；将来启用筛选时在此按 kept 过滤
    }

    function paint() {
      var rows = currentRows();
      var s = mat.summarize(rows);
      var merged = mat.mergeDuplicates(rows);
      var warn = mat.warnings(merged);

      dom.clear(headInfo);
      headInfo.appendChild(ui.card('汇总概览', dom.h('div', { class: 'cl-overview' }, [
        dom.h('div', { class: 'cl-stats' }, [
          dom.h('div', {}, ['材料条目：', dom.h('strong', { text: String(s.rawCount) })]),
          dom.h('div', {}, ['合并后：', dom.h('strong', { text: String(s.mergedCount) })]),
          dom.h('div', {}, ['合计份数：', dom.h('strong', { text: String(s.totalCopies) })]),
          dom.h('div', {}, ['涉及手续：', dom.h('strong', {
            text: String(rows.map(function (r) { return r.procedureName; })
              .filter(function (v, i, a) { return a.indexOf(v) === i; }).length)
          })])
        ]),
        warn.length ? dom.h('details', { class: 'cl-dropped' }, [
          dom.h('summary', { text: '⚠ ' + warn.length + ' 处材料信息不全（点击展开）' }),
          dom.h('ul', {}, warn.slice(0, 40).map(function (w) { return dom.h('li', { text: w }); }))
        ]) : null
      ])));

      dom.clear(body);

      if (viewMode === 'flat') {
        // 终审 I-3：勾选列 + 「已勾选 N / 共 M」小计
        var checkedN = mat.countChecked(checkedMap, merged);
        body.appendChild(ui.section('全部材料（已合并同名）· 已勾选 ' + checkedN + ' / 共 ' + merged.length, ui.table(
          ['备料', '材料名称', '份数', '盖章要求', '提供方', '涉及手续'],
          merged.map(function (r) {
            return [
              dom.h('input', {
                type: 'checkbox', checked: !!checkedMap[r.name],
                'aria-label': '备料勾选：' + r.name,
                onChange: function (e) {
                  checkedMap = mat.toggleCheck(checkedMap, r.name);
                  paint();
                }
              }),
              r.name, r.copies || '待确认', r.seal || '待确认', r.provider || '待确认', r.from.join('、')
            ];
          }), { empty: '暂无可汇总的材料' })));
      } else {
        var groups = mat.groupByProvider(merged);
        groups.forEach(function (g) {
          body.appendChild(ui.section(g.provider + '（' + g.items.length + ' 项）', ui.table(
            ['材料名称', '份数', '盖章要求'],
            g.items.map(function (r) { return [r.name, r.copies || '待确认', r.seal || '待确认']; }),
            { empty: '' })));
        });
      }
    }

    var actions = dom.h('div', { class: 'page__actions' }, [
      ui.button('按明细查看', { onClick: function () { viewMode = 'flat'; paint(); } }),
      ui.button('按提供方分组', { onClick: function () { viewMode = 'byProvider'; paint(); } }),
      ui.button('打印清单', { onClick: function () { window.print(); } }),
      ui.button('复制清单', { onClick: function () {
        var rows = mat.mergeDuplicates(currentRows());
        var text = rows.map(function (r) {
          return r.name + '　份数：' + (r.copies || '待确认') + '　盖章：' + (r.seal || '待确认') +
            '　提供方：' + (r.provider || '待确认');
        }).join('\n');
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { alert('已复制 ' + rows.length + ' 条材料'); });
      }}),
      ui.button('导出 Word', { tone: 'primary', onClick: function () {
        var rows = mat.mergeDuplicates(currentRows());
        var html = exp.buildDocHtml({
          title: '项目手续办理材料清单',
          meta: '生成时间：' + root.SJSQ.core.util.formatDate(new Date()),
          sections: [{ h: '一、材料清单', html: exp.buildTableHtml(
            ['序号', '材料名称', '份数', '盖章要求', '提供方'],
            rows.map(function (r, i) {
              return [String(i + 1), r.name, r.copies || '待确认', r.seal || '待确认', r.provider || '待确认'];
            })) }]
        });
        root.SJSQ.logic.renderTemplate.downloadDoc(html, '项目材料清单');
      }})
    ]);

    page.appendChild(headInfo);
    page.appendChild(actions);
    page.appendChild(body);
    paint();
    return page;
  }

  return { render: render };
});
