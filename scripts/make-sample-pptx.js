/* scripts/make-sample-pptx.js —— 一次性样例生成脚本，留作回归工具 */
const fs = require('fs');
const path = require('path');
const p = require('../js/logic/pptx.js');
const bytes = p.buildPptx([
  { layout: 'title', title: '石景山区学校工程前期手续辅助系统', subtitle: '汇报材料 · ' + new Date().toISOString().slice(0, 10) },
  { title: '项目概况', bullets: ['建设性质：新建', '项目总投资：2 亿元以上', '资金来源：财政资金（市级、区级各 50%）', '审批层级：市级'] },
]);
const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'sample.pptx');
fs.writeFileSync(outPath, Buffer.from(bytes));
console.log('written', outPath, bytes.length, 'bytes');
