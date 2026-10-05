/* js/views/ui.js —— 通用组件（薄壳，业务计算一律交给 logic/） */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.views = root.SJSQ.views || {};
    root.SJSQ.views.ui = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var STATUS = { idle: '未开始', doing: '办理中', done: '已办结' };

  function statusMeta(code) {
    var c = Object.prototype.hasOwnProperty.call(STATUS, code) ? code : 'idle';
    return { code: c, label: STATUS[c], tone: c };
  }

  function D() { return root.SJSQ.core.dom; }

  function card(title, body) {
    var dom = D();
    var kids = [];
    if (title) kids.push(dom.h('div', { class: 'ui-card__head' }, [dom.h('h3', { text: title })]));
    kids.push(dom.h('div', { class: 'ui-card__body' }, body || ''));
    return dom.h('section', { class: 'ui-card' }, kids);
  }

  function section(title, children) {
    var dom = D();
    return dom.h('section', { class: 'ui-section' }, [
      dom.h('h2', { class: 'ui-section__title', text: title }),
      dom.h('div', { class: 'ui-section__body' }, children || '')
    ]);
  }

  function table(headers, rows, opts) {
    var dom = D();
    opts = opts || {};
    var head = dom.h('thead', {}, [dom.h('tr', {}, headers.map(function (t) {
      return dom.h('th', { text: t });
    }))]);
    var body = dom.h('tbody', {}, (rows || []).map(function (r) {
      return dom.h('tr', {}, r.map(function (cell) {
        return dom.h('td', {}, cell === null || cell === undefined ? '' : cell);
      }));
    }));
    var t = dom.h('table', { class: 'ui-table' }, [head, body]);

    if (!rows || !rows.length) {
      return dom.h('div', { class: 'ui-table-wrap' }, [t, empty(opts.empty || '暂无数据')]);
    }
    return dom.h('div', { class: 'ui-table-wrap' }, [t]);
  }

  function tag(text, tone) {
    return D().h('span', { class: 'ui-tag ui-tag--' + (tone || 'idle'), text: text });
  }

  function statusTag(code) {
    var m = statusMeta(code);
    return tag(m.label, m.tone);
  }

  function button(text, opts) {
    var dom = D();
    opts = opts || {};
    var b = dom.h('button', {
      class: 'ui-btn ui-btn--' + (opts.tone || 'default') + (opts.disabled ? ' is-disabled' : ''),
      type: 'button',
      disabled: !!opts.disabled
    }, [text]);
    if (opts.onClick && !opts.disabled) b.addEventListener('click', opts.onClick);
    if (opts.disabled && opts.title) b.title = opts.title;
    return b;
  }

  function empty(text, hint) {
    var dom = D();
    return dom.h('div', { class: 'ui-empty' }, [
      dom.h('div', { class: 'ui-empty__text', text: text || '暂无数据' }),
      hint ? dom.h('div', { class: 'ui-empty__hint', text: hint }) : null
    ]);
  }

  function modal(opts) {
    var dom = D();
    var overlay = dom.h('div', { class: 'ui-modal' }, [
      dom.h('div', { class: 'ui-modal__dialog', role: 'dialog', 'aria-modal': 'true' }, [
        dom.h('div', { class: 'ui-modal__head' }, [dom.h('h3', { text: opts.title || '' })]),
        dom.h('div', { class: 'ui-modal__body' }, opts.body || ''),
        dom.h('div', { class: 'ui-modal__foot' }, [
          button('取消', { onClick: function () { api.close(); } }),
          button(opts.confirmText || '确定', { tone: 'primary', onClick: function () {
            var ok = opts.onConfirm ? opts.onConfirm() : true;
            if (ok !== false) api.close();
          }})
        ])
      ])
    ]);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) api.close(); });
    var api = {
      el: overlay,
      open: function () { document.body.appendChild(overlay); },
      close: function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    };
    return api;
  }

  function field(o) {
    var dom = D();
    var id = 'f-' + (o.name || Math.random().toString(36).slice(2));
    var input;
    if (o.type === 'select') {
      input = dom.h('select', { id: id, name: o.name }, (o.options || []).map(function (op) {
        var value = typeof op === 'string' ? op : op.value;
        var label = typeof op === 'string' ? op : op.label;
        return dom.h('option', { value: value, selected: String(o.value) === String(value) }, [label]);
      }));
    } else if (o.type === 'textarea') {
      input = dom.h('textarea', { id: id, name: o.name, rows: o.rows || 4 }, [o.value || '']);
    } else {
      input = dom.h('input', { id: id, name: o.name, type: o.type || 'text', value: o.value === undefined ? '' : o.value, placeholder: o.placeholder || '' });
    }
    return dom.h('div', { class: 'ui-field' }, [
      dom.h('label', { for: id, text: o.label }),
      input,
      o.hint ? dom.h('div', { class: 'ui-field__hint', text: o.hint }) : null
    ]);
  }

  function ring(pct, label) {
    var dom = D();
    var r = 26, c = 2 * Math.PI * r;
    var dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('class', 'ui-ring__svg');
    function circle(attrs) {
      var el = document.createElementNS(svgNS, 'circle');
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      return el;
    }
    svg.appendChild(circle({ cx: 32, cy: 32, r: r, fill: 'none', stroke: 'var(--c-border)', 'stroke-width': 6 }));
    svg.appendChild(circle({
      cx: 32, cy: 32, r: r, fill: 'none', stroke: 'var(--c-primary)', 'stroke-width': 6,
      'stroke-linecap': 'round', 'stroke-dasharray': dash + ' ' + (c - dash),
      transform: 'rotate(-90 32 32)'
    }));
    return dom.h('div', { class: 'ui-ring' }, [
      svg,
      dom.h('div', { class: 'ui-ring__label' }, [
        dom.h('strong', { text: pct + '%' }),
        dom.h('span', { text: label })
      ])
    ]);
  }

  function timelineBar(steps) {
    var dom = D();
    var total = (steps || []).reduce(function (s, x) { return s + (x.duration || 0); }, 0) || 1;
    return dom.h('div', { class: 'ui-tlbar' }, [
      dom.h('div', { class: 'ui-tlbar__track' }, (steps || []).map(function (s) {
        var w = Math.max(2, Math.round(((s.duration || 0) / total) * 100));
        var time = s.duration ? s.duration + ' 天' : '—';
        var seg = dom.h('div', { class: 'ui-tlbar__seg', style: 'width:' + w + '%', title: s.name + '（' + time + '）' }, [s.name]);
        if (s.duration) seg.appendChild(dom.h('span', { class: 'ui-tlbar__dur', text: String(s.duration) }));
        return seg;
      }))
    ]);
  }

  function stepCards(steps) {
    var dom = D();
    return dom.h('ol', { class: 'ui-steps' }, (steps || []).map(function (s, i) {
      return dom.h('li', { class: 'ui-steps__item' }, [
        dom.h('span', { class: 'ui-steps__no', text: String(i + 1) }),
        dom.h('div', { class: 'ui-steps__body' }, [
          dom.h('h4', { text: s.title }),
          s.body ? dom.h('div', { class: 'ui-steps__desc' }, s.body) : null
        ])
      ]);
    }));
  }

  return {
    STATUS: STATUS, statusMeta: statusMeta, statusTag: statusTag,
    card: card, section: section, table: table, tag: tag, button: button,
    empty: empty, modal: modal, field: field, ring: ring,
    timelineBar: timelineBar, stepCards: stepCards
  };
});
