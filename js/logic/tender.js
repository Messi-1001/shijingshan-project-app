/* js/logic/tender.js —— 四类招标时间轴 + 招标方式建议（纯函数） */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = mod; }
  else {
    root.SJSQ = root.SJSQ || { core: {}, data: {}, logic: {}, views: {}, rawData: [] };
    root.SJSQ.logic = root.SJSQ.logic || {};
    root.SJSQ.logic.tender = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var TENDER_TYPES = ['设计', '勘察', '监理', '施工'];

  var STATUS_MAP = { '未开始': 'idle', '办理中': 'doing', '已办结': 'done' };

  // 各类型招标的额外系数（服务类比工程类短，评审更简单）
  var TYPE_FACTOR = { '设计': 1.0, '勘察': 0.9, '监理': 0.8, '施工': 1.15 };

  var PHASES = [
    { key: 'announce', name: '公告期',   days: 20 },
    { key: 'qa',       name: '答疑',     days: 5  },
    { key: 'open',     name: '开标',     days: 1  },
    { key: 'evaluate', name: '评标',     days: 5  },
    { key: 'publish',  name: '公示',     days: 3  },
    { key: 'notice',   name: '中标通知', days: 2  },
    { key: 'contract', name: '合同签订', days: 5  }
  ];

  var PRE_QUALIFY_EXTRA = { preQualification: 10, preQualifyReview: 7 };

  function pad2(n) { return String(n).padStart(2, '0'); }

  /** 纯字符串日期加减，用 UTC 避免夏令时/时区导致差一天 */
  function addDays(dateStr, n) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
    if (!m) return '';
    var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    d.setUTCDate(d.getUTCDate() + Number(n || 0));
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  function scale(days, type) {
    var f = TYPE_FACTOR[type] || 1;
    return Math.max(1, Math.round(days * f));
  }

  function buildTimeline(type, opts) {
    var o = opts || {};
    var cursor = o.startDate || '';
    var phases = [];
    var list = PHASES.slice();

    // 资格预审：在公告期之前插入资格预审公告与评审
    if (o.preQualification) {
      list = [
        { key: 'preAnnounce', name: '资格预审公告', days: PRE_QUALIFY_EXTRA.preQualification },
        { key: 'preReview',   name: '资格预审评审', days: PRE_QUALIFY_EXTRA.preQualifyReview }
      ].concat(list);
    }

    list.forEach(function (ph) {
      var d = scale(ph.days, type);
      var start = cursor || '';
      var end = cursor ? addDays(cursor, d - 1) : '';
      phases.push({ key: ph.key, name: ph.name, days: d, startDate: start, endDate: end });
      if (cursor) cursor = addDays(end, 1);
    });

    var totalDays = phases.reduce(function (s, p) { return s + p.days; }, 0);
    return {
      type: type, phases: phases, totalDays: totalDays,
      endDate: o.startDate ? addDays(o.startDate, totalDays - 1) : ''
    };
  }

  function buildAllTimelines(opts) {
    return TENDER_TYPES.map(function (tp) { return buildTimeline(tp, opts); });
  }

  return {
    TENDER_TYPES: TENDER_TYPES, STATUS_MAP: STATUS_MAP, PHASES: PHASES, TYPE_FACTOR: TYPE_FACTOR,
    addDays: addDays, buildTimeline: buildTimeline, buildAllTimelines: buildAllTimelines
  };
});
