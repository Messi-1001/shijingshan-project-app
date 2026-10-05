/* js/views/v-estimate.js —— 页面 8：投资估算（两页纸明细 + 汇总 + 免责说明 + Word 导出） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../logic/estimate.js'), require('../core/util.js'), require('../logic/exporters.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.vEstimate = factory(root.SJSQ.logic.estimate, root.SJSQ.core.util, root.SJSQ.logic.exporters);
  }
})(typeof self !== 'undefined' ? self : this, function (estimate, util, exporters) {
  'use strict';

  function defaultInput() { return { 工程费用: 20000, projectName: '' }; }

  // 纯函数（Node 可测）：导出文件名 = 项目名-投资估算表-YYYY-MM-DD.doc
  function exportFileName(projectName, now) {
    return exporters.docFileName(
      (projectName || '项目') + '-投资估算表',
      util.formatDate(now || new Date())
    );
  }

  // 纯函数（Node 可测）：转发 estimate.buildTwopage，第二页补基本预备费行并加合计。
  // 显示口径一致性：分项行按 formatMoney 四舍五入后，合计行取「取整分项之和」，
  // 避免「行之和 1588 ≠ 合计 1589」的 1 万元毛刺；内核原始值（raw/summary）不动。
  function buildRows(est) {
    var e = est && est.items ? est : estimate.calcEstimate({ 工程费用: (est && est.工程费用) || 0 });
    var tp = estimate.buildTwopage(e);
    var page1rows = tp.page1.map(function (r) {
      return [r.no, r.name, r.base, r.rate, util.formatMoney(r.amount), r.ref];
    });
    var page2rows = tp.page2.map(function (r) {
      return [r.no, r.name, r.ratio, util.formatMoney(r.amount)];
    });
    // 第二页补基本预备费（合计行不混入明细，走 total / tfoot）
    var dispReserve = Math.round(e.reserve);
    page2rows.push(['4', '基本预备费', (estimate.RESERVE_RATE * 100).toFixed(0) + '%', util.formatMoney(e.reserve)]);
    var dispOther = tp.page1.reduce(function (s, r) { return s + Math.round(r.amount); }, 0);
    var dispTotal = tp.summary.工程费用 + dispOther + dispReserve;
    return {
      page1: { rows: page1rows, total: ['其他费合计（万元）', dispOther] },
      page2: { rows: page2rows, total: ['项目总投资（万元）', dispTotal] },
      summary: tp.summary,
      disp: { 其他费合计: dispOther, 基本预备费: dispReserve, projectTotal: dispTotal },
      raw: e,
    };
  }

  function render(params) {
    var ui = window.SJSQ.views.ui, h = window.SJSQ.core.dom.h,
      store = window.SJSQ.app.store, exporters = window.SJSQ.logic.exporters;
    var wrap = h('div', { class: 'view view-estimate' });
    var state = { input: (params && params.input) || defaultInput() };
    var META_ID = 'estimateInput'; // G22：单例设置统一存 meta 表
    var loaded = !!(params && params.input);
    var body = h('div', {});

    function draw() {
      body.innerHTML = '';
      var r = buildRows(state.input);
      var form = ui.card('估算参数', [
        ui.field({ label: '项目名称', name: 'projectName', value: state.input.projectName, placeholder: '如：××学校新建工程' }),
        ui.field({ label: '工程费用（万元）', name: 'gcfy', value: state.input.工程费用, placeholder: '建安工程费 + 设备购置费' }),
        ui.button('计算', { tone: 'primary', onClick: function () {
          state.input.projectName = form.querySelector('[name=projectName]').value;
          state.input.工程费用 = util.parseNum(form.querySelector('[name=gcfy]').value);
          if (!(state.input.工程费用 > 0)) { alert('工程费用必须为正数'); return; }
          store.put('meta', { id: META_ID, value: state.input }); draw();
        } }),
      ]);
      body.appendChild(form);
      body.appendChild(ui.card('第一页 · 工程建设其他费估算表', ui.table(
        ['序号', '费用名称', '计算基数', '费率', '金额（万元）', '取费依据'], r.page1.rows,
        { foot: [['', '其他费合计', '', '', util.formatMoney(r.page1.total[1]), '']] }
      )));
      body.appendChild(ui.card('第二页 · 工程费用构成与总投资', ui.table(
        ['序号', '费用构成', '比例', '金额（万元）'], r.page2.rows,
        { foot: [['', '项目总投资', '', util.formatMoney(r.page2.total[1])]] }
      )));
      body.appendChild(ui.card('估算汇总', ui.table(
        ['项目', '金额（万元）'],
        [['工程费用', util.formatMoney(r.summary.工程费用)],
         ['工程建设其他费', util.formatMoney(r.disp.其他费合计)],
         ['基本预备费', util.formatMoney(r.disp.基本预备费)],
         ['项目总投资', util.formatMoney(r.disp.projectTotal)],
         ['其他费占比', r.summary.其他费占比 + '%']]
      )));
      body.appendChild(ui.card('免责说明', h('p', { class: 'notice' },
        '上述取费费率均为估算参考值，用于前期匡算；最终以现行取费文件、财政评审与批复结论为准。')));
      body.appendChild(h('div', { class: 'actions' }, [
        ui.button('导出为 Word（两页纸）', { tone: 'primary', onClick: function () {
          var html = exporters.buildEstimateDoc(r, state.input.projectName || '未命名项目');
          exporters.downloadDoc(html, exportFileName(state.input.projectName, new Date()));
        } }),
        ui.button('打印', { onClick: function () { window.print(); } }),
      ]));
    }

    draw();
    wrap.appendChild(body);
    // 首次进入时从 meta 表恢复上次的估算参数（G22）
    if (!loaded) {
      Promise.resolve(store.get('meta', META_ID)).then(function (row) {
        if (row && row.value) { state.input = row.value; loaded = true; draw(); }
      }).catch(function () { /* 读取失败保持默认值 */ });
    }
    return wrap;
  }

  return { defaultInput: defaultInput, buildRows: buildRows, exportFileName: exportFileName, render: render };
});
