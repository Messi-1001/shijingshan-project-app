/* js/views/v-templates.js —— 页面 5：申请资料模板库（spec 3.5） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views['v-templates'] = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // 前 5 类为存量模板分类；后 3 类供自定义模板使用（④⑤ 空缺后补，spec 11.2）
  var CATEGORY_ORDER = ['土地手续', '规划手续', '发改委手续', '各类评价', '联合验收', '招标与合同', '施工许可', '其他'];

  function groupByCategory(list) {
    if (!list || !list.length) return [];
    return CATEGORY_ORDER.map(function (cat) {
      return { category: cat, items: list.filter(function (t) { return t.category === cat; }) };
    }).filter(function (g) { return g.items.length > 0; });
  }

  // 自定义模板不走 data.search（那里只认存量索引），用同一套字段规则过滤
  function searchCustom(list, kw) {
    var k = String(kw || '').trim().toLowerCase();
    if (!k) return (list || []).slice();
    return (list || []).filter(function (t) {
      return [t.fileName, t.category, t.type, t.dir].join(' ').toLowerCase().indexOf(k) >= 0;
    });
  }

  function render(params) {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var data = root.SJSQ.data.templates;
    var exp = root.SJSQ.logic.exporters;
    var ctMod = root.SJSQ.views['v-templates-custom'];
    var store = (root.SJSQ.app && root.SJSQ.app.store) || null;
    var customList = [];
    var keyword = (params && params.sub) || '';

    var desc = dom.h('p', { text: '存量模板 ' + data.allIds().length + ' 个。「可复用」= 空白模板 / 范本 / 请示函，支持一键复制与导出 Word；「参考」= 已填样例 / 批复 / 成果文件，仅供查看对照。' });
    var page = dom.h('div', { class: 'page' }, [
      dom.h('div', { class: 'page__head' }, [
        dom.h('h1', { text: '申请资料模板库' }),
        desc
      ])
    ]);

    var input = dom.h('input', {
      class: 'lib-search', type: 'search', value: keyword,
      placeholder: '搜索模板文件名或分类（如：概算 / 划拨 / 联合验收）'
    });
    var body = dom.h('div', {});

    function paint(kw) {
      dom.clear(body);
      desc.textContent = '存量模板 ' + data.allIds().length + ' 个' +
        (customList.length ? '，自定义模板 ' + customList.length + ' 个' : '') +
        '。「可复用」= 空白模板 / 范本 / 请示函，支持一键复制与导出 Word；「参考」= 已填样例 / 批复 / 成果文件，仅供查看对照。';
      var list = ctMod
        ? ctMod.mergeCustom(data.search(kw), searchCustom(customList, kw))
        : data.search(kw);
      var groups = groupByCategory(list);

      if (!groups.length) {
        body.appendChild(ui.empty('没有匹配的模板', '试试更短的关键词'));
        return;
      }

      groups.forEach(function (g) {
        body.appendChild(ui.section(g.category + '（' + g.items.length + '）', [
          ui.table(['模板名称', '类型', '可复制', '挂靠手续', '操作'],
            g.items.map(function (t) {
              var procs = (t.procedureIds || []).map(function (pid) {
                var p = root.SJSQ.app.procedures.byId[pid];
                return p ? ('第 ' + p.no + ' 项') : pid;
              }).join('、');

              return [
                dom.h('div', {}, [
                  dom.h('strong', { text: t.fileName }),
                  dom.h('div', { class: 'tpl-path', text: t.dir })
                ]),
                ui.tag(t.type, t.type === '可复用' ? 'done' : 'idle'),
                t.editable ? ui.tag('可复制', 'info') : ui.tag('扫描件', 'idle'),
                procs || '—',
                dom.h('div', { class: 'tpl-actions' }, [
                  ui.button('复制内容', {
                    disabled: !t.editable,
                    title: t.editable ? '' : '该模板为扫描件，请下载后手工填写',
                    onClick: function () { root.SJSQ.logic.renderTemplate.copyToClipboard(t, ui); }
                  }),
                  ui.button('打开文件', { onClick: function () { window.open(encodeURI(t.dir + '/' + t.fileName), '_blank'); } }),
                  ui.button('导出 Word', {
                    disabled: !t.editable,
                    onClick: function () {
                      var html = exp.buildDocHtml({
                        title: t.fileName.replace(/\.pdf$/i, ''),
                        meta: '来源：' + t.dir + '　类型：' + t.type,
                        sections: [{ h: '说明', html: '<p>本文件由模板库导出，内容为空白模板占位，请按项目实际情况填写。</p>' }]
                      });
                      root.SJSQ.logic.renderTemplate.downloadDoc(html, t.fileName);
                    }
                  })
                ])
              ];
            }), { empty: '' })
        ]));
      });
    }

    var deb = root.SJSQ.core.util.debounce(function () { paint(input.value); }, 120);
    input.addEventListener('input', deb);

    // 自定义模板：进页面异步带出（store meta 表），有「＋ 新增模板」入口（Task 38）
    if (ctMod && store) {
      ctMod.loadCustom(store).then(function (rows) {
        customList = rows || [];
        paint(input.value);
      });
    }
    var addBtn = ctMod ? ui.button('＋ 新增模板', { tone: 'primary', onClick: function () {
      ctMod.openAddDialog(
        root.SJSQ.app.store, root.SJSQ.app.procedures, function () { location.reload(); }
      );
    }}) : null;

    page.appendChild(dom.h('div', { class: 'page__actions' }, [input, addBtn]));
    page.appendChild(body);
    paint(keyword);
    return page;
  }

  return { CATEGORY_ORDER: CATEGORY_ORDER, groupByCategory: groupByCategory, searchCustom: searchCustom, render: render };
});
