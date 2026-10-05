/* js/main.js —— 启动引导（必须最后引入） */
(function () {
  'use strict';

  var S = window.SJSQ;
  var REQUIRED = [
    'core.ns', 'core.util', 'core.dom', 'core.store', 'core.idb', 'core.router',
    'core.state', 'data.schema', 'data.index', 'data.guidance', 'logic.graph',
    'views.ui', 'views.shell', 'views.v-projects', 'views.v-library', 'views.v-detail'
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

  // 从存量 id 里提取序号段最大值（兼容旧格式 proj-3 与新格式 proj-3-x1y2z），
  // boot 时用它回置 util 的 uid 计数器，避免刷新后序号从 1 重来（C1 双保险之二）。
  function maxSeqOf(rows) {
    var max = 0;
    (rows || []).forEach(function (row) {
      var m = /-(\d+)/.exec(String((row && row.id) || ''));
      if (m) {
        var n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    });
    return max;
  }

  // 数据注册：rawData（七个 procedures-*.js 在加载时压入）→ buildIndex → 挂 S.app.procedures。
  // 若校验有错，页面顶部显示红色错误条并在控制台打出全部错误（自检可见，不静默）。
  function registerProcedures() {
    var idx = S.data.index;
    var out = idx.buildIndex(S.rawData || []);
    S.app = S.app || {};
    S.app.procedures = {
      list: out.list, byId: out.byId, bySection: out.bySection,
      counts: idx.getCounts(), errors: out.errors
    };
    if (out.errors.length) {
      console.error('手续数据校验不通过：\n' + out.errors.join('\n'));
      var app = document.getElementById('app');
      var bar = document.createElement('div');
      bar.className = 'app-banner';
      bar.style.background = 'var(--c-danger-bg)';
      bar.style.borderColor = 'var(--c-danger-border)';
      bar.style.color = 'var(--c-danger)';
      bar.textContent = '⚠ 手续数据校验不通过，共 ' + out.errors.length + ' 处，详见控制台（Console）';
      app.insertBefore(bar, app.firstChild);
    }
    return out;
  }

  // 阶段三、四才实现的页面的占位路由（checklist / templates / library / detail 视图文件尚未存在）
  function TODO(label) {
    return function () {
      return S.core.dom.h('div', { class: 'page' }, [
        S.core.dom.h('h1', { text: label }),
        S.views.ui.empty('本页面将在后续阶段实现', '')
      ]);
    };
  }

  function boot() {
    if (!checkModules()) return;

    // 应用状态单例：boot 前段挂好，后面 createBestStore 的回调里只做属性赋值补挂
    // store/router（G23：禁止整体替换 S.app，否则 state 会被弄丢）。
    S.app = S.app || {};
    S.app.state = S.core.state.createState();

    // 数据注册必须在路由启动之前完成（视图会读 SJSQ.app.procedures）
    registerProcedures();

    var routes = {
      projects:  function () { return S.views['v-projects'].render(); },
      library:   function () { return S.views['v-library'].render(); },
      detail:    function (params) { return S.views['v-detail'].render(params); },
      checklist: TODO('我的项目专属清单'),
      templates: TODO('模板库')
    };

    S.core.idb.createBestStore().then(function (store) {
      // 先扫存量 id 回置 uid 计数器，再进壳层——保证首个新建项目的 uid 不与旧数据撞
      return Promise.all([
        store.list('projects').catch(function () { return []; }),
        store.list('checklist').catch(function () { return []; })
      ]).then(function (lists) {
        var maxSeq = 0;
        lists.forEach(function (rows) {
          var n = maxSeqOf(rows);
          if (n > maxSeq) maxSeq = n;
        });
        if (maxSeq > 0) S.core.util.seedSeq(maxSeq);
        return store;
      });
    }).then(function (store) {
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
