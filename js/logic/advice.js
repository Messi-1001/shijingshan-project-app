/* js/logic/advice.js —— 建议引擎：7 条规则（blocked/next/deadline/risk/estimate/reserved/start），
   按紧要程度排序，永不为空。纯函数，不碰 DOM 与存储。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./progress.js'), require('./schedule.js'), require('../data/reject-reasons.js'));
  } else {
    root.SJSQ = root.SJSQ || {}; root.SJSQ.logic = root.SJSQ.logic || {};
    root.SJSQ.logic.advice = factory(root.SJSQ.logic.progress, root.SJSQ.logic.schedule, root.SJSQ.data.rejectReasons);
  }
})(typeof self !== 'undefined' ? self : this, function (progress, schedule, rejectReasons) {
  'use strict';

  var RULE_ORDER = ['blocked', 'next', 'deadline', 'risk', 'estimate', 'reserved', 'start'];
  var LEVEL_WEIGHT = { block: 0, warn: 1, info: 2 };
  var RISK_HIT_THRESHOLD = 3;

  // 与 core/router.js 的 buildHash 同构（id 走路径段，其余键走查询串），
  // 保证 refs 里的 hash 一定能被 router.parseHash 解析——不手写字符串。
  function hash(name, params) {
    var p = params || {};
    var base = '#/' + String(name || '');
    if (p.id) base += '/' + encodeURIComponent(p.id);
    var extra = Object.keys(p).filter(function (k) {
      return k !== 'id' && k !== 'sub' && p[k] !== undefined && p[k] !== null && p[k] !== '';
    });
    if (extra.length) {
      base += '?' + extra.map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
      }).join('&');
    }
    return base;
  }

  function statusOf(checklist, id) {
    var c = checklist && checklist[id];
    return (c && c.status) || 'idle';
  }

  function buildAdvice(input) {
    input = input || {};
    var index = input.index || { list: [], byId: {} };
    var checklist = input.checklist || {};
    var schedInput = input.scheduleInput;
    var list = index.list || [];
    var out = [];

    var doneCount = list.filter(function (p) { return statusOf(checklist, p.id) === 'done'; }).length;

    // 1) blocked —— 前置未完成
    var blocked = [];
    list.forEach(function (p) {
      if (statusOf(checklist, p.id) === 'done') return;
      var prev = p.prev || [];
      var waiting = prev.filter(function (id) { return statusOf(checklist, id) !== 'done'; });
      if (waiting.length) blocked.push({ id: p.id, no: p.no, name: p.name, waiting: waiting });
    });
    if (blocked.length) {
      var first = blocked[0];
      var waitingNames = first.waiting.map(function (id) { return (index.byId[id] || {}).name || id; });
      out.push({
        rule: 'blocked', level: 'block',
        title: '有 ' + blocked.length + ' 项被前置卡住',
        body: '「' + first.no + '. ' + first.name + '」正等着 ' + waitingNames.join('、') + ' 办完。先把前置处理掉，否则后续整条链都动不了。',
        refs: first.waiting.map(function (id) {
          var p = index.byId[id] || {};
          return { label: '去办 ' + (p.no || '') + '. ' + (p.name || id), hash: hash('detail', { id: id }) };
        }),
      });
    }

    // 2) next —— 下一项该办的（前置已齐、编号最小）
    var next = null;
    var sorted = list.slice().sort(function (a, b) { return a.no < b.no ? -1 : a.no > b.no ? 1 : 0; });
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      if (statusOf(checklist, p.id) === 'done') continue;
      var ready = (p.prev || []).every(function (id) { return statusOf(checklist, id) === 'done'; });
      if (ready) { next = p; break; }
    }
    if (next) {
      out.push({
        rule: 'next', level: 'info',
        title: '下一步：' + next.no + '. ' + next.name,
        body: '建议先办「' + next.no + '. ' + next.name + '」——这是当前前置已齐、编号最小的可办事项。主管：' + (next.dept || '见详情页') + '。',
        refs: [{ label: '打开详情', hash: hash('detail', { id: next.id }) },
               { label: '加入办理中', hash: hash('checklist', { focus: next.id }) }],
      });
    }

    // 3) deadline —— 正推完成日晚于目标竣工日
    if (schedInput && schedInput.targetEndDate && schedInput.startDate) {
      try {
        var sched = schedule.buildSchedule(list, { mode: 'forward', startDate: schedInput.startDate });
        if (sched.range.end > schedInput.targetEndDate) {
          var gap = schedule.daysBetween(sched.range.end, schedInput.targetEndDate);
          var cp = schedule.criticalPath(list, schedInput.startDate);
          var longest = cp.items.slice().sort(function (a, b) {
            return schedule.durationOf(b) - schedule.durationOf(a);
          }).slice(0, 3);
          out.push({
            rule: 'deadline', level: 'warn',
            title: '按当前排期会超期 ' + Math.abs(gap) + ' 天',
            body: '正推完成日为 ' + sched.range.end + '，比目标竣工日 ' + schedInput.targetEndDate + ' 晚 ' + Math.abs(gap) +
              ' 天，时间不够。关键路径上最长的三项是：' + longest.map(function (p) { return p.name + '（' + schedule.durationOf(p) + ' 天）'; }).join('、') +
              '。建议从这三项入手压缩工期，或调整目标竣工日。',
            refs: [{ label: '去进度计划页调整', hash: hash('schedule') }],
          });
        }
      } catch (err) { /* 数据异常时静默跳过，不阻塞其他建议 */ }
    }

    // 4) risk —— 未完成项中命中"常见退回原因"≥3 条的项
    var risky = [];
    list.forEach(function (p) {
      if (statusOf(checklist, p.id) === 'done') return;
      var hits = rejectReasons.highFrequencyFor(p.id);
      if (hits.length >= RISK_HIT_THRESHOLD) risky.push({ p: p, hits: hits });
    });
    if (risky.length) {
      risky.sort(function (a, b) { return b.hits.length - a.hits.length; });
      var top = risky.slice(0, 3);
      out.push({
        rule: 'risk', level: 'warn',
        title: '有 ' + risky.length + ' 项属于"容易退回"类型',
        body: top.map(function (x) {
          return '· ' + x.p.no + '. ' + x.p.name + '：' + x.hits[0].reason + ' → ' + x.hits[0].fix;
        }).join('\n'),
        refs: [{ label: '查看退回原因库', hash: hash('reasons') }],
      });
    }

    // 5) estimate —— 未填工程费用
    if (!input.hasEstimate) {
      out.push({
        rule: 'estimate', level: 'info',
        title: '还没做投资估算',
        body: '本期项目按"新建 / 3000 万以上 / 财政资金 / 市级"口径处理，估算结果会直接影响初步设计概算的申报口径。建议先用两页纸估算表匡算一遍。',
        refs: [{ label: '去投资估算页', hash: hash('estimate') }],
      });
    }

    // 6) reserved —— 预留项提示
    var reserved = list.filter(function (p) { return p.reserved; });
    if (reserved.length) {
      out.push({
        rule: 'reserved', level: 'info',
        title: '有 ' + reserved.length + ' 项为预留手续',
        body: '预留项（' + reserved.map(function (p) { return p.no + '. ' + p.name; }).join('、') +
          '）本期不产生实际办理动作，但保留在清单里以覆盖极端情形。它们不计入进度完成率的分母。',
        refs: [],
      });
    }

    // 7) start —— 一项都没开始
    if (doneCount === 0 && !list.some(function (p) { return statusOf(checklist, p.id) === 'doing'; })) {
      var head = sorted.slice(0, 5);
      out.push({
        rule: 'start', level: 'info',
        title: '从这 5 项起步',
        body: head.map(function (p, i) { return (i + 1) + '. ' + p.no + '. ' + p.name + '（' + (p.dept || '见详情') + '）'; }).join('\n') +
          '\n前几项集中在发改口径，建议先一次性把线下的沟通与评审安排妥当。',
        refs: [{ label: '打开专属清单', hash: hash('checklist') }],
      });
    }

    // 兜底：排空纪律——buildAdvice 永远返回非空数组
    if (!out.length) {
      out.push({
        rule: 'start', level: 'info',
        title: '当前没有需要特别提醒的事项',
        body: '所有前置关系都已理顺。可以继续在专属清单里推进未完成事项。',
        refs: [{ label: '去专属清单', hash: hash('checklist') }],
      });
    }

    return rankAdvice(out);
  }

  function rankAdvice(list) {
    return list.slice().sort(function (a, b) {
      var w = LEVEL_WEIGHT[a.level] - LEVEL_WEIGHT[b.level];
      if (w !== 0) return w;
      return RULE_ORDER.indexOf(a.rule) - RULE_ORDER.indexOf(b.rule);
    });
  }

  return { RULE_ORDER: RULE_ORDER, RISK_HIT_THRESHOLD: RISK_HIT_THRESHOLD, buildAdvice: buildAdvice, rankAdvice: rankAdvice };
});
