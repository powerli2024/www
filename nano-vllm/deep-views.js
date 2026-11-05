/* Presentation only: every displayed numerical value comes from NanoDeep. */
(function (root) {
  'use strict';
  const D = root.NanoDeep;
  const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (x, precision = 3) => x === null || x === -Infinity ? '−∞' : Math.abs(x) < 1e-12 ? '0' : Number(x.toFixed(precision)).toLocaleString('en-US', { maximumFractionDigits: precision });
  const precise = x => x === 0 ? '0' : Math.abs(x) < 0.001 ? x.toExponential(4) : Number(x.toPrecision(7)).toString();
  const percent = x => x === 0 ? '0%' : x === 1 ? '100%' : x < 0.001 ? '<0.1%' : x > 0.999 ? '>99.9%' : `${num(x * 100, 1)}%`;
  const vec = v => `[${v.map(x => num(x)).join(', ')}]`;
  const bytes = n => n >= 1024 ** 3 ? `${num(n / 1024 ** 3, 2)} GiB` : n >= 1024 ** 2 ? `${num(n / 1024 ** 2, 2)} MiB` : `${num(n / 1024, 2)} KiB`;
  const source = (path, label) => `<a class="deep-source" href="${D.SOURCE}${path}" target="_blank" rel="noopener">${label} ↗</a>`;
  const note = (title, text, cls = '') => `<div class="deep-note ${cls}"><strong>${title}</strong><p>${text}</p></div>`;
  const stat = (label, value, small = '') => `<div class="deep-stat"><span>${label}</span><strong>${value}</strong>${small ? `<small>${small}</small>` : ''}</div>`;
  const formula = (eq, label = '') => `<div class="equation">${eq}${label ? `<small>${label}</small>` : ''}</div>`;
  const pill = (text, cls = '') => `<span class="deep-pill ${cls}">${text}</span>`;
  function matrix(title, rows, labels = [], active = -1, opts = {}) {
    const key = esc(`matrix-${title.replace(/<[^>]+>/g, '')}`);
    return `<div class="matrix-card"><div class="matrix-label"><strong>${title}</strong><span>${rows.length} × ${rows[0].length}</span></div><div class="matrix-scroll" tabindex="0" role="region" data-scroll="${key}" data-focus="${key}" aria-label="${esc(title.replace(/<[^>]+>/g, ''))} 数值矩阵，可横向滚动"><table class="number-matrix"><caption class="sr-only">${title}，${rows.length}行${rows[0].length}列</caption><thead><tr>${labels.length ? '<th scope="col">行 / 列</th>' : ''}${rows[0].map((_, j) => `<th scope="col">${opts.columns ? opts.columns[j] : `列${j}`}</th>`).join('')}</tr></thead><tbody>${rows.map((row, i) => `<tr class="${i === active ? 'active-row' : ''}">${labels[i] !== undefined ? `<th scope="row">${labels[i]}</th>` : ''}${row.map((x, j) => `<td class="${x === null ? 'masked-cell' : ''} ${opts.diagonal && i === j ? 'diagonal-cell' : ''}"${opts.weights && x !== null ? ` style="--weight:${Math.min(1, Math.max(0, x))}"` : ''}>${num(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }
  function bars(labels, values, options = {}) {
    const max = options.probability ? 1 : Math.max(...values.map(Math.abs), 1e-9);
    return `<div class="numeric-bars">${values.map((v, i) => `<div class="numeric-bar ${options.selected === i ? 'bar-selected' : ''}"><span>${labels[i]}</span><div class="bar-track"><i style="width:${100 * Math.abs(v) / max}%" class="${v < 0 ? 'negative' : ''}"></i></div><b>${options.probability ? esc(percent(v)) : num(v)}</b></div>`).join('')}</div>`;
  }
  function steps(names, active) {
    return `<div class="step-map" aria-label="本幕步骤">${names.map((name, i) => `<button data-step="${i}" data-focus="step-${i}" aria-label="第${i + 1}步：${name}" aria-current="${i === active ? 'step' : 'false'}" class="${i === active ? 'current' : i < active ? 'done' : ''}"><span>${i + 1}</span>${name}</button>`).join('')}</div>`;
  }
  const select = (id, key, title, options, value) => `<label class="deep-control">${title}<select id="${id}" data-setting="${key}">${options.map(([v, text]) => `<option value="${v}"${String(value) === String(v) ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
  const range = (id, key, title, min, max, step, value) => `<label class="deep-control range-control" for="${id}"><span>${title} <span class="control-value" id="${id}-value">${value}</span></span><input type="range" id="${id}" aria-label="${title}" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  const codeLenses = {
  "journey": {
    "path": "nanovllm/engine/scheduler.py",
    "start": 83,
    "end": 88,
    "lines": [
      "            self.block_manager.hash_blocks(seq)",
      "            seq.num_cached_tokens += seq.num_scheduled_tokens",
      "            seq.num_scheduled_tokens = 0",
      "            if is_prefill and seq.num_cached_tokens < seq.num_tokens:",
      "                continue",
      "            seq.append_token(token_id)"
    ],
    "why": "先把本轮已处理输入计入cached，再检查是否完成Prefill，最后才append新采样token。这几行直接说明“新输出暂时没有自己的KV”。"
  },
  "attention": {
    "path": "nanovllm/models/qwen3.py",
    "start": 77,
    "end": 88,
    "lines": [
      "        qkv = self.qkv_proj(hidden_states)",
      "        q, k, v = qkv.split([self.q_size, self.kv_size, self.kv_size], dim=-1)",
      "        q = q.view(-1, self.num_heads, self.head_dim)",
      "        k = k.view(-1, self.num_kv_heads, self.head_dim)",
      "        v = v.view(-1, self.num_kv_heads, self.head_dim)",
      "        if not self.qkv_bias:",
      "            q = self.q_norm(q)",
      "            k = self.k_norm(k)",
      "        q, k = self.rotary_emb(positions, q, k)",
      "        o = self.attn(q, k, v)",
      "        output = self.o_proj(o.flatten(1, -1))",
      "        return output"
    ],
    "why": "一次融合投影后切出Q/K/V，reshape各头，Q/K归一化与RoPE，再做attention和输出投影。网页的单头toy删掉了其中若干算子，不能当成完整Qwen3执行。"
  },
  "architecture": {
    "path": "nanovllm/models/qwen3.py",
    "start": 152,
    "end": 159,
    "lines": [
      "        if residual is None:",
      "            hidden_states, residual = self.input_layernorm(hidden_states), hidden_states",
      "        else:",
      "            hidden_states, residual = self.input_layernorm(hidden_states, residual)",
      "        hidden_states = self.self_attn(positions, hidden_states)",
      "        hidden_states, residual = self.post_attention_layernorm(hidden_states, residual)",
      "        hidden_states = self.mlp(hidden_states)",
      "        return hidden_states, residual"
    ],
    "why": "residual单独沿层传递；RMSNorm接受residual时融合相加，MLP输出又保留到下一次归一化。这就是概念残差式与函数调用边界不同的原因。"
  },
  "scheduler": {
    "path": "nanovllm/engine/scheduler.py",
    "start": 42,
    "end": 55,
    "lines": [
      "            if remaining < num_tokens and scheduled_seqs:  # only allow chunked prefill for the first seq",
      "                break",
      "            if not seq.block_table:",
      "                self.block_manager.allocate(seq, num_cached_blocks)",
      "            seq.num_scheduled_tokens = min(num_tokens, remaining)",
      "            num_batched_tokens += seq.num_scheduled_tokens",
      "            if seq.num_cached_tokens + seq.num_scheduled_tokens == seq.num_tokens:",
      "                seq.status = SequenceStatus.RUNNING",
      "                self.waiting.popleft()",
      "                self.running.append(seq)",
      "            scheduled_seqs.append(seq)",
      "",
      "        if scheduled_seqs:",
      "            return scheduled_seqs, True"
    ],
    "why": "剩余预算不足且已有序列被选中，就停止加入，而不把第二条请求切块；只要选到Prefill，立即return，尚未进入后面的Decode分支。"
  },
  "cache": {
    "path": "nanovllm/engine/block_manager.py",
    "start": 62,
    "end": 68,
    "lines": [
      "        for i in range(seq.num_blocks - 1):",
      "            token_ids = seq.block(i)",
      "            h = self.compute_hash(token_ids, h)",
      "            block_id = self.hash_to_block_id.get(h, -1)",
      "            if block_id == -1 or self.blocks[block_id].token_ids != token_ids:",
      "                break",
      "            num_cached_blocks += 1"
    ],
    "why": "循环停在num_blocks−1之前，所以请求最后一块不查询。哈希串接前缀；找到的块还比较token内容，遇到失配立刻break，不能跳着复用。再从计算依赖理解：这份KV没有保存末位置hidden或logits，仅凭它，即使前缀全部命中也不能直接得到下一token分布。本实现不复用最后一块、重新计算其实际输入，再用末位置hidden得到logits；这不意味着所有引擎都必须排除整块。"
  },
  "preemption": {
    "path": "nanovllm/engine/scheduler.py",
    "start": 75,
    "end": 79,
    "lines": [
      "    def preempt(self, seq: Sequence):",
      "        seq.status = SequenceStatus.WAITING",
      "        seq.is_prefill = True",
      "        self.block_manager.deallocate(seq)",
      "        self.waiting.appendleft(seq)"
    ],
    "why": "抢占改变状态、释放块引用、放回waiting队首；没有删除token_ids或重置已生成长度。后续若缓存已被覆盖，重新Prefill当前序列。"
  },
  "performance": {
    "path": "nanovllm/engine/model_runner.py",
    "start": 110,
    "end": 115,
    "lines": [
      "        num_kv_heads = hf_config.num_key_value_heads // self.world_size",
      "        head_dim = getattr(hf_config, \"head_dim\", hf_config.hidden_size // hf_config.num_attention_heads)",
      "        block_bytes = 2 * hf_config.num_hidden_layers * self.block_size * num_kv_heads * head_dim * hf_config.dtype.itemsize",
      "        config.num_kvcache_blocks = int(total * config.gpu_memory_utilization - used - peak + current) // block_bytes",
      "        assert config.num_kvcache_blocks > 0",
      "        self.kv_cache = torch.empty(2, hf_config.num_hidden_layers, config.num_kvcache_blocks, self.block_size, num_kv_heads, head_dim)"
    ],
    "why": "num_kv_heads先除TP，block_bytes同时包含K/V、层数、块大小、KV头、head_dim和dtype字节。池容量按预算向下取整；这不等于真实请求已写入的有效KV。"
  },
  "kernels": {
    "path": "nanovllm/layers/attention.py",
    "start": 62,
    "end": 74,
    "lines": [
      "        if k_cache.numel() and v_cache.numel():",
      "            store_kvcache(k, v, k_cache, v_cache, context.slot_mapping)",
      "        if context.is_prefill:",
      "            if context.block_tables is not None:    # prefix cache",
      "                k, v = k_cache, v_cache",
      "            o = flash_attn_varlen_func(q, k, v,",
      "                                       max_seqlen_q=context.max_seqlen_q, cu_seqlens_q=context.cu_seqlens_q,",
      "                                       max_seqlen_k=context.max_seqlen_k, cu_seqlens_k=context.cu_seqlens_k,",
      "                                       softmax_scale=self.scale, causal=True, block_table=context.block_tables)",
      "        else:    # decode",
      "            o = flash_attn_with_kvcache(q.unsqueeze(1), k_cache, v_cache,",
      "                                        cache_seqlens=context.context_lens, block_table=context.block_tables, ",
      "                                        softmax_scale=self.scale, causal=True)"
    ],
    "why": "nano-vLLM先调用自己的store_kvcache，再调用FlashAttention API；参数里同时有causal=True和block_table，说明分页布局可以和FlashAttention共存。 在线softmax的m/ℓ/u算法由依赖中的FlashAttention内核实现；这里是调用接口，不是本仓逐行实现该算法。"
  },
  "graph": {
    "path": "nanovllm/engine/model_runner.py",
    "start": 204,
    "end": 212,
    "lines": [
      "            graph_vars[\"input_ids\"][:bs] = input_ids",
      "            graph_vars[\"positions\"][:bs] = positions",
      "            graph_vars[\"slot_mapping\"].fill_(-1)",
      "            graph_vars[\"slot_mapping\"][:bs] = context.slot_mapping",
      "            graph_vars[\"context_lens\"].zero_()",
      "            graph_vars[\"context_lens\"][:bs] = context.context_lens",
      "            graph_vars[\"block_tables\"][:bs, :context.block_tables.size(1)] = context.block_tables",
      "            graph.replay()",
      "            return self.model.compute_logits(graph_vars[\"outputs\"][:bs])"
    ],
    "why": "本轮input_ids、positions、slot_mapping等写入捕获用缓冲，再replay。compute_logits在replay之后单独调用；sampler还在run函数后续执行。"
  },
  "tensor": {
    "path": "nanovllm/layers/linear.py",
    "start": 152,
    "end": 156,
    "lines": [
      "    def forward(self, x: torch.Tensor) -> torch.Tensor:",
      "        y = F.linear(x, self.weight, self.bias if self.tp_rank == 0 else None)",
      "        if self.tp_size > 1:",
      "            dist.all_reduce(y)",
      "        return y"
    ],
    "why": "每卡F.linear只贡献一部分；当TP>1就all_reduce。数学上是对输入分片的局部乘积求和，不是把结果拼起来。"
  },
  "practice": {
    "path": "nanovllm/sampling_params.py",
    "start": 5,
    "end": 11,
    "lines": [
      "class SamplingParams:",
      "    temperature: float = 1.0",
      "    max_tokens: int = 64",
      "    ignore_eos: bool = False",
      "",
      "    def __post_init__(self):",
      "        assert self.temperature > 1e-10, \"greedy sampling is not permitted\""
    ],
    "why": "示例参数必须满足真实接口的断言。特别是temperature>1e−10，不支持以0触发greedy；ignore_eos与max_tokens也会改变输出工作量。"
  },
  "rope": {
    "path": "nanovllm/layers/rotary_embedding.py",
    "start": 11,
    "end": 14,
    "lines": [
      "    x1, x2 = torch.chunk(x.float(), 2, dim=-1)",
      "    y1 = x1 * cos - x2 * sin",
      "    y2 = x2 * cos + x1 * sin",
      "    return torch.cat((y1, y2), dim=-1).to(x.dtype)"
    ],
    "why": "将head维度切成两半配对，按cos/sin做旋转；真实实现还在forward中按positions取频率。下方是旋转公式本身，不是对V的变换。"
  },
  "heads": {
    "path": "nanovllm/models/qwen3.py",
    "start": 29,
    "end": 39,
    "lines": [
      "        tp_size = dist.get_world_size()",
      "        self.total_num_heads = num_heads",
      "        assert self.total_num_heads % tp_size == 0",
      "        self.num_heads = self.total_num_heads // tp_size",
      "        self.total_num_kv_heads = num_kv_heads",
      "        assert self.total_num_kv_heads % tp_size == 0",
      "        self.num_kv_heads = self.total_num_kv_heads // tp_size",
      "        self.head_dim = head_dim or hidden_size // self.total_num_heads",
      "        self.q_size = self.num_heads * self.head_dim",
      "        self.kv_size = self.num_kv_heads * self.head_dim",
      "        self.scaling = self.head_dim ** -0.5"
    ],
    "why": "显式head_dim优先，否则才回退hidden_size/heads。Q头和KV头各自必须整除TP；图中的无效组合正对应这两个assert。"
  },
  "column": {
    "path": "nanovllm/layers/linear.py",
    "start": 62,
    "end": 70,
    "lines": [
      "        tp_size = dist.get_world_size()",
      "        super().__init__(input_size, divide(output_size, tp_size), bias, 0)",
      "",
      "    def weight_loader(self, param: nn.Parameter, loaded_weight: torch.Tensor):",
      "        param_data = param.data",
      "        shard_size = param_data.size(self.tp_dim)",
      "        start_idx = self.tp_rank * shard_size",
      "        loaded_weight = loaded_weight.narrow(self.tp_dim, start_idx, shard_size)",
      "        param_data.copy_(loaded_weight)"
    ],
    "why": "构造时把输出特征数除TP；加载时沿tp_dim=0切PyTorch的[out,in]权重，所以数学右乘记法对应W的输出列分片。"
  },
  "logits": {
    "path": "nanovllm/layers/embed_head.py",
    "start": 56,
    "end": 66,
    "lines": [
      "    def forward(self, x: torch.Tensor):",
      "        context = get_context()",
      "        if context.is_prefill:",
      "            last_indices = context.cu_seqlens_q[1:] - 1",
      "            x = x[last_indices].contiguous()",
      "        logits = F.linear(x, self.weight)",
      "        if self.tp_size > 1:",
      "            all_logits = [torch.empty_like(logits) for _ in range(self.tp_size)] if self.tp_rank == 0 else None",
      "            dist.gather(logits, all_logits, 0)",
      "            logits = torch.cat(all_logits, -1) if self.tp_rank == 0 else None",
      "        return logits"
    ],
    "why": "Prefill先抽取每条序列的最后输入位置，再投影成词表logits。TP词表分片会gather到rank0；这还不是采样完成后的token。"
  },
  "decode": {
    "path": "nanovllm/engine/model_runner.py",
    "start": 177,
    "end": 181,
    "lines": [
      "        for seq in seqs:",
      "            input_ids.append(seq.last_token)",
      "            positions.append(len(seq) - 1)",
      "            context_lens.append(len(seq))",
      "            slot_mapping.append(seq.block_table[-1] * self.block_size + seq.last_block_num_tokens  - 1)"
    ],
    "why": "每个decode请求仅取last_token作为新输入；位置使用len(seq)−1，context_lens却保留整个可见长度。只输入1个token，不等于只读1个token的KV。"
  },
  "rms": {
    "path": "nanovllm/layers/layernorm.py",
    "start": 21,
    "end": 24,
    "lines": [
      "        x = x.float()",
      "        var = x.pow(2).mean(dim=-1, keepdim=True)",
      "        x.mul_(torch.rsqrt(var + self.eps))",
      "        x = x.to(orig_dtype).mul_(self.weight)"
    ],
    "why": "rms_forward先在float中求平方均值，再乘倒平方根，最后乘可学习weight（公式中的γ）。没有减去均值。此处显示该函数的关键语句，完整上下文在源码链接。"
  },
  "swiglu": {
    "path": "nanovllm/layers/activation.py",
    "start": 9,
    "end": 11,
    "lines": [
      "    def forward(self, x: torch.Tensor) -> torch.Tensor:",
      "        x, y = x.chunk(2, -1)",
      "        return F.silu(x) * y"
    ],
    "why": "融合的gate_up投影结果拆成两半，对gate做SiLU后与up逐元素相乘。后续down_proj回投在Qwen3MLP.forward中；此处只显示激活/门控关键片段。"
  },
  "sampler": {
    "path": "nanovllm/layers/sampler.py",
    "start": 8,
    "end": 12,
    "lines": [
      "    def forward(self, logits: torch.Tensor, temperatures: torch.Tensor):",
      "        logits = logits.float().div_(temperatures.unsqueeze(dim=1))",
      "        probs = torch.softmax(logits, dim=-1)",
      "        sample_tokens = probs.div_(torch.empty_like(probs).exponential_(1).clamp_min_(1e-10)).argmax(dim=-1)",
      "        return sample_tokens"
    ],
    "why": "真实sampler先按温度缩放，再按词表softmax；之后用指数随机变量的竞争实现分类抽样。最后的argmax作用于带随机数的probs/exponential，而不是原始logits，因此不能称为greedy。网页用固定u的CDF展示同一分类分布，不复刻此内核。"
  }
};
  function sourceLens(mode, frame, state = {}) {
    let key = mode;
    if (mode === 'architecture') key = ({ 1: 'rms', 2: 'rope', 3: 'heads', 4: 'swiglu', 6: 'performance' })[frame.step] || mode;
    if (mode === 'attention') key = frame.step === 7 ? 'sampler' : frame.step === 8 ? 'decode' : mode;
    if (mode === 'tensor') key = frame.step <= 1 ? 'heads' : frame.step === 2 ? 'column' : frame.step === 4 ? 'logits' : mode;
    if (mode === 'kernels' && (frame.kind || state.kernel) === 'graph') key = 'graph';
    const c = codeLenses[key];
    if (!c) return '';
    return `<details class="deep-details source-lens" data-detail="source-lens"><summary>对照真实源码：${c.path.split('/').pop()} · ${c.start ? `L${c.start}—L${c.end}` : '关键片段'}</summary><p>${c.why}</p><pre class="source-code" tabindex="0" role="region" data-scroll="source-code" data-focus="source-code" aria-label="冻结源码片段，可横向滚动"><code>${c.lines.map((line, i) => `<span class="source-line">${c.start ? `<i aria-hidden="true">${c.start + i}</i>` : ''}${esc(line)}</span>`).join('')}</code></pre>${source(c.start ? `${c.path}#L${c.start}-L${c.end}` : c.path, '打开固定提交中的源文件')}<p class="source-license">原代码 © 2025 Xingkai Yu · MIT License。相关真实源码，不表示整段代码在当前动画帧同时执行；网页不执行这些Python/GPU算子。</p></details>`;
  }
  const chapters = {
    attention: { number: '02', kicker: '把一个 token 的预测，完整算一次', title: '从编号，到注意力，再到下一个词。', takeaway: 'Attention 输出是向量，不是答案。', text: '先在可见位置上做 attention softmax，得到加权内容；再经网络与词表投影，把 logits 转成下一个 token 的分布。两次 softmax 的轴和目的不同。', footnote: '4项手工词表 · 单头、dₖ=2 · 无训练 · 所有数值实时计算 · 不是Qwen3权重或完整Transformer', next: '下一幕：补齐真实 Transformer' },
    architecture: { number: '03', kicker: '把 toy 的省略，一项项补回来', title: '小数字讲数学，真实维度看 Qwen3。', takeaway: '数学结构相同，不能混用尺度。', text: '真实Qwen3-0.6B有28层、16个Q头、8个KV头和128维head。二维旋转、2→3→2 MLP是演算样例；它们帮你理解算子，不替代真实模型。', footnote: '模型配置固定到官方revision c1899de · 源码固定bb823b3 · 未加载权重 · toy代数与真实配置明确分开', next: '下一幕：让请求轮流上场' },
    preemption: { number: '06', kicker: '显存不够时，完整追踪一条请求', title: '让出 KV，不等于忘记已生成的字。', takeaway: '抢占保留 token，必要时重建 KV。', text: 'B被放回waiting后仍有原提示和已生成输出；释放的物理块可能被覆盖。恢复时重新Prefill当前序列，继续原输出计数，不是从头重启请求。', footnote: '冻结Python源码CPU元数据trace · 4 token/块、3块、2请求 · 模拟token ID代替GPU输出 · 不是GPU执行轨迹', next: '下一幕：算一笔显存与算力账' },
    performance: { number: '07', kicker: '先说清单位、分母和假设', title: '容量、流量、计算量，分开算。', takeaway: '批量摊薄权重，不会消除历史。', text: '更多输入可复用共同权重，但每条请求的KV随上下文增长。瓶颈取决于计算强度、硬件、内核、通信与工作负载，不能把某个阶段永久贴成“算力”或“带宽”受限。', footnote: '假想结构P≈10亿密集线性权重、L24、Hq16、Hkv4、d64、每元素2B · 理想账本，非Qwen配置、非实测', next: '下一幕：三个优化层次' },
    kernels: { number: '08', kicker: '数学、内存布局、发射方式，不在同一层', title: 'Flash、Paging、Graph，各管哪件事？', takeaway: '可以协作，不是三选一。', text: 'FlashAttention减少attention中间矩阵的IO；分页式KV组织不连续内存；CUDA Graph减少适用路径的重复发射。它们不缓存同一种东西，也不互相替代。', footnote: 'tile 2×2为教学示意 · online softmax实际数值演算 · 无kernel计时 · 本仓调用FlashAttention API', next: '下一幕：同一层，分给多张卡' },
    tensor: { number: '09', kicker: '先看张量怎么切，再谈多卡快不快', title: 'GQA 是共享头，TP 是拆分工作。', takeaway: '有些局部结果要相加，不能拼起来。', text: '列并行拆输出特征；行并行的局部乘积需要求和。该版本要求Q头与KV头都能整除TP，不会为不合法的组合自动复制KV头。更多GPU仍有同步和通信代价。', footnote: '8个Q头的结构示意 · 分片示例不改真实模型 · 2-rank代数例子独立于上方TP选择 · 未执行NCCL或多卡', next: '下一幕：把理解变成实验' },
    practice: { number: '10', kicker: '离开动画后，能自己提出和验证预测', title: '可复现，不只是“跑出一个数字”。', takeaway: '先证正确，再测快慢。', text: '固定源码与环境，区分初始化、预热和稳态；说明测量边界、分子、分母。这个页面通过CPU/静态检查不代表真实CUDA环境已经跑通。', footnote: '示例脚本已做语法与源码API检查 · GPU运行未验证 · 浏览器视觉验收按用户要求取消 · 不上传输入、不调用模型', next: '回到第一幕，把整条链连起来' }
  };
  const checks = {
    attention: { question: '被因果mask挡住的位置，应该怎样进入softmax？', choices: ['把分数写成0', '排除或写成−∞'], correct: 1, feedback: 'exp(0)=1，不会消失。把未来位置设为−∞后，权重才严格为0。', frame: 4 },
    architecture: { question: 'Qwen3-0.6B 的 head_dim 是多少？', choices: ['1024÷16=64', '配置明确指定128'], correct: 1, feedback: '显式head_dim=128优先；16个Q头合并后宽2048，输出投影再回到hidden_size=1024。', frame: 3 },
    preemption: { question: 'B抢占前已输出1个token，恢复时重新Prefill多少？', choices: ['仅原提示4个', '当前序列5个'], correct: 1, feedback: '当前序列包含原提示4个和已生成1个；缓存被覆盖后必须重建这5个的KV，输出计数继续。', frame: 8 },
    performance: { question: 'KV容量公式里，head数用哪一个？', choices: ['Q head数 Hq', 'KV head数 Hkv'], correct: 1, feedback: 'GQA共享KV头，缓存实际只存Hkv份K/V；attention的query工作量仍与Hq有关。', frame: 3 },
    kernels: { question: 'CUDA Graph 的 replay 重放什么？', choices: ['上轮答案', 'GPU操作序列，用新输入算'], correct: 1, feedback: '输入缓冲每轮更新，仍执行模型计算。该实现捕获self.model，不含LM head和sampler。', frame: 2 },
    tensor: { question: 'Hq=8、Hkv=2、TP=4 在此源码中能运行吗？', choices: ['会复制KV heads', '不合法，整除断言失败'], correct: 1, feedback: 'Hkv也必须能被TP整除。本版本没有KV heads不足时的自动复制兜底。', frame: 1 },
    practice: { question: '一次离线generate整批总耗时，能直接得到TTFT吗？', choices: ['能，总耗时除输出数', '不能，需要首token时刻'], correct: 1, feedback: '总耗时只能配合明确数量计算整批吞吐。TTFT和逐token间隔必须在合适边界单独记录。', frame: 3 }
  };
  function options(mode, s) {
    if (mode === 'attention') return select('query', 'query', '观察query行', [[0, '0 · 我'], [1, '1 · 爱'], [2, '2 · 学']], s.query) + select('embedding', 'embedding', '「学」向量第3维', [[0, '0'], [.5, '0.5'], [1, '1'], [1.5, '1.5']], s.embedding) + range('temperature', 'temperature', '采样温度 T', .2, 2, .1, s.temperature) + range('draw', 'draw', '固定抽样数 u', 0, .99, .01, s.draw);
    if (mode === 'architecture') return select('position', 'position', 'RoPE的Q位置 m', Array.from({ length: 7 }, (_, i) => [i, `${i} · ${i * 30}°`]), s.position) + select('inputGain', 'inputGain', 'Norm输入倍数', [[.5, '0.5×'], [1, '1×'], [2, '2×']], s.inputGain);
    if (mode === 'performance') return select('phase', 'phase', '阶段', [['decode', 'Decode：每请求1个新输入'], ['prefill', 'Prefill：无缓存整段输入']], s.phase) + select('batch', 'batch', '请求数 B', [1, 4, 16, 32].map(x => [x, `${x} 条`]), s.batch) + select('context', 'context', '可见长度 T（含本轮输入）', [128, 512, 2048, 8192].map(x => [x, `${x} token/请求`]), s.context);
    if (mode === 'kernels') return select('kernel', 'kernel', '选择机制', [['flash', 'FlashAttention · 计算IO'], ['paging', 'Paged KV · 物理地址'], ['graph', 'CUDA Graph · 发射开销']], s.kernel);
    if (mode === 'tensor') return select('kvHeads', 'kvHeads', 'KV头数 Hkv', [[2, '2 · GQA 4:1'], [4, '4 · GQA 2:1'], [8, '8 · MHA 1:1']], s.kvHeads) + select('tp', 'tp', 'TP rank数', [1, 2, 4, 8].map(x => [x, `${x} rank`]), s.tp);
    return `<span class="deep-options-note">${mode === 'preemption' ? 'A：8输入/4输出 · B：4输入/3输出' : '不连接GPU · 只给可复核的实验路径'}</span>`;
  }
  function getFrames(mode, s) {
    return mode === 'attention' ? D.attentionFrames(s) : mode === 'architecture' ? D.architectureFrames(s) : mode === 'preemption' ? D.preemptionFrames() : mode === 'performance' ? D.performanceFrames(s) : mode === 'kernels' ? D.kernelFrames(s) : mode === 'tensor' ? D.tensorFrames(s) : D.practiceFrames();
  }
  function attention(f) {
    const m = f.math, a = m.active, labels = m.ids.map((id, i) => `${i}·${m.tokens[id]}`), ribbons = ['编号', 'Embedding', 'Q/K/V', '点积', 'Mask', 'Softmax', '加权V', '词表采样', 'KV复用'];
    let h = steps(ribbons, f.step) + `<div class="symbol-key" aria-label="本幕符号定义"><span>原始N=3 输入位置</span><span>D=3 输入向量维度</span><span>dₖ=dᵥ=2 单头宽度</span><span>|词表|=4</span><span>i=query行 · j=key列</span><span>显示约3位小数，计算保留完整精度；≈表示近似</span></div><p class="parameter-hint">query只切换观察行；向量会改变数值链；温度与u只作用第8步词表采样及第9步追加，不会改变attention权重。</p>`;
    if (f.step === 0) h += `<div class="token-story"><div>${m.ids.map((id, i) => `<div class="token-id"><strong>${m.tokens[id]}</strong><span>token ID ${id}</span><small>位置 ${i}</small></div>`).join('<span class="story-arrow">→</span>')}</div>${note('ID 是地址，不是量值', 'ID 2并不是ID 1的“两倍语义”。真实tokenizer可能将一个汉字切成多个token；这4项词表只供手算。')}</div>`;
    if (f.step === 1) h += `<div class="deep-grid two">${matrix('E · 词表向量', m.E, m.tokens.map((t, i) => `${i}·${t}`), 2)}${matrix('X = E[[0,1,2]]', m.X, labels, 2)}</div>${formula('ID [0,1,2] → 查表 → X[3×3]', '每个输入位置得到一个3维向量；不是把ID直接送进点积。')}`;
    if (f.step === 2) h += `<div class="projection-grid">${[['Q', m.Wq, m.Q], ['K', m.Wk, m.K], ['V', m.Wv, m.V]].map(([name, w, out]) => `<div>${matrix(`W_${name}`, w)}<div class="matrix-flow">X[3×3] × W_${name}[3×2] ↓</div>${matrix(name, out, labels, m.query)}</div>`).join('')}</div>${formula(`例如 q₂ = [1, 1, ${m.gain}] × W_Q = ${vec(m.Q[2])}`, '每个输出分量 = 输入行与W对应列逐项相乘后求和。')}<details class="deep-details" data-detail="q-projection"><summary>把这一行完整展开：没有省掉的乘加</summary>${formula(`q₂[0] = 1×1 + 1×0 + ${m.gain}×1 = ${num(m.Q[2][0])}<br>q₂[1] = 1×0 + 1×1 + ${m.gain}×1 = ${num(m.Q[2][1])}`)}<p>矩阵乘法不是对应位置逐元素相乘。X每行是一个token位置，W每列定义一个输出特征；内维3相等，结果有3行×2列。这里使用数学右乘XW；PyTorch Linear权重按[out,in]储存，其调用等价于XWᵀ（若用PyTorch变量名W）。</p></details>`;
    if (f.step === 3) h += `<div class="deep-grid two">${matrix(`选中 q_${m.query}`, [m.Q[m.query]])}<div>${m.K.map((k, j) => `<div class="dot-line"><span>q_${m.query} · k_${j}</span><strong>${m.Q[m.query].map((x, n) => `${num(x)}×${num(k[n])}`).join(' + ')} = ${num(a.raw[j])}</strong><small>÷√2 ≈ ${num(a.scaled[j])}</small></div>`).join('')}</div></div>${note('为什么除以√d？', '若q/k分量近似独立、均值0、方差1，点积方差随d增长；除以√d把这个尺度拉回。它是尺度控制，不把分数直接变成概率。')}`;
    if (f.step === 4) h += `<div class="deep-grid two">${matrix('缩放后分数 QKᵀ/√2', m.rows.map(r => r.scaled), labels, m.query, { columns: ['k₀·我', 'k₁·爱', 'k₂·学'] })}${matrix('加上 causal mask', m.rows.map(r => r.masked), labels, m.query, { diagonal: true, columns: ['k₀·我', 'k₁·爱', 'k₂·学'] })}</div>${note('读图：行是 query，列是 key', `当前选择位置 ${m.query}。只保留 j≤${m.query}；对角线表示“可以看自己”。改变未来「学」的向量，位置0、1的输出不会受影响。`)}<details class="deep-details" data-detail="rectangular-mask"><summary>有缓存的chunk：矩形mask怎样对齐？</summary><p>已有C=3个缓存token，新chunk Q=2：第0个新query处于绝对位置3，可看key 0…3；第1个处于位置4，可看0…4。规则是 j≤C+i，而不是重新从 j≤i 开始。</p>${matrix('C=3，Q=2 · 1可见/−∞遮挡', [[1, 1, 1, 1, null], [1, 1, 1, 1, 1]], ['pos3', 'pos4'])}</details>`;
    if (f.step === 5) {
      const mx = Math.max(...a.masked.filter(x => x !== null)), ex = a.masked.map(x => x === null ? 0 : Math.exp(x - mx)), sum = ex.reduce((s, x) => s + x, 0);
      h += `<div class="deep-grid two"><div>${formula(`m = max(可见分数) ≈ ${num(mx)}`)}${matrix('分数 s', [a.masked])}${matrix('exp(s−m)', [ex])}${formula(`分母 Σexp(s−m) ≈ ${num(sum)}`)}</div><div>${bars(labels, a.weights, { probability: true })}${stat('归一化检查', `Σa = ${num(a.weights.reduce((s, x) => s + x, 0), 8)}`, '不是按词表归一化，而是按可见key位置')}</div></div>${note('稳定，不是近似', '所有指数同时乘exp(−m)，分子分母同乘，比例不变。即使原分数很大，也不必先算可能溢出的exp(s)。')}`;
    }
    if (f.step === 6) h += `<div class="deep-grid two"><div>${matrix('V · 被读取的内容', m.V, labels)}${bars(labels, a.weights, { probability: true })}</div><div>${a.output.map((v, dim) => formula(`o_${m.query}[${dim}] ≈ ${a.weights.map((w, j) => `${num(w)}×${num(m.V[j][dim])}`).join(' + ')} ≈ ${num(v)}`)).join('')}${stat(`当前位置输出 o_${m.query}`, vec(a.output), '这是二维向量，不是某个token ID')}</div></div>`;
    if (f.step === 7) {
      let cumulative = 0;
      h += `<div class="deep-grid two"><div>${matrix('末位置 o₂', [m.rows[2].output])}${matrix('手工词表投影 W_out', m.Wo, ['维度0', '维度1'], -1, { columns: m.tokens })}${formula(`logits = o₂ × W_out ≈ ${vec(m.logits)}`, '无论上方选择哪一行观察，续写都只用末位置。')}</div><div>${bars(m.tokens, m.probabilities, { probability: true, selected: m.picked })}<div class="cdf-strip" aria-label="词表概率累积区间">${m.probabilities.map((p, i) => { const start = cumulative; cumulative += p; return `<span style="width:${100 * p}%" title="${m.tokens[i]}：[${precise(start)},${precise(cumulative)})，p=${precise(p)}">${m.tokens[i]}</span>`; }).join('')}<i style="left:${m.u * 100}%" aria-hidden="true"></i></div>${formula(`softmax(logits / ${num(m.temperature)})`, `u=${num(m.u)} 落入「${m.tokens[m.picked]}」的累积概率区间；该项p≈${precise(m.probabilities[m.picked])}`)}</div></div>${note('这个“抽样”可重复', 'u是你亲手调的[0,1)数；真实分类抽样用随机数。本例不执行nano-vLLM sampler内核，只演示分布与抽样规则。此处T表示采样温度，不是输入长度。')}<details class="deep-details" data-detail="argmax"><summary>分类抽样与argmax究竟差在哪？</summary><div class="deep-stats">${stat('argmax(logits)', `「${m.tokens[m.logits.indexOf(Math.max(...m.logits))]}」`, '确定性选最大值；不使用u')}${stat('本次分类抽样', `「${m.tokens[m.picked]}」`, '按概率区间选择，低概率项也可能被选中')}</div><p>对任意正温度，除以T不改变logits排序，因此argmax不变；但概率会变，固定u可能落入不同区间。T→0⁺时分布集中于最大值（有并列最大值时不只一个）；有限低温不严格等同于argmax，也不保证更正确。nano-vLLM这个冻结版本要求temperature>10⁻¹⁰，没有用temperature=0启用greedy的接口。</p></details>`;
    }
    if (f.step === 8) h += `<div class="deep-grid two">${matrix(`旧K保留，末行追加「${m.tokens[m.reuse.appendedId]}」`, m.reuse.appendedK, ['我·保留', '爱·保留', '学·保留', `${m.tokens[m.reuse.appendedId]}·新写`], 3)}<div>${stat('整段4行重算的最后输出', vec(m.reuse.full))}${stat('保留3行KV，只算新query', vec(m.reuse.incremental))}<div class="proof-pass">数值最大差：${num(m.reuse.newOutputMaxDiff)}<br>旧三行attention输出变化：${num(m.reuse.oldOutputMaxDiff)}</div></div></div>${note('为什么可以从一层推广到所有层？', '因果mask让旧位置的attention不读未来；RMSNorm、MLP逐位置计算，残差也只合并同一位置。所以固定权重、前缀与位置规则时，可按层归纳：旧隐藏状态和旧K/V都不变。')}<details class="deep-details" data-detail="cache-proof"><summary>把“按层归纳”的三步写完整</summary><ol><li>基例：旧token与位置都不变，所以旧位置的embedding输入不变。</li><li>假设：第ℓ层的旧隐藏状态不变，则同一固定权重产生的旧Q/K/V（含相同位置处理）不变。</li><li>推进：旧query只读旧前缀；attention、逐位置Norm/MLP与残差得到的第ℓ+1层旧状态也不变。逐层重复，所有旧层KV都可沿用。</li></ol><p>改变旧token、模型参数、位置或可见性规则，会破坏这些前提。这是数学依赖证明；不同浮点kernel或计算顺序可有舍入差异，不能承诺与另一条完整重算路径逐位相同。</p></details>`;
    return h + `<div class="evidence-rail">${source('nanovllm/models/qwen3.py#L72-L88', '真实QKV路径')}${source('nanovllm/layers/attention.py#L59-L75', '因果attention')}${source('nanovllm/layers/sampler.py', '实际采样器')}</div>`;
  }
  function architecture(f) {
    const m = f.model, r = m.rope, p = m.mlp;
    let h = steps(['真实层', 'RMSNorm', 'RoPE', '维度', 'SwiGLU', '残差', '全层KV'], f.step) + '<p class="parameter-hint">位置控件作用于RoPE，输入倍数作用于RMSNorm；两者都是独立toy，不改变真实模型配置。</p>';
    if (f.step === 0 || f.step === 5) h += `<div class="layer-diagram"><div class="layer-track">${['hidden h [D]', 'RMSNorm', 'Q/K/V投影', 'Q/K Norm + RoPE', 'GQA attention', 'W_O投影', '+ 残差 h', 'RMSNorm', 'SwiGLU MLP', '+ 残差 h₁'].map((s, i) => `<div class="layer-node ${[f.step === 0 ? 4 : 6, f.step === 0 ? 8 : 9].includes(i) ? 'lit' : ''}"><span>${String(i + 1).padStart(2, '0')}</span>${s}</div>`).join('')}</div><aside>${stat('重复层数', '28', '固定 Qwen3-0.6B 配置')}${stat('残差宽度 D', '1,024')}${note('不是只堆attention', '位置间的信息混合由attention负责；MLP在每个位置做非线性特征变换。两条残差路径保持共同的hidden维度。')}</aside></div>${f.step === 5 ? formula('h₁ = h + Attn(Norm(h))<br>h₂ = h₁ + MLP(Norm(h₁))', '概念等价式；源码为了融合算子，将部分相加推迟到下一次RMSNorm调用。') : note('前一幕明确省略了这些', '没有Q/K归一化、RoPE、多头、W_O回投、残差、多层与MLP；其W_out只是4项词表投影，不能与真实attention的W_O混为一谈。')}`;
    if (f.step === 1) h += `<div class="deep-grid two"><div>${matrix('toy x', [m.x])}${formula(`mean(x²) = ${num(m.norm.meanSquare)}<br>√(mean(x²)+ε) = ${num(m.norm.denominator, 6)}`)}${matrix('RMSNorm(x), γ全1', [m.norm.output])}</div><div>${bars(['维度0', '维度1', '维度2', '维度3'], m.norm.output)}${note('试试把输入翻倍', 'γ不变、ε很小时，归一化后的尺度近似不变。它不减均值，也不是把每个向量变成概率分布。')}</div></div>`;
    if (f.step === 2) {
      const point = (v, scale = 72) => [160 + v[0] * scale, 150 - v[1] * scale];
      const q = point(r.rotatedQ), k = point(r.rotatedK);
      h += `<div class="deep-grid two"><div class="rope-plot"><svg viewBox="0 0 320 290" role="img" aria-label="二维RoPE示意：Q从0度旋转${m.position * 30}度；K从45度旋转30度到75度；旋转不改变向量长度"><circle cx="160" cy="150" r="72"/><circle cx="160" cy="150" r="102"/><path d="M20 150H300 M160 18V274" class="axes"/><line x1="160" y1="150" x2="${q[0]}" y2="${q[1]}" class="q-vector"/><circle cx="${q[0]}" cy="${q[1]}" r="5" class="q-dot"/><line x1="160" y1="150" x2="${k[0]}" y2="${k[1]}" class="k-vector"/><circle cx="${k[0]}" cy="${k[1]}" r="5" class="k-dot"/></svg><div class="rope-legend"><span>Q位置${m.position} · 从0°旋转${m.position * 30}°</span><span>K位置1 · 从45°旋转30°到75°</span></div></div><div>${formula(`原始 q=${vec(r.q)}，k=${vec(r.k)}<br>m=${r.qPosition}，n=${r.kPosition}，ω=π/6（每位置30°）`)}${formula('R(θ)[x,y] = [x cosθ − y sinθ,<br>　　　　　　　 x sinθ + y cosθ]')}${formula(`R(mω)q = [cos(${m.position * 30}°), sin(${m.position * 30}°)]<br>≈ ${vec(r.rotatedQ)}<br>R(nω)k = [cos30°−sin30°, sin30°+cos30°]<br>≈ ${vec(r.rotatedK)}`)}${matrix('旋转后的 Q / K', [r.rotatedQ, r.rotatedK], ['Q', 'K'])}${stat('两条计算路径的点积', num(r.dot, 6), `直接旋转点积 = 相对角点积 ${num(r.relativeDot, 6)}`)}<details class="deep-details" data-detail="rope-shift"><summary>同时平移两个位置，会改变这个点积吗？</summary><p>固定同一q、k与同一组旋转频率，把位置m和n都加Δ，相对差n−m不变，所以这一对旋转点积不变。注意“移动单独K”与“同时平移Q/K”不同；真实模型还受上下文、mask、位置缩放策略与数值精度影响，不能据此承诺任意改位置的整段模型输出完全不变。</p>${formula(`本例m=${r.qPosition}, n=${r.kPosition}，共同平移Δ=3<br>原点积 = ${num(r.dot, 6)}<br>平移后 = ${num(D.dot(D.rotate(r.q, (r.qPosition + 3) * r.omega), D.rotate(r.k, (r.kPosition + 3) * r.omega)), 6)}`)}</details>${note('缓存的是已经带位置的K', '旧K无需每轮重新旋转；不能把它随意移到另一位置复用。真实head有多对维度和不同频率，本图不是完整128维RoPE。此处只验证旋转代数；若Q位置0、K位置1，实际attention会把这条未来连接mask掉。')}</div></div>`;
    }
    if (f.step === 3) h += `${note('先定义轴与范围', 'Tq=本轮新query数；Tk=可见KV总长度，包含缓存与当前输入。以下是单请求、未做TP分片的逻辑形状；每个token是一行。')}<div class="dimension-board"><div class="dim-row"><strong>输入 X</strong><span>[Tq, 1024]</span><small>本轮新token数 × hidden_size</small></div><div class="dim-split">${[['Q', '16 × 128', '2048', '[1024, 2048]'], ['K', '8 × 128', '1024', '[1024, 1024]'], ['V', '8 × 128', '1024', '[1024, 1024]']].map(([x, heads, width, w]) => `<div><b>${x}</b><strong>${heads} = ${width}</strong><small>W_${x} ${w}</small></div>`).join('')}</div><div class="dim-row"><strong>每个Q head</strong><span>scores [Tq, Tk]</span><small>组内2个Q head共享1组K/V，但各自算权重</small></div><div class="dim-row"><strong>合并heads → W_O</strong><span>[Tq, 2048] × [2048, 1024]</span><small>输出[Tq,1024]，可以接残差</small></div></div><details class="deep-details" data-detail="packed-shape"><summary>真实runner如何存这些张量？</summary><p>Prefill按请求长度打包token，而不是将所有请求填到同一个最大长度。单卡Q reshape为[ΣTq, Hq/TP, d]；K/V为[ΣTq, Hkv/TP, d]。每卡KV池形状：[2, L, num_blocks, block_size, Hkv/TP, d]。这里的逻辑维度不等于底层一定会物化完整scores矩阵。</p></details>`;
    if (f.step === 4) h += `<div class="deep-grid two"><div>${matrix('h', [p.h])}<div class="mini-matrices">${matrix('W_gate', p.Wg)}${matrix('W_up', p.Wu)}</div>${matrix('W_down', p.Wd)}</div><div>${formula(`gate = ${vec(p.gate)}<br>up = ${vec(p.up)}`)}${formula('σ(z) = 1 / (1 + e⁻ᶻ)<br>SiLU(z) = z · σ(z)')}${formula(`SiLU(gate) = ${vec(p.activated)}<br>⊙ up = ${vec(p.gated)}`)}${formula(`× W_down ≈ ${vec(p.down)}`, '结果重新回到2维。真实模型是1024→3072→1024。')}${note('逐元素乘一项，亲手算一下', `第1维：SiLU(−1)×2 = [−1/(1+e)]×2 ≈ ${num(p.gated[1])}。这里“门”不是概率；SiLU可以为负，也可以大于1。`)}</div></div>`;
    if (f.step === 6) h += `<div class="kv-dim-stack">${['2份 · K和V', '28层', '8个KV头', '128维/head', '2 bytes/元素'].map(x => `<div>${x}</div>`).join('<b>×</b>')}</div><div class="deep-stats">${stat('每有效token的全层KV', '112 KiB', '114,688 bytes')}${stat('4,096 token的有效KV', '448 MiB', '单请求，不含预留与其他显存')}${stat('Q heads ≠ KV heads', '16 ≠ 8', 'GQA是2个Q head共享1组K/V')}</div>${note('Cache不只是一层的二维表', '前几幕把所有层和heads抽象成一个槽位，方便追踪生命周期；真实一个“token槽位”对应每一层全部KV heads的向量。')}`;
    return h + `<div class="evidence-rail">${source('nanovllm/models/qwen3.py#L120-L183', 'Qwen3层与残差')}${source('nanovllm/layers/rotary_embedding.py#L6-L48', 'RoPE实现')}<a class="deep-source" target="_blank" rel="noopener" href="https://huggingface.co/Qwen/Qwen3-0.6B/blob/${D.QWEN.revision}/config.json">固定官方配置 ↗</a></div>`;
  }
  function preemption(f) {
    const t = f.state;
    let h = `<div class="preempt-timeline">${['P A8+B4', 'D A1 · 抢占B', 'D A1', 'D A1 · A完成', 'P B5 · 恢复', 'D B1 · B完成'].map((x, i) => `<span class="${i + 1 === f.round ? 'active' : i + 1 < f.round ? 'past' : ''}"><b>${i + 1}</b>${x}</span>`).join('')}</div><div class="preemption-layout"><div class="request-cards">`;
    const seqs = t.seqs || t.sequences;
    const values = Array.isArray(seqs) ? seqs : Object.entries(seqs).map(([name, s]) => ({ name, ...s }));
    for (const s of values) {
      const name = s.id || s.name;
      h += `<div class="request-card ${f.event === 'preempt' && name === 'B' ? 'preempted' : ''}"><div><strong>请求 ${name}</strong>${pill(s.status)}</div><dl><div><dt>当前token数</dt><dd>${s.length ?? s.num_tokens ?? s.tokens?.length ?? s.token_ids?.length}</dd></div><div><dt>已生成输出</dt><dd>${s.generated ?? s.num_completion_tokens}</dd></div><div><dt>当前缓存token</dt><dd>${s.cached ?? s.num_cached_tokens}</dd></div></dl><div class="request-blocks">${(s.table || s.block_table || []).map((x, i) => `<span>L${i} → P${x}</span>`).join('') || '<span class="empty-block">当前无块引用</span>'}</div></div>`;
    }
    h += `</div><div class="preempt-pool"><div class="micro-label">3块已预留KV池 · 每块4槽</div>${t.blocks.map(b => {
        const owners = values.filter(s => s.table.includes(b.id));
        const valid = owners.reduce((max, s) => Math.max(max, Math.min(4, Math.max(0, s.cached - s.table.indexOf(b.id) * 4))), 0);
        return `<div class="preempt-block ${b.refs > 0 ? 'occupied' : 'free'}" data-physical="${b.id}" data-active-kv="${valid}"><strong>P${b.id}</strong><span>ref ${b.refs} · 当前有效KV ${valid}/4</span><small>${owners.length ? owners.map(s => s.name).join('+') + '引用' : '引用空闲'}${b.indexed ? ' · 有完整缓存索引' : ''}</small><div class="preempt-slots" aria-label="当前活跃有效KV ${valid}槽，分配未写${b.refs ? 4 - valid : 0}槽">${Array.from({ length: 4 }, (_, i) => `<i class="${i < valid ? 'written' : b.refs ? 'reserved' : ''}">${i < valid ? 'KV' : b.refs ? '待写' : '空闲'}</i>`).join('')}</div></div>`;
      }).join('')}<div class="queue-readout"><span>waiting</span><b>${t.waiting.join(' → ') || '空'}</b><span>running</span><b>${t.running.join(' → ') || '空'}</b></div></div></div>${f.event === 'preempt' ? note('这是schedule函数内部的瞬间', 'A已从running队首取出，暂不出现在队列快照；B被抢占后进waiting队首，随后A才会取到P2。这不是A丢失。', 'warning') : note('先看所处边界', f.step === 1 || f.step === 4 || f.step === 8 ? '本帧是schedule之后、model forward之前，分配槽位不表示对应KV已经写好。' : '队列、token计数、块表和ref_count来自真实冻结Python源码的CPU执行；token输出是固定测试ID。槽位按cached+块表推导，空闲仅表示当前无引用，不表示旧字节已擦除。')}`;
    return h + `<div class="evidence-rail">${source('nanovllm/engine/scheduler.py#L25-L92', '调度/抢占/后处理')}${source('nanovllm/engine/block_manager.py', '分配与释放')}<a class="deep-source" href="preemption-trace.json" download>下载CPU trace JSON ↓</a></div>`;
  }
  function performance(f) {
    const m = f.model;
    let h = steps(['假设', '容量', '权重', 'KV流量', '算术', '瓶颈'], f.step);
    if (f.step === 0) h += `<div class="workload-scene"><div class="workload-shape">${Array.from({ length: Math.min(m.batch, 8) }, (_, i) => `<div><span>请求${i + 1}</span>${Array.from({ length: 12 }, (_, j) => `<i class="${m.phase === 'prefill' || j === 11 ? 'new' : 'old'}"></i>`).join('')}</div>`).join('')}${m.batch > 8 ? `<small>另有${m.batch - 8}条，省略画出</small>` : ''}</div><div>${stat('本轮新输入位置总数', num(m.inputs, 0), m.phase === 'decode' ? 'B × 1' : 'B × T，假设无前缀命中')}${stat('每请求可见长度', num(m.context, 0), 'T含本轮输入，不是额外再加1')}${note('图标长度只是概念', '每行12格并不代表真实token数量；数字读数才是选定工作负载。')}</div></div>${formula('P≈10⁹ · L=24 · Hq=16 · Hkv=4 · d=64 · b=2 bytes', '假想结构，仅为拆账；不是上一幕Qwen3-0.6B的配置。')}`;
    if (f.step === 1) h += `${formula(`KV = 2 × B × T × L × Hkv × d × b<br>= 2 × ${m.batch} × ${m.context} × 24 × 4 × 64 × 2`, '第一个2是K+V，最后的2是每元素字节数。')}<div class="deep-stats">${stat('有效KV', bytes(m.kvBytes), `${m.batch * m.context}个有效token槽`)}${stat('请求占用块', bytes(m.assignedBytes), `${m.assignedBlocks}块 × 256槽，尾部空${m.tailSlots}槽`)}${stat('假设KV池已预留', bytes(m.poolBytes), `${m.poolBlocks}完整块；512MiB预算向下取整`)}</div><div class="capacity-meter"><i style="width:${Math.min(100, 100 * m.assignedBlocks / m.poolBlocks)}%" class="${m.fitsPool ? '' : 'overflow'}"></i></div>${note(m.fitsPool ? '该假设KV池放得下' : '该假设KV池放不下', m.fitsPool ? `尚余 ${m.poolBlocks - m.assignedBlocks} 个未被请求占用的块。空闲块可以暂留缓存内容，不能等同于字节已清零。` : `还差 ${m.assignedBlocks - m.poolBlocks} 个块。真实调度必须等待、限制并发或抢占；本账本不会假装所有请求照常同时运行。`, m.fitsPool ? '' : 'warning')}`;
    if (f.step === 2) h += `<div class="deep-grid two"><div class="weight-fan"><div class="weight-core">共享的权重<br><strong>${bytes(m.weightBytes)}</strong></div><div>${Array.from({ length: Math.min(m.batch, 8) }, (_, i) => `<span>输入组${i + 1}</span>`).join('')}</div></div><div>${stat('理想每步权重payload', bytes(m.weightBytes), 'P×b，假设参与权重各读一次')}${stat('每个新输入摊到的权重', bytes(m.weightBytesPerInput), `除以本轮${num(m.inputs, 0)}个新输入位置`)}</div></div>${note('小batch → 大batch，试着切换', '权重为多个位置复用，可能提高矩阵乘效率。但实际HBM流量取决于缓存、切片和算子，不能据此算出真实延迟。')}`;
    if (f.step === 3) h += `<div class="deep-stats">${stat('已有+当前有效KV容量', bytes(m.kvBytes), '2BTLHkvdb')}${stat('本轮新KV写入payload', bytes(m.newKVBytes), `2×${num(m.inputs, 0)}×L×Hkv×d×b`)}${stat(m.phase === 'decode' ? '理想KV读取payload' : 'Prefill实际KV读取', m.phase === 'decode' ? bytes(m.kvBytes) : '不由容量直接推断', m.phase === 'decode' ? '每个有效元素理想只读1次' : 'tile复用和SRAM布局影响IO')}</div>${formula(m.phase === 'decode' ? `每个生成位置的理想KV读取 = ${bytes(m.kvBytes / m.batch)}` : '不要把 Decode KV读取 × T 当作 Prefill HBM流量', m.phase === 'decode' ? 'batch变大，总KV随之增加；每请求的历史没有自动缩短。' : 'Prefill可在tile内重用数据，不需要逐query从HBM完整重读。')}${note('读取与写入是不同账目', '当前新K/V先写进缓存，再被attention读取；账本分别计一次写和一次理想读。真实缓存命中与重复读取可能使HBM流量不同。')}`;
    if (f.step === 4) h += `<div class="deep-grid two"><div>${formula(`dense ≈ 2P × ${num(m.inputs, 0)}<br>= ${num(m.denseFlops / 1e9)} GFLOP`)}${formula(`attention ≈ 4BLHq d × ${num(m.pairsPerSeq, 0)}<br>= ${num(m.attentionFlops / 1e9)} GFLOP`)}</div><div>${stat('每请求、每head的有效Q–K对', num(m.pairsPerSeq, 0), m.phase === 'decode' ? '1条新query × T个可见key' : '无缓存完整Prefill：T(T+1)/2')}${note('这里是有效数学操作量', '一次乘加算2 FLOPs，QK和AV各一次，合起来因子4。它不含softmax、Norm、SiLU、padding、通信或其他成本。')}</div></div><details class="deep-details" data-detail="prefix-pairs"><summary>如果Prefill已有C个prefix呢？</summary><p>Q个新query对应的可见配对数是 Q·C + Q(Q+1)/2。新query每个都看C个历史key，再加新chunk内部的下三角。缓存节约旧位置的重复计算，并不删掉新query对旧key的注意力。</p></details>`;
    if (f.step === 5) h += `<div class="deep-grid two"><div>${formula('计算强度 I = FLOPs / 搬运bytes<br>可达算术吞吐(FLOP/s) ≤ min(峰值算力, 带宽×I)', '这是roofline约束，不是实际性能预测。')}${m.phase === 'decode' ? stat('本账本Decode强度', `${num(m.decodeIntensity, 2)} FLOP/byte`, '(dense+attention)/(权重读+KV读+新KV写)') : note('Prefill不强行给I', '未建立Prefill真实HBM流量模型，所以不拿KV容量凑一个算术强度。')}</div><div class="bottleneck-cards"><div><strong>小batch</strong><p>权重摊薄有限，常更受数据移动和发射影响。</p></div><div><strong>长上下文</strong><p>每步KV读取与attention配对数增加。</p></div><div><strong>大batch / 多卡</strong><p>可能提高利用率，也增加容量、等待和通信。</p></div></div></div>`;
    return h + `<div class="evidence-rail">${source('nanovllm/engine/model_runner.py#L103-L121', 'KV池实际分配')}${source('nanovllm/models/qwen3.py#L29-L39', 'head维度与分片')}<a class="deep-source" href="https://arxiv.org/abs/2308.16369" target="_blank" rel="noopener">推理性能建模论文 ↗</a></div>`;
  }
  function kernels(f) {
    let h = `<div class="mechanism-map">${[['flash', '算得更省IO', 'FlashAttention'], ['paging', '放得更灵活', 'Paged KV'], ['graph', '发射更少开销', 'CUDA Graph']].map(([k, l, t]) => `<div class="${k === f.kind ? 'lit' : ''}"><small>${l}</small><strong>${t}</strong></div>`).join('')}</div>`;
    if (f.kind === 'flash') {
      h += steps(['完整公式', '分tile', '在线归一化', '合并结果'], f.step);
      if (f.step < 2) h += `<div class="tile-board"><div class="attention-tiles">${Array.from({ length: 16 }, (_, n) => `<i class="${Math.floor(n / 4) < n % 4 ? 'masked' : ''} ${f.step === 1 && n < 8 && n % 4 < 2 ? 'loaded-tile' : ''}">${Math.floor(n / 4) < n % 4 ? '×' : '·'}</i>`).join('')}</div><div>${formula('O = softmax(QKᵀ/√d + mask)V')}${note('公式不是内存分配计划', '不需要把全量S与A都写入HBM。按tile计算，用少量统计量合并，仍是精确attention算法（浮点次序可造成舍入差异）。')}</div></div>`;
      else h += `<div class="deep-grid two"><div>${matrix('当前query · 已缩放可见scores', [f.scores])}${matrix('V', f.values)}${formula('初值 m=−∞，ℓ=0，u=[0,0]<br>m′ = max(m, max(tile))<br>α = exp(m−m′)<br>ℓ′ = αℓ + Σexp(s−m′)<br>u′ = αu + Σexp(s−m′)v<br>最终 O = u/ℓ', 'm是已处理分数的最大值；ℓ是归一化质量；u是未归一化加权V向量，不是上一幕的抽样数。首tile的α=exp(−∞)=0。')}</div><div>${f.online.map((t, i) => `<div class="online-tile"><strong>Tile ${i + 1} · key ${t.start}—${t.start + 1}</strong><p>m=${num(t.m)} · α=${num(t.correction)}<br>ℓ=${num(t.l)} · u=${vec(t.u)}</p><small>当前归一化输出 ${vec(t.output)}</small></div>`).join('')}${formula(`第二tile：ℓ′ = exp(1.2−2.1)×(1+exp(−1.7))<br>　　　　　　　 + 1 + exp(−1.3)<br>≈ ${num(f.online[1].l, 6)}`, '旧统计量先按新的最大值重标尺，再加入本tile的质量。')}${stat('整行softmax直接计算', vec(f.full), '与最后tile合并输出一致（允许浮点舍入差异）')}${note('不能把各tile的softmax直接相加', '新tile可能带来更大的最大值；必须先把旧ℓ和u按α重缩放，再合并。')}</div></div>`;
    }
    if (f.kind === 'paging') h += steps(['布局问题', '地址换算', '内核读取', '组合使用'], f.step) + `<div class="address-equation"><div><small>逻辑位置</small><b>9</b></div><span>÷ 4</span><div><small>逻辑块 / 偏移</small><b>L2 / 1</b></div><span>查块表</span><div><small>[2,7,4] 的第2项</small><b>P4</b></div><span>4×4+1</span><div><small>物理槽位</small><b>17</b></div></div>${note('跨块不等于注意力被截断', '物理块可以不连续，query仍读取所有可见历史，不只看自己所在块。本仓先用Triton store_kvcache按slot_mapping写入，再调用FlashAttention分页接口。')}${formula('逻辑位置 → block_table → 物理块 + 块内偏移', 'Paged KV描述缓存组织；不要把它等同于本仓自写了原vLLM论文中的PagedAttention CUDA kernel。')}`;
    if (f.kind === 'graph') h += steps(['发射问题', '预捕获', '新输入replay', '分层组合'], f.step) + `<div class="graph-comparison"><div><strong>Eager：CPU逐个发起</strong>${['输入','model kernel 1','model kernel 2','model kernel …','logits','sampling'].map(x => `<span>${x}</span>`).join('')}</div><div><strong>Graph：适用路径重放model</strong><span>新input_ids / positions / blocks → 缓冲区</span><div class="graph-capture"><b>graph.replay()</b><small>self.model的多步GPU工作</small></div><span>compute_logits · 未捕获</span><span>sampling · 未捕获</span></div></div>${note('该源码的边界', 'Prefill、enforce_eager=True或batch>512走直接执行分支。其余适用decode选择预捕获batch形状，padding不是真请求。重放仍计算新输入，不是重复上次输出。')}`;
    return h + `<div class="evidence-rail">${source('nanovllm/layers/attention.py#L10-L75', '存KV与FlashAttention接口')}${source('nanovllm/engine/model_runner.py#L195-L257', 'Graph捕获与重放')}<a class="deep-source" href="https://arxiv.org/abs/2205.14135" target="_blank" rel="noopener">FlashAttention原论文 ↗</a></div>`;
  }
  function tensor(f) {
    const m = f.model;
    let h = steps(['GQA', 'TP约束', '列并行', '行并行', '多卡边界'], f.step);
    if (f.step < 2) h += `<div class="head-groups">${m.groups.map(g => `<div><div>${g.q.map(q => `<span>Q${q}</span>`).join('')}</div><b>↓ 共用</b><strong>K${g.kv} / V${g.kv}</strong></div>`).join('')}</div><div class="tp-ranks">${m.valid ? m.ranks.map(r => `<div><b>rank ${r.rank}</b><span>Q: ${r.q.join(', ')}</span><span>KV: ${r.kv.join(', ')}</span></div>`).join('') : `<div class="tp-error"><strong>此组合不合法</strong><span>Hq=${m.queryHeads}、Hkv=${m.kvHeads}，必须均能整除TP=${m.tp}。源码会断言失败，不能继续画“自动复制”。</span></div>`}</div>`;
    if (f.step === 2) h += `<div class="shard-diagram"><div><b>输入X</b><p>每个rank得到同一输入特征</p></div><span>×</span><div class="weight-shards">${[0, 1].map(r => `<div><b>W的输出列${r}</b><small>rank ${r}</small></div>`).join('')}</div><span>→</span><div><b>[Y₀ | Y₁]</b><p>逻辑上拼回完整输出；局部输出可直接交给匹配的下一层分片。</p></div></div>${formula('Y = X[W₀ | W₁] = [XW₀ | XW₁]', '概念右乘矩阵的列分片，对应PyTorch权重[out,in]中的输出维分片。')}${note('真实入口', 'QKVParallelLinear拆各头的输出；MergedColumnParallelLinear拆gate/up的中间特征。后续attention或门控在局部特征上继续算。')}`;
    if (f.step === 3) h += `<p class="parameter-hint">本帧固定演算2个rank，与上方TP控件独立；它只验证“求和而非拼接”的代数。</p><div class="deep-grid two">${matrix('单独的2-rank示例 W', m.W)}<div>${formula(`[1,2] × W前2行 = ${vec(m.partials[0])}<br>[3,4] × W后2行 = ${vec(m.partials[1])}`)}${formula(`all-reduce SUM → ${vec(m.sum)}`, `完整 [1,2,3,4] × W = ${vec(m.sum)}；不是拼成4维。`)}</div></div>${note('为何需要通信？', '每个rank只有输入的一部分，自己的输出是同一个结果向量的部分贡献。RowParallelLinear使用all_reduce相加；张量数值依赖其他rank，不能各自直接当最终结果。')}`;
    if (f.step === 4) h += `<div class="deep-stats">${stat('合法分片时每卡Q头', m.valid ? `${m.queryHeads / m.tp}` : '不合法')}${stat('每卡KV头', m.valid ? `${m.kvHeads / m.tp}` : '不合法')}${stat('理想每卡KV份额', m.valid ? `1 / ${m.tp}` : '不适用', '全局有效KV总量并未凭空消失')}</div>${note('不只有all-reduce', '本仓VocabParallelEmbedding做分片查表后归约；ParallelLMHead把局部词表logits gather到rank0后采样。通信、同步、拓扑和小batch开销都可能限制收益。')}${formula('TP ≠ 数据并行，也 ≠ 流水线并行', '这里同一层由多个rank共同完成；不以多卡数直接充当加速倍数。')}`;
    return h + `<div class="evidence-rail">${source('nanovllm/layers/linear.py', 'Column/Row并行')}${source('nanovllm/models/qwen3.py#L29-L39', 'Q与KV整除断言')}${source('nanovllm/layers/embed_head.py', 'Embedding与LM head')}</div>`;
  }
  function practice(f) {
    let h = steps(['固定版本', '正确性', '单变量', '测量指标', '可证伪预测'], f.step);
    const cards = [
      [['源码','bb823b3e06983d71485a8e1f23715ebd87d98ef8'],['模型','Qwen/Qwen3-0.6B · revision c1899de'],['环境','记录GPU/驱动/CUDA/PyTorch/FlashAttention与dtype'],['流量','保存实际token ID、输入长度、输出上限、并发、采样参数']],
      [['先做什么','单请求、TP=1、eager基线；确认返回结构、结束条件与资源占用'],['比较什么','相同输入下的logits/概率容差，而不是要求随机生成文本逐字相同'],['再开启什么','再用同样输入比较Graph，然后逐步增加batch或TP'],['明确限制','示例脚本未在GPU执行，不能承诺当前环境直接安装即用']],
      [['batch扫点','1 / 4 / 16 / 32；记录总吞吐与单请求等待'],['context扫点','128 / 512 / 2048；固定输出长度与其他变量'],['Graph对照','enforce_eager=True vs False；相同模型、输入及硬件'],['TP对照','先检查Q/KV heads整除与GPU数量，再测通信影响']],
      [['TTFT','请求进入服务 → 第1个输出可用；包含哪些排队/预处理必须声明'],['TPOT','后续token生成间隔的均值；首token不混进分母'],['吞吐','窗口内完成的输出token数 ÷ 秒；注明是否含输入token'],['尾延迟','报告P50/P95/P99和请求数；不能用均值替代尾部体验']],
      [['预测A','batch增大，理想每token权重读取下降；真实吞吐不保证线性'],['预测B','context增加，decode每步历史KV与attention工作增长'],['预测C','热前缀可能省输入计算，但末块排除/失配/容量会限制命中'],['预测D','Graph可能减少启动开销；不改变attention因果性或省掉模型计算']]
    ];
    h += `<div class="practice-grid">${cards[f.step].map(([k, v]) => `<div><span>${k}</span><p>${v}</p></div>`).join('')}</div><details class="deep-details" data-detail="reproduce"${f.step === 0 || f.step === 1 ? ' open' : ''}><summary>冻结源码 + 最小脚本：操作顺序与已验证范围</summary><ol><li>在自己的CUDA环境中下载冻结源码；确认Python版本与PyTorch、CUDA、FlashAttention组合兼容。</li><li>将nano-vLLM checkout到下方固定提交，按该版本README安装。依赖版本需记录；源码冻结不代表依赖自动完全冻结。</li><li>从官方模型仓库下载固定revision到本地目录，运行下载的demo_gpu.py，并传入 --model 本地路径。</li><li>默认eager、TP=1、temperature=0.6；加 --graph测试捕获路径，--tp N选择合法张量并行。</li><li>脚本只验证基本生成API，不自带TTFT/TPOT测量。不要用它的总时长替代逐token时序。</li></ol><div class="command-box" tabindex="0" role="region" aria-label="复现命令，可横向滚动" data-scroll="practice-command" data-focus="practice-command"><code>git checkout ${D.UPSTREAM}<br>python demo_gpu.py --model /path/to/Qwen3-0.6B<br>python demo_gpu.py --model /path/to/Qwen3-0.6B --graph</code></div><div class="download-row"><a href="demo_gpu.py" download>下载最小GPU示例 ↓</a><a href="experiment-guide.txt" download>下载复现实验说明 ↓</a><a href="qa-summary.json" download>下载静态/CPU验证清单 ↓</a></div></details>${note('验收范围透明', '数学单元测试、冻结Python源码差分、CPU元数据trace和合成DOM交互可重复检查。未执行GPU，不把模型公式当作测得性能；按最新要求不做真实浏览器、截图或登录验收。')}`;
    return h + `<div class="evidence-rail">${source('README.md', '冻结README')}${source('example.py', '上游最小用法')}${source('bench.py', '上游基准脚本')}${source('nanovllm/sampling_params.py', 'temperature约束')}</div>`;
  }
  function render(mode, f, state = {}) {
    const renderers = { attention, architecture, preemption, performance, kernels, tensor, practice };
    return { html: renderers[mode](f) + sourceLens(mode, f, state), title: f.title, detail: f.detail, code: mode === 'preemption' ? ['scheduler', 'blocks', 'postprocess'] : ['runner'] };
  }
  root.NanoViews = { sourceLens, codeLenses, chapters, checks, options, frames: getFrames, render, num, bytes, matrix };
})(typeof globalThis !== 'undefined' ? globalThis : this);
