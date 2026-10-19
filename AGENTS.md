# AGENTS.md — 3代码实施/ 代码细则

> 在本目录写代码前**必读**。上位总纲见 `../AGENTS.md`（目录地图、文档版本、隐私边界等在这里不复述）。
> 最后更新：2026-10-11 ｜ 状态：已封版 tag v1.0（494 测试全绿，代码约 8136 行）

---

## 1. 交付硬约束（违反即不可交付）

**交付形态：`file://` 协议双击 `index.html` 直接运行。** 因此：

| 禁止 | 原因 |
|---|---|
| ES Module（`type="module"`） | `file://` 下会因 CORS 直接失败 |
| `fetch` / `XMLHttpRequest` 读本地文件 | `file://` 下被安全策略拦截 |
| CDN / Service Worker | 必须完全离线可用；SW 在 `file://` 下不可用 |
| 任何构建步骤（webpack / vite / rollup） | 交付物必须能直接双击打开 |

**同时**：零第三方依赖，只用 Node 内置能力与浏览器原生 API。

## 2. 目录与模块职责

```
3代码实施/
├── index.html      只放 <script> 标签清单（不写逻辑；仅在新增 js 文件时改它）
├── css/            tokens / base / layout / components / print / platform / scheme
├── assets/         scheme-a.jpg, scheme-b.jpg, placeholder.svg
├── js/
│   ├── core/       ns, util, dom, store, idb, state, router
│   ├── data/       schema, procedures-01..07（七个板块）, procedures-index,
│   │               templates, guidance, conditions, platforms, reject-reasons, schemes
│   ├── logic/      graph, filter, progress, exporters, tender, schedule, estimate,
│   │               advice, search, backup, zip, pptx, flow, materials, render-template
│   └── views/      ui, shell, main 及各页面 v-*.js
├── tests/          node --test 运行，零 npm 依赖
├── scripts/        自检脚本（perf-measure 等）
└── docs/           验收记录、无头浏览器截图与实测结果
```

## 3. UMD 双端模式（所有 js 模块必须）

浏览器里挂 `window.SJSQ.*`，Node 里可 `require()` —— 页面无需打包，而 `js/logic/` 的纯函数能在 Node 跑单测。

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./dep.js'));
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.logic = root.SJSQ.logic || {};
         root.SJSQ.logic.x = factory(root.SJSQ.logic.dep); }
})(typeof self !== 'undefined' ? self : this, function (dep) { /* ... */ });
```

## 4. 测试

```bash
cd "D:/4workbuddy工作空间/2毕业设计/3代码实施"
"C:/Users/10304/.workbuddy/binaries/node/versions/22.12.0/node.exe" --test
```

- ⚠️ **不要写 `--test tests/`** —— Windows 下 Node 22 会把 `tests` 当模块 require 而报 MODULE_NOT_FOUND；
  单文件用 `--test tests/xxx.test.js`。
- 只用 `node:test` + `node:assert/strict`，**无任何 npm 依赖，无 package.json**。
- **提交前测试必须全绿**；新增功能配对应测试，不删既有断言。

## 5. 视图读数据的唯一口径

- 视图读手续索引**统一用 `window.SJSQ.app.procedures`**（boot 时由 `main.js` 的 `registerProcedures()`
  挂上，含 `{ list, byId, bySection, counts, errors }`）。
- ⚠️ **`SJSQ.data.index` 是「模块」**（有 `buildIndex` / `getAll`），**不是索引实例**。
- ⚠️ **`SJSQ.data.proceduresIndex` 这个键从未被赋值** —— 曾因视图误读它，导致导出中心全部拿到
  `undefined`（流程图 0 节点白纸、Word/CSV/PPT 报「导出失败」）。**新增视图务必核对键名。**

## 6. 数据契约（新增 / 改数据前必查）

1. 驳回理由 `freq` **只能是「常见」或「偶见」**，写别的值会让 `reject-reasons.test.js` 失败。
2. 驳回理由 `id` **必须顺延到库内最大号之后**（库内已有 r-001 ~ r-029，新增前先取 `Math.max`），否则撞号。
3. **编号 ≠ 办理顺序**：编号是清单登记顺序（1–40 连续，schema 强校验）；**依赖图**才表示办理先后。
4. `perf.test.js` 的检索条目总数按实际数据量计算，条目增减不会使其失效。

## 7. 依赖关系要点（改动 `prev` 前必须先确认）

- 第15项 多规合一初审意见（`gh-1`）**无前置**，可与前期立项并行先行启动；
  **`gh-1.prev` 必须保持为空** —— 若误设回 `['yd-3']` 会与 yd-3 成环，排期与拓扑序直接失效。
- 第10项用地预审与选址意见书（`yd-3`）与第3项上主任会（`lx-3`）须等 `gh-1` 办结（`lx-3` 显式挂 `gh-1`）。
- 第33项施工招标（`zb-5`）前置只有第7项初步设计概算审批（`lx-7`）。
- 当前有 2 处编号倒挂（第3、第10项须等第15项），是预期结果，不要"修正"。
- **这类数据用户改过一次口径；前后表述若冲突，必须先回问再改。**

## 8. 改完网页没变化？先查缓存

**现象**：改了 `js/**.js`，双击 `index.html` 看到的仍是旧内容。
**注意**：`index.html` 本身**不需要改**（它只是 script 标签清单），所以它的修改日期不变是正常的。

三步排查（别猜，直接验）：
1. `ls -la --time-style=+%m月%d日\ %H:%M js/data/*.js` 看真实修改时间；
2. `grep` 目标新字符串，确认磁盘内容已改；
3. 用 vm 沙箱按 `index.html` 的 script 顺序装载一遍、打印实际运行结果 ——
   结果正确则是浏览器缓存，**`Ctrl+F5` 强制刷新**即可。

## 9. 提交流程

- 提交信息用前缀：`fix:` / `docs:` / `chore:`（沿用现有习惯）。
- **测试全绿再提交**；封版打 tag。
- 仅当新增 js 文件需要加 `<script>` 标签时才动 `index.html`。

## 10. 隐私与路径边界

- 真实项目资料在 `D:\2工作\`，**严禁复制进本目录、严禁写入任何数据文件**。
- 模板库实物在 `../文件模板/`：路径基准保持 **`../`**，**勿改为绝对路径** ——
  曾因基准错误导致「打开文件」404。
