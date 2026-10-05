/* scripts/acceptance-evidence.js —— Task 67 逐条验收的数据层证据采集（一次性，可重复运行） */
const fs = require('node:fs');
const H = require('../tests/_helpers.js');
const idx = require('../js/data/procedures-index.js').buildIndex([H.loadAllProcedures()]);
const list = idx.list;
const reserved = list.filter((p) => p.reserved);
const effective = list.filter((p) => !p.reserved);
console.log('[1] 全量:', list.length, '有效:', effective.length, '预留:', reserved.length, '(', reserved.map((p) => p.id).join(','), ')');

const lx = list.filter((p) => p.id.startsWith('lx-'));
lx.forEach((p) => console.log('[3]', p.id, 'no=' + p.no, p.name, 'prev=', JSON.stringify(p.prev), p.reserved ? 'reserved' : ''));

const dataRaw = fs.readdirSync('js/data').map((f) => fs.readFileSync('js/data/' + f, 'utf8')).join('\n');
console.log('[3] 数据层含「储备」:', dataRaw.includes('储备'));

const missingBasis = list.filter((p) => !(p.basis || p.notes)).map((p) => p.id);
console.log('[2] 缺办理依据字段（basis/notes 均空）的项:', missingBasis.length ? missingBasis.join(',') : '无');

const tpl = require('../js/data/templates-index.js').RAW;
const withTpl = new Set();
tpl.forEach((t) => (t.procedureIds || []).forEach((id) => withTpl.add(id)));
console.log('[2] 有挂接模板的手续数:', withTpl.size, '/', list.length);

const plats = require('../js/data/platforms.js').PLATFORMS;
const GVV = /https:\/\/[a-z0-9.-]*\.beijing\.gov\.cn/;
plats.forEach((p) => console.log('[7] 平台:', p.id, p.name, p.url, 'steps=' + p.steps.length, 'target=_blank 跳转见 v-platform'));
console.log('[7] 平台域名全部 *.beijing.gov.cn:', plats.every((p) => GVV.test(p.url)));

// [8] 材料汇总：materials 汇总函数存在性（逻辑层）
const materials = require('../js/logic/materials.js');
console.log('[8] materials 导出:', Object.keys(materials).join(','));

// [5] 估算导出两页纸：exporters 的分页符
const exp = fs.readFileSync('js/logic/exporters.js', 'utf8');
console.log('[5] exporters 含分页符 page-break:', /page-break|br\s+clear=all|<br[^>]*style[^>]*page-break/.test(exp));

// [4] 模板复制/导出 Word 入口
const vt = fs.readFileSync('js/views/v-templates.js', 'utf8');
console.log('[4] v-templates 含复制与导出动作:', vt.includes('复制'), vt.includes('导出'));

// [9] 行数统计（交付代码：js + css + index.html；测试另计）
function lineCount(files) { return files.reduce((s, f) => s + fs.readFileSync(f, 'utf8').split('\n').length - 1, 0); }
function walk(dir, acc) {
  acc = acc || [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, acc); else acc.push(p);
  });
  return acc;
}
const jsAll = walk('js');
const jsTest = walk('tests');
const cssAll = walk('css');
console.log('[9] 交付 JS 行数:', lineCount(jsAll), '（' + jsAll.length + ' 文件）');
console.log('[9] 交付 CSS 行数:', lineCount(cssAll));
console.log('[9] index.html 行数:', lineCount(['index.html']));
console.log('[9] 测试 JS 行数:', lineCount(jsTest), '（' + jsTest.length + ' 文件）');
console.log('[9] 合计（交付+测试）:', lineCount(jsAll) + lineCount(cssAll) + lineCount(['index.html']) + lineCount(jsTest));
