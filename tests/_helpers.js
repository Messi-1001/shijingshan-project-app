/* tests/_helpers.js —— 测试公共工具 */
const path = require('node:path');

function req(rel) {
  return require(path.join(__dirname, '..', rel));
}

function loadAllProcedures() {
  const files = [
    'procedures-01-lixiang', 'procedures-02-yongdi', 'procedures-03-guihua',
    'procedures-04-pingjia', 'procedures-05-zhaobiao', 'procedures-06-shigong',
    'procedures-07-jungong'
  ];
  const all = [];
  files.forEach((f) => { req('js/data/' + f + '.js').forEach((p) => all.push(p)); });
  return all;
}

function makeProject(over) {
  return Object.assign({
    id: 'p-1', name: '测试学校工程', unit: '测试代建单位', address: '石景山区',
    landArea: 12000, buildArea: 15000, height: 18, floorsAbove: 4, floorsBelow: 1,
    investEstimate: 210000000, buildNature: '新建', investScale: '3000万以上',
    fundSource: '财政资金', approvalLevel: '市级'
  }, over || {});
}

module.exports = { req, loadAllProcedures, makeProject };
