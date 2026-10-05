/* js/views/v-reasons.js —— 退回原因库页：四类目 Tab + 按手续筛选 + 焦点跳转 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../data/reject-reasons.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.vReasons = factory(root.SJSQ.data.rejectReasons);
  }
})(typeof self !== 'undefined' ? self : this, function (reasons) {
  'use strict';

  // 纯函数：按类目 / 手续过滤；按手续过滤时保留通用项（appliesTo === 'ALL'）
  function filterReasons(all, opts) {
    opts = opts || {};
    var out = (all || []).slice();
    if (opts.category && opts.category !== '全部') {
      out = out.filter(function (x) { return x.category === opts.category; });
    }
    if (opts.procedureId) {
      out = out.filter(function (x) {
        return x.appliesTo === 'ALL' || (Array.isArray(x.appliesTo) && x.appliesTo.indexOf(opts.procedureId) >= 0);
      });
    }
    return out;
  }

  // 纯函数：按 CATEGORIES 固定顺序分组，组内常见项排前
  function buildGroupedView(list) {
    var g = {};
    (list || []).forEach(function (x) { (g[x.category] = g[x.category] || []).push(x); });
    return reasons.CATEGORIES.filter(function (c) { return g[c] && g[c].length; })
      .map(function (c) {
        g[c].sort(function (a, b) { return (a.freq === b.freq) ? (a.id < b.id ? -1 : 1) : (a.freq === '常见' ? -1 : 1); });
        return { category: c, items: g[c] };
      });
  }

  function appliesLabel(a) {
    if (a === 'ALL') return '全部手续';
    return Array.isArray(a) ? a.join('、') : String(a);
  }

  function render(params) {
    var ui = window.SJSQ.views.ui, h = window.SJSQ.core.dom.h, router = window.SJSQ.core.router;
    // 运行时手续索引：boot 后挂在 SJSQ.app.procedures（与 v-platform 同口径）
    var index = (window.SJSQ.app && window.SJSQ.app.procedures) || { list: [] };
    var focus = (params && params.focus) || null;
    var state = {
      category: (params && params.category) || '全部',
      procedureId: (params && params.procedureId) || '',
    };
    var wrap = h('div', { class: 'view view-reasons' });
    var bar = null;

    function draw() {
      wrap.innerHTML = '';
      wrap.appendChild(h('div', { class: 'tabs' }, ['全部'].concat(reasons.CATEGORIES).map(function (c) {
        return h('a', {
          class: 'tab' + (c === state.category ? ' active' : ''),
          href: router.buildHash('reasons', { category: c === '全部' ? '' : c, procedureId: state.procedureId }),
        }, c);
      })));

      var procOptions = [{ value: '', label: '全部手续' }].concat(index.list.map(function (p) {
        return { value: p.id, label: (p.no ? p.no + '. ' : '') + p.name };
      }));
      bar = h('div', { class: 'reasons-filter' }, [
        ui.field({ label: '按手续筛选', name: 'procedureId', type: 'select', value: state.procedureId, options: procOptions }),
      ]);
      wrap.appendChild(ui.card('筛选', bar));

      var list = filterReasons(reasons.REASONS, { category: state.category, procedureId: state.procedureId });
      var groups = buildGroupedView(list);
      var total = list.length;

      wrap.appendChild(ui.card('共 ' + total + ' 条', groups.length ? groups.map(function (g) {
        return h('div', { class: 'reasons-group' }, [
          h('h4', { class: 'reasons-group-title' }, g.category + '（' + g.items.length + '）'),
          h('div', { class: 'reasons-items' }, g.items.map(function (x) {
            return h('div', { class: 'reason-card' + (focus === x.id ? ' focus' : ''), id: 'reason-' + x.id }, [
              h('div', { class: 'reason-head' }, [
                h('div', { class: 'reason-text' }, x.reason),
                ui.tag(x.freq, x.freq === '常见' ? 'doing' : 'idle'),
              ]),
              h('div', { class: 'reason-line' }, [h('b', {}, '怎么改：'), x.fix]),
              x.avoid ? h('div', { class: 'reason-line muted' }, [h('b', {}, '怎么避免：'), x.avoid]) : null,
              h('div', { class: 'reason-applies' }, '适用：' + appliesLabel(x.appliesTo)),
            ]);
          })),
        ]);
      }) : ui.empty('没有匹配的原因', '试一试切换类目，或把"按手续筛选"改回全部。')));

      wrap.appendChild(ui.card('说明', h('p', { class: 'notice' },
        '以上为从材料与形式角度可自查的通用问题，不代表任何部门的内部退件口径。办理前请以平台"办事指南"为准。')));

      var sel = bar.querySelector('[name=procedureId]');
      if (sel) sel.addEventListener('change', function () {
        state.procedureId = sel.value;
        draw();
      });
    }

    draw();
    if (focus) setTimeout(function () {
      var el = document.getElementById('reason-' + focus);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    }, 0);
    return wrap;
  }

  return { filterReasons: filterReasons, buildGroupedView: buildGroupedView, appliesLabel: appliesLabel, render: render };
});
