window.LESSONS = [
  {
    id: '01',
    title: '追踪一次生成',
    kicker: '进程与时间',
    question: '点击生成之后，谁接收、谁计算、谁保存？何时才算完成？',
    intro: '先把一次普通语音生成走通。React 经过原生宿主和 Go RPC 调用 Workbench，后者调度 engine 与 audio.cpp；请求回复和后台状态是两条返回路径。',
    read: [
      {file: 'web/src/shared/lib/client.ts', line: 14, label: '真实桌面与预览后端'},
      {file: 'internal/workbench/generation.go', line: 16, label: 'Generate 与 Synthesize'},
      {file: 'internal/engine/engine.go', line: 260, label: 'Engine.Generate'}
    ],
    task: '分别画一次正常完成和一次受理后失败的时序图。泳道标进程，箭头标数据，并用两个标记区分“已受理”与“已完成”。',
    deliverable: '一页调用图＋不超过 200 字的口述提纲。',
    checks: [
      '标出原生宿主、Go 服务、audio.cpp 三个进程，指出数值计算的位置。',
      '说明 Generate 返回时后台任务可能尚未完成，而 Synthesize 会等待本次结果。',
      '分别画出调用回复与 State 推送，失败图没有把受理当作最终成功。',
      '说明浏览器模拟后端不能证明真实模型或 GPU 可用。'
    ],
    hints: [
      '先写五个动词：接收、检查、计算、保存、通知，再为每个动词分配负责模块。',
      '在 Generate 中找“启动”，在 Synthesize 中找“等待”，标出等待的是哪次任务。',
      '调用回复对应一次请求；State 事件经 Go 服务、宿主返回 WebView，描述后台任务变化。'
    ],
    quiz: {
      q: 'generation.start 已返回成功，随后状态显示 failed。最准确的理解是？',
      options: ['接口一定违背了约定，成功之后不能失败。', '请求成功受理，但后台推理或保存仍可能失败。', '浏览器收到旧状态，实际音频必然已经成功。'],
      answer: 1,
      explanation: 'Generate 主要报告任务是否成功启动；耗时工作在后台完成，最终结果由状态更新传回。Synthesize 才会等待本次任务完成后返回。'
    },
    transfer: '把普通语音换成 SoundFont 乐谱渲染，先预测它是否经过 audio.cpp，再到 workbench/score.go 验证。',
    review: '24–48 小时后闭卷画“受理成功但推理失败”的两条返回路径；7 天后解释 Activity 为什么不能代替 Generation 历史。'
  },
  {
    id: '02',
    title: '拆开音色参考',
    kicker: '条件与协议',
    question: '音色文件、目标文字、参考原文和情绪参考，分别把什么交给模型？',
    intro: '将素材导入与模型推理分开理解。导入保存参考音频和 Voice 记录；生成时把 VoiceID 解析成媒体路径，再按模型 family 与 variant 组织请求。导入音色这一步没有启动权重训练。',
    read: [
      {file: 'web/src/features/create/reference-controls.tsx', line: 1, label: '界面的参考输入'},
      {file: 'internal/workbench/voices.go', line: 15, label: '检查、转换并保存音色'},
      {file: 'internal/engine/request.go', line: 23, label: 'BuildRequest 模型适配'}
    ],
    task: '写四张请求卡：Qwen3-TTS Base 有/无参考原文，VoxCPM2 clone/continuation。每张列输入、必需字段、请求差异、缺少条件时的行为。',
    deliverable: '四张请求卡＋一张“导入 → 条件准备 → 引擎推理”的信息流图。',
    checks: [
      '区分 text 是新作品内容，reference_text 是参考音频里实际说出的原文。',
      '写出 Qwen 无原文时 x_vector_only_mode=true，有原文时为 false 并携带 options.reference_text。',
      '写出 Vox continuation 同时包含 voice_ref、audio 与顶层 reference_text。',
      '区分 VoiceID、文件路径和模型内部特征，不将一种模型的编码机制套给所有模型。'
    ],
    hints: [
      '给“希望它说的话”和“原音频里说的话”分别命名，然后找对应输入字段。',
      '顺着 RequiresVoice() 看；request 与 options 都可能携带条件。',
      'Qwen 检查 ReferenceText 是否为空；Vox 检查 VoxMode 是否为 continuation。切换条件后重写请求，别只向原请求追加字段。'
    ],
    quiz: {
      q: 'VoxCPM2 的 continuation 相比普通 clone，当前适配层增加了哪些关键条件？',
      options: ['只改一个音色名称。', '把模型权重重新训练一遍。', '参考音频同时作为 audio，并提供参考原文 reference_text。'],
      answer: 2,
      explanation: 'clone 使用 voice_ref；continuation 还把同一参考音频放入 audio，并传 reference_text。当前源码注释说明只传 voice_ref 会退化为普通克隆。'
    },
    transfer: '只有参考音频而没有原文时，分别预测 Qwen Base 与 Vox continuation 的处理，再找校验和请求映射证据。',
    review: '24–48 小时后闭卷解释为什么模型参数不能只靠统一字段名；7 天后说明请求里的 model: index 为什么不等于固定使用 IndexTTS。'
  },
  {
    id: '03',
    title: '做一个可验证的小改动',
    kicker: '首个练习',
    question: '给 models list 增加 --family，怎样保持旧行为并避免全局数据污染？',
    intro: '当前 CLI 尚无 --family；models list 返回 catalog、installed、generationOptions。JSON 已是默认输出。InstalledModel 没有 Family，需要通过目录模型 ID 关联。这个练习由你实现，课程不预先填完代码。',
    read: [
      {file: 'cmd/yovoice/main.go', line: 72, label: '解析参数与输出列表'},
      {file: 'cmd/yovoice/main_test.go', line: 1, label: 'CLI 测试约定'},
      {file: 'internal/schema/schema.go', line: 172, label: 'InstalledModel 的字段'}
    ],
    task: '只为 models list 注册 --family。合法族来自 catalog.Models；先筛目录，再按 ID 集合筛安装记录。用 t.TempDir() 和模拟记录验证，不需要下载模型。独立运行时使用新的 --data-dir。',
    deliverable: '最小代码差异、六种行为的测试结果、80 字说明为何先在 CLI 层实现。完整提交另需同步 CLI 文档与 CHANGELOG。',
    checks: [
      '默认查询结构、内容、顺序不变；筛选结果中的目录和安装项均完整且只属于目标族，安装记录字段与顺序保留。',
      '合法但无高级选项的 soundfont 输出 generationOptions: {}；没有安装项时 installed: []，不能为 null。',
      '未知族返回含输入值的错误且不输出成功 JSON；在创建数据目录和 Workbench 前拒绝。',
      '同一进程先筛选再默认查询，后者仍完整；catalog.Models 和 GenerationOptions 未被修改。',
      '只给 models list 增加参数，测试不访问正式数据或下载模型；记录上述六个行为场景的结果。'
    ],
    hints: [
      '拆成“哪些模型属于这个族”和“这些模型中哪些已安装”两步。',
      '用筛选后的模型 ID 建集合，再遍历原安装切片；创建新结果，保留原记录。',
      '不要用 catalog.Models[:0] 原地过滤或删除全局 map 的键。空安装结果用非 nil 空切片，合法族校验放在 os.MkdirAll 之前。'
    ],
    quiz: {
      q: '为什么不能只用 generationOptions 的键判断 --family 是否合法？',
      options: ['合法模型族可能没有高级选项，例如 soundfont。', '所有 map 的键都不可靠。', '模型 ID 的首段永远等于 family。'],
      answer: 0,
      explanation: '模型目录定义有哪些 family，高级选项字典只覆盖有对应选项的族。合法性应从 catalog.Models 的 Family 集合判断。'
    },
    transfer: '只设计不实现 --installed-only：先写与 --family 组合时三字段的语义、空结果约定和两个反例。',
    review: '24–48 小时后闭卷写出六个行为场景；7 天后解释 nil/空切片差异，并现场证明连续两次查询不污染全局数据。'
  },
  {
    id: '04',
    title: '把失败路径读完整',
    kicker: '取消与一致性',
    question: '用户取消或保存失败后，哪些工作已经完成，哪些状态和文件要清理？',
    intro: 'context 发出取消信号，任务通过明确的完成通道与状态迁移结束。音频文件和 SQLite 分属不同资源；.part、校验、改名与保存记录构成带补偿的流程。',
    read: [
      {file: 'internal/workbench/workbench.go', line: 108, label: '任务启动与完成'},
      {file: 'internal/engine/engine.go', line: 260, label: '推理、临时文件与清理'},
      {file: 'internal/store/store.go', line: 206, label: '持久化后再发布状态'}
    ],
    task: '分别在计算时、WAV 校验时、文件已改名而数据库保存失败时插入纸上故障。为每处写可见状态、可能残留文件、清理责任和验证方法，再用临时测试目录验证其中一条。',
    deliverable: '三行故障矩阵＋一张取消时序图。',
    checks: [
      '区分请求取消与确认终止，不把 context 当作强制停止所有工作的魔法。',
      '说清 .part、最终文件、Generation 记录分别在何时产生。',
      '说明 persist=true 时提交成功后才替换内存并通知，不提前发布成功状态。',
      '指出文件和数据库没有共同原子事务，进程崩溃窗口需要额外验证。'
    ],
    hints: [
      '找谁创建 context、谁接收它、谁关闭完成通道。',
      '画 .part → 验证 → 最终文件 → Generation，每步标失败出口。',
      '将文件通道与 Store.Update 的“复制 → 修改 → 提交 → 替换 → 通知”放在两条线上，找两者之间的窗口。'
    ],
    quiz: {
      q: 'Store.Update 在持久化成功后才发布内存状态，因此可以得出什么？',
      options: ['任何时刻断电都绝无孤儿音频文件。', '数据库与文件系统自动共享一个事务。', '提交失败不会直接发布未保存的新快照，但跨资源崩溃窗口仍需检查。'],
      answer: 2,
      explanation: 'Store 的顺序约束保护了这次状态更新；音频文件有自己的写入、改名与补偿步骤，不能因此推导出文件系统和 SQLite 的共同原子性。'
    },
    transfer: '多句生成的第二句失败时，第一句应否删除？先提出产品语义，再看 generateSegments；当前代码保留已完成句子。',
    review: '24–48 小时后闭卷追踪保存失败；7 天后用多句任务解释为什么不能将所有失败都描述成“一切回滚”。'
  },
  {
    id: '05',
    title: '分清证据能证明什么',
    kicker: '测试与边界',
    question: '测试通过、界面能点、模型出声、音色相似，分别需要什么证据？',
    intro: '请求构造、伪引擎生命周期、目录合同和真实推理处于不同验证层。先找出测试替换了什么，再陈述它实际覆盖的性质。',
    read: [
      {file: 'internal/engine/request_test.go', line: 15, label: '请求字段的合同测试'},
      {file: 'internal/engine/lifecycle_test.go', line: 21, label: '伪引擎与进程协议'},
      {file: 'internal/catalog/catalog_test.go', line: 12, label: '前后端目录一致性'}
    ],
    task: '给请求测试、伪引擎、浏览器预览、真实模型各写一张证据卡，包含配置、操作、观察、可支持结论和未覆盖条件。没做真实实验就写待验证。',
    deliverable: '四张证据卡＋一个模型请求分支的定向测试记录。工具链未就绪则先交测试计划，实践状态保留未通过。',
    checks: [
      '不把伪 WAV 或浏览器预览当成真实模型音质、显存和 GPU 性能证明。',
      '说明共享 JSON 一致不等于下载成功或模型文件兼容。',
      '真实实验若执行，记录模型 ID/精度、运行时、后端、硬件、输入、种子和冷/热启动。',
      '每张卡都写未覆盖条件，未执行的结果保持待验证。'
    ],
    hints: [
      '先在每个测试里找“被替换掉的东西”。',
      '查看伪音频的产生方式，判断有没有真正执行神经网络。',
      '将结论写成“配置 C、输入 I 下观察到 O”，然后单列没有检查的条件。'
    ],
    quiz: {
      q: '伪引擎能正确返回 WAV，且生命周期测试通过，直接支持哪项结论？',
      options: ['这个模型的人声克隆效果优秀。', '测试覆盖的进程、协议与保存行为符合预期。', '全部 GPU 和模型版本都可以运行。'],
      answer: 1,
      explanation: '测试替身可以验证编排协议与指定失败路径，不计算真实模型，因此不能推导音质、显存需求或广泛硬件兼容性。'
    },
    transfer: '目录里新增模型，但旧运行时不支持它。设计一个启动前检查与一条面向用户的反馈，不用真正接入新模型。',
    review: '24–48 小时后给“真实推理成功一次”写证据边界；7 天后说明它为什么不能代替取消与持久化失败测试。'
  },
  {
    id: '06',
    title: '提出有证据的优化',
    kicker: '测量与取舍',
    question: '哪个问题值得改，如何证明收益，而不是只让代码更复杂？',
    intro: '从用户能感受到的问题出发，先拿基线。全量 State 推送可能随历史增长产生代价；冷启动与引擎复用则影响生成等待。它们都是待测假设，不能只凭代码形状判定瓶颈。',
    read: [
      {file: 'internal/store/store.go', line: 206, label: '状态复制与更新'},
      {file: 'internal/desktop/server.go', line: 90, label: 'State 事件推送'},
      {file: 'internal/engine/engine.go', line: 113, label: '进程复用键与启动'}
    ],
    task: '从“历史很多时的状态推送成本”或“分阶段显示准备、加载、推理、保存耗时”选一个。先测基线，再写最小方案、比较实验和回归边界。',
    deliverable: '一页改进提案：用户痛点、证据、未知条件、最小方案、比较实验、风险与撤回方式。',
    checks: [
      '明确一个用户问题，未测结论标为假设，不写“已解决卡顿”。',
      '状态方案记录条目数、序列化字节、事件频率与耗时；耗时方案固定模型/后端/输入并区分冷启动与复用。',
      '比较实验条件明确，说明什么结果才算值得保留改动。',
      '能用一句话说明最小改动的价值，并列出一项回归风险与撤回办法。'
    ],
    hints: [
      '先写用户看见的具体问题，再写模块名。',
      '总耗时拆成准备、加载、计算、保存；状态代价拆成大小与频率。',
      '数据若不支持原假设，保留测量记录并换候选；不用为了完成课程硬做队列或全量架构重写。'
    ],
    quiz: {
      q: '同一模型第二次生成明显更快，最合理的下一步是？',
      options: ['固定输入和后端，区分冷启动与进程复用再比较。', '立刻宣布算法性能翻倍。', '把第二次耗时当作所有用户的固定等待时间。'],
      answer: 0,
      explanation: '进程/模型复用、系统缓存和输入差异都可能影响耗时。需要控制变量并分别记录，才能将收益归因于某项改动。'
    },
    transfer: '改看“音色导入失败提示太模糊”：提出可复现输入、当前错误、期望反馈以及不需要真实模型的验证方法。',
    review: '24–48 小时后闭卷解释测量为何先于优化；7 天后把同样的方法迁移到一个从未读过的功能，写出可证伪的假设。'
  }
];
