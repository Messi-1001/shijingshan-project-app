/* js/main.js —— 启动引导（必须最后引入） */
(function () {
  'use strict';

  var S = window.SJSQ;
  var REQUIRED = [
    'core.ns', 'core.util', 'core.dom', 'core.store', 'core.idb', 'core.router'
  ];

  function checkModules() {
    var missing = REQUIRED.filter(function (path) {
      var cur = S, segs = path.split('.');
      for (var i = 0; i < segs.length; i++) { cur = cur && cur[segs[i]]; }
      return !cur;
    });
    if (missing.length) {
      document.getElementById('app').innerHTML =
        '<div class="app-banner">模块加载不全，缺少：' + missing.join('、') +
        '。请检查 index.html 的 script 顺序。</div>';
      return false;
    }
    return true;
  }

  function boot() {
    if (!checkModules()) return;

    var routes = {
      // 阶段一 Task 10 会替换为 S.views['v-projects'].render()；
      // v-projects.js 尚未创建，此处先用占位视图，避免启动报错（brief Step 8 备注）
      projects: function () {
        return S.core.dom.h('div', { class: 'page', text: '项目管理（待 Task 10 实现）' });
      }
    };

    S.core.idb.createBestStore().then(function (store) {
      var shell = S.views.shell.createShell({
        store: store,
        storeInfo: { reason: store.reason || '' },
        routes: routes
      });
      var rootEl = document.getElementById('app');
      rootEl.innerHTML = '';
      rootEl.appendChild(shell);
      var r = shell.__router;

      // 顺序关键：必须先把运行时单例挂到 S.app，再 r.start()。
      // 因为首个视图在 render() 里读的是 SJSQ.app.store / SJSQ.app.state。
      // 注意用「属性赋值」而不是「整体替换 S.app」——S.app.state 已在 boot 前段挂好，
      // 整体替换会把它弄丢（这也是 03/04 的视图读不到 state 的根因）。
      S.app = S.app || {};
      S.app.store = store;
      S.app.storeInfo = { kind: store.kind, degraded: !!store.degraded };
      S.app.router = r;

      r.start();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
