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

  return {
    escapeCell: escapeCell, buildTableHtml: buildTableHtml,
    buildDocHtml: buildDocHtml, docFileName: docFileName, wordMime: wordMime,
    buildEstimateDoc: buildEstimateDoc,
    downloadDoc: downloadDoc
  };
});
