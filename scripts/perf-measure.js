/* scripts/perf-measure.js —— 无头浏览器运行性能测量（Task 66）
 * 运行方式（playwright 专用 Node）：
 *   NODE_PATH=C:/Users/10304/.workbuddy/binaries/node/workspace/node_modules \
 *   "C:/Users/10304/.workbuddy/binaries/node/versions/22.22.2-3/node.exe" scripts/perf-measure.js
 * 口径（spec/brief）：
 *   - 首屏（默认路由）渲染完成 ≤ 300ms（放宽口径，本地磁盘加载）
 *   - 40 行专属清单首次渲染 ≤ 300ms
 *   - 全量搜索（含索引构建，与 v-search 实际路径一致）平均 ≤ 200ms
 *   - 附加观测：排期计算 / 流程图布局（仅记录，不作门槛）
 * 结果写 docs/perf-check/perf-results.json；任一硬指标超阈值时退出码 1。
 */
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const APP = path.join(__dirname, '..');
const OUT_DIR = path.join(APP, 'docs', 'perf-check');
const BUDGET = { firstPaint: 300, checklistFirstRender: 300, searchAvg: 200 };

async function timedWait(page, fn, label) {
  const t0 = Date.now();
  await page.waitForFunction(fn, null, { timeout: 15000 });
  return Date.now() - t0;
}

(async function main() {
  // 本机 playwright 缓存只有 chromium-1243（当前 playwright 包期望 1247），
  // 显式指到已存在的可执行文件，避免触发 npx playwright install 下载。
  const exe = 'C:/Users/10304/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const browser = await chromium.launch({ headless: true, executablePath: fs.existsSync(exe) ? exe : undefined });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const url = pathToFileURL(path.join(APP, 'index.html')).href;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const app = document.querySelector('#app');
    return app && app.children.length > 0;
  }, null, { timeout: 15000 });
  const firstPaint = Date.now() - t0;

  // 建一个项目（走页面自身的 createProjectObject + store），使专属清单有 40 行可渲染
  await page.evaluate(async function () {
    const S = window.SJSQ;
    const obj = S.views['v-projects'].createProjectObject({
      name: '性能测量项目', unit: '测量单位', address: '石景山区',
      landArea: 12000, buildArea: 15000, height: 18, floorsAbove: 4, floorsBelow: 1,
      investEstimate: 210000000, buildNature: '新建', investScale: '3000万以上',
      fundSource: '财政资金', approvalLevel: '市级',
    });
    await S.app.store.put('projects', obj);
    S.app.state.set({ currentId: obj.id });
  });

  // 40 行专属清单首次渲染
  await page.evaluate(function () { window.location.hash = '#/checklist'; });
  const checklistFirstRender = await timedWait(page, function () {
    return document.querySelectorAll('select.cl-status').length >= 40;
  }, 'checklist');
  const checklistRows = await page.evaluate(function () {
    return document.querySelectorAll('select.cl-status').length;
  });

  // 全量搜索（与 v-search 同一路径：defaultData → buildSearchIndex → search）
  const search = await page.evaluate(function () {
    const s = window.SJSQ.logic.search;
    const queries = ['施工', '项目建议书', '验收', '规划许可', '模板', '概算', '招标'];
    const N = 20;
    s.search('施工', {}); // 预热（JIT/缓存）
    const t0 = performance.now();
    for (let i = 0; i < N; i++) s.search(queries[i % queries.length], {});
    return (performance.now() - t0) / N;
  });

  // 附加观测：排期 / 流程图（浏览器侧，仅记录）
  const extra = await page.evaluate(function () {
    const S = window.SJSQ;
    const list = S.app.procedures.list;
    let t0 = performance.now();
    for (let i = 0; i < 10; i++) S.logic.schedule.buildSchedule(list, { mode: 'forward', startDate: '2026-10-01' });
    const schedule = (performance.now() - t0) / 10;
    t0 = performance.now();
    for (let i = 0; i < 10; i++) S.logic.flow.buildFlowSvg(S.logic.flow.flowLayout(S.app.procedures));
    const flow = (performance.now() - t0) / 10;
    return { schedule: Math.round(schedule * 10) / 10, flow: Math.round(flow * 10) / 10 };
  });

  await browser.close();

  const result = {
    date: new Date().toISOString(),
    url: url,
    userAgent: 'chromium headless (playwright)',
    firstPaintMs: firstPaint,
    checklistFirstRenderMs: checklistFirstRender,
    checklistRows: checklistRows,
    searchAvgMs: Math.round(search * 10) / 10,
    extra: extra,
    pageErrors: errors,
    budget: BUDGET,
    pass: {
      firstPaint: firstPaint <= BUDGET.firstPaint,
      checklistFirstRender: checklistFirstRender <= BUDGET.checklistFirstRender,
      searchAvg: search <= BUDGET.searchAvg,
    },
  };
  result.allPass = Object.keys(result.pass).every((k) => result.pass[k]) && errors.length === 0;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, 'perf-results.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2));

  console.log('首屏渲染（默认路由，含脚本加载）:', firstPaint, 'ms  预算', BUDGET.firstPaint, result.pass.firstPaint ? 'PASS' : 'FAIL');
  console.log('专属清单 40 行首次渲染:', checklistFirstRender, 'ms（实测行数 ' + checklistRows + '） 预算', BUDGET.checklistFirstRender, result.pass.checklistFirstRender ? 'PASS' : 'FAIL');
  console.log('全量搜索平均（含索引构建）:', result.searchAvgMs, 'ms  预算', BUDGET.searchAvg, result.pass.searchAvg ? 'PASS' : 'FAIL');
  console.log('附加观测: 排期', extra.schedule, 'ms / 流程图', extra.flow, 'ms');
  console.log('页面错误:', errors.length ? errors : '无');
  console.log('结果已写入', path.relative(APP, out));
  process.exit(result.allPass ? 0 : 1);
})().catch(function (e) {
  console.error('perf-measure 失败：', e);
  process.exit(2);
});
