/* js/views/v-detail.js —— 页面 4：手续详情（spec 3.4，7 个信息块） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views['v-detail'] = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function getIndex(injected) {
    if (injected) return injected;
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.index) return root.SJSQ.data.index;
    if (typeof module !== 'undefined' && module.exports) return require('../data/procedures-index.js');
    return null;
  }

  function getGuidance() {
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.guidance) return root.SJSQ.data.guidance;
    if (typeof module !== 'undefined' && module.exports) return require('../data/guidance.js');
    return null;
  }

  function getKnownTemplateIds() {
    if (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.templates) {
      return root.SJSQ.data.templates.allIds();
    }
    return []; // 阶段四之前模板库尚未建立，全部视为"尚未挂接"
  }

  function buildDetailModel(id, injectedIndex) {
    var idx = getIndex(injectedIndex);
    if (!idx) return null;
    var proc = idx.getById(id);
    if (!proc) return null;

    var all = idx.getAll();
    var prevProcs = (proc.prev || []).map(function (pid) { return idx.getById(pid); })
      .filter(Boolean);
    var nextProcs = all.filter(function (p) { return (p.prev || []).indexOf(id) >= 0; });

    var g = getGuidance();
    var hint = (g && g.EVALUATION_HINTS && g.EVALUATION_HINTS[id]) || '';

    var known = getKnownTemplateIds();
    var missingTemplateIds = (proc.templates || []).filter(function (t) { return known.indexOf(t) < 0; });

    return { proc: proc, prevProcs: prevProcs, nextProcs: nextProcs, hint: hint, missingTemplateIds: missingTemplateIds };
  }

  function render(params) {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var id = (params && params.id) || '';
    var m = buildDetailModel(id);

    if (!m) {
      return dom.h('div', { class: 'page' }, [
        dom.h('h1', { text: '手续详情' }),
        ui.empty('找不到手续费：' + id, '请返回全量手续库重新选择')
      ]);
    }

    var p = m.proc;
    var page = dom.h('div', { class: 'page' }, [
      dom.h('div', { class: 'page__head' }, [
        dom.h('p', { class: 'breadcrumb' }, [
          dom.h('a', { href: '#/library', text: '← 返回全量手续库' })
        ]),
        dom.h('h1', { text: (p.no === null ? '' : '第 ' + p.no + ' 项 · ') + p.name }),
        dom.h('p', { text: p.notes || '' })
      ])
    ]);

    // 块 1 办理依据
    page.appendChild(ui.card('① 办理依据', dom.h('p', { text: p.basis || '待补充' })));

    // 块 2 前置条件
    page.appendChild(ui.card('② 前置条件', m.prevProcs.length
      ? dom.h('ul', {}, m.prevProcs.map(function (x) {
          return dom.h('li', {}, [dom.h('a', { href: '#/detail/' + x.id, text: '第 ' + x.no + ' 项 · ' + x.name })]);
        }))
      : dom.h('p', { text: '无前置手续，可作为起点。' })));

    // 块 3 办理部门 + 块 4 参考时限
    page.appendChild(ui.card('③ 办理部门 / ④ 参考时限', ui.table(
      ['办理部门', '参考时限', '线上平台'],
      [[p.dept || '—', p.duration || '以官方办事指南为准',
        p.platform === 'fgw' ? '北京市发展和改革委员会' : (p.platform === 'tzxm' ? '北京投资项目在线审批监管平台' : '—')]]
    )));

    // 块 5 所需材料清单
    page.appendChild(ui.card('⑤ 所需材料清单', p.materials && p.materials.length
      ? ui.table(['材料名称', '份数', '盖章要求', '提供方'], p.materials.map(function (mt) {
          return [mt.name || '', mt.copies || '—', mt.seal || '—', mt.provider || '—'];
        }))
      : ui.empty(p.reserved ? '预留项，暂不展开材料清单' : '材料清单待补充')));

    // 块 6 关联模板
    page.appendChild(ui.card('⑥ 关联模板', (p.templates && p.templates.length)
      ? dom.h('div', {}, [
          dom.h('p', { text: m.missingTemplateIds.length
            ? '以下 ' + m.missingTemplateIds.length + ' 个模板尚未挂接（模板库在阶段四建立）：'
            : '可在模板库中打开：' }),
          dom.h('ul', {}, p.templates.map(function (t) {
            return dom.h('li', {}, [dom.h('a', { href: '#/templates', text: t })]);
          }))
        ])
      : ui.empty('暂无关联模板')));

    // 块 7 常见退回原因（阶段六接入）
    page.appendChild(ui.card('⑦ 常见退回原因', ui.empty('退回原因库将在阶段六接入', '')));

    // 附加：评价类触发条件提示
    if (m.hint) {
      page.appendChild(ui.card('提示：本项什么时候才需要办？', dom.h('p', { text: m.hint })));
    }

    // 附加：后继手续
    if (m.nextProcs.length) {
      page.appendChild(ui.card('办完本项之后', dom.h('ul', {}, m.nextProcs.map(function (x) {
        return dom.h('li', {}, [dom.h('a', { href: '#/detail/' + x.id, text: '第 ' + x.no + ' 项 · ' + x.name })]);
      }))));
    }

    return page;
  }

  return { buildDetailModel: buildDetailModel, render: render };
});
