# www1 — 学习站优化版

本目录是 `D:\gpt\www`（只读原站）的优化成果，可直接用浏览器打开 `index.html`，也可整体部署到任意静态托管。

- 入口：`index.html`（门户，9 个栏目卡片）
- 详细改动与量化对比：`优化报告.md`
- 离线：全部资源本地化，`file://` 直接双击可用；无 CDN、无外链字体

## 一、文件来源（三类）

统计基准：原站 202 文件 / 9.90 MB，本目录 170 文件 / 8.12 MB（`git` 已排除）。
2026-11-06 并入独立站《操作系统原理》后为 **182 文件 / 9.0 MB**（新增 `os/` 11 个文件 / 468 KB）。

### A. 从 `www` 原样复制（93 个，内容未动）

| 目录 | 数量 | 说明 |
| --- | --- | --- |
| `algo/` | 53 | 课程数据 `content.js`、图片、katex 保留部分、测试产物 |
| `nano-vllm/` | 9 | 离线长文、实验数据 |
| `compiler/` | 8 | 章节数据、构建脚本 |
| `cf-atlas/` | 7 | 图谱数据、实验页 |
| `security/` | 6 | 3 个 `src/*.c`、图解页静态资源等 |
| `yovoice/` | 5 | 波形、示例数据 |
| `ml/` | 3 | 实验脚本与图片 |

这些文件只作为依赖被引用，未做任何字节级修改。

### B. 改动过的文件（48 个）

| 类别 | 文件 | 改了什么 |
| --- | --- | --- |
| 门户 | `index.html` | 重写：语义结构、skip-link、8 卡片、深浅色 token、44px 入口 |
| 全局注入 | 41 个 HTML（并入 os 后新增 `os/index.html`；`os/backup.html` 例外，见 §E） | `</head>` 前加 `_shared/base.css` + `_shared/tablet.css`；`<html>` 加 `data-w1-site`；补 `favicon.svg` |
| 站点样式 | `security/assets/style.css`、`algo/assets/style.css`、`cf-atlas/styles.css`、`compiler/assets/app.css`、`ml/assets/reader.css`、`nano-vllm/style.css`、`yovoice/styles.css` | 对比度、行宽、断点、触控目标；均在文件末尾以 `/* ===== 优化补丁 ===== */` 起头，原规则未删 |
| ethereum | `ethereum/index.html` | 去 cdnjs；本地语法制色；常驻复制按钮；≤1023px 抽屉式侧栏（330px）；表格局部滚动 |
| ml | `ml/index.html`、`ml/assets/reader.js`、`ml/第一周学习.html`、`ml/Python与C++编程辅助.html` | `course-data.js` → `course-index.js`；按需加载周块（动态 `<script>`） |
| ml 讲义 | `ml/逐周讲义/第01–24周.html`、`ml/项目A环境.html` | 断链改为带说明的占位文本；共享层注入 |
| security 内容 | `security/index.html` | 多选答案 `B→AB`；13 个 h1 归并为 1 个 + 12 个 `h2.chapter-title`；附录口径（8 份 PDF / 连续六章） |
| 其他 | `cf-atlas/index.html`、`compiler/index.html`、`compiler/backup.html`、`nano-vllm/index.html`、`nano-vllm/nano-vllm-offline.html`、`security/format-string*.html`、`yovoice/index.html` | 共享层注入与断链标注 |

### C. 新增文件（29 个）

| 路径 | 数量 | 用途 |
| --- | --- | --- |
| `_shared/base.css` | 1 | 基线层 `@layer w1-base`：行宽 74ch、图片自适应、`scroll-padding`、打印隐藏控件 |
| `_shared/tablet.css` | 1 | 平板层 `@layer w1-tablet`：≤1100px 的抽屉宽度、44px 触控、代码块局部滚动 |
| `_shared/favicon.svg` | 1 | 全站图标，消除 `/favicon.ico` 404 |
| `ml/assets/course-index.js` | 1 | 周索引 145 KB（原 2.4 MB 单文件） |
| `ml/assets/weeks/w01–w24.js` | 24 | 每周正文块，55–278 KB，按需加载 |
| `ml/assets/weeks/toolbox.js` | 1 | 编程工具箱正文块 81 KB |

### D. 相对 `www` 删除的文件（61 个）

- `algo/assets/vendor/katex/dist/fonts/*.ttf`、`*.woff`（各 20 个）：`katex.min.css` 只需 `woff2`
- `algo/assets/vendor/katex/dist/contrib/*`（15 个）：全站无引用
- `katex.css`、`katex-swap*.css`、`katex.min.js`、`katex.mjs`（6 个）：页面只用 `katex.min.css`，公式为预渲染 HTML
- `ml/assets/course-data.js`（2.4 MB）：拆分为索引 + 24 周块

