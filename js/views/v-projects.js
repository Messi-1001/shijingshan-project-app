/* js/views/v-projects.js —— 页面 1：项目管理（spec 3.1） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views['v-projects'] = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // 表单字段定义（数据驱动：加字段只改这里）
  var FIELDS = [
    { name: 'name',   label: '项目名称',   required: true,  type: 'text' },
    { name: 'unit',   label: '建设单位',   required: true,  type: 'text' },
    { name: 'address', label: '建设地点',  required: false, type: 'text' },
    { name: 'landArea',   label: '用地面积（㎡）',   required: false, type: 'number' },
    { name: 'buildArea',  label: '建筑面积（㎡）',   required: false, type: 'number' },
    { name: 'height',     label: '建筑高度（m）',    required: false, type: 'number' },
    { name: 'floorsAbove', label: '地上层数',        required: false, type: 'number' },
    { name: 'floorsBelow', label: '地下层数',        required: false, type: 'number' },
    { name: 'investEstimate', label: '投资估算（元）', required: false, type: 'number' },
    { name: 'startDate', label: '计划开工', required: false, type: 'date' },
    { name: 'endDate',   label: '计划竣工', required: false, type: 'date' }
  ];

  // 本期四维固定值（spec 第 1.4 节 / G8）
  var FIXED = {
    buildNature: '新建',
    investScale: '3000万以上',
    fundSource: '财政资金',
    approvalLevel: '市级'
  };

  function nextId() {
    var u = root.SJSQ && root.SJSQ.core && root.SJSQ.core.util;
    return u ? u.uid('proj') : 'proj-' + Date.now();
  }

  function createProjectObject(values) {
    var v = values || {};
    var obj = { id: v.id || nextId() };
    FIELDS.forEach(function (f) {
      obj[f.name] = v[f.name] === undefined || v[f.name] === null ? '' : v[f.name];
    });
    Object.keys(FIXED).forEach(function (k) { obj[k] = FIXED[k]; });
    obj.createdAt = v.createdAt || (root.SJSQ && root.SJSQ.core && root.SJSQ.core.util
      ? root.SJSQ.core.util.formatDate(new Date()) : '');
    return obj;
  }

  function validateProject(obj) {
    var errs = [];
    FIELDS.filter(function (f) { return f.required; }).forEach(function (f) {
      if (!String((obj || {})[f.name] || '').trim()) errs.push(f.label + '不能为空');
    });
    return errs;
  }

  function readForm(formEl) {
    var out = {};
    FIELDS.forEach(function (f) {
      var el = formEl.querySelector('[name="' + f.name + '"]');
      out[f.name] = el ? el.value : '';
    });
    return out;
  }

  function renderForm(existing) {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var base = existing || {};
    var form = dom.h('form', { class: 'form-grid' }, FIELDS.map(function (f) {
      return ui.field({ label: f.label, name: f.name, type: f.type, value: base[f.name] || '' });
    }));
    return form;
  }

  function render() {
    var dom = root.SJSQ.core.dom;
    var ui = root.SJSQ.views.ui;
    var util = root.SJSQ.core.util;
    var app = root.SJSQ.app || {};
    var store = app.store;

    var page = dom.h('div', { class: 'page' }, [
      dom.h('div', { class: 'page__head' }, [
        dom.h('h1', { text: '项目管理' }),
        dom.h('p', { text: '新建项目后，系统会给出该项目的手续办理清单（当前四维固定：新建 / 3000万以上 / 财政资金 / 市级）。' })
      ])
    ]);

    var listSlot = dom.h('div', {});

    function refresh() {
      store.list('projects').then(function (rows) {
        dom.clear(listSlot);
        if (!rows.length) {
          listSlot.appendChild(ui.empty('还没有项目', '点右上角「新建项目」开始'));
          return;
        }
        var sorted = util.sortZh(rows, 'name');
        listSlot.appendChild(ui.table(
          ['项目名称', '建设单位', '建设地点', '建筑面积（㎡）', '投资估算（元）', '创建日期', '操作'],
          sorted.map(function (p) {
            return [
              p.name, p.unit, p.address || '—',
              p.buildArea ? util.formatMoney(p.buildArea) : '—',
              p.investEstimate ? util.formatMoney(p.investEstimate) : '—',
              p.createdAt || '—',
              [
                ui.button('打开清单', { tone: 'primary', onClick: function () {
                  root.SJSQ.app.router.go('checklist', { id: p.id });
                }}),
                ui.button('编辑', { onClick: function () { openForm(p); } }),
                ui.button('删除', { tone: 'danger', onClick: function () {
                  ui.modal({
                    title: '确认删除',
                    body: dom.h('p', { text: '确定删除「' + p.name + '」？此操作不可撤销。' }),
                    confirmText: '删除',
                    onConfirm: function () {
                      store.remove('projects', p.id).then(function () {
                        if (root.SJSQ.app.state.get().currentId === p.id) {
                          root.SJSQ.app.state.set({ currentId: null });
                        }
                        refresh();
                      });
                    }
                  }).open();
                }})
              ]
            ];
          }),
          { empty: '' }
        ));
      });
    }

    function openForm(existing) {
      var form = renderForm(existing);
      var m = ui.modal({
        title: existing ? '编辑项目' : '新建项目',
        body: form,
        confirmText: '保存',
        onConfirm: function () {
          var values = readForm(form);
          var obj = createProjectObject(Object.assign({ id: existing && existing.id }, values));
          var errs = validateProject(obj);
          if (errs.length) {
            var box = form.querySelector('.form-errors');
            if (!box) {
              box = dom.h('div', { class: 'form-errors app-banner' });
              form.insertBefore(box, form.firstChild);
            }
            box.textContent = '⚠ ' + errs.join('；');
            return false; // 不关闭弹窗
          }
          store.put('projects', obj).then(function () {
            refresh();
            if (!existing) root.SJSQ.app.state.set({ currentId: obj.id });
          });
          return true;
        }
      });
      m.open();
    }

    page.appendChild(dom.h('div', { class: 'page__actions' }, [
      ui.button('＋ 新建项目', { tone: 'primary', onClick: function () { openForm(null); } })
    ]));
    page.appendChild(listSlot);
    refresh();
    return page;
  }

  return {
    FIELDS: FIELDS, FIXED: FIXED, render: render,
    createProjectObject: createProjectObject, validateProject: validateProject
  };
});
