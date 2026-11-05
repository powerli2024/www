window.OPTIMIZATIONS = [
  {
    id: '01',
    title: '让助手能力说明与实际启动参数一致',
    category: '可靠性',
    priority: 'P1',
    effort: '小',
    evidence: '源码确认',
    trigger: '用户阅读助手说明后启用 AI 助手，并依此判断它能读写什么、能否联网。',
    current: '中文文档声称助手不能执行命令、读写文件或联网；baseTools 实际包含 Read、Write、Edit、Bash、WebFetch、WebSearch，Windows 还加入 PowerShell，并传给 --tools 与 --allowedTools。',
    proposal: '先修正中英文能力说明，直接对照实际工具集合。若产品需要受限模式，再单独设计能力配置与清晰提示；文档修正不能代替工具权限限制。最小修改约半天，能力配置另需 1–3 天。',
    acceptance: [
      '中英文说明与 startProcess 实际传入的工具集合逐项一致。',
      '如新增能力配置，模拟进程检查工具列表与 Windows 平台差异。',
      '真实能力验证在隔离工作目录进行，记录实际成功、失败和权限提示。'
    ],
    boundary: '已确认静态文档差异；没有实测 ocho 的文件、命令和联网权限，不能宣称已证明越权漏洞。',
    sources: [
      { file: 'docs/ai_zh.md', line: 41, label: '文档宣称的能力边界' },
      { file: 'internal/assistant/assistant.go', line: 272, label: 'baseTools 的实际工具集合' },
      { file: 'internal/assistant/assistant.go', line: 274, label: 'startProcess 组装启动参数' }
    ]
  },
  {
    id: '02',
    title: '让客户端知道失败后是否可以重试',
    category: '体验',
    priority: 'P2',
    effort: '小',
    evidence: '源码确认',
    trigger: '外部脚本提交生成任务：可能是同一请求 ID 换了参数，也可能只是引擎正在忙。',
    current: 'submitJob 已有输入指纹与幂等重放，但参数冲突和引擎繁忙共用 errJobConflict，HTTP 统一返回 409。调用方难以稳定区分修正请求与等待重试。',
    proposal: '拆成 request_conflict 与 engine_busy 两种机器可读错误，明确可重试语义，更新 HTTP/MCP 文档与测试。先保留单引擎不排队的设计，约 1–2 天。',
    acceptance: [
      '同 ID、同参数不重复生成；同 ID、不同参数明确拒绝且不建议自动重试。',
      '不同 ID 遇到繁忙时得到明确可重试状态；取消后能够重新提交。',
      '已有调用兼容性有测试保护，HTTP 与 MCP 的错误说明一致。'
    ],
    boundary: '没有负载测试，不能据此声称当前吞吐低。内存任务和不排队是明确的范围选择，不是天然缺陷。',
    sources: [
      { file: 'internal/remote/jobs.go', line: 33, label: '合并的错误类型' },
      { file: 'internal/remote/jobs.go', line: 43, label: 'submitJob：幂等、指纹与繁忙分支' },
      { file: 'internal/remote/jobs.go', line: 129, label: 'jobHTTP：错误响应映射' },
      { file: 'internal/remote/api_test.go', line: 129, label: '已有的提交与重放测试' }
    ]
  },
  {
    id: '03',
    title: '为每次生成保存一份来源清单',
    category: '可维护性',
    priority: 'P2',
    effort: '中',
    evidence: '源码确认',
    trigger: '升级引擎、切换 CPU/CUDA 或替换模型后，用户想解释相同参数为何出现不同结果。',
    current: 'Generation 已保存 Draft 参数快照；引擎版本与后端保存在全局 State，没有随每条生成历史冻结。工程归档包含创作素材与历史，不包含模型和全局设置。',
    proposal: '添加可选、版本化的 provenance：应用构建标识、引擎版本、请求后端、模型与参考文件指纹、请求种子及自动种子状态。实际设备或种子只在引擎确实报告时记录。复用文件校验结果，避免每次重新读取大模型。约 2–4 天。',
    acceptance: [
      '旧历史仍能读取，未记录的字段明确显示未知；修改全局环境不会改变旧清单。',
      '工程导入导出保留来源信息，能识别模型或参考文件内容变化。',
      '新增字段同步 Go 与前端契约，导出和日志中不包含密钥。'
    ],
    boundary: '清单用于解释与追溯，不保证不同硬件、精度和引擎之间逐比特复现。项目已有下载摘要校验，本建议不是补一个不存在的校验功能。',
    sources: [
      { file: 'internal/schema/schema.go', line: 177, label: 'Generation 已有参数快照' },
      { file: 'internal/schema/schema.go', line: 288, label: '全局运行环境字段' },
      { file: 'internal/workbench/generation.go', line: 228, label: '生成时冻结 Draft' },
      { file: 'internal/workbench/project_archive.go', line: 23, label: '工程归档范围' },
      { file: 'internal/download/download.go', line: 50, label: '已有文件校验' }
    ]
  },
  {
    id: '04',
    title: '先测清楚，生成时间究竟花在哪里',
    category: '性能',
    priority: 'P2',
    effort: '中',
    evidence: '待测假设',
    trigger: '用户感觉生成很慢，需要区分冷启动、引擎请求、音频解码、保存与其他环节。',
    current: '已有 operation_id、总 elapsed_ms、引擎 startup_ms 和分句日志，也已有进程复用。当前这些关键调用没有统一传递任务关联 ID，历史没有完整分阶段指标。',
    proposal: '贯通任务关联 ID，记录是否复用进程、启动、请求往返和保存耗时，结合音频时长计算明确口径的 RTF。分别比较冷启动与热运行；只有测量指出瓶颈后再设计缓存或传输改进。约 1–3 天。',
    acceptance: [
      '用模拟延迟验证阶段计时，失败和取消也有完整结束记录。',
      '报告明确区分首次运行与热运行，注明模型、精度、后端和硬件。',
      'RTF 明确是否包含启动；应用层请求耗时不标成纯 GPU 推理耗时。'
    ],
    boundary: '没有证据证明当前项目慢，也不承诺提速幅度。应用层请求时间包含推理与序列化等成本；峰值显存与 GPU 时间需要额外测量。',
    sources: [
      { file: 'internal/workbench/workbench.go', line: 108, label: 'start：总耗时与操作 ID' },
      { file: 'internal/engine/engine.go', line: 113, label: 'start：现有复用与启动计时' },
      { file: 'internal/engine/engine.go', line: 260, label: 'Generate 的阶段边界' },
      { file: 'internal/engine/engine.go', line: 541, label: 'run：HTTP 往返与响应解析' }
    ]
  },
  {
    id: '05',
    title: '让真实模型验收成为可重复的一条路线',
    category: '可靠性',
    priority: 'P1',
    effort: '中',
    evidence: '源码确认',
    trigger: '升级 audio.cpp、模型包或参数映射后，快速测试通过，还需要确认指定发布包与硬件能生成真实语音。',
    current: '生命周期测试使用模拟引擎与测试模型文件，浏览器预览使用 previewCall。CI 已检查 Go、浏览器、安装和部分音频转换，但这些检查的目标不等于真实模型音质与硬件兼容性。',
    proposal: '增加显式启用的验收：固定一个模型及摘要、引擎版本和自有参考录音，完成导入、生成、保存、导出、再打开。保存日志和输出，把能运行、读对文本、音色相似与速度分开评价。首条路线约 1–2 天，不自动下载全部模型。',
    acceptance: [
      '真实输出可解析、非全静音、时长合理；取消后可再次生成。',
      '首轮与复用轮分别记录，CPU/CUDA 分别报告，保留输入、参数、版本和日志。',
      '人工听检记录漏字、重复、截断和音色漂移；结果只覆盖已测模型与硬件。'
    ],
    boundary: '不能因为所查自动测试使用模拟引擎，就断言作者从未人工验收。一个模型或一条样例成功也不能证明全目录兼容、普遍音质和生产稳定性。',
    sources: [
      { file: 'internal/engine/lifecycle_test.go', line: 21, label: '模拟生命周期测试的覆盖范围' },
      { file: 'internal/testkit/testkit.go', line: 70, label: 'RunFakeEngine 返回测试输出' },
      { file: 'web/src/shared/lib/client.ts', line: 14, label: '浏览器与桌面分支' },
      { file: '.github/workflows/check.yml', line: 209, label: '打包音频转换检查' },
      { file: '.github/workflows/check.yml', line: 309, label: '运行时 setup 与 help 检查' }
    ]
  }
];
