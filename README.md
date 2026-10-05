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