### E. 2026-11-06 并入的第 9 站：`os/`（操作系统原理 · 第 1–2 章）

来源是独立目录 `D:\gpt\操作系统原理`（同一套模板的另一轮产出，风格基准即 `compiler/` + `_shared/`）。审查结论与 4 处修复记在 `os/README.md` §八 与本报告 §11，此处只记接线差异。

| 项 | 独立目录 | 合集内 `os/` |
| --- | --- | --- |
| 文件 | 16 个（含两份 PDF 13.5 MB） | 11 个 / 468 KB：`index.html`、`backup.html`、`build.py`、`README.md`、`concepts.md`、`assets/{app.css,app.js}`、`content/{meta,ch1,ch2}.json` + `course.js` |
| 共享层 | `assets/` 内各存一份副本（与 `_shared/` 逐字节相同） | `index.html` 改引 `../_shared/{base.css,tablet.css,favicon.svg}`，副本不入库；`backup.html` 保持样式全内联，是全合集 42 个 HTML 中唯一不引共享层的页面（无脚本兜底页不该依赖外部文件） |
| 课程 PDF | 保留供页码回查 | **不发布**：页面只以文字引用页码，不加载 PDF；合集内 PDF 数仍为 0 |
| 门户 | 无 | 新增第 9 张卡片（紧接 `compiler/` 之后）；`lede` 与 facts 由「8」改口为「9」；`description` 补列操作系统 |

`os/assets/app.css` 是本站特有文件（`compiler/assets/app.css` + 末尾 `.osflow` 流程示意样式），不并进 `_shared/`：其余 8 站没有 `.osflow`，放进共享层只会变成无人使用的规则。

## 二、与 `www2` 的取舍

**取用的四点（已落地）**

1. **共享样式分层**：`@layer w1-base` / `w1-tablet` 只放“补缺”规则，站点原样式（无层）永远优先，避免共享层把某站带偏。
2. **按站定制断点**：断点写在各自站点的补丁里（ethereum 1023、security 860、ml 800、compiler 720、yovoice 650），而不是用一套通用断点硬压。
3. **缺陷编号 + 证据分级**：`优化报告.md` 用 `D1…D12`，每条标 A（实测）/ B（静态可证）/ C（推断）。
4. **文档化**：本 README + 优化报告 + 每站补丁标记，便于回溯。

**判定不取的四点（及理由）**

1. **浮动信息面板（www2 的 `.w2-dock`）**：与学习内容无关，遮挡正文，平板下更挤；属于“为展示优化而加的装饰”。
2. **门户由 `sites.js` 运行时渲染**：脚本未执行时整页空白，且数据要维护两份（注册表 + 页面）；本目录用静态卡片，卡片本身就是唯一数据源。
3. **`_shared` 里放通用组件 + `!important` 深色覆盖**：`!important` 会压过各站配色与层级，8 站风格会被抹平；本目录共享层只做低优先级补缺，配色改动写在各自站点。
4. **`html[data-w2-site]` 前缀提权写死各站宽度**：在 861–1100px 等区间直接覆盖站点原有响应式，容易产生新的挤压；本目录改为在站点自身样式里按实测补，且共享层保持低优先级。
   另：`www2/OPTIMIZATION.md` 称“全部达成”，但其实测样本为 12 页 × 5 视口 = 60 个，且同文自述仍有 58 个无目标锚点；这类结论按“部分达成”理解，本报告只写本轮实测覆盖的 40 页。

## 三、维护说明

- **新增一个栏目**：在 `index.html` 加一张 `<article class="card">`；目录内页面 `<head>` 引 `../_shared/base.css`、`../_shared/tablet.css`，`<html>` 写 `data-w1-site`。
- **改平板断点**：优先改该站自己的 CSS 补丁段；`_shared/tablet.css` 只处理多站共性（抽屉宽度、44px、代码滚动）。
- **共享层优先级**：站点样式（无 `@layer`）> 共享层。若某站被共享层影响，先检查该站是否漏写规则，而不是给共享层加 `!important`。
- **ml 加周**：`ml/assets/course-index.js` 的 `weeks` 数组加一条，新增 `weeks/wNN.js`（内容为 `window.ML_WEEKS=window.ML_WEEKS||{};window.ML_WEEKS[NN]={...}`），`reader.js` 会自动按需加载。
- **离线**：动态 `<script>` 注入不依赖 `fetch`/ESM，`file://` 下可用；但 Chrome 对 `file://` 的跨目录脚本仍按同源策略放行（本目录已验证）。

## 四、已知限制

- 深色模式：门户、compiler、security 与 2026-11-06 并入的 os 提供；其余 5 站维持原浅色设计（原站即如此，未强行添加）。
- 图片：原站仅 5 张 246 KB（测试截图），无大图可压缩；未做格式转换。
- 内容事实：仅修正可证伪的口径与配置错误，未对课程技术结论做实验复核。
