/* Educational, deterministic model. Not the nano-vLLM runtime. */
(function (root) {
  'use strict';
  const BLOCK_SIZE = 4;
  const PROMPT = ['解', '释', '一', '下', 'KV', '缓', '存', '。'];
  const OUTPUT = ['它', '保', '留', '历', '史', '。'];
  const clone = value => JSON.parse(JSON.stringify(value));

  function journeyFrames() {
    const frames = [{ kind: 'ready', round: 0, kv: 0, generated: 0, reserved: 0, input: [], title: '请求就绪，还没有计算', detail: '把提示词交给引擎。这里每个方块是抽象 token，不代表真实分词结果。' }];
    for (let round = 0; round < OUTPUT.length; round++) {
      const prefill = round === 0;
      const input = prefill ? PROMPT : [OUTPUT[round - 1]];
      const kv = PROMPT.length + round;
      const reserved = Math.ceil(kv / BLOCK_SIZE) * BLOCK_SIZE;
      frames.push({ kind: 'compute', prefill, round: round + 1, kv, generated: round, reserved, input, title: prefill ? 'Prefill：一次处理提示词' : `Decode ${round}：只输入刚才的 token`, detail: prefill ? '并行计算这一段提示词各位置的表示，写入它们的 K / V。因果掩码仍然阻止 token 看见后文。' : `把「${input[0]}」作为本轮输入，写入它的 K / V；当前 query 读取已有历史与当前 token 的 K / V。` });
      frames.push({ kind: 'sample', prefill, round: round + 1, kv, generated: round + 1, reserved, input, title: `采样：得到「${OUTPUT[round]}」`, detail: round === OUTPUT.length - 1 ? '达到本例输出上限，请求结束。真实引擎此时释放引用；下图冻结在释放前，便于观察最后一个输出仍没有自己的 KV。' : `由末位置 logits 采样得到新 token「${OUTPUT[round]}」。它的 K / V 尚未计算，要等下一轮把它作为输入。` });
    }
    return frames;
  }

  function schedulerFrames(budget = 8) {
    if (![6, 8, 12].includes(budget)) throw new Error('Unsupported teaching budget');
    const specs = [
      { id: 'A', prompt: 10, maxOutput: 4, arrival: 0, color: 'orange' },
      { id: 'B', prompt: 6, maxOutput: 3, arrival: 0, color: 'mint' },
      { id: 'C', prompt: 5, maxOutput: 3, arrival: 3, color: 'blue' }
    ];
    const seqs = specs.map(s => ({ ...s, status: 'future', kv: 0, generated: 0, reserved: 0 }));
    const waiting = [], running = [], frames = [];
    const save = (round, phase, scheduled, text) => frames.push({ round, phase, scheduled: clone(scheduled), text, seqs: clone(seqs), waiting: waiting.map(s => s.id), running: running.map(s => s.id), budget });
    save(0, 'ready', [], 'A、B 即将到达；C 在第 4 轮开始前到达。每一轮重新选择 batch，不必等整个旧 batch 一起结束。');
    for (let round = 0; round < 50; round++) {
      for (const s of seqs) if (s.arrival === round) { s.status = 'waiting'; waiting.push(s); }
      const scheduled = [];
      let remaining = budget;
      while (waiting.length && scheduled.length < 3) {
        const s = waiting[0];
        const uncached = s.prompt - s.kv;
        if (!remaining || (remaining < uncached && scheduled.length)) break;
        if (!s.reserved) s.reserved = Math.ceil(s.prompt / BLOCK_SIZE) * BLOCK_SIZE;
        const n = Math.min(uncached, remaining);
        scheduled.push({ id: s.id, n, phase: 'P', firstSample: s.kv + n === s.prompt });
        remaining -= n;
        s.kv += n;
        if (s.kv === s.prompt) { waiting.shift(); s.status = 'running'; running.push(s); s.generated++; }
      }
      let phase = 'prefill';
      if (!scheduled.length) {
        phase = 'decode';
        for (const s of [...running]) {
          s.kv++;
          s.reserved = Math.ceil(s.kv / BLOCK_SIZE) * BLOCK_SIZE;
          s.generated++;
          scheduled.push({ id: s.id, n: 1, phase: 'D', firstSample: false });
          if (s.generated === s.maxOutput) { s.status = 'finished'; s.processed = s.kv; s.kv = 0; s.reserved = 0; running.splice(running.indexOf(s), 1); }
        }
      }
      let text = phase === 'prefill' ? '本轮只做 Prefill。已在 running 中的其他序列等待，不能在这一轮夹入 Decode。' : '本轮对每个入选 running 序列处理 1 个 token，再各采样 1 个新 token。';
      if (scheduled.some(x => x.phase === 'P' && !x.firstSample)) text += ' 首序列切成一块；提示词尚未读完，不产生对外输出。';
      if (scheduled.some(x => x.firstSample)) text += ' 完成提示词的序列会在本轮采样第 1 个输出。';
      if (seqs.some(s => s.status === 'finished' && scheduled.some(x => x.id === s.id))) text += ' 达到输出上限的序列随即退出并释放块引用。';
      save(round + 1, phase, scheduled, text);
      if (seqs.every(s => s.status === 'finished')) break;
    }
    return frames;
  }

  class TeachingBlockPool {
    constructor(count = 12) {
      this.blocks = Array.from({ length: count }, (_, id) => ({ id, refs: 0, key: null, values: [], written: 0 }));
      this.free = this.blocks.map(b => b.id);
      this.cache = new Map();
      this.sequences = {};
    }
    /* Exact prefix identity stands in for the repo's chained xxhash64 + token check. */
    keyFor(tokens, end) { return JSON.stringify(tokens.slice(0, end)); }
    allocate(name, tokens, reuse = true) {
      const count = Math.ceil(tokens.length / BLOCK_SIZE), table = [];
      let matched = 0;
      if (reuse) {
        for (let i = 0; i < count - 1; i++) {
          const key = this.keyFor(tokens, (i + 1) * BLOCK_SIZE);
          const id = this.cache.get(key);
          if (id === undefined) break;
          const b = this.blocks[id];
          if (!b.refs) this.free.splice(this.free.indexOf(id), 1);
          b.refs++;
          table.push(id);
          matched++;
        }
      }
      for (let i = matched; i < count; i++) {
        if (!this.free.length) throw new Error('Teaching pool exhausted');
        const id = this.free.shift(), b = this.blocks[id];
        if (b.key !== null && this.cache.get(b.key) === id) this.cache.delete(b.key);
        Object.assign(b, { refs: 1, key: null, values: [], written: 0 });
        table.push(id);
      }
      return this.sequences[name] = { name, tokens: [...tokens], table, cached: matched * BLOCK_SIZE, computed: 0, released: false };
    }
    compute(name) {
      const s = this.sequences[name];
      for (let i = s.cached / BLOCK_SIZE; i < s.table.length; i++) {
        const b = this.blocks[s.table[i]], values = s.tokens.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE);
        b.values = values;
        b.written = values.length;
        if (values.length === BLOCK_SIZE) { b.key = this.keyFor(s.tokens, (i + 1) * BLOCK_SIZE); this.cache.set(b.key, b.id); }
      }
      s.computed = s.tokens.length - s.cached;
    }
    release(name) {
      const s = this.sequences[name];
      for (const id of [...s.table].reverse()) {
        const b = this.blocks[id];
        b.refs--;
        if (!b.refs) this.free.push(id);
      }
      s.released = true;
      s.historicalCached = s.cached;
      s.cached = 0;
      s.table = [];
    }
    snapshot() { return { blocks: this.blocks.map(b => ({ ...clone(b), indexed: b.key !== null && this.cache.get(b.key) === b.id })), free: [...this.free], sequences: clone(this.sequences) }; }
  }

  function cacheFrames(variant = 'shared') {
    const prefix = ['你', '是', '一', '位', '耐', '心', '的', '助'];
    const a = [...prefix, '手', '。'];
    const b = variant === 'full' ? [...prefix, '手', '请', '解', '释'] : variant === 'miss' ? ['他', ...prefix.slice(1), '手', '！'] : [...prefix, '手', '！'];
    const sourceA = variant === 'full' ? [...b] : a;
    const pool = new TeachingBlockPool();
    const frames = [];
    const add = (title, detail, active, phase) => frames.push({ title, detail, active, phase, variant, ...pool.snapshot() });
    add('从空块池开始', '每个物理块提供 4 个 token 的 KV 槽位。块表把序列的逻辑位置映射到物理块；这里展示的是跨层 K / V 的抽象。', null, 'empty');
    pool.allocate('A', sourceA, false);
    add('A：先分配，再计算', `为 ${sourceA.length} 个提示 token 预分配 3 个块。轮到计算前，已分配不等于已写入 KV。`, 'A', 'allocate');
    pool.compute('A');
    add('A：写入 KV，登记完整块', '只对完整、已计算的块建立缓存身份。身份包含此前的前缀，不只是当前块的 4 个 token。', 'A', 'compute');
    pool.allocate('B', b);
    const matched = pool.sequences.B.cached;
    add('B：查前缀，建立自己的块表', variant === 'miss' ? '第 1 个 token 不同，首块就失配。匹配立即停止；即使后面的文字相同，也不能越过失配复用。' : variant === 'full' ? '两段提示词完全相同且共 12 个 token，但这版实现不查请求的最后一块：只复用前 8 个，最后 4 个仍需计算。' : '前 8 个 token 完全相同，B 直接引用 A 的两个完整前缀块；最后一块新分配。共享块的 ref_count 从 1 变为 2。', 'B', 'lookup');
    pool.compute('B');
    add(`B：只计算剩余 ${b.length - matched} 个 token`, '省下的是重复前缀的 Prefill 计算，不是缓存答案。B 仍须计算未缓存部分、产生 logits 并采样自己的输出。此实验只展开 KV 管理，未展示采样。', 'B', 'compute');
    pool.release('A');
    add('A 结束：释放引用，不伤害 B', '引用计数逐个减 1。B 仍引用的共享块继续保留；归零的块进入空闲队列，可被重新分配。', 'B', 'release');
    pool.release('B');
    add('B 结束：空闲，不等于已擦除', '引用计数为 0 的完整缓存块，仍可保留内容和缓存身份；以后可命中，也可能在重新分配时被淘汰。这不是跨进程的持久缓存。', null, 'retained');
    pool.allocate('C', b);
    add('C 到达：从空闲池重新命中', '同前缀的新请求可重新启用未被覆盖的缓存块。缓存块回到使用中；请求最后一块依然重新计算。', 'C', 'reuse');
    pool.compute('C');
    add('C：复用前缀，补齐尾部', `C 复用了 ${pool.sequences.C.cached} 个 token 的 KV，只计算剩余 ${b.length - pool.sequences.C.cached} 个。现在 C 的完整提示词 KV 已就绪；真实引擎接着采样并继续 Decode。`, 'C', 'complete');
    return frames;
  }
  const api = { BLOCK_SIZE, PROMPT, OUTPUT, journeyFrames, schedulerFrames, TeachingBlockPool, cacheFrames };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NanoLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
