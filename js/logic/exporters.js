/* js/logic/exporters.js —— 导出构建（HTML 表格 / Word 文档 / 文件命名 / 下载触发） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.logic = root.SJSQ.logic || {};
    root.SJSQ.logic.exporters = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeCell(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, function (ch) { return ESC[ch]; });
  }

  function buildTableHtml(headers, rows) {
    var thead = '<thead><tr>' + (headers || []).map(function (h) {
      return '<th>' + escapeCell(h) + '</th>';
    }).join('') + '</tr></thead>';
    var tbody = '<tbody>' + (rows || []).map(function (r) {
      return '<tr>' + (r || []).map(function (c) {
        return '<td>' + escapeCell(c) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%">' +
      thead + tbody + '</table>';
  }

  function buildDocHtml(opts) {
    var o = opts || {};
    var body = (o.sections || []).map(function (s) {
      return '<h2>' + escapeCell(s.h) + '</h2>' + (s.html || '');
    }).join('\n');

    return '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8">' +
      '<title>' + escapeCell(o.title || '导出文档') + '</title>' +
      '<style>' +
      'body{font-family:"Microsoft YaHei",SimSun,sans-serif;font-size:11pt;line-height:1.6;color:#000}' +
      'h1{font-size:16pt}h2{font-size:13pt;margin-top:14pt;border-bottom:1px solid #999;padding-bottom:3pt}' +
      'table{border-collapse:collapse;width:100%;font-size:10pt}' +
      'th,td{border:1px solid #666;padding:4pt 6pt;vertical-align:top;text-align:left}' +
      'th{background:#eee}' +
      '.meta{font-size:9pt;color:#555;margin-bottom:10pt}' +
      '</style></head><body>' +
      '<h1>' + escapeCell(o.title || '') + '</h1>' +
      (o.meta ? '<div class="meta">' + escapeCell(o.meta) + '</div>' : '') +
      body +
      '</body></html>';
  }

  function docFileName(title, suffix) {
    var name = String(title || '导出文档').replace(/[\\/:*?"<>|]/g, '_');
    var tail = suffix ? '-' + suffix : '';
    return name + tail + '.doc';
  }

  function wordMime() { return 'application/msword'; }

  /* —— 两页纸投资估算表（Task 48）——
     Word 打开 HTML 对 CSS 支持有限：只用保守表格属性（border/cellpadding）+ SimSun，
     禁 flex/grid；分页用 <div class="page-break">（page-break-after 最稳）。 */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function formatMoneyCell(n) {
    var s = String(n == null ? 0 : n);
    var m = s.match(/^(-?)(\d+)(\.\d+)?$/);
    if (!m) return s;
    return m[1] + m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (m[3] ? m[3].slice(0, 3) : '');
  }

  function buildEstimateDoc(rows, projectName) {
    var today = new Date();
    var dstr = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
    var css = 'body{font-family:SimSun,serif;font-size:10.5pt;color:#000}' +
      'h2{text-align:center;font-size:16pt;margin:0 0 4pt}' +
      'h3{font-size:12pt;margin:14pt 0 6pt}' +
      'p.meta{text-align:center;font-size:9pt;color:#333;margin:0 0 12pt}' +
      '.page-break{page-break-after:always}' +
      'table{border-collapse:collapse;width:100%}' +
      'th,td{border:1px solid #000;padding:3pt 4pt;font-size:9.5pt}' +
      'th{background:#eee;text-align:center}' +
      'td.num{text-align:right}' +
      'tfoot td{font-weight:bold;background:#f7f7f7}' +
      'p.note{font-size:9pt;color:#444;margin-top:10pt}';

    function tbl(headers, dataRows, foot) {
      var t = '<table border="1" cellspacing="0" cellpadding="4"><thead><tr>' +
        headers.map(function (x) { return '<th>' + escapeCell(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        dataRows.map(function (r) {
          return '<tr>' + r.map(function (c, i) {
            return '<td' + (i === r.length - 1 && /^[\d,]+$/.test(String(c)) ? ' class="num"' : '') + '>' + escapeCell(c) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody>';
      if (foot && foot.length) {
        t += '<tfoot>' + foot.map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + escapeCell(c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tfoot>';
      }
      return t + '</table>';
    }

    var page1 = '<h3>一、工程建设其他费估算表</h3>' + tbl(
      ['序号', '费用名称', '计算基数', '费率', '金额（万元）', '取费依据'],
      rows.page1.rows,
      [['', '其他费合计', '', '', formatMoneyCell(rows.page1.total[1]), '']]
    );

    var page2 = '<h3>二、工程费用构成与项目总投资</h3>' + tbl(
      ['序号', '费用构成', '比例', '金额（万元）'],
      rows.page2.rows,
      [['', '项目总投资', '', formatMoneyCell(rows.page2.total[1])]]
    ) + '<p class="note">注：取费费率均为前期匡算参考值，最终以现行取费文件与财政评审结论为准。</p>';

    return '<html><head><meta charset="utf-8"><title>' + escapeCell(projectName + '-投资估算表') + '</title>' +
      '<style>' + css + '</style></head><body>' +
      '<h2>' + escapeCell(projectName || '未命名项目') + ' 投资估算表</h2>' +
      '<p class="meta">制表日期：' + dstr + '　金额单位：万元</p>' +
      page1 +
      '<div class="page-break"></div>' +
      page2 +
      '</body></html>';
  }

  /* 下载触发（与数据构建分离）：仅浏览器环境可用；Node 无 Blob 时安全返回 false。
     数据构建（buildDocHtml / buildTableHtml / docFileName）保持 Node 可测。 */
  function downloadDoc(html, filename) {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' ||
        !URL.createObjectURL || typeof document === 'undefined' || !document.body) {
      return false;
    }
    var blob = new Blob(['\ufeff', html], { type: wordMime() });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || docFileName('导出文档');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return true;
  }

  /* —— Task 60：导出扩展（清单/进度 Word + 全量 CSV + 汇报数据装配）—— */

  // 双环境模块解析：Node 走 require，浏览器走 SJSQ.logic（brief 里纯 require 在浏览器会退化）
  function dep(name) {
    try { return require('./' + name + '.js'); } catch (e) { /* 浏览器无 require */ }
    var root = (typeof self !== 'undefined') ? self : globalThis;
    return (root.SJSQ && root.SJSQ.logic && root.SJSQ.logic[name]) || null;
  }

  var STATUS_CN = { idle: '未开始', doing: '办理中', done: '已办结' };

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildAllCsv(index, checklist) {
    var head = ['编号', '名称', '板块', '主管部门', '标准时长(天)', '前置编号', '状态', '备注'];
    var rows = [head.map(csvCell).join(',')];
    (index.list || []).forEach(function (p) {
      var st = (checklist && checklist[p.id] && checklist[p.id].status) || 'idle';
      rows.push([
        p.no, p.name, p.section || '', p.dept || '',
        p.duration || '', (p.prev || []).join(' '),
        STATUS_CN[st] || st,
        (checklist && checklist[p.id] && checklist[p.id].note) || '',
      ].map(csvCell).join(','));
    });
    return rows.join('\r\n');
  }

  function downloadCsv(csv, fileName) {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' ||
        !URL.createObjectURL || typeof document === 'undefined' || !document.body) {
      return false;
    }
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.csv') ? fileName : fileName + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return true;
  }

  function buildProcedureListDoc(index, checklist, projectName) {
    var rows = (index.list || []).map(function (p) {
      var c = (checklist && checklist[p.id]) || {};
      var st = STATUS_CN[c.status || 'idle'];
      return [p.no, p.name, p.section || '', p.dept || '', st, (p.prev || []).join('、'), c.note || ''];
    });
    var done = rows.filter(function (r) { return r[4] === '已办结'; }).length;
    var html = buildTableHtml(['编号', '手续名称', '板块', '主管部门', '状态', '前置手续', '备注'], rows);
    var doc = buildDocHtml({
      title: projectName + ' 工程前期手续清单',
      meta: '共 ' + rows.length + ' 项，已办结 ' + done + ' 项',
      sections: [{ h: '一、手续清单', html: html }],
    });
    // Word 打开不依赖 DOCTYPE；按契约以 <html 开头
    return doc.replace(/^<!DOCTYPE html>\n?/, '');
  }

  function buildScheduleDoc(view, projectName) {
    var rows = view.rows.map(function (r) {
      return [r.no, r.name, r.dur + ' 天', r.est, r.eft, r.critical ? '是' : ''];
    });
    var ms = view.milestones.map(function (m) { return [m.name, m.date]; });
    return buildDocHtml({
      title: projectName + ' 工程进度计划',
      meta: view.mode === 'forward' ? '排期方式：正排' : '排期方式：倒排',
      sections: [
        { h: '一、排期总览', html: '<p>计划区间：' + view.range.start + ' 至 ' + view.range.end + '，共 ' + view.totalDays + ' 天。</p>' },
        { h: '二、逐项排期', html: buildTableHtml(['编号', '手续名称', '工期', '最早开始', '最早完成', '关键路径'], rows) },
        { h: '三、关键节点', html: buildTableHtml(['节点', '计划日期'], ms) },
      ],
    });
  }

  function buildReportData(ctx) {
    var index = ctx.index || { list: [], byId: {} };
    var checklist = ctx.checklist || {};
    var projectName = ctx.projectName || '未命名项目';
    var slides = [];

    slides.push({
      layout: 'title',
      title: projectName + ' 前期手续工作汇报',
      subtitle: '石景山区学校工程「前期手续 → 竣工验收」辅助系统 · ' + new Date().toISOString().slice(0, 10),
      bullets: [],
    });

    // 1) 项目概况（固定四维口径）
    var pv = ctx.projectValues || {};
    slides.push({
      title: '一、项目概况',
      bullets: [
        '建设性质：' + (pv.buildNature || '新建'),
        '项目投资规模：' + (pv.investScale || '3000 万以上'),
        '资金来源：' + (pv.fundSource || '财政资金') + '（市级、区级各承担 50%）',
        '审批层级：' + (pv.approvalLevel || '市级'),
        '本次口径下无需按维度裁剪，清单以全量登记为准。',
      ],
    });

    // 2) 手续流程
    var sections = {};
    index.list.forEach(function (p) { var s = p.section || '未分组'; (sections[s] = sections[s] || []).push(p); });
    var flowBullets = Object.keys(sections).map(function (s) {
      return s + '：' + sections[s].length + ' 项（' + sections[s][0].no + '–' + sections[s][sections[s].length - 1].no + '）';
    });
    var reserved = index.list.filter(function (p) { return p.reserved; });
    flowBullets.push('合计登记 ' + index.list.length + ' 项，其中有效 ' + (index.list.length - reserved.length) + ' 项、预留 ' + reserved.length + ' 项。');
    flowBullets.push('流程止于竣工验收备案，收尾结算仅作说明、不单独编号。');
    slides.push({ title: '二、手续流程总览', bullets: flowBullets });

    // 3) 进度
    var prog = null;
    try { var pm = dep('progress'); prog = pm ? pm.summarize(index.list, checklist) : null; } catch (e) { prog = null; }
    var schedView = null;
    if (ctx.scheduleInput) {
      try {
        var sc = dep('schedule');
        var sched = sc.buildSchedule(index.list, ctx.scheduleInput);
        schedView = { mode: ctx.scheduleInput.mode, range: sched.range, totalDays: sched.totalDays };
      } catch (e) { schedView = null; }
    }
    slides.push({
      title: '三、办理进度与计划排期',
      bullets: (prog ? [
        '总体完成度：' + prog.percent + '%（已办结 ' + prog.done + ' 项 / 办理中 ' + prog.doing + ' 项 / 未开始 ' + prog.idle + ' 项）',
      ] : ['进度数据待录入。']).concat(schedView ? [
        '计划区间：' + schedView.range.start + ' 至 ' + schedView.range.end + '，共 ' + schedView.totalDays + ' 天',
        '排期方式：' + (schedView.mode === 'forward' ? '正排（自开工日往后推）' : '倒排（自竣工日往前推）'),
      ] : []),
    });

    // 4) 招标计划
    var tenderBullets = ['招标分四类：设计、勘察、监理、施工。', '各环节标准天数：公告 20 天 / 答疑 5 天 / 开标 1 天 / 评标 5 天 / 公示 3 天 / 中标通知 2 天 / 合同签订 5 天。'];
    if (ctx.tenderInput) {
      try {
        var tender = dep('tender');
        if (tender && tender.adviseMethod) {
          var adv = tender.adviseMethod(ctx.tenderInput);
          tenderBullets.push('施工招标方式建议：' + adv.method + '（' + adv.reasons.join('；') + '）');
        }
      } catch (e) { /* 忽略 */ }
    }
    tenderBullets.push('建议勘察设计招标提前开展，避免压缩后续施工图与报建时间。');
    slides.push({ title: '四、招标工作时间计划', bullets: tenderBullets });

    // 5) 投资
    var est = null;
    if (ctx.estimateInput && ctx.estimateInput.工程费用 > 0) {
      var estMod = dep('estimate');
      est = estMod ? estMod.calcEstimate({ 工程费用: ctx.estimateInput.工程费用 }) : null;
    }
    if (est) {
      slides.push({
        title: '五、投资估算',
        bullets: [
          '工程费用：' + est.工程费用 + ' 万元',
          '工程建设其他费：' + est.otherSubtotal + ' 万元',
          '基本预备费：' + est.reserve + ' 万元',
          '项目总投资：' + est.projectTotal + ' 万元',
          '注：取费费率为前期匡算参考值，最终以现行取费文件与财政评审结论为准。',
        ],
      });
    } else {
      slides.push({ title: '五、投资估算', bullets: ['尚未录入工程费用，请先在「投资估算」页匡算后重新导出。'] });
    }

    // 6) 建议
    var adviceList = [];
    try {
      var am = dep('advice');
      if (am) adviceList = am.buildAdvice({
        index: index, checklist: checklist, projectValues: pv,
        scheduleInput: ctx.scheduleInput, hasEstimate: !!(ctx.estimateInput && ctx.estimateInput.工程费用 > 0),
      });
    } catch (e) { adviceList = []; }
    slides.push({
      title: '六、当前建议',
      bullets: adviceList.slice(0, 6).map(function (a) {
        return '【' + (a.level === 'block' ? '紧要' : a.level === 'warn' ? '注意' : '提示') + '】' + a.title + ' —— ' +
          String(a.body).replace(/\n+/g, '；');
      }).concat(adviceList.length ? [] : ['暂无特别提醒。']),
    });

    return { title: projectName + ' 前期手续工作汇报', subtitle: '', slides: slides };
  }

  return {
    escapeCell: escapeCell, buildTableHtml: buildTableHtml,
    buildDocHtml: buildDocHtml, docFileName: docFileName, wordMime: wordMime,
    buildEstimateDoc: buildEstimateDoc,
    downloadDoc: downloadDoc,
    csvCell: csvCell,
    buildAllCsv: buildAllCsv,
    downloadCsv: downloadCsv,
    buildProcedureListDoc: buildProcedureListDoc,
    buildScheduleDoc: buildScheduleDoc,
    buildReportData: buildReportData
  };
});
