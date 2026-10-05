# 石景山区学校工程「前期手续 → 竣工验收」辅助系统

## 怎么打开
双击 `index.html` 即可。**不需要启动本地服务器**，也不要用 `type="module"` 改写脚本。

## 怎么跑测试
```bash
cd "D:/4workbuddy工作空间/2毕业设计/3代码实施"
"C:/Users/10304/.workbuddy/binaries/node/versions/22.12.0/node.exe" --test
```
> 注意：不要写 `--test tests/` 或 `--test tests`（Windows 下 Node 22 会把 `tests` 当模块 require 报错）；单文件测试用 `--test tests/xxx.test.js`。

## 目录
- `css/` 样式（tokens 令牌 / base 基础 / layout 壳层 / components 组件 / print 打印）
- `js/core/` 基础设施：命名空间、工具、DOM、存储、状态、路由
- `js/data/` 纯数据（40 项手续、35 个模板索引、条件值、平台、退回原因）
- `js/logic/` 纯函数逻辑（不碰 DOM、不碰存储），全部有 Node 测试
- `js/views/` 页面渲染
- `tests/` Node 内置测试运行器用例

## 待手动核对的 DOM 行为（Task 4 / Task 9 完成时执行）
- [ ] `h('div', {class:'x', text:'你好'})` 渲染出带 class 的 div
- [ ] `h('button', {onClick: fn})` 点击触发 fn
- [ ] `h('input', {value:'a'})` 输入框初值为 a
- [ ] 事件委托 `on(root,'click','.row',fn)` 点击子元素能命中

## 阶段二验收记录（2026-10-05）
- [x] 全量手续库出现 ①→⑦ 共 40 行，⑤ 只有 1 行（集成测试 + 无头浏览器核对）
- [x] 搜索"划拨"命中 yd-7；搜索"副市长"命中 lx-4（检索字段含名称/部门/依据/说明）
- [x] ② 用地手续无"建设用地规划许可证"（该表在 guidance.EXCLUDED 备忘）
- [x] ① 第 4 项页面底部「办完本项之后」指向第 5 项（A→B 严格先后）
- [x] ⑦ 第 39 项前置列出 35/36/37/38 四项（并联汇合）
- [x] ⑧ 收尾结算只在库页底部作为一句话说明出现，未占编号
- 核对方式：`tests/integration-phase2.test.js`（10 例，锁死 40=37+3、区间、拓扑、并联）+ 无头浏览器脚本（verify-phase2.js，截图见 `docs/verify-3-全量库.png`、`docs/verify-4-详情页.png`）
- 附带修正：手续行增加「串联 / 可并联」标注（数据 parallel 字段 + `graph.parallelPeers` 并联识别，Task 23 补丁）；v-detail 空态文案笔误修正

## 阶段三验收记录（2026-10-05）
- [x] 清单页 40 行，进度环随勾选变化（集成测试锁定 40 项 + 无头浏览器核对 done/doing 计数联动）
- [x] 改一项状态为「已办结」后，"下一项"自动跳转（`progress.nextUp` 纯函数测试 + 页面刷新后重绘验证）
- [x] 备注输入后刷新仍保留（IndexedDB 持久化 + 无头浏览器 F5 核对）
- [x] 导出 Word 能用 WPS 打开（`exporters.buildDocHtml` 输出 Word 兼容 HTML，`downloadDoc` 触发 download 事件由无头浏览器捕获核对）
- [x] 各板块完成率看板随状态变化（`buildBoard` 纯函数测试 tone idle/doing/done 三态 + 页面 `.board` 渲染核对）
- [x] 控制台调用 buildSafetyNet 传"装修改造"时，unhandled 含 sg-1 且原因含"城市更新"（静态自检：`safetynet.test.js` 断言 `unhandled[0].procedureId === 'sg-1'` 且 reason 含「城市更新」）
- 核对方式：`tests/integration-phase3.test.js`（6 例：条件值零缺失、G8 恒等 40 项、37 有效手续、完成率线性、① 立项前置联动、脏状态归 idle）+ 无头浏览器脚本（verify-phase3.js，截图见 `docs/verify-5-专属清单.png`）
