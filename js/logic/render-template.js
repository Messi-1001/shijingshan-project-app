/* js/logic/render-template.js —— 模板占位符填充、复制、导出 Word */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.logic = root.SJSQ.logic || {};
    root.SJSQ.logic.renderTemplate = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var PLACEHOLDERS = {
    '{{项目名称}}': 'name',
    '{{建设单位}}': 'unit',
    '{{建设地点}}': 'address',
    '{{用地面积}}': 'landArea',
    '{{建筑面积}}': 'buildArea',
    '{{建筑高度}}': 'height',
    '{{地上层数}}': 'floorsAbove',
    '{{地下层数}}': 'floorsBelow',
    '{{投资估算}}': 'investEstimate',
    '{{计划开工}}': 'startDate',
    '{{计划竣工}}': 'endDate',
    '{{今日}}': '__today'
  };

  var MONEY_FIELDS = ['investEstimate'];
  var BLANK = '＿＿＿＿';

  function util() {
    if (root && root.SJSQ && root.SJSQ.core && root.SJSQ.core.util) return root.SJSQ.core.util;
    if (typeof module !== 'undefined' && module.exports) return require('../core/util.js');
    return null;
  }

  function valueOf(key, project, today) {
    if (key === '__today') return today || '';
    var v = (project || {})[key];
    if (v === null || v === undefined || v === '') return '';
    var u = util();
    if (MONEY_FIELDS.indexOf(key) >= 0 && u) return u.formatMoney(v);
    return String(v);
  }

  function renderText(template, project, today) {
    var out = String(template === undefined || template === null ? '' : template);
    Object.keys(PLACEHOLDERS).forEach(function (ph) {
      var v = valueOf(PLACEHOLDERS[ph], project, today);
      out = out.split(ph).join(v === '' ? BLANK : v);
    });
    return fillMissing(out);
  }

  function fillMissing(text) {
    return String(text || '').replace(/\{\{[^}]*\}\}/g, BLANK);
  }

  function listPlaceholders() { return Object.keys(PLACEHOLDERS); }

  function buildFilledDoc(title, templateBody, project) {
    var exp = (root && root.SJSQ && root.SJSQ.logic && root.SJSQ.logic.exporters)
      ? root.SJSQ.logic.exporters
      : (typeof module !== 'undefined' && module.exports ? require('./exporters.js') : null);
    var body = renderText(templateBody, project).split('\n').map(function (line) {
      return '<p>' + (exp ? exp.escapeCell(line) : line) + '</p>';
    }).join('');
    return exp.buildDocHtml({
      title: title,
      meta: '项目：' + ((project || {}).name || '—') + '　生成时间：' + renderText('{{今日}}', project, ''),
      sections: [{ h: '正文', html: body }]
    });
  }

  /* ── 以下函数依赖 DOM 的部分靠手动验证；buildCopyText 为纯逻辑可测 ── */

  // 终审 I-2：复制文本构建。无项目 → 占位清单（保持现状）；有项目 → 12 个占位符
  // 经 renderText 填成真实值（未填字段留填空线）。显示名用 label || fileName（终审 I-1）。
  function buildCopyText(templateMeta, project, today) {
    var meta = templateMeta || {};
    var showName = meta.label || meta.fileName || '';
    var header = '【' + showName + '】\n';
    if (!project) {
      return header + '（空白模板，请按项目实际情况填写）\n\n' +
        listPlaceholders().map(function (ph) { return ph + '：' + BLANK; }).join('\n');
    }
    return header + '（已按当前项目填入，请核对后使用）\n\n' +
      renderText(listPlaceholders().join('\n'), project, today || '');
  }

  function todayStr() {
    var u = root && root.SJSQ && root.SJSQ.core && root.SJSQ.core.util;
    return u ? u.formatDate(new Date()) : '';
  }

  function copyToClipboard(templateMeta, ui, project) {
    var filled = !!project;
    var text = buildCopyText(templateMeta, project, todayStr());
    var msg = filled
      ? '已复制到剪贴板（已按当前项目填入 ' + listPlaceholders().length + ' 个字段，请核对）'
      : '已复制到剪贴板（共 ' + listPlaceholders().length + ' 个待填字段）';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { alert(msg); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      alert(msg);
    }
  }

  function downloadDoc(html, baseName) {
    var exp = root.SJSQ.logic.exporters;
    var u = root.SJSQ.core.util;
    var blob = new Blob(['\ufeff', html], { type: exp.wordMime() });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exp.docFileName(String(baseName || '模板').replace(/\.[^.]+$/, ''), u.formatDate(new Date()));
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  return {
    PLACEHOLDERS: PLACEHOLDERS, BLANK: BLANK,
    renderText: renderText, fillMissing: fillMissing,
    listPlaceholders: listPlaceholders, buildFilledDoc: buildFilledDoc,
    buildCopyText: buildCopyText, copyToClipboard: copyToClipboard, downloadDoc: downloadDoc
  };
});
