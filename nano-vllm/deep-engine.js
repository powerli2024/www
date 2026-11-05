/* Numerical teaching models. Values are calculated, not measured GPU performance. */
(function (root) {
  'use strict';
  const UPSTREAM = 'bb823b3e06983d71485a8e1f23715ebd87d98ef8';
  const SOURCE = `https://github.com/GeeeekExplorer/nano-vllm/blob/${UPSTREAM}/`;
  const clone = x => JSON.parse(JSON.stringify(x));
  const finiteVector = x => Array.isArray(x) && x.length > 0 && Array.from(x).every(v => typeof v === 'number' && Number.isFinite(v));
  function shape(A) {
    if (!Array.isArray(A) || !A.length || !finiteVector(A[0]) || !Array.from(A).every(r => finiteVector(r) && r.length === A[0].length)) throw new Error('Expected a finite rectangular matrix');
    return [A.length, A[0].length];
  }
  function mm(A, B) {
    const [m, k] = shape(A), [j, n] = shape(B);
    if (k !== j) throw new Error(`Matrix dimension mismatch: ${m}×${k} cannot multiply ${j}×${n}`);
    return Array.from({ length: m }, (_, r) => Array.from({ length: n }, (_, c) => A[r].reduce((sum, x, i) => sum + x * B[i][c], 0)));
  }
  function softmax(xs, temperature = 1) {
    if (!Number.isFinite(temperature) || temperature <= 0 || !Array.isArray(xs) || !xs.length || !Array.from(xs).every(x => typeof x === 'number' && (Number.isFinite(x) || x === -Infinity))) throw new Error('Invalid softmax input');
    const max = Math.max(...xs);
    if (max === -Infinity) throw new Error('No visible position');
    const exps = xs.map(x => x === -Infinity ? 0 : Math.exp((x - max) / temperature));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  }
  const dot = (a, b) => { if (!finiteVector(a) || !finiteVector(b) || a.length !== b.length) throw new Error('Dot dimension mismatch or invalid input'); return a.reduce((sum, x, i) => sum + x * b[i], 0); };
  function rotate(v, theta) { if (!finiteVector(v) || v.length !== 2 || !Number.isFinite(theta)) throw new Error('Expected finite 2D vector and angle'); const [x, y] = v; return [x * Math.cos(theta) - y * Math.sin(theta), x * Math.sin(theta) + y * Math.cos(theta)]; }
  function sample(probs, u) {
    if (!finiteVector(probs) || probs.some(p => p < 0) || !Number.isFinite(u) || !(u >= 0 && u < 1)) throw new Error('Invalid categorical sample');
    const total = probs.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) > 1e-8) throw new Error('Invalid categorical sample');
    let cdf = 0, lastPositive = -1;
    for (let i = 0; i < probs.length; i++) { cdf += probs[i]; if (probs[i] > 0) lastPositive = i; if (u * total < cdf) return i; }
    return lastPositive;
  }
  function attentionModel(options = {}) {
    const gain = Number(options.embedding ?? 1), query = Number(options.query ?? 2), temperature = Number(options.temperature ?? 1), u = Number(options.draw ?? 0.62);
    if (![0, 0.5, 1, 1.5].includes(gain) || ![0, 1, 2].includes(query)) throw new Error('Unsupported teaching matrix choice');
    const tokens = ['我', '爱', '学', '习'];
    const E = [[1, 0, 0], [0, 1, 0], [1, 1, gain], [0, 0, 1]];
    const ids = [0, 1, 2], X = ids.map(i => E[i]);
    const Wq = [[1, 0], [0, 1], [1, 1]], Wk = [[1, 0], [0, 1], [1, -1]], Wv = [[1, 0], [0, 1], [1, 1]];
    const Wo = [[0.2, -0.3, 0.1, 1], [-0.1, 0.4, 0.2, 0.8]];
    const Q = mm(X, Wq), K = mm(X, Wk), V = mm(X, Wv);
    const rows = Q.map((q, i) => {
      const raw = K.map(k => dot(q, k));
      const scaled = raw.map(x => x / Math.sqrt(2));
      const masked = scaled.map((x, j) => j > i ? -Infinity : x);
      const weights = softmax(masked);
      const output = mm([weights], V)[0];
      return { position: i, raw, scaled, masked: masked.map(x => x === -Infinity ? null : x), weights, output };
    });
    const logits = mm([rows[2].output], Wo)[0];
    const probabilities = softmax(logits, temperature), picked = sample(probabilities, u);
    // Compare full recomputation and a single new query using retained prefix KV.
    const extendedX = [...X, E[picked]], extendedQ = mm(extendedX, Wq), extendedK = mm(extendedX, Wk), extendedV = mm(extendedX, Wv);
    const extendedRows = extendedQ.map((q, i) => {
      const a = softmax(extendedK.map((k, j) => j <= i ? dot(q, k) / Math.sqrt(2) : -Infinity));
      return mm([a], extendedV)[0];
    });
    const incrementalK = [...K, extendedK[3]], incrementalV = [...V, extendedV[3]];
    const incremental = mm([softmax(incrementalK.map(k => dot(extendedQ[3], k) / Math.sqrt(2)))], incrementalV)[0];
    const reuse = { appendedId: picked, oldK: K, appendedK: extendedK, oldV: V, appendedV: extendedV, full: extendedRows[3], incremental,
      oldOutputMaxDiff: Math.max(...rows.flatMap((row, i) => row.output.map((x, j) => Math.abs(x - extendedRows[i][j])))),
      newOutputMaxDiff: Math.max(...incremental.map((x, i) => Math.abs(x - extendedRows[3][i]))) };
    return { tokens, E, ids, X, Wq, Wk, Wv, Wo, Q, K, V, rows, query, active: rows[query], logits, probabilities, picked, temperature, u, gain, reuse,
      dimensions: { E: [4, 3], X: [3, 3], Wq: [3, 2], Wk: [3, 2], Wv: [3, 2], Q: [3, 2], K: [3, 2], V: [3, 2], scores: [3, 3], output: [3, 2], Wo: [2, 4], logits: [1, 4] } };
  }
  function attentionFrames(options = {}) {
    const math = attentionModel(options);
    const stages = [
      ['离散符号：token 先变成编号', '真实 tokenizer 把文本切成 token ID；编号没有数值距离的语义。本例人为把「我 / 爱 / 学 / 习」设成 4 个词表项，只为方便核算。'],
      ['查表：ID → embedding', 'E 的每行是一个 token 的向量。输入 ID [0,1,2] 取出 E 的三行，得到 X。可以改「学」的第三维，观察后续所有量连锁变化；这些向量是手工设定的，不是训练结果。'],
      ['线性投影：一份 X，三种角色', 'Q = XW_Q，K = XW_K，V = XW_V。矩阵乘法要求内维相等：[3×3] × [3×2] → [3×2]。Q 用来查询，K 用来匹配，V 提供被聚合的内容；它们不是三个不同输入。'],
      ['打分：点积，再除以 √dₖ', 'sᵢⱼ = qᵢ·kⱼ / √dₖ。本例 dₖ=2。缩放用于缓解维度变大时点积尺度增长，不能把点积本身当概率。选择不同 query 行查看实际乘加。'],
      ['因果掩码：把未来的分数设为 −∞', '第 i 个位置只看 j≤i。掩码要加在 softmax 之前；这样未来位置的 exp(−∞)=0。Prefill 可以并行算多行，但每行仍遵守这个限制。'],
      ['Softmax：分数成为归一化权重', 'aᵢⱼ = exp(sᵢⱼ−m) / Σₖ exp(sᵢₖ−m)，m 是本行可见最大值。减去同一个 m 不改变比例，却避免指数溢出。每行权重非负、总和为 1，未来位置严格为 0。'],
      ['加权求和：读取 V，不是选择单个词', 'oᵢ = Σⱼ aᵢⱼ vⱼ，即 A[3×3] × V[3×2] → O[3×2]。一个 attention 输出是向量，不是 token。真实模型还会经过输出投影、残差、归一化、多层网络等。'],
      ['词表分布：只用末位置续写', '本小模型用手工 W_out[2×4] 把末位置向量映射到 4 个 logits，再做 softmax(logits / T)。这不是完整 Transformer。温度改变分布，不能保证回答质量；u 是固定的可调整抽样数，不是假装随机的模型输出。'],
      ['因果性，让旧 K / V 可以留在原处', '对固定模型和固定旧前缀，旧位置看不到追加的 token，旧 K / V 因而不变。新 token 必须先变为下一轮输入，才得到自己的 K / V。改变旧 token、模型或位置处理，就不能盲目沿用旧缓存。']
    ];
    return stages.map(([title, detail], step) => ({ step, title, detail, math }));
  }

  const PERF = { parameters: 1e9, layers: 24, queryHeads: 16, kvHeads: 4, headDim: 64, bytesPerElement: 2 };
  function performanceModel(options = {}) {
    const batch = Number(options.batch ?? 4), context = Number(options.context ?? 2048), phase = options.phase || 'decode';
    if (![1, 4, 16, 32].includes(batch) || ![128, 512, 2048, 8192].includes(context) || !['prefill', 'decode'].includes(phase)) throw new Error('Unsupported traffic scenario');
    const p = PERF, inputs = phase === 'decode' ? batch : batch * context;
    const pairsPerSeq = phase === 'decode' ? context : context * (context + 1) / 2;
    const weightBytes = p.parameters * p.bytesPerElement;
    const kvBytes = 2 * batch * context * p.layers * p.kvHeads * p.headDim * p.bytesPerElement;
    const newKVBytes = 2 * inputs * p.layers * p.kvHeads * p.headDim * p.bytesPerElement;
    const denseFlops = 2 * p.parameters * inputs;
    const attentionFlops = 4 * batch * p.layers * p.queryHeads * p.headDim * pairsPerSeq;
    const kvSlotBytes = 2 * p.layers * p.kvHeads * p.headDim * p.bytesPerElement;
    const blockSize = 256, blockBytes = kvSlotBytes * blockSize, assignedBlocks = batch * Math.ceil(context / blockSize);
    const poolBudget = 512 * 1024 ** 2, poolBlocks = Math.floor(poolBudget / blockBytes), poolBytes = poolBlocks * blockBytes;
    return { ...p, batch, context, phase, inputs, pairsPerSeq, kvSlotBytes, blockSize, blockBytes, assignedBlocks,
      assignedBytes: assignedBlocks * blockBytes, tailSlots: assignedBlocks * blockSize - batch * context,
      poolBudget, poolBlocks, poolBytes, fitsPool: assignedBlocks <= poolBlocks, weightBytes, weightBytesPerInput: weightBytes / inputs, kvBytes, newKVBytes, denseFlops, attentionFlops,
      idealDecodeBytes: phase === 'decode' ? weightBytes + kvBytes + newKVBytes : null,
      decodeIntensity: phase === 'decode' ? (denseFlops + attentionFlops) / (weightBytes + kvBytes + newKVBytes) : null };
  }
  function performanceFrames(options = {}) {
    const model = performanceModel(options);
    const stages = [
      ['先写下假设，再谈“快”', '以下是显式的教学结构和理想流量账本，不代表 Qwen3 的实际配置，不是 nano-vLLM 实测。没有把动画长短转换成毫秒或加速倍数。'],
      ['容量不等于流量：有效 KV、占用块、整个池', '先按有效 token 数算 KV，再按每条请求向上取整到块。池在运行前已预留，释放请求引用并不把这部分显存归还给 CUDA。此处假设专给 KV 池 512 MiB，不是 GPU 总容量。'],
      ['权重：批量能摊薄共同读取', 'P=10亿只近似参与密集线性乘的权重参数量，并不定义一个完整真实模型。将同一层权重用于多个输入位置，通常比一次只处理一个位置更容易形成大矩阵乘。这里理想化为每步读取这些权重一次；真实缓存复用、分片和算子实现会改变流量。'],
      ['KV：上下文越长，历史越多', '每个位置缓存 K 和 V 两份数据。KV 容量约为 2×B×T×L×H_KV×d×元素字节数。T 包含本轮已写入的新输入 KV。Decode 本轮仍要读取可见历史；有缓存不等于不做 attention。'],
      ['计算：线性层与 attention 分开数', '数学有效操作量粗估 dense FLOPs ≈ 2P×输入位置数；attention 两次乘法合计约 4×B×L×H_Q×d×可见 query-key 对数。一次乘加计 2 FLOPs；省略 softmax、归一化和其他操作，也不计 kernel padding 等额外运算。'],
      ['瓶颈是条件，不是标签', '较长 Prefill / 较大批量常有较高计算强度；小批量 Decode 常更受权重和 KV 数据移动影响。但长上下文、大 batch、通信、硬件与实现都可能改变瓶颈，不能简单宣称“Prefill 永远算力受限”。']
    ];
    return stages.map(([title, detail], step) => ({ step, title, detail, model }));
  }

  function tensorModel(options = {}) {
    const tp = Number(options.tp ?? 2), kvHeads = Number(options.kvHeads ?? 4), queryHeads = 8, headDim = 2;
    if (![1, 2, 4, 8].includes(tp) || ![2, 4, 8].includes(kvHeads)) throw new Error('Unsupported TP choice');
    const valid = queryHeads % tp === 0 && kvHeads % tp === 0;
    const groups = Array.from({ length: kvHeads }, (_, k) => ({ kv: k, q: Array.from({ length: queryHeads / kvHeads }, (_, j) => k * queryHeads / kvHeads + j) }));
    const ranks = valid ? Array.from({ length: tp }, (_, rank) => ({ rank,
      q: Array.from({ length: queryHeads / tp }, (_, j) => rank * queryHeads / tp + j),
      kv: Array.from({ length: kvHeads / tp }, (_, j) => rank * kvHeads / tp + j) })) : [];
    const x = [1, 2, 3, 4], W = [[1, 0], [0, 1], [1, 1], [2, -1]];
    const partials = [[x[0] * W[0][0] + x[1] * W[1][0], x[0] * W[0][1] + x[1] * W[1][1]], [x[2] * W[2][0] + x[3] * W[3][0], x[2] * W[2][1] + x[3] * W[3][1]]];
    return { tp, kvHeads, queryHeads, headDim, valid, groups, ranks, ratio: queryHeads / kvHeads, x, W, partials, sum: partials[0].map((v, i) => v + partials[1][i]) };
  }
  function tensorFrames(options = {}) {
    const model = tensorModel(options);
    const stages = [
      ['GQA：多个 Q head，共用一组 K / V head', '本图有 8 个 query heads。减少 KV heads 可以减少 KV 存储；这不是减少 query heads。每个 query head 仍分别计算自己的注意力，只是它们组内使用同一组 K / V。'],
      ['张量并行：同一层拆到多个 rank', '这版 Qwen3Attention 要求 H_Q 和 H_KV 均能整除 TP。试试 H_KV=2、TP=4：它并不自动复制 KV heads，而会触发整除断言。图中无效选项不会伪装成可运行。'],
      ['Column-parallel：按输出特征分片', '概念上 Y=XW，把 W 的输出列分给不同 rank。QKVParallelLinear 与 MergedColumnParallelLinear 各自得到局部输出；每个 rank 不必都保存完整权重。PyTorch 权重存储是[out,in]，这里用数学[in,out]记法。'],
      ['Row-parallel：局部乘积相加才完整', '把输入特征和权重的输入行分片，得到 Y=Σᵣ XᵣWᵣ。本例单独用 2 个 rank 演算 [1,2,3,4]×W；局部输出必须 all-reduce 求和，而不是把它们简单拼接。'],
      ['更多 GPU ≠ 免费倍速', '分片降低每 rank 的部分权重与 KV 负担，但引入同步与通信；小 batch 的通信开销可能很显著。这里演示分片和归约的代数，不模拟 NCCL、网络或真实加速比。']
    ];
    return stages.map(([title, detail], step) => ({ step, title, detail, model }));
  }

  function kernelFrames(options = {}) {
    const kind = options.kernel || 'flash';
    const sequences = {
      flash: [
        ['普通注意力公式，不要求先存整张大表', 'S=QKᵀ/√dₖ+causal_mask，A=softmax(S)，O=AV 是数学表达。若直接把 S 和 A 全写进显存，中间表随 T² 增长。FlashAttention 改变计算顺序与数据移动，而不是把因果规则换掉。'],
        ['切成 tile，把一小块放进快存储', '分块加载 Q/K/V，在片上快存储中计算局部 scores，不必把整张注意力矩阵物化到 HBM。真实 kernel 的 tile 大小与并行方式不是本图的 2×2。'],
        ['在线 softmax：保留统计量与部分输出', '每处理一块，更新最大值 m、归一化因子 l 和未归一化输出 u。新最大值改变时，旧统计量要乘 exp(m_old−m_new) 重新缩放；直接把各块 softmax 相加是错的。'],
        ['相同公式，不同 IO 路径', '最终 O=u/l。在实数算术下等价于完整 softmax attention，浮点舍入可不同。nano-vLLM 调用 flash_attn_varlen_func / flash_attn_with_kvcache；本页没有声称自写了原始 vLLM PagedAttention kernel。']
      ],
      paging: [
        ['分页式 KV：回答“历史放哪里”', '逻辑 token 位置先换成逻辑块号与块内偏移，再查 block_table 得到物理块号。这个映射不改变 attention 的数学定义。'],
        ['块表查找：位置 9 → 第 2 块偏移 1', '教学块大小 4，位置从 0 开始：floor(9/4)=2，9 mod 4=1。若 block_table=[2,7,4]，物理槽位就是 4×4+1=17。'],
        ['计算内核消费映射，不要求物理连续', 'Attention 接口通过 block_table / slot_mapping 访问缓存。本仓库以分页管理配合 FlashAttention API；“分页式 KV 管理”和“某个特定 PagedAttention CUDA kernel”不应混为一谈。'],
        ['与 FlashAttention 协作，而非互相替代', '分页管理布局、共享、分配；FlashAttention 优化 attention 的计算与 IO。它们可以同时存在。物理映射正确仍不代表算子没有带宽开销。']
      ],
      graph: [
        ['CUDA Graph：回答“GPU 操作怎样发起”', '重复的 GPU 操作序列可以先捕获，再用图重放减少 CPU 发射开销。图重放仍读取本轮新输入、写新结果，不是缓存旧答案。'],
        ['先捕获一组适用 batch 形状', '本仓 runner 为若干 decode batch size 预捕获执行图，并为不足形状的位置使用 padding。不是任何任意形状都自动免费重放。'],
        ['新输入写入缓冲，再 replay', '捕获范围是 self.model 的 forward，不包含后续 compute_logits 与 sampler。Prefill、enforce_eager 或大于 512 的 batch 会走直接执行分支。'],
        ['优化层次：调度 / 内存 / 内核 / 发射', '四个层次一起影响推理：Scheduler 决定做什么，块管理决定存哪里，attention kernel 决定怎样算，CUDA Graph 减少适用执行路径的重复发射。没有一个机制可以单独解释所有加速。']
      ]
    };
    if (!sequences[kind]) throw new Error('Unsupported kernel comparison');
    const scores = [1.2, -0.5, 2.1, 0.8], values = [[1, 0], [0, 1], [2, 1], [-1, 2]];
    let m = -Infinity, l = 0, u = [0, 0];
    const online = [];
    for (let start = 0; start < scores.length; start += 2) {
      const tile = scores.slice(start, start + 2), nextM = Math.max(m, ...tile), correction = m === -Infinity ? 0 : Math.exp(m - nextM), p = tile.map(s => Math.exp(s - nextM));
      l = correction * l + p.reduce((a, b) => a + b, 0);
      u = u.map((x, d) => correction * x + p.reduce((sum, w, j) => sum + w * values[start + j][d], 0));
      m = nextM; online.push({ start, m, l, u: [...u], output: u.map(x => x / l), correction, p });
    }
    return sequences[kind].map(([title, detail], step) => ({ kind, step, title, detail, scores, values, online, full: mm([softmax(scores)], values)[0], map: { position: 9, size: 4, table: [2, 7, 4], logical: 2, offset: 1, physical: 4, slot: 17 } }));
  }

  function preemptionFrames() {
    const trace = root.NanoPreemptionTrace;
    if (!trace) throw new Error('Source-verified preemption trace is missing');
    const f = trace.frames, ev = trace.events[0];
    return [
      { state: f[0].state, title: '三个物理块，两条请求', detail: 'A 提示 8 token，B 提示 4 token；每块 4 token，池共 3 块。两者 maxOutput 分别是 4 和 3。这里只缩小参数，状态来自冻结源码的 CPU 元数据执行。', round: 0 },
      { state: f[1].afterSchedule, title: '第 1 轮：整段预分配，恰好装满', detail: 'A 占 P0、P1，B 占 P2。此帧在 model forward 之前：已预分配不等于已有 KV。两条请求本轮都做 Prefill。', round: 1 },
      { state: f[1].state, title: 'Prefill 结束：各产生第 1 个输出', detail: 'A 已缓存 8，B 已缓存 4；各有 1 个新输出尚未写 KV。下一轮 A 要输入第 9 个 token，需要第 3 个物理块，但池中没有空闲块。', round: 1 },
      { state: ev.after, title: '第 2 轮中间态：从 running 尾部抢占 B', detail: 'A 已从队首取出等待调度；B 从尾部被抢占，释放 P2，放到 waiting 队首。B 的 token 列表和已生成计数仍保留，但 block_table 与当前 cached 清空。这不是删除 B 的输出，也不是把 KV 换出到 CPU。', round: 2, event: 'preempt' },
      { state: f[2].afterSchedule, title: 'P2 立即被 A 重新分配', detail: '释放后的P2本可暂留B的缓存身份，但重新分配先清除这个身份，此刻尚未forward，不能说GPU字节已经覆盖。B已无法再命中它；下一步A写入时才覆盖对应槽位。', round: 2 },
      { state: f[2].state, title: 'A 继续 Decode，B 保留 token 等待', detail: '本轮 A 处理 1 个输入并生成第 2 个输出。B 仍保留原提示 4 token 加已生成的 1 token；当前 KV 为 0，尚未重新入场。', round: 2 },
      { state: f[3].state, title: '第 3 轮：waiting 不等于一定能入场', detail: '调度器先尝试 Prefill，但 B 所需块仍不够，无法入场，于是继续 Decode A。Prefill 优先不是无条件跳过容量检查。', round: 3 },
      { state: f[4].state, title: '第 4 轮：A 完成，引用归还池', detail: 'A 达到 4 个输出，退出 running 并释放 3 个块。下一轮 B 才能重新 Prefill；并没有在 A 的 Decode 轮里混入 B 的 Prefill。', round: 4 },
      { state: f[5].afterSchedule, title: '第 5 轮：B 不是只重算原来的 4 个', detail: 'B 的当前序列有 5 个 token：原提示 4 个 + 抢占前已生成的 1 个。旧 KV 已无可用命中，重新 Prefill 这 5 个 token，输出计数不会归零。', round: 5 },
      { state: f[5].state, title: 'B 恢复后，追加第 2 个输出', detail: '重建当前序列的 KV 后继续采样。现在 B 的 KV=5，输出数=2；刚采样的新输出仍要下一轮才获得自己的 KV。', round: 5 },
      { state: f[6].state, title: '第 6 轮：B 达到上限，全部结束', detail: 'B 再 Decode 1 次，生成第 3 个输出后释放引用。两条请求都结束；缓存内容可能暂留，但没有活跃请求占用。这个例子展示重计算式抢占，不是 CPU swap。', round: 6 }
    ].map((frame, step) => ({ ...clone(frame), step, fixture: trace.fixture }));
  }


  const QWEN = { name: 'Qwen3-0.6B', revision: 'c1899de289a04d12100db370d81485cdf75e47ca', hidden: 1024, heads: 16, kvHeads: 8, headDim: 128, intermediate: 3072, layers: 28, vocab: 151936, epsilon: 1e-6 };
  function rmsNorm(x, gamma, epsilon = 1e-6) {
    if (!finiteVector(x) || !finiteVector(gamma) || x.length !== gamma.length || !Number.isFinite(epsilon) || epsilon <= 0) throw new Error('Invalid RMSNorm input');
    const meanSquare = x.reduce((a, b) => a + b * b, 0) / x.length, denominator = Math.sqrt(meanSquare + epsilon);
    return { meanSquare, denominator, output: x.map((v, i) => gamma[i] * v / denominator) };
  }
  const silu = x => x / (1 + Math.exp(-x));
  function architectureModel(options = {}) {
    const position = Number(options.position ?? 2), inputGain = Number(options.inputGain ?? 1);
    if (![0, 1, 2, 3, 4, 5, 6].includes(position) || ![0.5, 1, 2].includes(inputGain)) throw new Error('Unsupported architecture toy setting');
    const x = [1 * inputGain, 2 * inputGain, -1 * inputGain, 0], gamma = [1, 1, 1, 1], norm = rmsNorm(x, gamma);
    const q = [1, 0], k = [1, 1], omega = Math.PI / 6, qPosition = position, kPosition = 1;
    const rotatedQ = rotate(q, qPosition * omega), rotatedK = rotate(k, kPosition * omega);
    const relativeK = rotate(k, (kPosition - qPosition) * omega);
    const h = [1, -1], Wg = [[1, 0, 1], [0, 1, -1]], Wu = [[1, 2, 0], [1, 0, 1]], Wd = [[1, 0], [0, 1], [1, -1]];
    const gate = mm([h], Wg)[0], up = mm([h], Wu)[0], activated = gate.map(silu), gated = activated.map((v, i) => v * up[i]);
    const down = mm([gated], Wd)[0], residual = down.map((v, i) => v + h[i]);
    return { config: QWEN, position, inputGain, x, gamma, norm,
      rope: { q, k, omega, qPosition, kPosition, rotatedQ, rotatedK, dot: dot(rotatedQ, rotatedK), relativeDot: dot(q, relativeK), normQ: Math.hypot(...rotatedQ), normK: Math.hypot(...rotatedK) },
      mlp: { h, Wg, Wu, Wd, gate, up, activated, gated, down, residual },
      kvBytesPerToken: 2 * QWEN.layers * QWEN.kvHeads * QWEN.headDim * 2 };
  }
  function architectureFrames(options = {}) {
    const model = architectureModel(options);
    const stages = [
      ['从单头玩具，走向真实 Qwen3 层', '前一幕只展示 attention 的数值链。真实模型还要多次做归一化、位置旋转、多头注意力、残差和带门控的 MLP。下面的结构/维度对照固定 Qwen3-0.6B 配置；小数字演算依旧是手工 toy。'],
      ['RMSNorm：控制向量的尺度', '对一个向量，RMSNorm(x)ᵢ = γᵢ xᵢ / √(Σⱼxⱼ²/D + ε)。γ 是训练参数，不是固定必须等于 1；它不减均值，区别于 LayerNorm。右侧 toy 设 γ 全 1，ε=10⁻⁶。'],
      ['RoPE：用旋转编码相对位置', '每一对维度做旋转 R(θ)，不同维度对用不同频率；此处只画一对，ω=π/6。旋转保持长度，(R(mω)q)·(R(nω)k)=q·R((n−m)ω)k。该源码只旋转 Q/K，不旋转 V。'],
      ['真实维度：head_dim 不一定是 D/H_Q', '固定配置中 D=1024、H_Q=16、H_KV=8、d=128。Q 的总宽度是 2048，K/V 各1024；合并 QKV 是4096。attention 输出经 W_O[2048×1024] 回到残差宽度1024。不要误用 1024/16=64。'],
      ['SwiGLU：两个分支，一道可学习的门', 'gate=hW_g，up=hW_u，MLP(h)=(SiLU(gate) ⊙ up)W_down；SiLU(z)=z·sigmoid(z)。⊙ 是逐元素乘，不是矩阵乘。真实中间维度为3072；这里用2→3→2单独演算。'],
      ['残差 + 堆叠：attention 不是整个模型', '概念上 h₁=h+Attention(RMSNorm(h))，h₂=h₁+MLP(RMSNorm(h₁))。源码把部分残差相加融合进下一次 RMSNorm，所以物理调用边界不同，但依赖关系相同。28层后最终归一化，再映射词表 logits。'],
      ['一份完整 KV：每层、每位置、每 KV head', '此模型按 BF16/FP16 的2字节估算，每token的全层KV为 2×28×8×128×2=114688 bytes=112 KiB。4096个有效token是448 MiB。这不含权重、激活、工作区或预留空槽，也不是总显存实测。']
    ];
    return stages.map(([title, detail], step) => ({ step, title, detail, model }));
  }
  function practiceFrames() {
    return [
      ['先固定实验对象', '源码、模型revision、dtype、GPU、驱动/CUDA、PyTorch、FlashAttention、TP、batch和输入输出长度，都影响结果。先保存这些元数据，再看吞吐；不要用这个网页的动画速度作为对照。'],
      ['建立最小正确性基线', '先用一个小请求、TP=1、enforce_eager=True 跑通，再比较图重放。该冻结 SamplingParams 要求temperature>10⁻¹⁰，因此不支持temperature=0，网页上的低温不是greedy接口。'],
      ['一次只改一个变量', '保持请求内容与长度分布不变，分别改变batch、context、graph或TP。初始化/下载/预热与稳态计时分开。独立重复并报告分布；不要用一次总耗时声称特定kernel的加速比。'],
      ['给指标写清分子和分母', 'TTFT 是到首token的延迟；TPOT是后续token的平均生成间隔；吞吐是指定观测窗口内的token或请求数/秒。离线generate只在整批结束时返回，单测它的总墙钟耗时不能拆出TTFT和TPOT。'],
      ['带着可证伪的问题回到源码', '试验预测可以错：更大batch可能摊薄权重读取，却增加KV容量与单请求等待；长上下文增加每步历史读取；Graph主要改启动开销。若结果相反，检查工作负载、同步、缓存热度与内存余量，而不是改写数据。']
    ].map(([title, detail], step) => ({ step, title, detail }));
  }

  const api = { UPSTREAM, SOURCE, QWEN, rmsNorm, silu, architectureModel, architectureFrames, practiceFrames, shape, mm, softmax, dot, rotate, sample, attentionModel, attentionFrames, PERF, performanceModel, performanceFrames, tensorModel, tensorFrames, kernelFrames, preemptionFrames };
  root.NanoDeep = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
