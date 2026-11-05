# www · 学习笔记合集

自包含、可离线的交互式学习网页，经 GitHub 部署到 Cloudflare Pages。

## 目录结构

```
www/
├── index.html            门户（列出所有站点）
├── security/             系统安全交互讲义（含 src/ 下 3 个示例 .c）
│   ├── format-string.html        格式化字符串图解 v1
│   └── format-string-v2.html     格式化字符串图解 v2
├── compiler/             编译原理第 1–3 章交互讲义
├── ml/                   机器学习 24 周学习包
├── algo/                 算法设计与分析学习包
├── nano-vllm/            nano-vllm 源码研习室
├── cf-atlas/             缓存友好算法图谱
├── yovoice/              YoVoice 语音合成学习包
└── ethereum/             区块链/以太坊实验指导手册
```

每个子目录是独立、自包含的学习站点（相对路径引用资源），可单独打开或部署。

## 新增一个站点

1. 在仓库根新建一个英文 slug 子目录，放入该站点的 `index.html` 及 `assets/`、`content/` 等。
2. 确认站点内资源均使用**相对路径**（不要出现 `file://` 或 `/assets/...` 这种绝对路径）。
3. 在 `index.html`（门户）的 `meta` 列表里加一项并重新生成，或直接在 `<main>` 里补一张卡片。

## Cloudflare Pages 部署设置

- 关联仓库：`powerli2024/www`
- 框架预设：None
- **构建命令：留空**
- **输出目录：仓库根 `/`**（或直接用默认根目录）
- 根 `index.html` 为门户；`/security/`、`/compiler/` 等自动各自服务其 `index.html`
- 后续可在 Cloudflare 控制台绑定自定义域名

## 免费版限制与对应（已核对）

- 单部署文件数上限约 2 万：当前约  个文件，远低于上限。
- 单资源最大 25 MB：所有文件均远小于此。
- 构建次数 500 次/月：本站纯静态、构建命令留空，几乎不消耗。
- 带宽：免费版不限量（合理使用）。
- 未使用 Pages Functions / R2，不触及相应配额。

## 已知问题

- `compiler/` 的 `README.md` 引用 `build.py` 生成 `content/course.js`，但源目录未提供该脚本；当前 `course.js` 已生成可用，若需改 JSON 重新生成需补回构建脚本。
- `security/` 原 3 处 `file:///D:/gpt/...` 本地源码链接已改为相对路径 `src/*.c`（源文件已复制到 `security/src/`）。
- 各站点均未做读屏器实测；键盘可达性由原生控件与 `:focus-visible` 保证。
