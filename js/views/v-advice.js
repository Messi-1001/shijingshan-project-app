/* js/views/v-advice.js —— 建议页（首页默认落点）：一次调用读齐全局状态，
   先返回骨架、再异步填充（总览 8.6 #4：collectInput 是 Promise，paint() 独立成函数）。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../logic/advice.js'), require('../logic/progress.js'), require('../logic/schedule.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.vAdvice = factory(root.SJSQ.logic.advice, root.SJSQ.logic.progress, root.SJSQ.logic.schedule);
  }
})(typeof self !== 'undefined' ? self : this, function (advice, progress, schedule) {
  'use strict';

  function adviceTone(level) {
    if (level === 'block') return 'advice-block';
    if (level === 'warn') return 'advice-warn';
    return 'advice-info';
  }

  // 入参 store 可注入（Node 测试用）；浏览器中取的是运行时实例 SJSQ.app.store，
  // 不是模块 SJSQ.core.store（后者只有 createMemoryStore/assertStoreContract/TABLES）。
  function collectInput(store) {
    var s = store || (typeof window !== 'undefined' && window.SJSQ && window.SJSQ.app && window.SJSQ.app.store);
    var index = (typeof window !== 'undefined' && window.SJSQ && window.SJSQ.data && window.SJSQ.data.proceduresIndex) || { list: [], byId: {} };
    var fallbackSched = (typeof window !== 'undefined' && window.SJSQ && window.SJSQ.views && window.SJSQ.views.vSchedule)
      ? window.SJSQ.views.vSchedule.defaultInput()
      : { mode: 'forward', startDate: '2026-01-01', targetEndDate: '2027-01-01' };
    // G22：单例设置存在 meta 表，读到的是 { id, value }；checklist 是行表，需自行聚成 map。
    // 浏览器端手续索引用 boot 挂好的 SJSQ.app.procedures（与 v-platform / v-reasons 同口径）。
    var idx = (typeof window !== 'undefined' && window.SJSQ && window.SJSQ.app && window.SJSQ.app.procedures) || index;
    return Promise.all([
      Promise.resolve(s.get('meta', 'scheduleInput')),
      Promise.resolve(s.get('meta', 'estimateInput')),
      Promise.resolve(s.get('meta', 'projectValues')),
      Promise.resolve(s.list('checklist')),
    ]).then(function (res) {
      var schedRow = res[0], estRow = res[1], pvRow = res[2], rows = res[3] || [];
      var checklist = {};
      rows.forEach(function (r) { checklist[r.id] = r; });
      return {
        index: idx,
        checklist: checklist,
        projectValues: (pvRow && pvRow.value) || null,
        scheduleInput: (schedRow && schedRow.value) || fallbackSched,
        hasEstimate: !!(estRow && estRow.value && estRow.value.工程费用 > 0),
      };
    }).catch(function () {
      // 读取失败时给出安全的默认入参，让页面照常渲染（不白屏）
      return { index: idx, checklist: {}, projectValues: null, scheduleInput: fallbackSched, hasEstimate: false };
    });
  }

  // 把入参画进 body（独立成函数，方便异步填充）
  function paint(input, ui, h, body, router) {
    var index = input.index;
    var sum = progress.summarize(index.list || [], input.checklist);
    var list = advice.buildAdvice(input);

    // 顶部进度概览
    body.appendChild(ui.card('项目进度概览', h('div', { class: 'advice-overview' }, [
      h('div', { class: 'ov-item' }, [h('span', { class: 'ov-num' }, String(sum.percent) + '%'), h('span', { class: 'ov-label' }, '总体完成度')]),
      h('div', { class: 'ov-item' }, [h('span', { class: 'ov-num' }, String(sum.done)), h('span', { class: 'ov-label' }, '已办结')]),
      h('div', { class: 'ov-item' }, [h('span', { class: 'ov-num' }, String(sum.doing)), h('span', { class: 'ov-label' }, '办理中')]),
      h('div', { class: 'ov-item' }, [h('span', { class: 'ov-num' }, String(sum.idle)), h('span', { class: 'ov-label' }, '未开始')]),
      h('div', { class: 'ov-item' }, [h('span', { class: 'ov-num' }, String(sum.total)), h('span', { class: 'ov-label' }, '清单总数')]),
    ])));

    // 建议列表（body 含 \n，靠 .advice-body 的 white-space: pre-line 换行，不手动拆 <p>）
    var items = list.map(function (a) {
      return h('div', { class: 'advice-item ' + adviceTone(a.level) }, [
        h('div', { class: 'advice-title' }, a.title),
        h('div', { class: 'advice-body' }, a.body),
        h('div', { class: 'advice-refs' }, (a.refs || []).map(function (r) {
          return h('a', { class: 'advice-ref', href: r.hash }, r.label);
        })),
      ]);
    });
    body.appendChild(ui.card('给你的建议（' + list.length + ' 条，按紧要程度排序）', items.length ? items : h('p', { class: 'notice' }, '暂无建议。')));

    // 快捷入口
    body.appendChild(ui.card('常用入口', h('div', { class: 'advice-quick' }, [
      ui.button('专属清单', { onClick: function () { location.hash = router.buildHash('checklist'); } }),
      ui.button('全量手续库', { onClick: function () { location.hash = router.buildHash('library'); } }),
      ui.button('进度计划', { onClick: function () { location.hash = router.buildHash('schedule'); } }),
      ui.button('投资估算', { onClick: function () { location.hash = router.buildHash('estimate'); } }),
      ui.button('平台导航', { onClick: function () { location.hash = router.buildHash('platform'); } }),
      ui.button('退回原因库', { onClick: function () { location.hash = router.buildHash('reasons'); } }),
    ])));
  }

  function render(params) {
    var dom = window.SJSQ.core.dom;
    var ui = window.SJSQ.views.ui, h = dom.h;
    var store = window.SJSQ.app.store;            // 运行时实例（不是 SJSQ.core.store 模块）
    var router = window.SJSQ.core.router;

    var wrap = h('div', { class: 'view view-advice' });
    var body = h('div', { class: 'advice-slot' }, h('p', { class: 'notice' }, '正在读取本机数据…'));
    wrap.appendChild(body);

    // store 接口一律返回 Promise，所以必须「先返回骨架、再异步填充」，
    // 绝不能在 render 里同步使用 collectInput 的返回值。
    Promise.resolve(collectInput(store)).then(function (input) {
      dom.clear(body);
      paint(input, ui, h, body, router);
    }).catch(function () {
      dom.clear(body);
      body.appendChild(h('p', { class: 'notice' }, '读取本机数据失败，请刷新页面重试。'));
    });

    return wrap;
  }

  return { adviceTone: adviceTone, collectInput: collectInput, render: render };
});
