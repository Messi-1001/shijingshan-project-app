/* js/views/v-tender.js —— 页面 6：招标工作时间计划 + 施工招标方式建议（spec 3.6 / 3.7） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views['v-tender'] = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // 纯函数（Node 可测）：招标参数默认值
  function defaultInput() {
    return { startDate: '', urgency: '正常', complexity: '中',
      techComplexity: false, hasSpecialRequirements: false };
  }

  // 纯函数（Node 可测）：将 meta 表读回的记录合并到默认值上，
  // 字段缺失 / 取值非法时回退默认，保证刷新恢复不产生脏状态（G22）。
  function mergeInput(saved) {
    var d = defaultInput();
    var s = saved && typeof saved === 'object' ? saved : {};
    return {
      startDate: typeof s.startDate === 'string' && s.startDate ? s.startDate : d.startDate,
      urgency: ['宽松', '正常', '紧张'].indexOf(s.urgency) >= 0 ? s.urgency : d.urgency,
      complexity: ['低', '中', '高'].indexOf(s.complexity) >= 0 ? s.complexity : d.complexity,
      techComplexity: s.techComplexity === true,
      hasSpecialRequirements: s.hasSpecialRequirements === true,
    };
  }

  function render() {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var tender = root.SJSQ.logic.tender;
    var util = root.SJSQ.core.util;
    var router = root.SJSQ.core.router;
    var store = root.SJSQ.app && root.SJSQ.app.store;
    var META_ID = 'tenderInput'; // G22：单例设置统一存 meta 表（同 v-schedule / v-estimate）

    var state = mergeInput(null);
    if (!state.startDate) { state.startDate = util.formatDate(new Date()); }

    var page = dom.h('div', { class: 'page' }, [
      dom.h('div', { class: 'page__head' }, [
        dom.h('h1', { text: '招标工作时间计划' }),
        dom.h('p', { text: '设计 / 勘察 / 监理 / 施工四类招标的时间轴，以及施工招标方式（资格预审 vs 资格后审）建议。' })
      ])
    ]);

    // 输入区
    var form = dom.h('div', { class: 'form-grid' }, [
      ui.field({ label: '招标启动日期', name: 'startDate', type: 'date', value: state.startDate }),
      ui.field({ label: '工期紧迫度', name: 'urgency', type: 'select',
        options: ['宽松', '正常', '紧张'], value: state.urgency }),
      ui.field({ label: '工程复杂度', name: 'complexity', type: 'select',
        options: ['低', '中', '高'], value: state.complexity }),
      ui.field({ label: '技术特别复杂', name: 'techComplexity', type: 'select',
        options: [{ value: 'false', label: '否' }, { value: 'true', label: '是' }] }),
      ui.field({ label: '有特殊资质 / 业绩要求', name: 'hasSpecialRequirements', type: 'select',
        options: [{ value: 'false', label: '否' }, { value: 'true', label: '是' }] })
    ]);

    var timelineSlot = dom.h('div', {});
    var adviceSlot = dom.h('div', {});

    function readForm() {
      var g = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value : ''; };
      state.startDate = g('startDate') || state.startDate;
      state.urgency = g('urgency');
      state.complexity = g('complexity');
      state.techComplexity = g('techComplexity') === 'true';
      state.hasSpecialRequirements = g('hasSpecialRequirements') === 'true';
    }

    // meta 恢复后把读回值同步回表单控件，再重绘结果区
    function applyToForm() {
      var set = function (n, v) { var el = form.querySelector('[name="' + n + '"]'); if (el) el.value = v; };
      set('startDate', state.startDate);
      set('urgency', state.urgency);
      set('complexity', state.complexity);
      set('techComplexity', String(state.techComplexity));
      set('hasSpecialRequirements', String(state.hasSpecialRequirements));
    }

    function paint() {
      // ① 四类招标时间轴
      dom.clear(timelineSlot);
      var all = tender.buildAllTimelines({ startDate: state.startDate });
      timelineSlot.appendChild(ui.section('一、四类招标工作时间轴', all.map(function (tl) {
        return ui.card(tl.type + '招标（共 ' + tl.totalDays + ' 天，至 ' + tl.endDate + '）', [
          ui.timelineBar(tl.phases.map(function (p) { return { name: p.name, duration: p.days }; })),
          ui.table(['环节', '天数', '起', '止'], tl.phases.map(function (p) {
            return [p.name, String(p.days), p.startDate || '—', p.endDate || '—'];
          }), { empty: '' })
        ]);
      })));

      // ② 施工招标方式建议
      dom.clear(adviceSlot);
      var a = tender.adviseMethod(state);
      adviceSlot.appendChild(ui.section('二、施工招标方式建议', [
        ui.card('建议采用：' + a.method, [
          dom.h('p', {}, ['预估招标周期：', dom.h('strong', { text: a.periodDays + ' 天' })]),
          dom.h('h4', { text: '判定理由' }),
          dom.h('ul', {}, a.reasons.map(function (r) { return dom.h('li', { text: r }); })),
          dom.h('h4', { text: '关键节点' }),
          ui.table(['节点', '天数'], a.keyNodes.map(function (n) { return [n.name, String(n.days)]; }), { empty: '' }),
          dom.h('h4', { text: '风险提示' }),
          dom.h('ul', {}, a.risks.map(function (r) { return dom.h('li', { text: r }); }))
        ])
      ]));
    }

    // 「提前开展勘察设计招标」提示（G24：站内链接统一走 buildHash，禁止硬编码 hash）
    var early = ui.card('前置：提前开展勘察设计招标', [
      dom.h('p', { text: '勘察设计招标可在整个项目招标核准前提前开展，但需先报发改委审查并取得批复。' }),
      dom.h('p', {}, [dom.h('a', {
        href: router.buildHash('detail', { id: 'zb-1' }),
        text: '查看第 29 项 · 提前开展勘察设计招标方案审查'
      })])
    ]);

    page.appendChild(ui.card('参数', form));
    page.appendChild(early);
    page.appendChild(timelineSlot);
    page.appendChild(adviceSlot);

    // 表单变化即重算，并持久化到 meta 表（G22：刷新后可恢复）
    form.addEventListener('change', function () {
      readForm();
      if (store) {
        try { store.put('meta', { id: META_ID, value: state }); } catch (e) { /* 存储失败不打断页面 */ }
      }
      paint();
    });

    page.appendChild(dom.h('div', { class: 'page__actions' }, [
      ui.button('打印计划', { onClick: function () { window.print(); } })
    ]));

    paint();

    // 首次进入时从 meta 表恢复上次的招标参数（G22）
    if (store) {
      Promise.resolve(store.get('meta', META_ID)).then(function (row) {
        if (row && row.value) {
          state = mergeInput(row.value);
          if (!state.startDate) { state.startDate = util.formatDate(new Date()); }
          applyToForm();
          paint();
        }
      }).catch(function () { /* 读取失败保持默认值，不打断页面 */ });
    }

    return page;
  }

  return { defaultInput: defaultInput, mergeInput: mergeInput, render: render };
});
