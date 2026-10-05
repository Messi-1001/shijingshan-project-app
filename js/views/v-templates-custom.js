/* js/views/v-templates-custom.js —— 自定义模板（补充 ④⑤ 等空缺） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views['v-templates-custom'] = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var ALLOWED = ['土地手续', '规划手续', '发改委手续', '各类评价', '联合验收', '招标与合同', '施工许可', '其他'];
  var META_ID = 'custom-templates';

  function seq() {
    if (!root.__customTplSeq) root.__customTplSeq = 0;
    root.__customTplSeq += 1;
    return root.__customTplSeq;
  }

  function buildCustomTemplate(values) {
    var v = values || {};
    if (!v.fileName || !String(v.fileName).trim()) return null;
    var category = ALLOWED.indexOf(v.category) >= 0 ? v.category : '其他';
    // id 必须全局唯一：seq 每次刷新页面会归零，且 \W 会把中文文件名剥得只剩扩展名，
    // 二者叠加会让不同自定义模板撞 id、被 mergeCustom 去重丢失（阶段四验收实测发现），
    // 故加 Date.now 后缀并保留中文（\u4e00-\u9fa5）参与派生。
    return {
      id: 'tpl-custom-' + seq() + '-' + Date.now().toString(36) + '-' +
        String(v.fileName).replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 12),
      fileName: String(v.fileName).trim(),
      dir: v.dir || '(自定义)',
      category: category,
      type: v.type === '参考' ? '参考' : '可复用',
      editable: v.editable !== false,
      procedureIds: Array.isArray(v.procedureIds) ? v.procedureIds.slice() : [],
      placeholderId: '',
      custom: true
    };
  }

  function mergeCustom(baseList, customList) {
    var out = (baseList || []).slice();
    var seen = {};
    out.forEach(function (x) { seen[x.id] = true; });
    (customList || []).forEach(function (x) {
      if (seen[x.id]) return;
      seen[x.id] = true;
      out.push(x);
    });
    return out;
  }

  function loadCustom(store) {
    if (!store) return Promise.resolve([]);
    return store.get('meta', META_ID).then(function (row) {
      return (row && Array.isArray(row.list)) ? row.list : [];
    });
  }

  function saveCustom(store, list) {
    // Task 68：写入失败（如配额满）必须可见，禁止静默；localStorage 实现可能同步抛错
    try {
      return store.put('meta', { id: META_ID, list: list || [] })
        .catch(function (e) { root.SJSQ.views.ui.saveError(e); });
    } catch (e) {
      root.SJSQ.views.ui.saveError(e);
      return Promise.resolve();
    }
  }

  function openAddDialog(store, proceduresData, onDone) {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var form = dom.h('form', { class: 'form-grid' }, [
      ui.field({ label: '文件名（含扩展名）', name: 'fileName', placeholder: '如：施工招标文件（空白）.pdf' }),
      ui.field({ label: '存放目录（可留空）', name: 'dir', placeholder: '如：../文件模板/招标与合同' }),
      ui.field({ label: '分类', name: 'category', type: 'select', options: ALLOWED }),
      ui.field({ label: '类型', name: 'type', type: 'select', options: ['可复用', '参考'] }),
      ui.field({ label: '关联手续 id（逗号分隔）', name: 'procedureIds', placeholder: '如：zb-5 或 zb-2,zb-3' }),
      ui.field({ label: '是否可复制文字', name: 'editable', type: 'select', options: [
        { value: 'true', label: '是（文本型）' }, { value: 'false', label: '否（扫描件）' }
      ] })
    ]);

    ui.modal({
      title: '新增模板', body: form, confirmText: '保存',
      onConfirm: function () {
        var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value : ''; };
        var t = buildCustomTemplate({
          fileName: get('fileName'), dir: get('dir'), category: get('category'),
          type: get('type'), editable: get('editable') !== 'false',
          procedureIds: get('procedureIds').split(',').map(function (s) { return s.trim(); }).filter(Boolean)
        });
        if (!t) { alert('文件名不能为空'); return false; }
        loadCustom(store).then(function (list) {
          list.push(t);
          saveCustom(store, list).then(function () { if (onDone) onDone(); });
        });
        return true;
      }
    }).open();
  }

  return {
    ALLOWED: ALLOWED, META_ID: META_ID,
    buildCustomTemplate: buildCustomTemplate, mergeCustom: mergeCustom,
    loadCustom: loadCustom, saveCustom: saveCustom, openAddDialog: openAddDialog
  };
});
