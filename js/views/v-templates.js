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

  /* —— M3 深链聚焦：#/templates?focus=<templateId> —— */

  // 纯函数（Node 可测）：从 params 里解析 focus 目标 id，无则空串
  function focusTid(params) {
    var f = params && params.focus;
    return f ? String(f).trim() : '';
  }

  // 纯函数（Node 可测）：在模板列表里定位聚焦目标，找不到返回 null
  function pickFocusTemplate(list, focus) {
    var f = focusTid({ focus: focus });
    if (!f) return null;
    var arr = list || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === f) return arr[i];
    return null;
  }

  // DOM 侧：目标行加高亮 class，滚动到该行，1.5s 后移除高亮
  function applyFocus(scope, tid) {
    if (!scope || !tid) return;
    var el = scope.querySelector('[data-tid="' + tid + '"]');
    if (!el) return;
    var tr = el.closest ? el.closest('tr') : null;
    if (!tr) return;
    tr.classList.add('row-focus');
    if (tr.scrollIntoView) tr.scrollIntoView({ block: 'center' });
    setTimeout(function () { tr.classList.remove('row-focus'); }, 1500);
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
    var focusId = focusTid(params); // M3：#/templates?focus=<templateId> 深链聚焦

    // 终审 I-2：预取当前项目（state.currentId → store），供复制/导出时把占位符填成真实值。
    // store.get 是异步的，render 同步返回，先挂 null，取到后回调闭包内生效（点击必晚于此）。
    var curProject = null;
    var curState = (root.SJSQ.app && root.SJSQ.app.state) || null;
    var curId = curState ? curState.get().currentId : null;
    if (curId && store) {
      store.get('projects', curId).then(function (p) { curProject = p || null; }).catch(function () {});
    }

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
                dom.h('div', { dataset: { tid: t.id } }, [
                  // 终审 I-1：显示通用化名（label || fileName），fileName 不进 UI
                  dom.h('strong', { text: data.displayName(t) }),
                  dom.h('div', { class: 'tpl-path', text: t.dir })
                ]),
                ui.tag(t.type, t.type === '可复用' ? 'done' : 'idle'),
                t.editable ? ui.tag('可复制', 'info') : ui.tag('扫描件', 'idle'),
                procs || '—',
                dom.h('div', { class: 'tpl-actions' }, [
                  ui.button('复制内容', {
                    disabled: !t.editable,
                    title: t.editable ? '' : '该模板为扫描件，请下载后手工填写',
                    onClick: function () { root.SJSQ.logic.renderTemplate.copyToClipboard(t, ui, curProject); }
                  }),
                  // 自定义模板无实体文件（仅存在索引里），打开只会 404，置灰并说明
                  ui.button('打开文件', {
                    disabled: !!t.custom,
                    title: t.custom ? '自定义模板仅可复制/导出（无实体文件可打开）' : '',
                    onClick: function () { window.open(encodeURI(t.dir + '/' + t.fileName), '_blank'); }
                  }),
                  ui.button('导出 Word', {
                    disabled: !t.editable,
                    onClick: function () {
                      var rt = root.SJSQ.logic.renderTemplate;
                      var showName = data.displayName(t);
                      if (curProject) {
                        // 终审 I-2：有当前项目 → 12 个占位符填真实值后导出
                        var html = rt.buildFilledDoc(showName.replace(/\.pdf$/i, ''),
                          rt.listPlaceholders().join('\n'), curProject);
                        rt.downloadDoc(html, showName);
                        return;
                      }
                      var html0 = exp.buildDocHtml({
                        title: showName.replace(/\.pdf$/i, ''),
                        meta: '来源：' + t.dir + '　类型：' + t.type,
                        sections: [{ h: '说明', html: '<p>本文件由模板库导出，内容为空白模板占位，请按项目实际情况填写。</p>' }]
                      });
                      rt.downloadDoc(html0, showName);
                    }
                  })
                ])
              ];
            }), { empty: '' })
        ]));
      });

      // M3：paint 可能被搜索/自定义模板加载触发多次，聚焦跟随每次重建
      if (focusId) applyFocus(body, focusId);
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

  return { CATEGORY_ORDER: CATEGORY_ORDER, groupByCategory: groupByCategory, searchCustom: searchCustom, render: render, focusTid: focusTid, pickFocusTemplate: pickFocusTemplate, applyFocus: applyFocus };
});
