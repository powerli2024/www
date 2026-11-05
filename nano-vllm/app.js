(function () {
  'use strict';
  const { PROMPT, OUTPUT, BLOCK_SIZE, journeyFrames, schedulerFrames, cacheFrames } = window.NanoLab;
  const $ = id => document.getElementById(id);
  const stage = $('lab-stage');
  const V = window.NanoViews;
  const modeOrder = ['journey', 'attention', 'architecture', 'scheduler', 'cache', 'preemption', 'performance', 'kernels', 'tensor', 'practice'];
  const state = { mode: 'journey', index: 0, playing: false, speed: 1, budget: 8, variant: 'shared', selectedBlock: null, query: 2, embedding: 1, temperature: 1, draw: 0.62, position: 2, inputGain: 1, batch: 4, context: 2048, phase: 'decode', kernel: 'flash', kvHeads: 4, tp: 2 };
  const memo = {};
  let timer = null;
  let lastRender = '';
  let lastStageKey = '';
  const detailState = {};
  const scrollState = {};
  let restoringFocus = false;
  const chapter = {
    journey: { number: '01', kicker: '从 prompt 到第一个新 token', title: '先理解上下文，再逐步生成。', takeaway: '新输出 ≠ 新 KV。', text: 'Prefill 完成时，已经得到第 1 个输出。之后每轮 Decode 把刚生成的 token 喂回模型，才计算它的 K / V，并采样下一个输出。每条序列仍是自回归的。', footnote: '抽象 token · 4 token / 块（非源码默认值）· 演示停在最后一次释放之前 · 动画时长不是 GPU 耗时', next: '下一幕：从编号算到概率' },
    scheduler: { number: '04', kicker: '一个 batch，不必从头绑到尾', title: '每一轮，重新决定谁上场。', takeaway: '连续批处理，不等于混合阶段。', text: '请求可在轮次之间加入或退出。但这版 nano-vLLM 的每一轮只执行一种阶段，优先 Prefill；仅当轮第一个序列可切块。新请求的 Prefill 可能暂时推迟已有请求的 Decode。', footnote: '固定到达时刻 · 最多 3 条序列 · 无前缀命中 · 显存充足，省略抢占 · 预算只演示 Prefill token 上限；Decode 本例每序列 1 token', next: '下一幕：把记忆分成小块' },
    cache: { number: '05', kicker: '逻辑连续，物理位置不必连续', title: '同一段前缀，不必计算两遍。', takeaway: '共享的是记忆，不是答案。', text: '块表让不同序列指向相同物理 KV。只有连续匹配的完整前缀块可复用；这版实现还会排除请求最后一块。命中后仍须处理剩余输入，并继续自己的生成。', footnote: '4 token / 块（默认 256）· 字符标记 token 身份，非真实 KV 数值 · 池已预留，分配 / 释放仅指请求占用 · 省略生成期间新增 KV 与实际结束时机', next: '下一幕：显存不足，谁先让路' }
  };
  const checks = {
    journey: { question: '第 1 个输出出现时，它已经有自己的 KV 了吗？', choices: ['已经有了', '还没有'], correct: 1, feedback: '提示词的 KV 已经写完，但刚采样的输出要等下一轮作为输入，才会计算自己的 K / V。', frame: 2 },
    scheduler: { question: 'C 在第 4 轮到达，A、B 会在同一轮做 Decode 吗？', choices: ['会，混在一起算', '不会，本轮先 Prefill'], correct: 1, feedback: '这版调度器 Prefill 优先，单轮不混两种阶段。A、B 的 KV 仍保留，只是这一轮没有继续生成。', frame: 4 },
    cache: { question: '每块 4 token 时，相同的 12 token 热缓存能复用多少？', choices: ['12 个，全部复用', '8 个，留下最后一块'], correct: 1, feedback: '教学块大小为 4。这版实现不查询请求的最后一块，即使它完整且内容相同，所以只复用前 8 个。', frame: 3 }
  };
  Object.assign(chapter, V.chapters);
  Object.assign(checks, V.checks);
  function frames() {
    const { index, playing, speed, selectedBlock, ...parameters } = state;
    const key = JSON.stringify(parameters);
    if (!memo[key]) memo[key] = state.mode === 'journey' ? journeyFrames() : state.mode === 'scheduler' ? schedulerFrames(state.budget) : state.mode === 'cache' ? cacheFrames(state.variant) : V.frames(state.mode, state);
    if (Object.keys(memo).length > 128) delete memo[Object.keys(memo)[0]];
    return memo[key];
  }
  function restoreFocus(before) {
    if (!before) return;
    let target = before.id ? $(before.id) : null;
    if (!target && before.dataset && before.dataset.focus) target = [...stage.querySelectorAll('[data-focus]')].find(el => el.dataset.focus === before.dataset.focus);
    if (target && target !== before) {
      restoringFocus = true;
      try { target.focus({ preventScroll: true }); } finally { restoringFocus = false; }
    }
  }
  function syncControls() {
    document.querySelectorAll('[data-setting]').forEach(el => { el.value = state[el.dataset.setting]; const out = $(el.id + '-value'); if (out) out.textContent = state[el.dataset.setting]; });
    if ($('budget')) $('budget').value = String(state.budget);
    if ($('variant')) $('variant').value = state.variant;
  }
  const esc = value => String(value).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  const token = (text, classes, label) => `<span class="token ${classes || ''}"${label ? ` title="${esc(label)}"` : ''}>${esc(text)}</span>`;
  function renderJourney(f, animate) {
    const hasInput = f.kind !== 'ready';
    const compute = f.kind === 'compute';
    const sample = f.kind === 'sample';
    const shownInput = hasInput ? f.input : PROMPT;
    const isPrefill = f.prefill !== false;
    const phase = f.kind === 'ready' ? '准备就绪' : isPrefill ? 'Prefill' : 'Decode';
    const inputHtml = shownInput.map(t => token(t, compute ? 'mint' : 'prompt')).join('');
    const outputHtml = OUTPUT.map((t, i) => i < f.generated ? token(t, i === f.generated - 1 && sample ? `fresh ${animate ? 'animated-in' : ''}` : 'orange', i === f.generated - 1 && sample ? '刚采样，尚无 KV' : '已作为输入处理，已有 KV') : token('·', 'dim', '尚未生成')).join('');
    const allTokens = [...PROMPT, ...OUTPUT];
    const kvHtml = Array.from({ length: 4 }, (_, group) => `<span class="kv-block" aria-label="教学块 ${group}，4 个槽位">${Array.from({ length: 4 }, (_, slot) => {
      const i = group * 4 + slot;
      return `<span class="kv-cell ${i < f.kv ? 'written' : i < f.reserved ? 'reserved' : ''} ${compute && i >= f.kv - f.input.length && i < f.kv ? 'new-kv' : ''}" title="槽 ${i + 1}：${i < f.kv ? `已写入「${allTokens[i]}」的 KV` : i < f.reserved ? '已分配，尚未写入' : '未分配'}">${i < f.kv ? esc(allTokens[i]) : '·'}</span>`;
    }).join('')}</span>`).join('');
    stage.innerHTML = `<div class="journey-board">
      <div class="flow-panel"><div class="micro-label">本轮输入 <b>${hasInput ? f.input.length : PROMPT.length} token${!hasInput ? ' · 待处理' : ''}</b></div><div class="token-rack">${inputHtml}</div><p class="flow-caption">${isPrefill ? '提示词作为一段输入；<br>因果掩码保留先后关系。' : '只喂回上轮的新 token，<br>不重新喂入整段历史。'}</p></div>
      <div class="gpu-area"><div class="gpu-connector left ${compute && animate ? 'active-path' : ''}"><i class="traveler"></i></div><div class="gpu-shell ${compute ? 'active' : ''}"><div class="gpu-core"><span>MODEL FORWARD</span><strong>${phase}</strong><small>${compute ? '写入输入的 K / V' : sample ? 'logits → sampling' : '等待开始'}</small></div></div><div class="gpu-connector right ${sample && animate ? 'active-path' : ''}"><i class="traveler"></i></div><div class="round-badge">${f.round ? `ROUND ${String(f.round).padStart(2, '0')} · ${compute ? 'COMPUTE' : 'SAMPLE'}` : 'READY · PROMPT = 8'}</div></div>
      <div class="flow-panel"><div class="micro-label">输出序列 <b>${f.generated} / ${OUTPUT.length} token</b></div><div class="token-rack">${outputHtml}</div><p class="flow-caption">${sample ? '橙色实心：刚采样的新 token。<br>它还没有自己的 KV。' : compute && f.generated ? '上一轮输出现已写入 KV。<br>下一次采样会再增加 1 个输出。' : '这里的输出内容是预设示例，<br>不是模型的实际回答。'}</p></div>
    </div><div class="kv-shelf"><div class="kv-name"><strong>KV Cache</strong><small>跨层抽象 · 按块分配</small></div><div class="kv-cells">${kvHtml}</div><div class="kv-meter"><strong>${f.kv}</strong><span>/ ${f.reserved}</span><br>已写入 / 已分配槽位</div></div><div class="kv-legend"><span><i class="legend-box"></i>已写 KV</span><span><i class="legend-box unwritten"></i>分配未写</span><span><i class="legend-box pending"></i>新输出，未写 KV</span></div>${V.sourceLens(state.mode, f, state)}`;
    return { title: f.title, detail: f.detail, code: compute ? ['runner'] : sample ? ['runner', 'postprocess'] : ['scheduler'] };
  }

  function renderScheduler(f) {
    const all = frames();
    const total = all.length - 1;
    let html = `<div class="schedule-head"><span>A、B：第 1 轮前到达 <span style="color:#5f808b">/</span> C：第 4 轮前到达</span><div class="stage-pills"><span class="stage-pill phase">${f.phase === 'ready' ? '等待开始' : f.phase.toUpperCase()}</span><span class="stage-pill">ROUND ${String(f.round).padStart(2, '0')} / ${total}</span></div></div><div class="schedule-scroll" tabindex="0" role="region" data-scroll="schedule-rounds" data-focus="schedule-rounds" aria-label="调度轮次表，可横向滚动"><div class="schedule-grid"><span></span><div class="schedule-axis" style="grid-template-columns:repeat(${total},minmax(0,1fr))">${Array.from({ length: total }, (_, i) => `<span class="round-tick">${i + 1}</span>`).join('')}</div><span class="axis-spacer"></span>`;
    for (const s of f.seqs) {
      html += `<div class="sequence-info"><span class="sequence-badge ${s.color === 'orange' ? '' : s.color}">${s.id}</span><span>请求 ${s.id}<small>输入 ${s.prompt} · 输出 ${s.maxOutput}</small></span></div><div class="schedule-row" style="grid-template-columns:repeat(${total},minmax(0,1fr))">`;
      for (let r = 1; r <= total; r++) {
        const row = all[r], work = row.scheduled.find(w => w.id === s.id), sequence = row.seqs.find(x => x.id === s.id);
        const past = r <= f.round, current = r === f.round;
        html += `<button class="round-cell ${past ? 'past' : ''} ${work && past ? work.phase : ''} ${current ? 'now' : ''} ${work && past && sequence.status === 'finished' ? 'finished' : ''}" data-round="${r}" data-focus="round-${s.id}-${r}" aria-current="${current ? 'step' : 'false'}" aria-label="跳到第 ${r} 轮，查看请求 ${s.id}" title="点击查看第 ${r} 轮">${past && work ? `${work.phase}${work.n}<small>${work.phase === 'P' ? work.firstSample ? '+ 首输出' : '未输出' : '+ 1 输出'}</small>` : past && sequence.status === 'finished' ? '✓' : '·'}</button>`;
      }
      html += `</div><div class="sequence-summary"><span>${s.status === 'future' ? '尚未到达' : s.status === 'waiting' ? 'waiting' : s.status === 'running' ? 'running' : '<span class="released">已结束 · 已释放</span>'}</span><br><span>输出 <strong>${s.generated}</strong> / ${s.maxOutput}</span><br><span>${s.status === 'finished' ? `累计处理 ${s.processed}` : `KV ${s.kv} / 已分配 ${s.reserved}`}</span></div>`;
    }
    html += `</div></div><div class="schedule-status"><div class="queue-strip"><label>WAITING</label>${f.waiting.length ? f.waiting.map(s => `<span class="queue-item">${s}</span>`).join('') : '<span class="queue-empty">空</span>'}</div><div class="queue-strip"><label>RUNNING</label>${f.running.length ? f.running.map(s => `<span class="queue-item">${s}</span>`).join('') : '<span class="queue-empty">空</span>'}</div><div class="batch-box">本轮处理输入<strong>${f.scheduled.reduce((n, s) => n + s.n, 0)} token</strong></div></div><div class="schedule-legend"><span><i></i>P = Prefill · 数字为输入量</span><span><i class="mint"></i>D = Decode</span><span><i class="outline"></i>点击任一格跳到那一轮</span></div>`;
    stage.innerHTML = html + V.sourceLens(state.mode, f, state);
    stage.querySelectorAll('[data-round]').forEach(b => b.addEventListener('click', () => jump(Number(b.dataset.round))));
    const scheduledText = f.scheduled.map(s => `${s.id}：${s.n} token`).join(' + ');
    return { title: f.phase === 'ready' ? '请求按自己的节奏进入与退出' : `第 ${f.round} 轮 · ${f.phase === 'prefill' ? 'Prefill' : 'Decode'} · ${scheduledText}`, detail: f.text, code: ['scheduler'] };
  }

  function renderCache(f) {
    const names = ['A', 'B', ...(f.sequences.C ? ['C'] : [])];
    const used = f.blocks.filter(b => b.refs > 0);
    const retained = f.blocks.filter(b => b.refs === 0 && b.indexed);
    const written = used.reduce((n, b) => n + b.written, 0);
    const saved = f.sequences.B ? f.sequences.B.released ? f.sequences.B.historicalCached : f.sequences.B.cached : 0;
    let html = `<div class="cache-layout"><div><div class="micro-label">逻辑块表 <b>每个请求各有一张</b></div><div class="logical-list">`;
    for (const name of names) {
      const s = f.sequences[name];
      html += `<div class="logical-seq ${f.active === name ? 'is-active' : ''}"><div class="logical-title"><strong>请求 ${name}</strong><small>${s ? s.released ? '已释放' : `${s.tokens.length} token` : '尚未分配'}</small></div>${s && !s.released ? `<div class="block-table">${s.table.map((id, i) => `<button class="map-entry ${f.blocks[id].refs > 1 ? 'shared' : ''}" data-block="${id}" data-focus="logical-${name}-${i}" aria-pressed="${state.selectedBlock === id}" title="逻辑块 ${i} → 物理块 P${id}" aria-label="查看请求 ${name} 的逻辑块 ${i}，指向物理块 P${id}">L${i}→${id}</button>`).join('')}</div><p class="logical-caption">${s.cached} 复用 + ${s.computed} 新计算${s.computed === 0 && s.tokens.length > s.cached ? ' · 尾部待算' : ''}</p>` : `<p class="logical-empty">${s && s.released ? '块表已清空，引用已归还' : '— → — → —'}</p>`}</div>`;
    }
    html += `</div></div><div class="mapping-bridge" aria-hidden="true"><span>→</span></div><div><div class="physical-title"><span>GPU · 物理 KV 块池</span><b>12 × 4 槽位</b></div><div class="physical-pool">`;
    for (const b of f.blocks) {
      const owners = Object.values(f.sequences).filter(s => !s.released && s.table.includes(b.id)).map(s => s.name);
      const status = b.refs > 1 ? '共享' : b.refs ? '使用中' : b.indexed ? '空闲 · 可命中' : b.written ? '空闲 · 保留字节但无缓存索引' : '空闲';
      const activeSeq = f.active ? f.sequences[f.active] : null;
      const activeIndex = activeSeq ? activeSeq.table.indexOf(b.id) : -1;
      const newWrite = activeIndex >= 0 && ['compute', 'complete'].includes(f.phase) && activeIndex >= activeSeq.cached / BLOCK_SIZE;
      const newReference = activeIndex >= 0 && ['lookup', 'reuse'].includes(f.phase) && activeIndex < activeSeq.cached / BLOCK_SIZE;
      html += `<button class="physical-block ${b.refs ? 'used' : 'unindexed'} ${b.refs > 1 ? 'shared' : ''} ${!b.refs && b.indexed ? 'retained' : ''} ${state.selectedBlock === b.id ? 'selected-block' : ''} ${newWrite ? 'cache-write' : ''} ${newReference ? 'cache-reference' : ''}" data-block="${b.id}" data-focus="physical-${b.id}" aria-pressed="${state.selectedBlock === b.id}" aria-label="物理块 P${b.id}，${status}，引用 ${b.refs}，已写 ${b.written} 槽${owners.length ? `，属于请求 ${owners.join('、')}` : ''}"><span class="block-head">P${String(b.id).padStart(2, '0')}<small>ref ${b.refs}</small></span><span class="block-slots">${Array.from({ length: BLOCK_SIZE }, (_, i) => `<span class="block-slot ${i < b.written ? 'written' : 'unwritten'}">${i < b.written ? esc(b.values[i]) : '·'}</span>`).join('')}</span><span class="block-owner">${owners.length ? owners.join(' + ') : b.indexed ? '缓存可命中' : '空闲'}</span></button>`;
    }
    html += `</div><div class="pool-statline"><span>使用中 <strong>${used.length}</strong></span><span>空闲 <strong>${f.free.length}</strong></span><span>空闲且可命中 <strong>${retained.length}</strong></span><span>当前在用 KV <strong>${written}</strong> / ${used.length * BLOCK_SIZE} 槽</span></div></div></div><div class="cache-budget"><span>该对照中 B 省下的重复计算</span><strong>${saved || 0}</strong><span>token</span><span>${state.variant === 'full' ? '末块即使完整，也不复用' : state.variant === 'miss' ? '首块失配，不能跳着复用' : '点击块表或物理块，检查引用关系'}</span></div><div id="block-inspection" class="block-inspection" aria-live="polite"></div>`;
    stage.innerHTML = html + V.sourceLens(state.mode, f, state);
    stage.querySelectorAll('[data-block]').forEach(el => el.addEventListener('click', () => inspectBlock(Number(el.dataset.block), f)));
    if (state.selectedBlock !== null) inspectBlock(state.selectedBlock, f);
    return { title: f.title, detail: f.detail, code: ['blocks'] };
  }

  function inspectBlock(id, f) {
    state.selectedBlock = id;
    stage.querySelectorAll('[data-block]').forEach(el => { const selected = Number(el.dataset.block) === id; el.classList.toggle('selected-block', selected); el.setAttribute('aria-pressed', String(selected)); });
    const b = f.blocks[id], owners = Object.values(f.sequences).filter(s => !s.released && s.table.includes(id)).map(s => s.name);
    $('block-inspection').textContent = `P${String(id).padStart(2, '0')}：${owners.length ? `请求 ${owners.join('、')} 正在引用` : '没有活跃请求引用'}；ref_count = ${b.refs}；已写 ${b.written} / 4 槽；${b.indexed ? '完整前缀身份已登记，可被后续查找命中' : b.key !== null ? '保留完整 KV，但缓存索引已指向另一块，不能直接命中' : '尚无可复用的完整块身份'}。`;
  }

  function configureChapter() {
    const c = chapter[state.mode];
    $('lab-number').textContent = `/ ${c.number}`;
    $('lab-kicker').textContent = c.kicker;
    $('lab-title').textContent = c.title;
    $('takeaway-no').textContent = `${c.number} / 10`;
    $('takeaway-title').textContent = c.takeaway;
    $('takeaway-text').textContent = c.text;
    $('next-chapter').innerHTML = `${c.next} <span aria-hidden="true">→</span>`;
    $('lab-footnote').textContent = c.footnote;
    $('experiment').setAttribute('aria-labelledby', `tab-${state.mode}`);
    document.querySelectorAll('[role=tab]').forEach(tab => {
      const active = tab.dataset.mode === state.mode;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    stage.className = `lab-stage ${state.mode}-stage`;
    $('lab-options').innerHTML = state.mode === 'scheduler' ? `<label>Prefill 预算<select id="budget"><option value="6"${state.budget === 6 ? ' selected' : ''}>6 token / 轮</option><option value="8"${state.budget === 8 ? ' selected' : ''}>8 token / 轮</option><option value="12"${state.budget === 12 ? ' selected' : ''}>12 token / 轮</option></select></label>` : state.mode === 'cache' ? `<label>选择对照<select id="variant"><option value="shared"${state.variant === 'shared' ? ' selected' : ''}>共享前 8 个 token</option><option value="full"${state.variant === 'full' ? ' selected' : ''}>末块也恰好完整</option><option value="miss"${state.variant === 'miss' ? ' selected' : ''}>第 1 个 token 不同</option></select></label>` : state.mode === 'journey' ? '<span class="journey-annotation">8 输入 + 6 预设输出</span>' : V.options(state.mode, state);
    if ($('budget')) $('budget').addEventListener('change', e => { pause(); state.budget = Number(e.target.value); state.index = 0; render(false); });
    if ($('variant')) $('variant').addEventListener('change', e => { pause(); state.variant = e.target.value; state.index = 0; state.selectedBlock = null; render(false); });
    $('lab-options').querySelectorAll('[data-setting]').forEach(el => el.addEventListener(el.type === 'range' ? 'input' : 'change', e => {
      pause();
      const key = el.dataset.setting;
      state[key] = ['phase', 'kernel'].includes(key) ? e.target.value : Number(e.target.value);
      if (key === 'kernel') state.index = 0;
      render(false);
    }));
    const test = checks[state.mode];
    $('check-question').textContent = test.question;
    $('check-answers').innerHTML = test.choices.map((text, i) => `<button data-answer="${i}" aria-pressed="false">${text}</button>`).join('');
    $('check-feedback').textContent = '';
    $('check-jump').hidden = true;
    $('check-answers').querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
      $('check-answers').querySelectorAll('[data-answer]').forEach(b => { b.setAttribute('aria-pressed', String(b === button)); b.classList.toggle('correct-answer', Number(b.dataset.answer) === test.correct); });
      $('check-feedback').textContent = `${Number(button.dataset.answer) === test.correct ? '对，关键就在这里。' : '容易混淆的地方就在这里：'}${test.feedback}`;
      $('check-jump').hidden = false;
    }));
  }
  function render(animate = true) {
    const focusedBefore = document.activeElement;
    if (lastRender) {
      const saved = scrollState[lastRender] || (scrollState[lastRender] = {});
      stage.querySelectorAll('[data-scroll]').forEach(el => { saved[el.dataset.scroll] = { left: el.scrollLeft || 0, top: el.scrollTop || 0 }; });
    }
    if (lastStageKey) {
      const saved = {};
      stage.querySelectorAll('[data-detail]').forEach(el => { saved[el.dataset.detail] = el.open; });
      detailState[lastStageKey] = saved;
    }
    const list = frames();
    state.index = Math.min(state.index, list.length - 1);
    const f = list[state.index];
    const chapterKey = state.mode;
    if (chapterKey !== lastRender) { configureChapter(); lastRender = chapterKey; }
    stage.classList.remove('motion-paused');
    stage.classList.toggle('deep-animated', animate && !['journey', 'scheduler', 'cache'].includes(state.mode));
    stage.setAttribute('style', `--animation-duration:${Math.min(1400, 1430 / state.speed)}ms`);
    let content;
    if (state.mode === 'journey') content = renderJourney(f, animate);
    else if (state.mode === 'scheduler') content = renderScheduler(f);
    else if (state.mode === 'cache') content = renderCache(f);
    else {
      content = V.render(state.mode, f, state);
      stage.innerHTML = content.html;
      stage.querySelectorAll('[data-step]').forEach(el => el.addEventListener('click', () => jump(Number(el.dataset.step))));
    }
    lastStageKey = `${state.mode}:${state.index}:${state.mode === 'kernels' ? state.kernel : ''}`;
    stage.querySelectorAll('[data-detail]').forEach(el => {
      if (detailState[lastStageKey] && Object.hasOwn(detailState[lastStageKey], el.dataset.detail)) el.open = detailState[lastStageKey][el.dataset.detail];
      const summary = el.querySelectorAll('summary')[0];
      if (summary) summary.setAttribute('data-focus', `detail-${el.dataset.detail}`);
    });
    syncControls();
    stage.querySelectorAll('[data-scroll]').forEach(el => {
      const saved = scrollState[state.mode] && scrollState[state.mode][el.dataset.scroll];
      if (saved) { el.scrollLeft = saved.left; el.scrollTop = saved.top; }
    });
    restoreFocus(focusedBefore);
    $('step-title').textContent = content.title;
    $('step-description').textContent = content.detail;
    $('step-counter').textContent = `${String(state.index + 1).padStart(2, '0')} / ${list.length}`;
    $('timeline').max = list.length - 1;
    $('timeline').value = state.index;
    $('timeline').setAttribute('aria-valuetext', `${state.index + 1} / ${list.length}，${content.title}`);
    $('back').disabled = state.index === 0;
    $('next').disabled = state.index === list.length - 1;
    document.querySelectorAll('[data-code]').forEach(el => el.classList.toggle('active-code', content.code.includes(el.dataset.code)));
    updatePlayButton();
  }
  function updatePlayButton() {
    const ended = state.index === frames().length - 1;
    $('play-icon').textContent = state.playing ? 'Ⅱ' : ended ? '↺' : '▶';
    $('play-label').textContent = state.playing ? '暂停' : ended ? '重播' : '播放';
    $('play').setAttribute('aria-label', state.playing ? '暂停动画' : ended ? '重新播放动画' : '播放动画');
    $('play').setAttribute('aria-pressed', String(state.playing));
  }
  function pause(freeze = true) { clearTimeout(timer); timer = null; state.playing = false; stage.classList.toggle('motion-paused', freeze); updatePlayButton(); }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!state.playing) return;
      if (state.index >= frames().length - 1) { pause(false); return; }
      state.index++;
      render(true);
      if (state.index === frames().length - 1) pause(false); else schedule();
    }, (state.mode === 'journey' ? 2600 : ['scheduler', 'cache', 'preemption'].includes(state.mode) ? 4200 : 6500) / state.speed);
  }
  function play() {
    if (state.playing) return pause();
    if (state.index === frames().length - 1) state.index = 0;
    state.playing = true;
    render(false);
    if (state.playing) schedule();
  }
  function jump(index) { pause(); state.index = Math.max(0, Math.min(index, frames().length - 1)); state.selectedBlock = null; render(true); }
  function changeMode(mode) {
    if (!modeOrder.includes(mode)) return;
    pause(); state.mode = mode; state.index = 0; state.selectedBlock = null; render(false);
  }
  document.querySelectorAll('[role=tab]').forEach(tab => {
    tab.addEventListener('click', () => changeMode(tab.dataset.mode));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let index = modeOrder.indexOf(state.mode);
      index = event.key === 'Home' ? 0 : event.key === 'End' ? modeOrder.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + modeOrder.length) % modeOrder.length;
      changeMode(modeOrder[index]); $('tab-' + modeOrder[index]).focus();
    });
  });
  $('play').addEventListener('click', play);
  $('back').addEventListener('click', () => jump(state.index - 1));
  $('next').addEventListener('click', () => jump(state.index + 1));
  $('reset').addEventListener('click', () => jump(0));
  $('timeline').addEventListener('input', e => jump(Number(e.target.value)));
  $('speed').addEventListener('change', e => { state.speed = Number(e.target.value); stage.setAttribute('style', `--animation-duration:${Math.min(1400, 1430 / state.speed)}ms`); if (state.playing) schedule(); });
  $('next-chapter').addEventListener('click', () => {
    changeMode(modeOrder[(modeOrder.indexOf(state.mode) + 1) % modeOrder.length]);
    $('experiment').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    $('experiment').focus({ preventScroll: true });
  });
  $('check-jump').addEventListener('click', () => {
    pause();
    if (state.mode === 'cache') { state.variant = 'full'; state.selectedBlock = null; }
    if (state.mode === 'kernels') state.kernel = 'graph';
    if (state.mode === 'tensor') { state.kvHeads = 2; state.tp = 4; }
    state.index = checks[state.mode].frame;
    render(true);
    $('experiment').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    $('experiment').focus({ preventScroll: true });
  });
  $('boundary-open').addEventListener('click', () => {
    pause(); $('boundaries').focus({ preventScroll: true }); $('boundaries').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    $('boundaries').classList.remove('section-highlight');
    requestAnimationFrame(() => $('boundaries').classList.add('section-highlight'));
  });
  stage.addEventListener('focusin', () => { if (state.playing && !restoringFocus) pause(); });
  stage.addEventListener('pointerdown', () => { if (state.playing) pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', pause);
  render(false);
  /* Public read-only debugging surface for deterministic QA; no network, storage or model execution. */
  window.NanoLabState = () => ({ ...state, frame: JSON.parse(JSON.stringify(frames()[state.index])), count: frames().length });
})();
