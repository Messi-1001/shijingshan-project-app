/* js/views/v-schedule.js —— 页面 7：进度计划（正排/倒排 + 甘特图 + 关键路径 + 关键节点） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../logic/schedule.js'), require('../logic/tender.js'), require('../core/util.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.vSchedule = factory(root.SJSQ.logic.schedule, root.SJSQ.logic.tender, root.SJSQ.core.util);
  }
})(typeof self !== 'undefined' ? self : this, function (schedule, tender, util) {
  'use strict';
  var MILESTONE_IDS = ['lx-1', 'pj-1', 'gh-1', 'zb-1', 'sg-1', 'jg-6'];

  function todayStr() {
    var d = new Date();
    return util.pad2(d.getFullYear()) + '-' + util.pad2(d.getMonth() + 1) + '-' + util.pad2(d.getDate());
  }

  function defaultInput() {
    var s = todayStr();
    return { mode: 'forward', startDate: s, targetEndDate: tender.addDays(s, 365) };
  }

  // 纯函数（Node 可测）：index = { list, byId }，input = { mode, startDate, targetEndDate }
  function buildView(index, input) {
    var sched = schedule.buildSchedule(index.list, input);
    var cp = schedule.criticalPath(index.list, sched.range.start);
    var critSet = {};
    for (var i = 0; i < cp.chain.length; i++) critSet[cp.chain[i]] = true;
    var rows = sched.rows.map(function (r) {
      return { id: r.id, no: r.no, name: r.name, dur: r.dur, est: r.est, eft: r.eft, critical: !!critSet[r.id] };
    });
    var dateOf = {};
    for (var j = 0; j < rows.length; j++) { dateOf[rows[j].id] = rows[j].est + ' ~ ' + rows[j].eft; }
    var milestones = MILESTONE_IDS.filter(function (id) { return !!dateOf[id]; })
      .map(function (id) { return { id: id, name: index.byId[id] ? index.byId[id].name : id, date: dateOf[id] }; });
    return { mode: input.mode, range: sched.range, rows: rows, critical: cp.chain, milestones: milestones, totalDays: sched.totalDays };
  }

  function render(params) {
    var ui = window.SJSQ.views.ui, gantt = window.SJSQ.views.gantt, store = window.SJSQ.app.store, h = window.SJSQ.core.dom.h;
    var wrap = h('div', { class: 'view view-schedule' });
    var state = { input: (params && params.input) || defaultInput() };
    var body = h('div', { class: 'schedule-body' });

    // G22：单例设置统一存 meta 表
    var META_ID = 'scheduleInput';

    function draw() {
      body.innerHTML = '';
      var index = window.SJSQ.app.procedures;
      var v = buildView(index, state.input);
      var head = ui.card('进度计划（全量 ' + v.rows.length + ' 项 · 共 ' + v.totalDays + ' 天）', [
        ui.field({ label: '排期方式', name: 'mode', type: 'select', value: state.input.mode, options: [{ value: 'forward', label: '正排（从开工日往后推）' }, { value: 'backward', label: '倒排（从竣工日往前推）' }] }),
        ui.field({ label: '开工日期', name: 'startDate', type: 'date', value: state.input.startDate }),
        ui.field({ label: '目标竣工日期', name: 'targetEndDate', type: 'date', value: state.input.targetEndDate }),
        ui.button('重新计算', { onClick: recalc, tone: 'primary' }),
      ]);
      body.appendChild(head);
      body.appendChild(ui.card('甘特图', gantt.gantt(v.rows, v.range, { today: todayStr() })));
      body.appendChild(ui.card('关键路径（' + v.critical.length + ' 项）', ui.table(
        ['编号', '名称', '最早开始', '最早完成'],
        v.rows.filter(function (r) { return r.critical; }).map(function (r) { return [r.no, r.name, r.est, r.eft]; })
      )));
      body.appendChild(ui.card('关键节点', ui.table(
        ['节点', '计划日期'],
        v.milestones.map(function (m) { return [m.name, m.date]; })
      )));

      // 交互纪律：切换正排/倒排或改日期即重算，且只换输入与重算、不清空已有日期
      head.addEventListener('change', recalc);

      function recalc() {
        var m = head.querySelector('[name=mode]').value;
        state.input.mode = m;
        state.input.startDate = head.querySelector('[name=startDate]').value || state.input.startDate;
        state.input.targetEndDate = head.querySelector('[name=targetEndDate]').value || state.input.targetEndDate;
        store.put('meta', { id: META_ID, value: state.input });
        draw();
      }
    }
    draw();
    wrap.appendChild(body);
    // 首次进入时尝试从 meta 表恢复上次的排期参数（G22）
    if (!params || !params.input) {
      Promise.resolve(store.get('meta', META_ID)).then(function (row) {
        if (row && row.value) { state.input = row.value; draw(); }
      }).catch(function () { /* 读取失败保持默认值，不打断页面 */ });
    }
    return wrap;
  }

  return { MILESTONE_IDS: MILESTONE_IDS, defaultInput: defaultInput, buildView: buildView, render: render };
});
