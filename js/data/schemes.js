/* js/data/schemes.js —— 概念方案数据层（Task 63）：2 版方案 + 校验 + 占位图路径 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.data = root.SJSQ.data || {}; root.SJSQ.data.schemes = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PLACEHOLDER = 'assets/placeholder.svg';

  var SCHEMES = [
    {
      id: 'scheme-a',
      name: '方案 A · 集中式布局',
      image: 'assets/scheme-a.png',
      concept: '以一座主体教学楼为核心，教学、办公、食堂等功能竖向叠合，释放出一片完整的集中活动场地。',
      features: [
        '主体教学楼集中布置于场地中央，层数较高、占地较小',
        '西侧集中布置 200 米环形跑道与球类场地',
        '地下设置设备用房与部分停车，减少地面占用',
        '后勤出入口与师生主入口分流，货车不进入教学区',
      ],
      area: { '用地面积': '约 2.4 公顷', '总建筑面积': '约 2.2 万 ㎡', '容积率': '约 0.9', '绿地率': '约 35%', '建筑高度': '不超过 24 米' },
      pros: ['用地集约，腾出完整室外活动场地', '竖向功能集中，管线短、运维成本低'],
      cons: ['单体体量大，对消防与疏散设计提出更高要求', '分期建设灵活性较差'],
    },
    {
      id: 'scheme-b',
      name: '方案 B · 院落式布局',
      image: 'assets/scheme-b.png',
      concept: '以两到三个围合院落组织教学组团，尺度更接近传统校园，室外空间层次丰富，便于分年级管理。',
      features: [
        '教学组团沿南北向分列，中间形成内院',
        '行政与生活用房独立成组，靠近次入口',
        '风雨操场设置在西侧，与室外场地连成一片活动带',
        '院落内设置分年级活动场地，课间可达性好',
      ],
      area: { '用地面积': '约 2.4 公顷', '总建筑面积': '约 2.1 万 ㎡', '容积率': '约 0.85', '绿地率': '约 38%', '建筑高度': '不超过 20 米' },
      pros: ['空间层次丰富，更贴近使用者体验', '可分区分期建设，实施弹性大'],
      cons: ['建筑密度较高，室外集中场地相对受限', '外围护面积大，保温与造价控制压力更大'],
    },
  ];

  function listSchemes() { return SCHEMES.slice(); }

  function getScheme(id) {
    for (var i = 0; i < SCHEMES.length; i++) if (SCHEMES[i].id === id) return SCHEMES[i];
    return null;
  }

  // 校验必填字段（图片文件存在性无法在 Node 校验，只校验路径字段非空）
  function validateSchemes(list) {
    var errs = [];
    (list || SCHEMES).forEach(function (x) {
      ['id', 'name', 'image', 'concept'].forEach(function (f) { if (!x[f]) errs.push((x.id || '?') + ' 缺字段 ' + f); });
      if (!Array.isArray(x.features) || x.features.length < 3) errs.push(x.id + ' features 少于 3 条');
      if (!Array.isArray(x.pros) || !x.pros.length) errs.push(x.id + ' 缺 pros');
      if (!Array.isArray(x.cons) || !x.cons.length) errs.push(x.id + ' 缺 cons');
      if (!x.area || typeof x.area !== 'object' || !Object.keys(x.area).length) errs.push(x.id + ' 缺 area');
    });
    return errs;
  }

  return { PLACEHOLDER: PLACEHOLDER, SCHEMES: SCHEMES, listSchemes: listSchemes, getScheme: getScheme, validateSchemes: validateSchemes };
});
