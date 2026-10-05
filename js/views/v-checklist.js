/* js/views/v-checklist.js —— 页面 2：我的项目专属清单（spec 3.2，核心页） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views['v-checklist'] = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var STATUS_CODES = ['idle', 'doing', 'done'];

  function L(name) {
    if (root && root.SJSQ && root.SJSQ.logic && root.SJSQ.logic[name]) return root.SJSQ.logic[name];
    if (typeof module !== 'undefined' && module.exports) {
      if (name === 'filter') return require('../logic/filter.js');
      if (name === 'progress') return require('../logic/progress.js');
      if (name === 'exporters') return require('../logic/exporters.js');
    }
    return null;
  }

  // G24：页面内一切链接一律走 router.buildHash，禁止手拼 '#/xxx'
  function href(name, params) {
    if (root && root.SJSQ && root.SJSQ.core && root.SJSQ.core.router &&
        typeof root.SJSQ.core.router.buildHash === 'function') {
      return root.SJSQ.core.router.buildHash(name, params);
    }
    return '#/' + name; // Node/降级兜底，浏览器内不会走到
  }

  function checklistRowId(projectId, procedureId) {
    return String(projectId) + '::' + String(procedureId);
  }

  /** 纯函数：把手续 + 状态 + 项目四维 → 清单行 */
  function buildRows(list, checklist, projectValues, condMap, projectId) {
    var flt = L('filter'), prog = L('progress');
    var pid = projectId || '';
    var cm = remap(checklist, pid);
    var dm = prog ? prog.doneMapOf(list, cm) : {};

    return (list || []).map(function (p) {
      var status = prog ? prog.statusOf(cm, p.id) : 'idle';
      if (STATUS_CODES.indexOf(status) < 0) status = 'idle'; // 未知状态归 idle
      var why = [];
      if (flt) {
        why = flt.explainHit(p.id, projectValues, condMap).map(function (h) {
          return h.dim + '：' + h.value + '（适用：' + h.allowed.join('/') + '）';
        });
      }
      var blocked = (p.prev || []).filter(function (x) { return !dm[x]; });
      return {
        no: p.no, id: p.id, name: p.name, dept: p.dept,
        duration: p.duration, status: status, why: why, blocked: blocked,
        reserved: !!p.reserved
      };
    });
  }

  /** 把"以 rowId 为键"的存储映射，转成"以 procedureId 为键"的映射。
      rowId 契约：'<projectId>::<procedureId>'；row 内若缺 projectId/procedureId
      （旧数据 / 最小形态），按键名解析兜底。 */
  function remap(checklist, projectId) {
    var out = {};
    if (!projectId) return out;
    Object.keys(checklist || {}).forEach(function (k) {
      var row = checklist[k] || {};
      var segs = String(k).split('::');
      var pid = row.projectId !== undefined && row.projectId !== null && row.projectId !== ''
        ? row.projectId : segs[0];
      if (pid !== projectId) return;
      var prid = row.procedureId !== undefined && row.procedureId !== null && row.procedureId !== ''
        ? row.procedureId : segs[1];
      if (prid) out[prid] = row;
    });
    return out;
  }

  /** 安全网：统计裁剪结果，并把"本期未覆盖"的组合单独列出来（spec 5.5 第三重防护） */
  function buildSafetyNet(list, projectValues, condMap) {
    var flt = L('filter');
    var r = flt ? flt.filterProcedures(list, projectValues, condMap) : { kept: list || [], dropped: [] };

    var unhandled = [];
    // ⑤ 施工许可：装修改造走城市更新路，本期不做
    if ((projectValues || {}).buildNature === '装修改造') {
      var sg = (list || []).find(function (p) { return p.id === 'sg-1'; });
      if (sg) {
        unhandled.push({
          procedureId: 'sg-1', procedureName: sg.name,
          reason: '建设性质 = 装修改造 走"城市更新"路径（城市更新号 → 风险等级 → 超危大数量 → 工程性质 → 单体信息 → 工程编码），本期未覆盖'
        });
      }
    }

    var warning = r.dropped.length
      ? '已按项目四维取值裁掉 ' + r.dropped.length + ' 项手续，可展开查看原因；全量手续库始终可对照。'
      : '';

    return {
      keptCount: r.kept.length, droppedCount: r.dropped.length,
      dropped: r.dropped, unhandled: unhandled, warning: warning
    };
  }

  /** 看板：七个板块的完成率分项（只统计指定项目） */
  function buildBoard(list, checklist, projectId) {
    var prog = L('progress');
    var mine = remap(checklist, projectId);
    var sch = (root && root.SJSQ && root.SJSQ.data && root.SJSQ.data.schema)
      ? root.SJSQ.data.schema
      : (typeof module !== 'undefined' && module.exports ? require('../data/schema.js') : null);

    return sch.SECTION_ORDER.map(function (key) {
      var items = (list || []).filter(function (p) { return p.section === key; });
      var done = items.filter(function (p) { return prog.statusOf(mine, p.id) === 'done'; }).length;
      var percent = items.length ? Math.round((done / items.length) * 100) : 0;
      var tone = percent === 0 ? 'idle' : (percent === 100 ? 'done' : 'doing');
      return { section: key, name: sch.SECTIONS[key].name, total: items.length, done: done, percent: percent, tone: tone };
    }).filter(function (x) { return x.total > 0; });
  }

  function render(params) {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var prog = root.SJSQ.logic.progress;
    var exp = root.SJSQ.logic.exporters;
    var conditions = root.SJSQ.data.conditions;
    var app = root.SJSQ.app || {};
    var store = app.store, state = app.state;

    var projectId = (params && params.id) || state.get().currentId;

    var page = dom.h('div', { class: 'page' });

    if (!projectId) {
      page.appendChild(dom.h('h1', { text: '我的项目专属清单' }));
      page.appendChild(ui.empty('还没有选择项目', '请先到「项目管理」新建或打开一个项目'));
      page.appendChild(ui.button('去项目管理', { tone: 'primary', onClick: function () {
        app.router.go('projects');
      }}));
      return page;
    }

    var list = app.procedures.list;
    var headSlot = dom.h('div', {});
    var bodySlot = dom.h('div', {});

    function paint() {
      Promise.all([store.get('projects', projectId), store.list('checklist')]).then(function (res) {
        var project = res[0];
        var allChecklist = res[1] || [];
        var checklist = {};
        allChecklist.forEach(function (r) { checklist[r.id] = r; });

        var rows = buildRows(list, checklist, conditions.FIXED_VALUES, null, projectId);
        var stats = prog.summarize(list, remap(checklist, projectId));
        var next = prog.nextUp(list, remap(checklist, projectId));

        // 头部：项目信息 + 进度环 + 下一项
        dom.clear(headSlot);
        headSlot.appendChild(dom.h('div', { class: 'page__head' }, [
          dom.h('p', { class: 'breadcrumb' }, [dom.h('a', { href: href('projects'), text: '← 返回项目管理' })]),
          dom.h('h1', { text: '我的项目专属清单' }),
          dom.h('p', { text: (project ? project.name + '（' + project.unit + '）' : '（项目已删除）') +
            ' · 四维口径：新建 / 3000万以上 / 财政资金 / 市级' })
        ]));

        headSlot.appendChild(ui.card('进度总览', dom.h('div', { class: 'cl-overview' }, [
          ui.ring(stats.percent, '已完成'),
          dom.h('div', { class: 'cl-stats' }, [
            dom.h('div', {}, ['已办结：', dom.h('strong', { text: String(stats.done) }), ' / ' + stats.total]),
            dom.h('div', {}, ['办理中：', dom.h('strong', { text: String(stats.doing) })]),
            dom.h('div', {}, ['未开始：', dom.h('strong', { text: String(stats.idle) })]),
            next ? dom.h('div', { class: 'cl-next' }, [
              '下一项：', dom.h('a', { href: href('detail', { id: next.id }), text: '第 ' + next.no + ' 项 · ' + next.name })
            ]) : dom.h('div', { class: 'cl-next' }, ['全部手续已办结 🎉'])
          ])
        ])));

        headSlot.appendChild(ui.card('各板块完成率', dom.h('div', { class: 'board' },
          buildBoard(list, checklist, projectId).map(function (b) {
            return dom.h('div', { class: 'board__item' }, [
              dom.h('div', { class: 'board__name', text: b.name }),
              dom.h('div', { class: 'board__bar' }, [
                dom.h('div', { class: 'board__fill board__fill--' + b.tone, style: 'width:' + b.percent + '%' })
              ]),
              dom.h('div', { class: 'board__num', text: b.done + '/' + b.total + '（' + b.percent + '%）' })
            ]);
          }))));

        // 分板块表格
        dom.clear(bodySlot);
        var groups = root.SJSQ.data.schema.SECTION_ORDER.map(function (key) {
          return { key: key, meta: root.SJSQ.data.schema.SECTIONS[key] };
        });

        groups.forEach(function (g) {
          var items = rows.filter(function (r) {
            var p = app.procedures.byId[r.id];
            return p && p.section === g.key;
          });
          if (!items.length) return;

          var tableRows = items.map(function (r) {
            var sel = dom.h('select', { class: 'cl-status', dataset: { pid: r.id } }, [
              'idle', 'doing', 'done'
            ].map(function (code) {
              var m = ui.statusMeta(code);
              return dom.h('option', { value: code, selected: r.status === code }, [m.label]);
            }));

            return [
              String(r.no),
              dom.h('div', {}, [
                dom.h('a', { href: href('detail', { id: r.id }), text: r.name }),
                r.blocked.length ? dom.h('div', { class: 'cl-blocked', text: '⏸ 待前置：' + r.blocked.length + ' 项' }) : null
              ]),
              r.dept || '—',
              r.duration || '—',
              sel,
              dom.h('input', {
                class: 'cl-note', type: 'text', placeholder: '备注…',
                value: (checklist[checklistRowId(projectId, r.id)] || {}).note || '',
                dataset: { pid: r.id }
              })
            ];
          });

          bodySlot.appendChild(ui.section(g.meta.no + ' ' + g.meta.name, [
            ui.table(['#', '手续名称', '办理部门', '参考时限', '状态', '备注'], tableRows, { empty: '' })
          ]));
        });

        // 🔒 安全网 2：每项"为什么你要办这一项"
        bodySlot.appendChild(ui.section('为什么你要办这些手续（命中依据）', [
          ui.table(['#', '手续', '命中依据'], rows.filter(function (r) { return r.why.length; })
            .map(function (r) { return [String(r.no), r.name, r.why.join('；')]; }))
        ]));

        // 🔒 安全网 3：裁剪结果可展开 + 本期未覆盖显式提示
        var net = buildSafetyNet(list, conditions.FIXED_VALUES, null);

        if (net.warning) {
          var details = dom.h('details', { class: 'cl-dropped' }, [
            dom.h('summary', { text: net.warning }),
            dom.h('ul', {}, net.dropped.map(function (d) {
              return dom.h('li', { text: '第 ' + (app.procedures.byId[d.id] || {}).no + ' 项 ' +
                d.name + ' —— 未命中：' + d.miss.join('、') });
            }))
          ]);
          bodySlot.appendChild(details);
        }

        if (net.unhandled.length) {
          bodySlot.appendChild(ui.section('⛔ 本期未覆盖（显式提示，非静默隐藏）', [
            ui.table(['手续', '原因'], net.unhandled.map(function (u) {
              return [u.procedureName, u.reason];
            }))
          ]));
        }

        // ⑧ 收尾结算：一句话说明
        bodySlot.appendChild(ui.section('⑧ 收尾结算（一句话说明，不编号）', [
          dom.h('div', { class: 'ui-card' }, [
            dom.h('div', { class: 'ui-card__body' }, [
              dom.h('p', { text: root.SJSQ.data.index.closingNote() })
            ])
          ])
        ]));

        bindTableEvents();
      });
    }

    function persist(procedureId, patch) {
      var id = checklistRowId(projectId, procedureId);
      return store.get('checklist', id).then(function (existing) {
        var row = Object.assign({
          id: id, projectId: projectId, procedureId: procedureId,
          status: 'idle', note: '', updatedAt: ''
        }, existing || {}, patch);
        row.updatedAt = root.SJSQ.core.util.formatDate(new Date()) + ' ' +
          root.SJSQ.core.util.pad2(new Date().getHours()) + ':' +
          root.SJSQ.core.util.pad2(new Date().getMinutes());
        return store.put('checklist', row);
      });
    }

    // paint() 每次整体重建 bodySlot，旧节点连同其监听器一起被丢弃，直接重绑即可
    function bindTableEvents() {
      // 状态下拉
      bodySlot.querySelectorAll('.cl-status').forEach(function (el) {
        el.addEventListener('change', function () {
          persist(el.dataset.pid, { status: el.value }).then(paint);
        });
      });
      // 备注（去抖 600ms 后保存）
      var save = root.SJSQ.core.util.debounce(function (el) {
        persist(el.dataset.pid, { note: el.value });
      }, 600);
      bodySlot.querySelectorAll('.cl-note').forEach(function (el) {
        el.addEventListener('input', function () { save(el); });
      });
    }

    // 顶部操作：对照全量库 / 打印 / 导出
    var actions = dom.h('div', { class: 'page__actions' }, [
      dom.h('a', { class: 'ui-btn', href: href('library'), text: '对照全量手续库' }),
      ui.button('打印清单', { onClick: function () { window.print(); } }),
      ui.button('导出 Word', { onClick: function () {
        Promise.all([store.get('projects', projectId), store.list('checklist')]).then(function (res) {
          var project = res[0] || { name: '项目' };
          var checklist = {};
          (res[1] || []).forEach(function (r) { checklist[r.id] = r; });
          var rows = buildRows(list, checklist, conditions.FIXED_VALUES, null, projectId);
          var html = exp.buildDocHtml({
            title: project.name + ' · 手续办理清单',
            meta: '建设单位：' + (project.unit || '—') + '　生成时间：' + root.SJSQ.core.util.formatDate(new Date()),
            sections: [
              { h: '一、办理清单', html: exp.buildTableHtml(
                ['#', '手续名称', '办理部门', '参考时限', '状态'],
                rows.map(function (r) {
                  return [String(r.no), r.name, r.dept, r.duration || '—', ui.statusMeta(r.status).label];
                })) },
              { h: '二、⑧ 收尾结算说明', html: '<p>' + root.SJSQ.data.index.closingNote() + '</p>' }
            ]
          });
          exp.downloadDoc(html, exp.docFileName(project.name + '手续办理清单',
            root.SJSQ.core.util.formatDate(new Date())));
        });
      }})
    ]);

    page.appendChild(headSlot);
    page.appendChild(actions);
    page.appendChild(bodySlot);
    paint();
    return page;
  }

  return {
    buildRows: buildRows, remap: remap, checklistRowId: checklistRowId,
    buildSafetyNet: buildSafetyNet, buildBoard: buildBoard, render: render
  };
});
