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

  /* 下载触发（与数据构建分离）：仅浏览器环境可用；Node 无 Blob 时安全返回 false。
     数据构建（buildDocHtml / buildTableHtml / docFileName）保持 Node 可测。 */
  function downloadDoc(html, filename) {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' ||
        !URL.createObjectURL || typeof document === 'undefined') {
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
    downloadDoc: downloadDoc
  };
});
