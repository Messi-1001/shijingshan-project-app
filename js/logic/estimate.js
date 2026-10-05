/* js/logic/estimate.js —— 投资估算内核：分档累进 + 不动点迭代 + 两页纸数据（纯函数，不碰 DOM 与存储） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.logic = root.SJSQ.logic || {}; root.SJSQ.logic.estimate = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BRACKETS_MGMT = [
    { upTo: 1000, rate: 0.020 }, { upTo: 5000, rate: 0.018 }, { upTo: 10000, rate: 0.016 },
    { upTo: 50000, rate: 0.014 }, { upTo: 100000, rate: 0.012 }, { upTo: Infinity, rate: 0.010 },
  ];

  var RATE_ITEMS = [
    { key: 'kcsj', name: '勘察设计费', rate: 0.0260, base: '工程费用', ref: '计价格〔2002〕10号' },
    { key: 'jl', name: '工程监理费', rate: 0.0200, base: '工程费用', ref: '发改价格〔2007〕670号' },
    { key: 'zbdl', name: '招标代理服务费', rate: 0.0035, base: '工程费用', ref: '计价格〔2002〕1980号' },
    { key: 'sgtz', name: '施工图审查费', rate: 0.0010, base: '工程费用', ref: '京建发〔2019〕' },
    { key: 'zjhf', name: '前期工作咨询费', rate: 0.0015, base: '项目总投资', ref: '计价格〔1999〕1283号' },
    { key: 'hp', name: '环境影响评价费', rate: 0.0006, base: '项目总投资', ref: '计价格〔2002〕125号' },
    { key: 'zjzx', name: '造价咨询费', rate: 0.0030, base: '工程费用', ref: '京价协〔2020〕' },
    { key: 'bx', name: '工程保险费', rate: 0.0030, base: '工程费用', ref: '行业惯例' },
    { key: 'cdzb', name: '场地准备及临时设施费', rate: 0.0050, base: '工程费用', ref: '行业惯例' },
  ];

  var MGMT_ITEM = { key: 'jsdwgl', name: '建设单位管理费', ref: '财建〔2016〕504号' };

  var SPLIT_RATIOS = { 建筑工程费: 0.60, 安装工程费: 0.20, 设备及工器具购置费: 0.20 };
  var RESERVE_RATE = 0.03;

  function round2(n) { return Math.round(n * 100) / 100; }

  function calcBracketFee(amountWan, brackets) {
    var bs = brackets || BRACKETS_MGMT;
    var remain = amountWan, lower = 0, sum = 0;
    for (var i = 0; i < bs.length; i++) {
      var upper = Math.min(amountWan, bs[i].upTo);
      if (upper > lower) { sum += (upper - lower) * bs[i].rate; lower = upper; }
      if (amountWan <= bs[i].upTo) break;
    }
    return round2(sum);
  }

  function itemAmount(item, 工程费用, 总投资) {
    var baseAmount = item.base === '项目总投资' ? 总投资 : 工程费用;
    return round2(baseAmount * item.rate);
  }

  function calcEstimate(input) {
    var 工程费用 = Number(input.工程费用) || 0;
    var 总投资 = 工程费用 * 1.10;
    var iterations = 0;
    var items = [], otherSubtotal = 0, reserve = 0, projectTotal = 总投资;
    for (var k = 0; k < 20; k++) {
      iterations = k + 1;
      items = [];
      items.push({ key: MGMT_ITEM.key, name: MGMT_ITEM.name, rate: null, base: '工程费用', baseAmount: 工程费用, amount: calcBracketFee(工程费用), ref: MGMT_ITEM.ref });
      var sum = items[0].amount;
      for (var i = 0; i < RATE_ITEMS.length; i++) {
        var it = RATE_ITEMS[i];
        var amt = itemAmount(it, 工程费用, 总投资);
        items.push({ key: it.key, name: it.name, rate: it.rate, base: it.base, baseAmount: it.base === '项目总投资' ? round2(总投资) : 工程费用, amount: amt, ref: it.ref });
        sum += amt;
      }
      otherSubtotal = round2(sum);
      reserve = round2((工程费用 + otherSubtotal) * RESERVE_RATE);
      var newTotal = round2(工程费用 + otherSubtotal + reserve);
      if (Math.abs(newTotal - 总投资) < 0.01) { 总投资 = newTotal; projectTotal = newTotal; break; }
      总投资 = newTotal; projectTotal = newTotal;
    }
    return { 工程费用: 工程费用, items: items, otherSubtotal: otherSubtotal, reserve: reserve, projectTotal: projectTotal, iterations: iterations };
  }

  function buildCostBreakdown(工程费用) {
    var out = [];
    var sum = 0;
    var keys = Object.keys(SPLIT_RATIOS);
    for (var i = 0; i < keys.length; i++) {
      var amount = i === keys.length - 1 ? round2(工程费用 - sum) : round2(工程费用 * SPLIT_RATIOS[keys[i]]);
      sum += amount;
      out.push({ name: keys[i], ratio: SPLIT_RATIOS[keys[i]], amount: amount });
    }
    return out;
  }

  function buildTwopage(estimate) {
    var page1 = estimate.items.map(function (it, i) {
      return {
        no: String(i + 1), name: it.name,
        base: it.base + (it.baseAmount ? '（' + it.baseAmount + ' 万元）' : ''),
        rate: it.rate === null ? '分档累进' : (it.rate * 100).toFixed(2) + '%',
        amount: it.amount, ref: it.ref,
      };
    });
    var page2 = buildCostBreakdown(estimate.工程费用).map(function (r, i) {
      return { no: String(i + 1), name: r.name, ratio: (r.ratio * 100).toFixed(0) + '%', amount: r.amount };
    });
    return {
      page1: page1, page2: page2,
      summary: {
        工程费用: estimate.工程费用, 其他费合计: estimate.otherSubtotal,
        基本预备费: estimate.reserve, projectTotal: estimate.projectTotal,
        其他费占比: estimate.projectTotal ? round2(estimate.otherSubtotal / estimate.projectTotal * 100) : 0,
      },
    };
  }

  return {
    BRACKETS_MGMT: BRACKETS_MGMT, RATE_ITEMS: RATE_ITEMS, SPLIT_RATIOS: SPLIT_RATIOS, RESERVE_RATE: RESERVE_RATE,
    round2: round2, calcBracketFee: calcBracketFee, calcEstimate: calcEstimate,
    buildCostBreakdown: buildCostBreakdown, buildTwopage: buildTwopage,
  };
});
