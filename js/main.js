/* js/main.js —— 启动引导（必须最后引入） */
(function () {
  'use strict';

  // Node 测试环境：不执行 boot，只导出可测的错误条挂载函数
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountValidationErrorBar: mountValidationErrorBar };
    return;
  }

  var S = window.SJSQ;
  var REQUIRED = [
    'core.ns', 'core.util', 'core.dom', 'core.store', 'core.idb', 'core.router',
    'core.state', 'data.schema', 'data.index', 'data.guidance', 'logic.graph',
    'data.conditions', 'logic.filter', 'logic.progress', 'logic.exporters',
    'logic.renderTemplate',
    'views.ui', 'views.shell', 'views.v-projects', 'views.v-library', 'views.v-detail',
    'views.v-checklist', 'views.v-templates', 'views.v-templates-custom'
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
  // 若校验有错，控制台打出全部错误（自检可见，不静默）；红条本身延迟到壳层挂载后渲染
  // （见 mountValidationErrorBar），避免被 boot 清空 #app 的时机抹掉。
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
    }
    var tpl = S.data.templates;
    var tplOut = tpl.build();
    S.app.templates = { list: tplOut.list, byId: tplOut.byId, errors: tplOut.errors };
    if (tplOut.errors.length) console.error('模板索引校验不通过：\n' + tplOut.errors.join('\n'));
    return out;
  }

  // 校验失败红条：挂进壳层的 banner 区（topbar 与 main 之间）。该区在 router 的
  // mount（mainEl）之外，任何 render / 清屏都不会把它带走（终审 #1 修复）。
  // 之所以不在 registerProcedures 里立即插 #app：随后 rootEl.innerHTML='' 会把它清掉。
  function mountValidationErrorBar(shellEl, errors) {
    if (!shellEl || !(errors || []).length) return null;
    var bar = document.createElement('div');
    bar.className = 'app-banner';
    bar.style.background = 'var(--c-danger-bg)';
    bar.style.borderColor = 'var(--c-danger-border)';
    bar.style.color = 'var(--c-danger)';
    bar.textContent = '⚠ 手续数据校验不通过，共 ' + errors.length + ' 处，详见控制台（Console）';
    var zone = shellEl.__bannerZone;
    if (zone) {
      zone.appendChild(bar);
    } else {
      shellEl.insertBefore(bar, shellEl.firstChild);
    }
    return bar;
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
      checklist: function (p) { return S.views['v-checklist'].render(p); },
      templates: function (p) { return S.views['v-templates'].render(p); }
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

      // 校验红条必须在清屏之后挂进 banner 区，才能持续可见（终审 #1）
      mountValidationErrorBar(shell, S.app.procedures && S.app.procedures.errors);
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
