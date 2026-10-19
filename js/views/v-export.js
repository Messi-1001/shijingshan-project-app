/* js/views/v-export.js —— 页面 13：导出中心（清单驱动 + runExport 纯分发，永不抛错） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {}; root.SJSQ.views.vExport = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EXPORTS = [
    { key: 'procedure-word', name: '手续清单（Word）', kind: 'doc', desc: '全部登记手续 + 当前办理状态 + 前置关系，A4 纵向，可直接打印带去办事。' },
    { key: 'schedule-word', name: '进度计划（Word）', kind: 'doc', desc: '当前排期结果：区间、逐项最早开始/完成、关键路径标记、关键节点。' },
    { key: 'estimate-word', name: '投资估算表（两页纸 Word）', kind: 'doc', desc: '第一页工程建设其他费明细，第二页工程费用构成与项目总投资。' },
    { key: 'all-csv', name: '全量数据（CSV）', kind: 'data', desc: '40 项手续的编号、名称、板块、主管部门、时长、前置、状态、备注，可用 Excel 打开。' },
    { key: 'report-pptx', name: '工作汇报（PPT）', kind: 'deck', desc: '项目概况 + 手续流程 + 进度排期 + 招标计划 + 投资估算 + 当前建议，共约 7 页。' },
    { key: 'report-html', name: '工作汇报（HTML，可打印为 PDF）', kind: 'web', desc: '与 PPT 同一份数据源，浏览器打开后可 Ctrl+P 存为 PDF；PPT 打不开时用这个。' },
    { key: 'flow-image', name: '手续流程图（图片）', kind: 'image', desc: '七板块正交布局流程图，优先导出 PNG；受浏览器限制时自动降级为 SVG。' },
    { key: 'backup-snapshot', name: '数据备份（JSON 快照）', kind: 'data', desc: '项目、办理状态与各项设置整表带走，可在「数据管理」页导入恢复。' },
    { key: 'print', name: '打印当前页面', kind: 'print', desc: '按 A4 排版打印当前所在页面（清单 / 估算表 / 材料清单均已适配）。' },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function downloadBinary(bytes, fileName, mime) {
    var blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function downloadText(text, fileName, mime) {
    var blob = new Blob([text], { type: mime || 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  // report-html：PPT 的正式回退方案。必须是一份可独立打开的完整 HTML
  //（含分页、可 Ctrl+P 存 PDF），不是附属品。
  function buildReportHtml(report) {
    var pages = report.slides.map(function (s, i) {
      var body = s.layout === 'title'
        ? '<h1>' + esc(s.title) + '</h1>' + (s.subtitle ? '<p class="sub">' + esc(s.subtitle) + '</p>' : '')
        : '<h2>' + esc(s.title) + '</h2><ul>' + (s.bullets || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>';
      var cls = 'slide' + (s.layout === 'title' ? ' cover' : '') + (i < report.slides.length - 1 ? ' page-break' : '');
      return '<section class="' + cls + '">' + body + '</section>';
    }).join('');
    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + esc(report.title) + '</title><style>' +
      'html,body{margin:0;padding:0;font-family:"Microsoft YaHei",SimSun,sans-serif;color:#1f2733;background:#eef1f5}' +
      '.slide{box-sizing:border-box;width:960px;min-height:540px;margin:24px auto;padding:48px 56px;background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.08)}' +
      '.slide.cover{display:flex;flex-direction:column;justify-content:center;align-items:center}' +
      'h1{font-size:38px;color:#1F3864;margin:0 0 12px;text-align:center}' +
      '.sub{color:#6b7480;font-size:16px;margin:0}' +
      'h2{font-size:26px;color:#1F3864;margin:0 0 20px;padding-bottom:12px;border-bottom:2px solid #dbe3ec}' +
      'ul{margin:0;padding-left:22px}li{font-size:17px;line-height:2;margin-bottom:6px}' +
      '@media print{body{background:#fff}.slide{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none;border-radius:0;page-break-after:always}.page-break{page-break-after:always}}' +
      '</style></head><body>' + pages + '</body></html>';
  }

  // 纯分发（Node 可测）：按 key 调对应导出器；依赖全部由 ctx 注入。
  // 降级纪律：永不抛错，一律返回 { ok, format, reason }。
  async function runExport(key, ctx) {
    ctx = ctx || {};
    try {
      var E = ctx.exporters, P = ctx.pptx, F = ctx.flow;
      var pn = ctx.projectName || '未命名项目';
      switch (key) {
        case 'procedure-word': {
          var html = E.buildProcedureListDoc(ctx.index, ctx.checklist, pn);
          E.downloadDoc(html, E.docFileName(pn + '-手续清单'));
          return { ok: true, format: 'doc' };
        }
        case 'schedule-word': {
          var view = ctx.scheduleView;
          if (!view) return { ok: false, reason: '还没有排期结果，请先到「进度计划」页点一次「重新计算」。' };
          E.downloadDoc(E.buildScheduleDoc(view, pn), E.docFileName(pn + '-进度计划'));
          return { ok: true, format: 'doc' };
        }
        case 'estimate-word': {
          if (!ctx.estimateInput || !(ctx.estimateInput.工程费用 > 0)) return { ok: false, reason: '还没有估算结果，请先到「投资估算」页填写工程费用并计算。' };
          var rows = ctx.estimateRows;
          if (!rows) return { ok: false, reason: '估算结果未就绪。' };
          E.downloadDoc(E.buildEstimateDoc(rows, pn), E.docFileName(pn + '-投资估算表'));
          return { ok: true, format: 'doc' };
        }
        case 'all-csv': {
          E.downloadCsv(E.buildAllCsv(ctx.index, ctx.checklist), pn + '-全量手续-' + stamp());
          return { ok: true, format: 'csv' };
        }
        case 'report-pptx': {
          var report = E.buildReportData({
            projectName: pn, index: ctx.index, checklist: ctx.checklist, projectValues: ctx.projectValues,
            scheduleInput: ctx.scheduleInput, estimateInput: ctx.estimateInput, tenderInput: ctx.tenderInput,
          });
          // 降级路径：pptx 模块缺失时回退为 HTML 演示稿（正式回退方案，可打印为 PDF）
          if (!P || typeof P.buildPptx !== 'function') {
            (ctx.downloadText || downloadText)(buildReportHtml(report), pn + '-工作汇报-' + stamp() + '.html');
            return { ok: true, format: 'html', reason: 'PPT 组件不可用，已降级为 HTML 演示稿（可 Ctrl+P 存为 PDF）。' };
          }
          var bytes = P.buildPptx(report.slides);
          (ctx.downloadBinary || downloadBinary)(bytes, pn + '-工作汇报-' + stamp() + '.pptx',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation');
          return { ok: true, format: 'pptx' };
        }
        case 'report-html': {
          var r2 = E.buildReportData({
            projectName: pn, index: ctx.index, checklist: ctx.checklist, projectValues: ctx.projectValues,
            scheduleInput: ctx.scheduleInput, estimateInput: ctx.estimateInput, tenderInput: ctx.tenderInput,
          });
          (ctx.downloadText || downloadText)(buildReportHtml(r2), pn + '-工作汇报-' + stamp() + '.html');
          return { ok: true, format: 'html' };
        }
        case 'flow-image': {
          var layout = F.flowLayout(ctx.index, { sectionLabels: ctx.sectionLabels });
          var svg = F.buildFlowSvg(layout, { statusOf: ctx.statusOf || function () { return 'idle'; } });
          return await F.exportFlowImage(svg, pn + '-手续流程图');
        }
        case 'backup-snapshot': {
          var B = ctx.backup;
          if (!B || !ctx.store) return { ok: false, reason: '备份组件或数据存储不可用，请改到「数据管理」页操作。' };
          var snapshot = await B.exportSnapshot(ctx.store);
          (ctx.downloadText || downloadText)(B.toJson(snapshot), pn + '-数据备份-' + stamp() + '.json', 'application/json;charset=utf-8');
          return { ok: true, format: 'json' };
        }
        case 'print': {
          window.print();
          return { ok: true, format: 'print' };
        }
        default:
          return { ok: false, reason: '未知或不支持的导出项：' + key };
      }
    } catch (err) {
      return { ok: false, reason: '导出失败：' + ((err && err.message) || err) };
    }
  }

  // 运行时手续索引解析（与 v-platform / v-reasons / v-schedule 同口径）。
  // boot 时 main.js 的 registerProcedures 把 buildIndex 的产物挂在 S.app.procedures；
  // procedures-index.js 自己挂的是 S.data.index（那是「模块」，不是索引实例）。
  // 历史缺陷：本文件原先读的是一个从未被赋值的 data 键（名字是 procedures 前缀 + Index
  // 后缀，非 proceduresIndex），导致 index 恒为 undefined：流程图导出成 0 节点白纸，
  // Word/CSV/PPT 全被兜底成「导出失败」。与用户是否填写信息无关。
  function resolveIndex() {
    var S = (typeof window !== 'undefined' && window.SJSQ) || null;
    if (!S) return { list: [], byId: {}, bySection: {} };
    var index = (S.app && S.app.procedures)
      || (S.data && S.data.index && typeof S.data.index.getAll === 'function'
        ? { list: S.data.index.getAll(), byId: {}, bySection: {} }
        : null)
      || { list: [], byId: {}, bySection: {} };
    if (!index.list || !index.list.length) {
      return { list: (S.data && S.data.index && typeof S.data.index.getAll === 'function')
        ? S.data.index.getAll() : [], byId: index.byId || {}, bySection: index.bySection || {} };
    }
    return index;
  }

  function render() {
    var ui = window.SJSQ.views.ui, h = window.SJSQ.core.dom.h;
    var store = window.SJSQ.app.store;   // 运行时实例，不是 SJSQ.core.store 模块
    var wrap = h('div', { class: 'view view-export' });

    // G21/G22：Store 是「表 + id」接口。单例设置一律从 meta 表按 id 取后读 .value；
    // checklist 取整表再聚成 Map。整个过程是异步的，所以 ctxOf 必须是 async。
    async function ctxOf() {
      var index = resolveIndex();

      var rows = (await store.list('checklist')) || [];
      var checklist = {};
      rows.forEach(function (r) { checklist[r.id] = r; });

      async function meta(id) {
        var row = await store.get('meta', id);
        return row ? row.value : null;
      }

      var scheduleInput = await meta('scheduleInput');
      var scheduleView = null;
      try {
        if (scheduleInput) {
          var sv = window.SJSQ.views.vSchedule.buildView(index, scheduleInput);
          scheduleView = { mode: sv.mode, range: sv.range, rows: sv.rows, critical: sv.critical, milestones: sv.milestones, totalDays: sv.totalDays };
        }
      } catch (e) { scheduleView = null; }

      var estimateInput = await meta('estimateInput');
      var estimateRows = null;
      try { if (estimateInput && estimateInput.工程费用 > 0) estimateRows = window.SJSQ.views.vEstimate.buildRows(estimateInput); } catch (e) { estimateRows = null; }

      var projectValues = await meta('projectValues');
      var tenderInput = await meta('tenderInput');

      return {
        projectName: (projectValues && projectValues.projectName) || '石景山区学校新建工程',
        index: index, checklist: checklist, projectValues: projectValues,
        scheduleInput: scheduleInput, scheduleView: scheduleView,
        estimateInput: estimateInput, estimateRows: estimateRows,
        tenderInput: tenderInput,
        exporters: window.SJSQ.logic.exporters, pptx: window.SJSQ.logic.pptx, flow: window.SJSQ.logic.flow,
        backup: window.SJSQ.logic.backup, store: store,
        sectionLabels: (window.SJSQ.data.schema && window.SJSQ.data.schema.SECTIONS) || null,
        statusOf: function (id) { return (checklist[id] && checklist[id].status) || 'idle'; },
      };
    }

    var statusEls = {};
    var cards = EXPORTS.map(function (x) {
      var st = h('p', { class: 'export-status' }, '');
      statusEls[x.key] = st;
      return h('div', { class: 'export-item' }, [
        h('div', { class: 'export-head' }, [
          h('div', {}, [h('div', { class: 'export-name' }, x.name), h('div', { class: 'export-desc' }, x.desc)]),
          ui.button('导出', { tone: x.key === 'report-pptx' ? 'primary' : 'default', onClick: async function () {
            st.className = 'export-status running';
            st.textContent = '正在生成…';
            var r = await runExport(x.key, await ctxOf());
            if (r.ok) {
              st.className = 'export-status ok';
              st.textContent = '已完成（' + r.format + '）' + (r.reason ? '　' + r.reason : '');
            } else {
              st.className = 'export-status fail';
              st.textContent = r.reason;
            }
          } }),
        ]),
        st,
      ]);
    });

    wrap.appendChild(ui.card('导出与打印', [
      h('p', { class: 'notice' }, '所有导出都在本机浏览器完成，不上传任何数据。PPT 为真正的 .pptx 文件；若无法打开，请改用「工作汇报（HTML）」并打印为 PDF。'),
      h('div', { class: 'export-list' }, cards),
    ]));

    return wrap;
  }

  return { EXPORTS: EXPORTS, esc: esc, buildReportHtml: buildReportHtml, downloadBinary: downloadBinary, downloadText: downloadText, resolveIndex: resolveIndex, runExport: runExport, render: render };
});
