/* js/logic/backup.js —— 数据备份与恢复（Task 57）：
   导出快照（受管表整表 + meta 白名单）→ 校验 → 导入（merge/replace）。
   G21 纪律：只使用 get(table,id) / list(table) / put(table,obj) / remove(table,id) / clear(table)，
   绝不出现键值式 get/set。安全纪律：导入前必校验、不部分写入；导出只含用户录入数据（G15）。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.logic = root.SJSQ.logic || {}; root.SJSQ.logic.backup = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BACKUP_VERSION = 1;
  // G21：与 core/store.js 的 TABLES 契约对齐——受管表 + meta 白名单，而不是一串键值名。
  var TABLES = ['projects', 'checklist'];
  var META_TABLE = 'meta';
  // meta 表内的单例设置白名单。custom-templates 是实际落库 id（v-templates-custom）；
  // 该行为 { id, list } 顶层形态（未包 value:{}），备份按「整行原样带走/原样写回」处理，
  // 对行内形态不敏感，因此不需要为此改 v-templates-custom（最小改动）。
  var META_IDS = ['projectValues', 'scheduleInput', 'estimateInput', 'tenderInput', 'custom-templates', 'notes'];
  var ALL_TABLES = TABLES.concat([META_TABLE]);

  function nowIso() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function fileStamp(date) {
    var d = date || new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  async function exportSnapshot(store) {
    var tables = {};
    for (var i = 0; i < TABLES.length; i++) {
      var name = TABLES[i];
      var rows = await Promise.resolve(store.list(name));
      if (rows && rows.length) tables[name] = rows;
    }
    // meta 表只导出白名单单例，其余（内部字段等）一律不带出去（安全纪律 4）
    var meta = [];
    for (var j = 0; j < META_IDS.length; j++) {
      var row = await Promise.resolve(store.get(META_TABLE, META_IDS[j]));
      if (row != null) meta.push(row);
    }
    if (meta.length) tables.meta = meta;
    return {
      app: '石景山区学校工程前期手续辅助系统',
      version: BACKUP_VERSION,
      exportedAt: nowIso(),
      tables: tables,
    };
  }

  function validateSnapshot(obj) {
    var errors = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { ok: false, errors: ['快照不是有效对象'] };
    }
    if (obj.version !== BACKUP_VERSION) errors.push('备份版本不匹配（期望 ' + BACKUP_VERSION + '，实际 ' + obj.version + '）');
    if (!obj.tables || typeof obj.tables !== 'object' || Array.isArray(obj.tables)) {
      errors.push('缺少 tables 对象');
    } else {
      Object.keys(obj.tables).forEach(function (name) {
        if (ALL_TABLES.indexOf(name) < 0) { errors.push('未知表：' + name); return; }
        if (!Array.isArray(obj.tables[name])) errors.push('表 ' + name + ' 不是数组');
      });
    }
    if (obj.exportedAt && !/^\d{4}-\d{2}-\d{2}T/.test(obj.exportedAt)) errors.push('exportedAt 格式非法');
    return { ok: errors.length === 0, errors: errors };
  }

  // checklist 行 id 契约：'<projectId>::<procedureId>'（v-checklist.checklistRowId）。
  // 行内带 projectId 字段时优先用之；两者皆无则视为未知形态（不认识，不碰）。
  function pidOf(row) {
    if (!row || typeof row !== 'object') return null;
    if (row.projectId !== undefined && row.projectId !== null && row.projectId !== '') return String(row.projectId);
    var id = String(row.id || '');
    return id.indexOf('::') >= 0 ? id.split('::')[0] : null;
  }

  // 携带项②：清理 checklist 孤儿行。
  //   不带 projectId：删掉「所属项目已不存在」的行（导入后调用）。
  //   带 projectId：点名删除该项目的全部行（项目删除路径调用）。
  // 返回被删行 id 数组。未知形态（pid 为 null）一律保留，宁可不错杀。
  function pruneOrphanChecklist(store, projectId) {
    return Promise.all([
      Promise.resolve(store.list('checklist')),
      Promise.resolve(store.list('projects')),
    ]).then(function (res) {
      var rows = res[0] || [];
      var alive = {};
      (res[1] || []).forEach(function (p) { if (p && p.id) alive[p.id] = true; });
      var dead = rows.filter(function (r) {
        var pid = pidOf(r);
        if (projectId != null) return pid === String(projectId);
        if (pid === null) return false;
        return !alive[pid];
      });
      return Promise.all(dead.map(function (r) { return Promise.resolve(store.remove('checklist', r.id)); }))
        .then(function () { return dead.map(function (r) { return r.id; }); });
    });
  }

  async function importSnapshot(store, snapshot, opts) {
    opts = opts || {};
    var v = validateSnapshot(snapshot);
    if (!v.ok) throw new Error('备份校验失败：' + v.errors.join('；'));

    // replace：只清理「受管范围内」的数据
    //   projects / checklist 整表清空；meta 只删白名单 id（别把白名单外的行一起吞掉）
    if (opts.mode === 'replace') {
      for (var t = 0; t < TABLES.length; t++) await Promise.resolve(store.clear(TABLES[t]));
      for (var mId = 0; mId < META_IDS.length; mId++) await Promise.resolve(store.remove(META_TABLE, META_IDS[mId]));
    }

    var written = [], skipped = [];
    // 能走到这里说明 validateSnapshot 已通过，表名一定在 ALL_TABLES 内（未知表在上面已被整体拒绝）
    var names = Object.keys(snapshot.tables || {});
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var rows = snapshot.tables[name] || [];
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        if (!row || typeof row !== 'object' || !row.id) { skipped.push(name + ':无 id 行'); continue; }
        if (name === META_TABLE && META_IDS.indexOf(row.id) < 0) { skipped.push('meta:' + row.id); continue; }
        await Promise.resolve(store.put(name, row));
      }
      written.push(name);
    }
    // 携带项②：导入完成后顺带清一次孤儿行（merge 会把旧孤儿带回来，replace 天然无孤儿）
    await pruneOrphanChecklist(store);
    return { written: written, skipped: skipped };
  }

  function toJson(snapshot) { return JSON.stringify(snapshot, null, 2); }

  return {
    BACKUP_VERSION: BACKUP_VERSION, TABLES: TABLES, META_IDS: META_IDS, ALL_TABLES: ALL_TABLES,
    exportSnapshot: exportSnapshot, validateSnapshot: validateSnapshot,
    importSnapshot: importSnapshot, pruneOrphanChecklist: pruneOrphanChecklist,
    toJson: toJson, fileStamp: fileStamp,
  };
});
