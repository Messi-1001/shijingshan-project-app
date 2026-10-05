/* js/views/v-search.js —— 页面 11：全局搜索（Task 56，G24：关键词走查询串 ?q=中文） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../logic/search.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.vSearch = factory(root.SJSQ.logic.search);
  }
})(typeof self !== 'undefined' ? self : this, function (search) {
  'use strict';

  function render(params) {
    var ui = window.SJSQ.views.ui, h = window.SJSQ.core.dom.h, router = window.SJSQ.core.router;
    var q = (params && params.q) || '';
    var wrap = h('div', { class: 'view view-search' });
    // 自定义模板异步带出（store meta 表），取到后重绘，让检索项一并包含
    var customRows = null;
    var store = (window.SJSQ.app && window.SJSQ.app.store) || null;
    var ctMod = window.SJSQ.views['v-templates-custom'];
    if (ctMod && store) {
      ctMod.loadCustom(store).then(function (rows) {
        customRows = rows || [];
        draw(wrap.__lastQuery || q);
      }).catch(function () { /* 存储不可用时只搜存量数据 */ });
    }

    function doSearch(input) {
      var v = input.value;
      // G24：搜索参数进查询串，刷新 / 分享后结果仍在
      location.hash = router.buildHash('search', { q: v });
    }

    function draw(query) {
      wrap.__lastQuery = query;
      wrap.innerHTML = '';
      var input = h('input', {
        class: 'search-input', type: 'search', name: 'q', value: query,
        placeholder: '试试：施工许可 / 立项 / 漏盖公章 / 在线平台'
      });
      var form = h('form', { class: 'search-box' }, [
        input,
        ui.button('搜索', { tone: 'primary', onClick: function () { doSearch(input); } })
      ]);
      // 回车等价点按钮（form submit 由输入框回车触发）
      form.addEventListener('submit', function (e) { e.preventDefault(); doSearch(input); });
      wrap.appendChild(ui.card('全局搜索', form));

      if (!query) {
        wrap.appendChild(ui.card('搜索范围', ui.table(['类别', '说明'], [
          ['手续', '40 项登记手续的编号、名称、主管部门'],
          ['模板', '模板库内全部模板文件（含自定义模板）'],
          ['退回原因', '退回原因库的原因与整改动作'],
          ['平台', '两个申报平台的步骤与说明'],
        ])));
        return;
      }

      // 数据装配与 search.defaultData 同构：SJSQ.data 只有静态数据（平台/退回原因），
      // 手续/模板索引在 boot 后挂于 app.procedures / app.templates，必须一并带入，
      // 否则浏览器里「手续 / 模板」两类永远检索不到（阶段六实机验收发现）。
      var d = window.SJSQ.data || {};
      var a = window.SJSQ.app || {};
      var data = Object.assign({},
        d,
        a.procedures ? { proceduresIndex: a.procedures } : null,
        a.templates ? { templatesIndex: a.templates } : null,
        customRows ? { customTemplates: customRows } : null);
      var r = search.search(query, { index: search.buildSearchIndex(data) });
      var summary = search.SOURCES.map(function (k) {
        return search.KIND_LABEL[k] + ' ' + (r.byKind[k] || 0);
      }).join(' · ');
      wrap.appendChild(ui.card('找到 ' + r.total + ' 条（' + summary + '）', [
        h('p', { class: 'search-note' }, '关键词：' + query),
        ui.table(['类别', '结果', '所属'], r.hits.map(function (x) {
          return [
            x.kindLabel,
            // highlight 内部先转义再包 mark，可安全走 innerHTML
            h('a', { class: 'search-hit', href: x.hash, html: search.highlight(x.title, query) }),
            h('span', { class: 'muted', html: search.highlight(x.subtitle || '', query) })
          ];
        }), { empty: '没有匹配结果。换个关键词，或去"全量手续库"按编号查找。' })
      ]));
      if (r.total > r.hits.length) {
        wrap.appendChild(h('p', { class: 'search-note' }, '另有 ' + (r.total - r.hits.length) + ' 条未展示，请细化关键词。'));
      }
    }

    draw(q);
    return wrap;
  }

  return { render: render };
});
