/* js/views/v-data.js —— 页面 12：数据管理（Task 57）
   导出备份 / 导入备份（merge/replace + 导入前自动回滚点）/ 清空全部数据。
   存储契约：全部走 backup.js（表 + id），本视图只管交互与提示。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../logic/backup.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.vData = factory(root.SJSQ.logic.backup);
  }
})(typeof self !== 'undefined' ? self : this, function (backup) {
  'use strict';

  function downloadJson(text, fileName) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function render() {
    var ui = window.SJSQ.views.ui, h = window.SJSQ.core.dom.h;
    var store = window.SJSQ.app.store;   // 运行时实例，不是 SJSQ.core.store 模块
    var wrap = h('div', { class: 'view view-data' });

    wrap.appendChild(ui.card('数据说明', h('div', {}, [
      h('p', {}, '本系统所有录入数据保存在你自己的浏览器里（优先 IndexedDB，不可用时降级到 localStorage，再不可用则仅保存在当前页面内存中）。没有服务器、不上传任何数据。'),
      h('p', { class: 'notice' }, '提示：清除浏览器数据、更换浏览器或使用无痕模式，都会导致录入内容丢失。重要节点请导出一份备份文件留档。'),
    ])));

    wrap.appendChild(ui.card('导出备份', h('div', { class: 'actions' }, [
      ui.button('导出全部数据（.json）', { tone: 'primary', onClick: async function () {
        var snap = await backup.exportSnapshot(store);
        downloadJson(backup.toJson(snap), '石景山手续系统-备份-' + backup.fileStamp() + '.json');
      } }),
    ])));

    var fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'file-input' });
    var modeSel = ui.field({ label: '导入方式', name: 'mode', type: 'select', value: 'merge', options: [
      { value: 'merge', label: '合并（推荐：只覆盖备份里有的项）' },
      { value: 'replace', label: '替换（清空现有数据后导入）' },
    ] });
    var status = h('p', { class: 'notice data-status' }, '');

    wrap.appendChild(ui.card('导入备份', h('div', {}, [
      modeSel, fileInput,
      h('div', { class: 'actions' }, [
        ui.button('导入', { onClick: async function () {
          var f = fileInput.files && fileInput.files[0];
          if (!f) { status.textContent = '请先选择一个 .json 备份文件。'; return; }
          var text = await f.text();
          var snap;
          try { snap = JSON.parse(text); } catch (e) { status.textContent = '文件不是合法 JSON，无法导入。'; return; }
          var v = backup.validateSnapshot(snap);
          if (!v.ok) { status.textContent = '校验失败：' + v.errors.join('；'); return; }
          var mode = modeSel.querySelector('[name=mode]').value;
          async function doImport() {
            // 导入前自动导出一份回滚点
            var rollback = await backup.exportSnapshot(store);
            downloadJson(backup.toJson(rollback), '石景山手续系统-导入前备份-' + backup.fileStamp() + '.json');
            var r = await backup.importSnapshot(store, snap, { mode: mode });
            status.textContent = '导入完成，写入 ' + r.written.length + ' 项：' + r.written.join('、') + '。已同时下载导入前备份。请刷新页面查看。';
          }
          if (mode === 'replace') {
            var m = ui.modal({ title: '确认替换？', body: '当前全部录入数据将被清空，且无法撤销。建议先确认"导入前备份"已下载。', confirmText: '确认替换', onConfirm: doImport });
            m.open();
          } else { doImport(); }
        } }),
      ]),
      status,
    ])));

    wrap.appendChild(ui.card('危险操作', h('div', {}, [
      h('p', {}, '清空本机全部录入数据。清空前会自动下载一份备份。'),
      h('div', { class: 'actions' }, [
        ui.button('清空全部数据', { tone: 'danger', onClick: function () {
          // 危险操作与「替换导入」同规格：二次确认后才动手
          var m = ui.modal({
            title: '确认清空？',
            body: '当前全部录入数据（项目、清单进度、各项设置）将被清空，且无法撤销。系统会先自动下载一份清空前备份。',
            confirmText: '确认清空',
            onConfirm: async function () {
              var snap = await backup.exportSnapshot(store);
              downloadJson(backup.toJson(snap), '石景山手续系统-清空前备份-' + backup.fileStamp() + '.json');
              // Store 的 clear(table) 必须带表名（没有无参 clear）。逐表清空受管范围。
              for (var i = 0; i < backup.ALL_TABLES.length; i++) {
                await store.clear(backup.ALL_TABLES[i]);
              }
              location.reload();
            },
          });
          m.open();
        } }),
      ]),
    ])));

    return wrap;
  }

  return { render: render };
});
