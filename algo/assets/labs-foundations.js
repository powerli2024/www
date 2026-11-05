/* Algorithm laboratory definitions 01--05. No dependencies or DOM mutation. */
(function (root) {
  'use strict';
  root.AlgoLabs = root.AlgoLabs || {};
  const copy = value => JSON.parse(JSON.stringify(value));
  const seq = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
  const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const show = value => value === null || value === undefined ? '—' : String(value);
  const panel = (heading, content, v) => '<section class="lab-panel"><h4>' + v.esc(heading) + '</h4>' + content + '</section>';
  const note = (value, v) => '<p class="lab-note">' + v.esc(value) + '</p>';
  function numbers(a, allowEmpty) {
    if (!Array.isArray(a) || (!allowEmpty && !a.length) || !a.every(Number.isSafeInteger)) {
      throw new TypeError('请输入安全整数数组；本问题要求非空时，数组不能为空。');
    }
    if (a.reduce((s, x) => s + Math.abs(x), 0) > Number.MAX_SAFE_INTEGER) {
      throw new RangeError('数值总量超过本演示的精确整数范围。');
    }
    return a.slice();
  }
  function add(frames, state, spec) {
    frames.push(copy(Object.assign({ metrics: {}, lines: [], state }, spec)));
  }
  function question(prompt, options, correct, explain) {
    return { prompt, options, correct, explain };
  }

  const maximum = {
    title: '一段连续的最好选择',
    subtitle: '把“必须在这里结束”与“到目前为止最好”分开',
    concept: 'end 只代表以当前位置结尾的非空区间。best 汇总已经处理的所有终点。负数可以在最优段内部；全负数组也必须选一个数。',
    presets: [
      { name: '课文主例 · 中途保留负数', data: { values: [4, -6, 3, 2, -1, 4, -8, 5] } },
      { name: '全负数 · 0 不是合法答案', data: { values: [-5, -2, -7, -1, -4] } }
    ],
    code: [
      'end = best = A[1]',
      'for i = 2..n:',
      '    restart = A[i]',
      '    extend = end + A[i]',
      '    end = max(restart, extend)',
      '    best = max(best, end)',
      'return best'
    ],
    build(data) {
      const a = numbers(data.values, false), frames = [];
      const s = { values: a, i: -1, endAt: -1, bestThrough: -1, end: null, best: null,
        endRange: [], bestRange: [], restart: null, extend: null, rows: [], phase: 'intro' };
      const invariant = () => s.endAt < 0 ? '尚未选择任何区间；输入保证非空。' :
        'end 是以位置 ' + (s.endAt + 1) + ' 结尾的最大非空区间和；best 覆盖前 ' + (s.bestThrough + 1) + ' 项。';
      const emit = spec => add(frames, s, Object.assign({ invariant: invariant(),
        metrics: { 'end': show(s.end), 'best': show(s.best), '已汇总终点': s.bestThrough + 1 } }, spec));
      emit({ title: '先确定合法选择', reason: '只能选择连续且非空的一段。接下来逐个考察区间的右端点。',
        question: question('数组全部为负数时，能直接返回 0 吗？', ['能，什么都不选', '不能，必须选择非空区间'], 1, '空区间不合法；全负数的答案是最大的单个元素。') });
      s.i = s.endAt = s.bestThrough = 0; s.end = s.best = a[0];
      s.endRange = s.bestRange = [0]; s.rows.push([1, a[0], '初始化', s.end, s.best]); s.phase = 'commit';
      emit({ title: '第一个元素建立两个状态', reason: '唯一以位置 1 结尾的非空段是 A[1]。用它初始化，保留全负数时的正确语义。', lines: [1] });
      for (let i = 1; i < a.length; i++) {
        s.i = i; s.restart = a[i]; s.extend = s.end + a[i]; s.phase = 'consider';
        const choice = s.restart > s.extend ? 0 : s.restart < s.extend ? 1 : 2;
        emit({ title: '位置 ' + (i + 1) + '：比较两个合法来源',
          reason: '单独取当前数得到 ' + s.restart + '；把它接到上一段得到 ' + s.extend + '。除此之外的前段都不会更优。', lines: [2, 3, 4],
          ...(i === 1 ? { question: question('这一项应怎样得到新的 end？', ['从当前项重新开始', '延长上一段', '两种同分，均可'], choice,
            '比较 A[i] 与旧 end+A[i]。两种候选都包含当前元素，因此满足“必须在这里结束”。') } : {}) });
        if (s.restart >= s.extend) { s.end = s.restart; s.endRange = [i]; }
        else { s.end = s.extend; s.endRange = s.endRange.concat(i); }
        s.endAt = i; s.phase = 'end';
        emit({ title: '局部状态已经更新', reason: '现在 end=' + s.end + '。best 暂时仍只覆盖前 ' + i + ' 项；下一步再把这个新终点纳入比较。', lines: [5] });
        if (s.end > s.best) { s.best = s.end; s.bestRange = s.endRange.slice(); }
        s.bestThrough = i; s.phase = 'commit';
        s.rows.push([i + 1, a[i], s.restart >= s.extend ? '重新开始' : '延长', s.end, s.best]);
        emit({ title: '把新终点纳入全局答案', reason: 'best=max(旧 best, 新 end)。局部状态可以下降，已经找到的全局答案不会因此被删除。', lines: [6] });
      }
      s.phase = 'done';
      emit({ title: '所有终点都已考虑', reason: '答案是 ' + s.best + '，一个取得它的区间是位置 ' + (s.bestRange[0] + 1) + ' 至 ' + (s.bestRange[s.bestRange.length - 1] + 1) + '。时间 Θ(n)，额外状态空间 Θ(1)；此处保留表格用于教学。', lines: [7],
        question: question('为什么返回 best，而不是直接返回最后的 end？', ['最优区间不一定在数组最后结束', 'end 没有包含当前元素', 'best 允许跳过任意负数'], 0, 'end 固定右端点，best 在所有已经处理的右端点中取最大值。') });
      return frames;
    },
    render(frame, v) {
      const s = frame.state;
      return panel('输入与当前终点', v.array(s.values, { active: s.i < 0 ? [] : [s.i], labels: s.values.map((_, i) => '位置 ' + (i + 1)) }), v) +
        panel('end 的连续区间', v.array(s.values, { selected: s.endRange, labels: s.values.map((_, i) => '位置 ' + (i + 1)) }) + note('必须在 ' + (s.endAt < 0 ? '当前终点' : '位置 ' + (s.endAt + 1)) + ' 结束；值：' + show(s.end), v), v) +
        panel('best 已保存的区间', v.array(s.values, { selected: s.bestRange, labels: s.values.map((_, i) => '位置 ' + (i + 1)) }) + note('全局最好值：' + show(s.best), v), v) +
        panel('手推记录', v.table(['位置', 'A[i]', '选择', 'end', 'best'], s.rows, { active: [s.rows.length - 1, s.phase === 'end' ? 3 : 4] }), v);
    }
  };

  const twoSum = {
    title: '一次比较，排除一整批候选',
    subtitle: '双指针为什么能从平方次检查降到线性次',
    concept: '数组必须非降序。和太小，当前左端与更小的右端也不可能成功；和太大时对称排除右端。删除的依据是不等式，绝不是“试着移动”。',
    presets: [
      { name: '负数仍然有序 · 找到一对', data: { values: [-5, -1, 2, 4, 9], target: 3 } },
      { name: '逐批排除 · 无解', data: { values: [-4, -1, 0, 3, 8, 10], target: 20 } }
    ],
    code: [
      '要求 A 非降序；l=1，r=n',
      'while l < r:',
      '    sum = A[l] + A[r]',
      '    if sum == target: return (l,r)',
      '    if sum < target:',
      '        排除 (l,j)，l<j≤r；l=l+1',
      '    else: 排除 (i,r)，l≤i<r；r=r-1',
      'return 无解'
    ],
    build(data) {
      const a = numbers(data.values, false), target = data.target;
      if (!Number.isSafeInteger(target) || a.some((x, i) => i && a[i - 1] > x)) throw new TypeError('双指针要求安全整数目标和非降序数组。');
      const pairs = [];
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) pairs.push({ i, j, sum: a[i] + a[j], status: 'default' });
      const s = { values: a, target, l: 0, r: a.length - 1, pairs, comparisons: 0, currentSum: null,
        batch: [], excluded: [], result: null, phase: 'intro' }, frames = [];
      const emit = spec => add(frames, s, Object.assign({ invariant: '如果还有未找到的解，它仍在未被证明不可能的候选对中；同一位置不能用两次。',
        metrics: { '目标和': target, '比较次数': s.comparisons, '已排除位置对': s.pairs.filter(p => p.status === 'rejected').length,
          '原始候选对': pairs.length } }, spec));
      emit({ title: '输入有序，位置不能重复', reason: '先有顺序，才能把一次比较推广到一整批位置对。负数不会破坏这个推理。',
        question: question('为什么循环必须要求 l<r？', ['保证两个位置不同', '因为负数不能相加', '为了让指针始终间隔至少两个元素'], 0, '允许 l=r 会把同一个数组位置使用两次。') });
      s.phase = 'candidates';
      emit({ title: '把候选空间展开', reason: '三角表中的每一格代表一个 i<j 的位置对。完整枚举需要检查至多 n(n−1)/2 格。' });
      s.phase = 'pointers';
      emit({ title: '先检查当前最外侧的一对', reason: 'l 指向当前最小候选，r 指向当前最大候选。每次移动后，候选范围都会缩小。', lines: [1, 2] });
      while (s.l < s.r) {
        const l = s.l, r = s.r, sum = a[l] + a[r];
        s.currentSum = sum; s.comparisons++; s.phase = 'compare'; s.batch = [];
        const action = sum < target ? 0 : sum > target ? 1 : 2;
        emit({ title: '比较位置 ' + (l + 1) + ' 与 ' + (r + 1), reason: a[l] + ' + ' + a[r] + ' = ' + sum + '，目标是 ' + target + '。', lines: [2, 3],
          ...(s.comparisons === 1 ? { question: question('下一步有哪项保证正确？', ['左指针右移', '右指针左移', '已经找到一对'], action,
            sum < target ? '任何 j≤r 都有 A[l]+A[j]≤当前和，不能达到目标。' : sum > target ? '任何 i≥l 都有 A[i]+A[r]≥当前和，不能达到目标。' : '当前和等于目标，而且 l<r，两个位置合法。') } : {}) });
        if (sum === target) {
          s.result = [l, r]; s.phase = 'found';
          s.pairs.find(p => p.i === l && p.j === r).status = 'selected';
          emit({ title: '找到合法位置对', reason: '这里只要求任意一对；其他未检查的候选并未被宣称为无解。', lines: [4] });
          break;
        }
        const removing = sum < target ? l : r;
        s.batch = s.pairs.filter(p => p.status !== 'rejected' && (sum < target ? p.i === l && p.j <= r : p.j === r && p.i >= l)).map(p => [p.i, p.j]);
        for (const p of s.pairs) if (s.batch.some(([i, j]) => p.i === i && p.j === j)) p.status = 'rejected';
        s.phase = 'exclude';
        emit({ title: '用不等式排除 ' + s.batch.length + ' 对',
          reason: sum < target ? '对 l<j≤r：A[l]+A[j]≤' + sum + '<' + target + '，整个当前左端行都不可能。' :
            '对 l≤i<r：A[i]+A[r]≥' + sum + '>' + target + '，整个当前右端列都不可能。', lines: sum < target ? [5, 6] : [7] });
        if (sum < target) s.l++; else s.r--;
        s.excluded.push(removing); s.currentSum = null; s.phase = 'move';
        emit({ title: '移动一格，保留其余可能', reason: '指针差 r−l 减少 1。已经删除的每一格都有不可能的理由，尚未删除的格继续保留。', lines: sum < target ? [6] : [7] });
      }
      s.phase = 'done'; s.batch = [];
      emit({ title: s.result ? '搜索完成' : '候选范围已经耗尽', reason: s.result ?
        '找到的两项之和是 ' + target + '。实际比较 ' + s.comparisons + ' 次；算法最坏 Θ(n)，不是 Θ(n²)。' :
        'l≥r，已无法提供两个不同位置。所有原始候选都被安全排除，故无解。', lines: s.result ? [4] : [8] });
      return frames;
    },
    render(frame, v) {
      const s = frame.state, n = s.values.length;
      const rows = s.values.map((_, i) => [i + 1].concat(s.values.map((__, j) => {
        if (j <= i) return '·';
        const p = s.pairs.find(p => p.i === i && p.j === j);
        return p.status === 'rejected' ? '× 已排除' : p.status === 'selected' ? '✓ ' + p.sum :
          i === s.l && j === s.r && s.currentSum !== null ? p.sum : '待查';
      })));
      return panel('双指针', v.array(s.values, { active: s.l < s.r ? [s.l, s.r] : [], selected: s.result || [], rejected: s.excluded,
        labels: s.values.map((_, i) => '位置 ' + (i + 1) + (i === s.l ? ' · l' : '') + (i === s.r ? ' · r' : '')) }), v) +
        panel('候选位置对：× 表示已证明不可能', v.table(['i / j'].concat(seq(1, n)), rows,
          { active: s.l < s.r ? [s.l, s.r + 1] : [-1, -1], highlights: s.batch.map(([i, j]) => [i, j + 1]) }), v);
    }
  };

  const bfsLab = {
    title: '队列如何让最短距离逐层出现',
    subtitle: '入队时标记，出队时扩展，无法到达的点保持 ∞',
    concept: 'BFS 的队列按非递减距离处理顶点。第一次发现时就记下距离与父节点。它保证最少边数；带权最短路需要另行判断。',
    presets: [
      { name: '课文无向图 · 一条环和一个孤立点', data: { source: 's', directed: false,
        nodes: [{ id: 's', x: 55, y: 145 }, { id: 'a', x: 180, y: 65 }, { id: 'b', x: 180, y: 225 },
          { id: 'c', x: 330, y: 65 }, { id: 'd', x: 465, y: 65 }, { id: 't', x: 405, y: 225 }, { id: 'z', x: 550, y: 170 }],
        edges: [{ u: 's', v: 'a' }, { u: 's', v: 'b' }, { u: 'a', v: 'c' }, { u: 'c', v: 'd' }, { u: 'd', v: 't' }, { u: 'b', v: 't' }] } },
      { name: '有向菱形 · 两条边都想发现 x', data: { source: 'p', directed: true,
        nodes: [{ id: 'p', x: 65, y: 145 }, { id: 'q', x: 235, y: 65 }, { id: 'r', x: 235, y: 225 }, { id: 'x', x: 425, y: 145 }, { id: 'z', x: 550, y: 65 }],
        edges: [{ u: 'p', v: 'q' }, { u: 'p', v: 'r' }, { u: 'q', v: 'x' }, { u: 'r', v: 'x' }] } }
    ],
    code: [
      '所有 dist=∞，parent=无',
      'dist[source]=0；source 入队',
      'while 队列非空:',
      '    u = 队首出队',
      '    for v in Adj[u] 的固定顺序:',
      '        if dist[v] == ∞:',
      '            dist[v]=dist[u]+1；parent[v]=u',
      '            v 入队（此时已经标记）',
      'return dist, parent'
    ],
    build(data) {
      const nodes = copy(data.nodes), edges = copy(data.edges), source = data.source;
      if (!Array.isArray(nodes) || !nodes.length || nodes.some(n => typeof n.id !== 'string' || !Number.isFinite(n.x) || !Number.isFinite(n.y))) throw new TypeError('图需要带坐标的命名顶点。');
      const ids = nodes.map(n => n.id);
      if (new Set(ids).size !== ids.length || !ids.includes(source) || !Array.isArray(edges) || edges.some(e => !ids.includes(e.u) || !ids.includes(e.v))) throw new TypeError('图的顶点标识、源点或边不合法。');
      const adj = Object.fromEntries(ids.map(id => [id, []]));
      for (const e of edges) { adj[e.u].push(e.v); if (!data.directed && e.u !== e.v) adj[e.v].push(e.u); }
      for (const id of ids) adj[id].sort(compareId);
      const s = { nodes, edges, source, directed: !!data.directed, dist: Object.fromEntries(ids.map(id => [id, null])),
        parents: Object.fromEntries(ids.map(id => [id, null])), queue: [], processed: [], order: [], current: null, edge: null,
        scanned: 0, phase: 'intro' }, frames = [];
      const emit = spec => add(frames, s, Object.assign({ invariant: '每个已发现顶点恰好入队一次；队列中的距离非递减，父节点的距离恰少 1。',
        metrics: { '已发现': ids.filter(id => s.dist[id] !== null).length, '队列长度': s.queue.length, '已扫描邻接项': s.scanned } }, spec));
      emit({ title: '先画出图与源点', reason: '邻居按名称顺序处理。未发现点先记为 ∞；有向图严格沿箭头走。', lines: [1],
        question: question('什么时候应把一个点标记为已发现？', ['入队时', '等它出队后', '等所有点都处理完'], 0, '入队时标记，其他前驱就不会再次把同一个点加入队列。') });
      s.dist[source] = 0; s.queue.push(source); s.phase = 'enqueue';
      emit({ title: '源点距离为 0', reason: '从源点到自己不需要经过边。把它放到队首，准备扩展第一层。', lines: [2] });
      let asked = false;
      while (s.queue.length) {
        const u = s.queue.shift(); s.current = u; s.edge = null; s.order.push(u); s.phase = 'dequeue';
        emit({ title: '队首 ' + u + ' 出队', reason: '当前距离为 ' + s.dist[u] + '。现在只扫描它的邻居；队列里的其他点仍在等待。', lines: [3, 4] });
        for (const v of adj[u]) {
          s.edge = [u, v]; s.scanned++; s.phase = 'inspect';
          const unseen = s.dist[v] === null;
          emit({ title: '检查 ' + u + (s.directed ? ' → ' : ' — ') + v,
            reason: unseen ? v + ' 尚未发现，可以由当前点走一步到达。' : v + ' 已经在入队时标记，不能重复入队或覆盖它的父节点。', lines: [5, 6],
            ...(!asked && unseen ? { question: question('若现在发现 ' + v + '，它的距离应是多少？',
              [String(s.dist[u] + 1), String(s.dist[u]), '仍然是 ∞'], 0, '经 u 再走一条边，距离是 dist[u]+1；FIFO 保证更短层已先得到机会。') } : {}) });
          if (unseen) {
            asked = true; s.dist[v] = s.dist[u] + 1; s.parents[v] = u; s.queue.push(v); s.phase = 'enqueue';
            emit({ title: '发现 ' + v + '，立即标记并入队', reason: '记录父节点 ' + u + '，距离 ' + s.dist[v] + '。它的出边要等它出队才处理。', lines: [7, 8] });
          }
        }
        s.processed.push(u); s.edge = null; s.phase = 'expanded';
        emit({ title: u + ' 的邻居已经检查完', reason: '继续处理队首。已经发现的层不会被后面更远的层抢先处理。', lines: [3] });
      }
      s.current = null; s.edge = null; s.phase = 'done';
      const missing = ids.filter(id => s.dist[id] === null);
      emit({ title: '队列为空，搜索完成', reason: missing.length ? '从 ' + source + ' 无法到达 ' + missing.join('、') + '，它们保持 ∞。搜索不会凭空跳到其他分量。' : '全部顶点均可达。距离表示最少边数，父节点链给出一条达到该距离的路径。', lines: [9] });
      return frames;
    },
    render(frame, v) {
      const s = frame.state;
      const graph = { directed: s.directed, nodes: s.nodes.map(n => Object.assign({}, n, { label: n.id,
        state: n.id === s.current ? 'active' : s.dist[n.id] !== null ? 'selected' : s.phase === 'done' ? 'rejected' : 'default',
        tag: s.dist[n.id] === null ? '∞' : '距离 ' + s.dist[n.id] })),
        edges: s.edges.map(e => ({ u: e.u, v: e.v, label: '', state:
          s.edge && (s.edge[0] === e.u && s.edge[1] === e.v || !s.directed && s.edge[0] === e.v && s.edge[1] === e.u) ? 'active' :
            s.parents[e.v] === e.u || !s.directed && s.parents[e.u] === e.v ? 'selected' : 'default' })) };
      return panel('图与发现树', v.graph(graph), v) +
        panel('等待队列 · 左侧先出', s.queue.length ? v.array(s.queue, { active: [0], labels: s.queue.map((_, i) => i === 0 ? '队首' : '等待') }) : note('空队列', v), v) +
        panel('距离与父节点', v.table(['顶点', '距离', '父节点', '状态'], s.nodes.map(n => [n.id, s.dist[n.id] === null ? '∞' : s.dist[n.id],
          s.parents[n.id] || '无', s.processed.includes(n.id) ? '已展开' : n.id === s.current ? '正在展开' : s.queue.includes(n.id) ? '已入队' : '未发现']),
          { active: [s.nodes.findIndex(n => n.id === s.current), 1] }), v);
    }
  };

  const mergeLab = {
    title: '合并时，一次数出一批逆序对',
    subtitle: '两半各自有序，才有“剩余左半全部更大”的保证',
    concept: '逆序对按原位置定义：i<j 且 A[i]>A[j]。两端相等不计。每次取较小的右表头，它与所有剩余左项形成跨半逆序；原始位置标签始终保留。',
    presets: [
      { name: '课文主例 · 左右各一对，跨半两对', data: { values: [4, 1, 3, 2] } },
      { name: '重复数 · 相等不能计入', data: { values: [2, 2, 1, 3, 1] } }
    ],
    code: [
      'SortCount(l,r):',
      '    if l>=r: return 0',
      '    m=floor((l+r)/2)',
      '    leftCount=SortCount(l,m)',
      '    rightCount=SortCount(m+1,r)',
      '    i=l；j=m+1；buffer=[]；cross=0',
      '    while 左右均未耗尽:',
      '        if A[i]<=A[j]: 取左表头',
      '        else:',
      '            cross += m-i+1',
      '            取右表头',
      '    顺序追加未耗尽的一半',
      '    把 buffer 写回 A[l..r]',
      '    return leftCount+rightCount+cross'
    ],
    build(data) {
      const a = numbers(data.values, true), frames = [];
      const s = { original: a, work: a.map((value, id) => ({ value, id })), range: [], mid: null, stack: [],
        left: [], right: [], li: 0, ri: 0, buffer: [], countedPairs: [], deltaPairs: [], localCross: 0, count: 0,
        phase: 'intro', finalCount: null };
      const emit = spec => add(frames, s, Object.assign({ invariant: '已计入的位置对互不重复，均满足原位置 i<j 且原数值严格大于；已完成的子区间保持有序。',
        metrics: { '已确认逆序对': s.count, '本次新增': s.deltaPairs.length, '当前合并跨半数': s.localCross } }, spec));
      emit({ title: '保留原始位置，先分清严格关系', reason: '下方数字标签保留原位置。排序会移动数值，但逆序始终依据原位置定义。',
        question: question('两个值相等，且前者原位置更早，算逆序吗？', ['算', '不算'], 1, '逆序需要严格 A[i]>A[j]，相等时取左表头且不计数。') });
      function solve(l, r) {
        s.stack.push([l, r]); s.range = [l, r]; s.left = []; s.right = []; s.buffer = []; s.deltaPairs = []; s.localCross = 0;
        if (l >= r) {
          s.phase = 'base'; s.mid = null;
          emit({ title: l > r ? '空区间返回 0' : '单元素已经有序', reason: '不足两个位置，不可能形成逆序对。这是递归停止的依据。', lines: [1, 2] });
          s.stack.pop(); return 0;
        }
        const m = Math.floor((l + r) / 2); s.mid = m; s.phase = 'split';
        emit({ title: '拆分位置 ' + (l + 1) + ' 至 ' + (r + 1), reason: '逆序对分为左半内部、右半内部与跨两半三类。三类互不重叠。', lines: [3, 4, 5] });
        const inside = solve(l, m) + solve(m + 1, r);
        const left = s.work.slice(l, m + 1), right = s.work.slice(m + 1, r + 1);
        let i = 0, j = 0, cross = 0;
        const buffer = [];
        function sync(phase) {
          s.range = [l, r]; s.mid = m; s.left = left; s.right = right; s.li = i; s.ri = j; s.buffer = buffer;
          s.localCross = cross; s.count = s.countedPairs.length; s.phase = phase;
        }
        sync('merge-ready'); s.deltaPairs = [];
        const takeLeft = left[0].value <= right[0].value;
        emit({ title: '两半已有序，开始合并', reason: '左半原位置都早于右半。现在用两个表头决定下一个输出，并批量统计跨半逆序。', lines: [6, 7],
          ...(l === 0 && r === a.length - 1 ? { question: question('比较当前两个表头，下一步应怎样做？',
            ['取左表头，不增加跨半逆序', '取右表头，并计入所有剩余左项'], takeLeft ? 0 : 1,
            takeLeft ? '左表头不大于右表头，也不大于任何剩余右项，因此没有新增跨半逆序。' : '右表头小于左表头，而剩余左项只会更大，因此每项都形成一对。') } : {}) });
        while (i < left.length || j < right.length) {
          s.deltaPairs = [];
          let reason, lines;
          if (i < left.length && j < right.length) {
            if (left[i].value <= right[j].value) {
              reason = left[i].value + '≤' + right[j].value + '，取左项。右侧剩余数都不更小，不新增跨半逆序。';
              buffer.push(left[i++]); lines = [7, 8];
            } else {
              const token = right[j], delta = left.slice(i).map(x => [x.id, token.id]);
              s.countedPairs.push(...delta); s.deltaPairs = delta; cross += delta.length;
              reason = token.value + ' 小于剩余左项 ' + left.slice(i).map(x => x.value).join('、') + '，一次新增 ' + delta.length + ' 对。';
              buffer.push(right[j++]); lines = [9, 10, 11];
            }
          } else {
            const fromLeft = i < left.length;
            const token = fromLeft ? left[i++] : right[j++]; buffer.push(token);
            reason = '一半已空，顺序追加 ' + token.value + '。涉及另一半的跨半逆序都已处理。'; lines = [12];
          }
          sync('emit');
          emit({ title: '输出第 ' + buffer.length + ' 个元素', reason, lines });
        }
        for (let k = 0; k < buffer.length; k++) s.work[l + k] = buffer[k];
        s.deltaPairs = []; sync('merged');
        emit({ title: '合并结果写回当前区间', reason: '该区间有 ' + inside + ' 对内部逆序，加 ' + cross + ' 对跨半逆序，共 ' + (inside + cross) + ' 对；同时返回有序区间供上一层使用。', lines: [13, 14] });
        s.stack.pop(); return inside + cross;
      }
      s.finalCount = solve(0, a.length - 1); s.range = []; s.stack = []; s.phase = 'done'; s.deltaPairs = [];
      emit({ title: '排序与计数同时完成', reason: '共 ' + s.finalCount + ' 对严格逆序。时间 Θ(n log n)，辅助存储 Θ(n)；展示中的原位置与计数对列表仅为教学记录。', lines: [14] });
      return frames;
    },
    render(frame, v) {
      const s = frame.state, labels = tokens => tokens.map(t => '原位置 ' + (t.id + 1));
      const row = (tokens, active) => tokens.length ? v.array(tokens.map(t => t.value), { active: active >= 0 && active < tokens.length ? [active] : [], labels: labels(tokens) }) : note('空', v);
      return panel('当前数组 · 高亮正在处理的区间', v.array(s.work.map(t => t.value), { selected: s.range.length ? seq(s.range[0], s.range[1]) : [], labels: labels(s.work) }), v) +
        note('调用路径：' + (s.stack.length ? s.stack.map(([l, r]) => '[' + (l + 1) + ',' + (r + 1) + ']').join(' → ') : '已返回'), v) +
        panel('左半已排序 · 表头向右走', row(s.left, s.li), v) + panel('右半已排序 · 表头向右走', row(s.right, s.ri), v) +
        panel('当前合并缓冲区', row(s.buffer, s.buffer.length - 1), v) +
        panel('实际计入的原位置对', s.countedPairs.length ? v.table(['左位置', '右位置', '严格大小关系'], s.countedPairs.map(([i, j]) => [i + 1, j + 1, s.original[i] + ' > ' + s.original[j]]),
          { highlights: s.deltaPairs.map(p => [s.countedPairs.findIndex(q => q[0] === p[0] && q[1] === p[1]), 2]) }) : note('尚未计入任何逆序对', v), v);
    }
  };

  function compatible(a, b) { return a.f <= b.s || b.f <= a.s; }
  function optimumWitness(intervals, firstGreedy) {
    let best = [];
    for (let mask = 0; mask < 2 ** intervals.length; mask++) {
      const subset = intervals.filter((_, i) => Math.floor(mask / 2 ** i) % 2).sort((a, b) => a.s - b.s || a.f - b.f || compareId(a.id, b.id));
      if (!subset.every((x, i) => !i || subset[i - 1].f <= x.s)) continue;
      if (subset.length > best.length || subset.length === best.length && subset.length && best[0].id === firstGreedy && subset[0].id !== firstGreedy) best = subset;
    }
    return best;
  }
  function timeline(s, v, mode) {
    const list = s.intervals, selected = mode === 'correct' ? s.selected : mode === 'wrong' ? s.wrongSelected : s.exchange.after;
    const rejected = mode === 'correct' ? s.rejected : mode === 'wrong' ? s.wrongRejected : [];
    const min = Math.min(0, ...list.map(x => x.s)), max = Math.max(1, ...list.map(x => x.f)), scale = 470 / (max - min);
    const x = t => 92 + (t - min) * scale, rowHeight = Math.min(39, 210 / Math.max(1, list.length));
    const colors = { active: '#b45309', selected: '#0f766e', rejected: '#64748b', default: '#6366f1' };
    const body = list.map((item, i) => {
      const current = s.phase === mode && s.current === item.id;
      const state = current ? 'active' : selected.includes(item.id) ? 'selected' : rejected.includes(item.id) ? 'rejected' : 'default';
      const y = 24 + i * rowHeight, width = Math.max(1, x(item.f) - x(item.s));
      return '<g data-state="' + state + '"><text x="8" y="' + (y + 17) + '" font-size="13" fill="currentColor">' + v.esc(item.id + ' [' + item.s + ',' + item.f + ')') +
        '</text><rect x="' + x(item.s) + '" y="' + y + '" width="' + width + '" height="25" rx="6" fill="' + colors[state] + '" opacity="' + (state === 'rejected' ? '.25' : '.9') +
        '"/><text x="' + (x(item.s) + width / 2) + '" y="' + (y + 17) + '" text-anchor="middle" font-size="13" fill="' + (state === 'rejected' ? 'currentColor' : '#fff') + '">' + v.esc(selected.includes(item.id) ? '选' : rejected.includes(item.id) ? '跳过' : item.id) + '</text></g>';
    }).join('');
    const ticks = Array.from(new Set([min, max].concat(seq(0, 5).map(i => min + Math.round((max - min) * i / 5))))).sort((a, b) => a - b);
    return '<svg class="lab-intervals" viewBox="0 0 600 300" role="img" aria-label="' + v.esc('任务时间轴，' + (mode === 'correct' ? '最早结束策略' : mode === 'wrong' ? s.wrongName : '交换后的最优见证')) + '" style="display:block;width:100%;height:auto;max-height:340px">' + body +
      '<line x1="92" x2="562" y1="265" y2="265" stroke="currentColor" opacity=".3"/>' + ticks.map(t => '<text x="' + x(t) + '" y="287" text-anchor="middle" font-size="13" fill="currentColor">' + v.esc(String(t)) + '</text>').join('') + '</svg>';
  }
  const greedyLab = {
    title: '选得最早结束，为什么不会后悔',
    subtitle: '执行正确规则、尝试错误规则，再看交换到底保留了什么',
    concept: '目标是选出最多互不重叠的固定区间。端点相接不冲突。最早结束给剩余任务保留空间；交换证明保证存在与这次选择一致的最优解。',
    presets: [
      { name: '课文主例 · 最早开始会失手', data: { wrong: 'start', intervals: [{ id: 'A', s: 0, f: 4 }, { id: 'B', s: 0, f: 2 }, { id: 'C', s: 2, f: 4 }, { id: 'D', s: 4, f: 7 }, { id: 'E', s: 3, f: 5 }] } },
      { name: '短任务陷阱 · 中间一段挡住两段', data: { wrong: 'duration', intervals: [{ id: 'X', s: 0, f: 3 }, { id: 'Y', s: 3, f: 6 }, { id: 'Z', s: 2, f: 4 }] } },
      { name: '看见交换 · 最优解首项也能替换', data: { wrong: 'start', intervals: [{ id: 'A', s: 0, f: 3 }, { id: 'B', s: 1, f: 2 }, { id: 'C', s: 3, f: 4 }, { id: 'D', s: 4, f: 6 }, { id: 'E', s: 5, f: 7 }] } }
    ],
    code: [
      '按 finish 非降序排序，平局按名称',
      'chosen=[]；last=−∞',
      'for x in 排好序的任务:',
      '    if start[x]>=last:',
      '        chosen 加入 x',
      '        last=finish[x]',
      '// 对照：改按开始时刻或持续时间排序',
      'for x in 对照顺序:',
      '    if x 与已选的所有任务兼容:',
      '        对照集合加入 x',
      '// 交换：f(g)≤f(o)，用 g 换首项 o',
      '// 后续开始≥f(o)≥f(g)，数量保持'
    ],
    build(data) {
      const intervals = copy(data.intervals);
      if (!Array.isArray(intervals) || intervals.length > 10 || intervals.some(x => typeof x.id !== 'string' || !Number.isSafeInteger(x.s) || !Number.isSafeInteger(x.f) || x.s >= x.f) || new Set(intervals.map(x => x.id)).size !== intervals.length) throw new TypeError('请输入至多 10 个名称唯一、开始早于结束的整数区间。');
      if (data.wrong !== 'start' && data.wrong !== 'duration') throw new TypeError('对照策略应为 start 或 duration。');
      const correct = intervals.slice().sort((a, b) => a.f - b.f || compareId(a.id, b.id));
      const wrong = intervals.slice().sort((a, b) => (data.wrong === 'start' ? a.s - b.s : (a.f - a.s) - (b.f - b.s)) || compareId(a.id, b.id));
      const s = { intervals, selected: [], rejected: [], wrongSelected: [], wrongRejected: [], current: null, phase: 'intro',
        order: [], correctOrder: correct.map(x => x.id), wrongOrder: wrong.map(x => x.id), last: null,
        wrongName: data.wrong === 'start' ? '最早开始（名称打破平局）' : '持续时间最短（名称打破平局）', exchange: null, optimum: null }, frames = [];
      const emit = spec => add(frames, s, Object.assign({ invariant: '两个集合内的任务都互相兼容；可行不等于最优。半开区间允许结束与下一开始相等。',
        metrics: { '最早结束已选': s.selected.length, '对照已选': s.wrongSelected.length, '当前 last': s.last === null ? '−∞' : s.last } }, spec));
      emit({ title: '先锁定目标', reason: '一间教室，可以舍弃部分任务；目标是留下尽可能多的任务，而非总收益或使用最少教室。',
        question: question('区间 [0,2) 与 [2,4) 能都选吗？', ['能，端点接续不冲突', '不能，共用了时刻 2'], 0, '半开区间在结束时刻已经释放资源，因此 start≥last 就可以接续。') });
      s.phase = 'correct'; s.order = s.correctOrder;
      emit({ title: '先按结束时间排队', reason: '结束越早，剩余任务的开始约束越宽松。平局按名称只是为了复现同一过程。', lines: [1, 2] });
      for (const x of correct) {
        s.current = x.id;
        emit({ title: '考虑 ' + x.id, reason: '开始时刻 ' + x.s + '，上一项结束时刻 ' + (s.last === null ? '−∞' : s.last) + '。先判断兼容，再决定是否保留。', lines: [3, 4] });
        const accept = s.last === null || x.s >= s.last;
        if (accept) { s.selected.push(x.id); s.last = x.f; } else s.rejected.push(x.id);
        emit({ title: accept ? '接受 ' + x.id : '跳过 ' + x.id,
          reason: accept ? '端点满足接续条件；将 last 更新为 ' + x.f + '。' : '它与已经保留的末项重叠，不能放进当前集合。', lines: accept ? [5, 6] : [4] });
      }
      s.current = null;
      emit({ title: '正确规则得到一个可行集合', reason: '选中 ' + (s.selected.join('、') || '空集') + '，数量为 ' + s.selected.length + '。接着执行另一条看似合理的规则。' });
      s.phase = 'wrong'; s.order = s.wrongOrder;
      emit({ title: '对照：' + s.wrongName, reason: '仍然检查与全部已选任务的兼容性。对照失败若发生，原因是选择顺序，而非故意漏掉冲突检查。', lines: [7, 8] });
      for (const x of wrong) {
        s.current = x.id;
        const chosen = intervals.filter(y => s.wrongSelected.includes(y.id));
        const conflicts = chosen.filter(y => !compatible(x, y));
        emit({ title: '对照规则考虑 ' + x.id, reason: '依照新的优先顺序，检查它与当前已选任务是否冲突。', lines: [8, 9] });
        if (!conflicts.length) s.wrongSelected.push(x.id); else s.wrongRejected.push(x.id);
        emit({ title: !conflicts.length ? '对照接受 ' + x.id : '对照跳过 ' + x.id,
          reason: !conflicts.length ? '它与对照已选集合全部兼容。' : '与 ' + conflicts.map(x => x.id).join('、') + ' 冲突；先前的选择正在限制后续机会。', lines: !conflicts.length ? [10] : [9] });
      }
      s.current = null; s.phase = 'compare';
      emit({ title: '可行不代表最多', reason: '最早结束选 ' + s.selected.length + ' 个；对照规则选 ' + s.wrongSelected.length + ' 个。' +
        (s.selected.length > s.wrongSelected.length ? '这个具体输入已经否定对照规则的普遍最优性。' : '此例同分不能证明对照规则总是正确。') });
      if (correct.length) {
        const g = correct[0], witness = optimumWitness(intervals, g.id), o = witness[0];
        s.optimum = witness.length; s.phase = 'exchange'; s.order = [];
        s.exchange = { before: witness.map(x => x.id), after: witness.map(x => x.id), g: g.id, o: o.id,
          finishG: g.f, finishO: o.f, remaining: [], changed: false };
        emit({ title: '从一个真实最优解开始交换', reason: '为了展示见证，对这个小输入枚举全部子集，得到最优集合 ' + s.exchange.before.join('、') + '。实际贪心算法不需要这次枚举。',
          question: question('把该集合首项 ' + o.id + ' 换成最早结束的 ' + g.id + '，后续任务为何仍合法？',
            ['因为 f(g)≤f(o)，后续仍能接上', '因为 g 的开始时刻一定最早', '因为任意两个任务都能交换'], 0,
            '原后续开始≥f(o)，而 f(o)≥f(g)。替换只会放宽后续开始限制，数量保持不变。') });
        s.exchange.after = [g.id].concat(witness.slice(1).map(x => x.id)); s.exchange.changed = g.id !== o.id;
        emit({ title: g.id === o.id ? '首项已经与贪心一致' : '执行首项替换', reason: 'f(' + g.id + ')=' + g.f + '≤f(' + o.id + ')=' + o.f + '。替换后的任务数仍为 ' + witness.length + '，所有后续区间仍相容。', lines: [11, 12] });
        s.exchange.remaining = intervals.filter(x => x.id !== g.id && x.s >= g.f).map(x => x.id); s.phase = 'done';
        emit({ title: '固定首项，把同一推理交给剩余问题', reason: '至少存在一个以 ' + g.id + ' 开头的最优解。后续只看开始≥' + g.f + ' 的任务，重复同样论证。排序 O(n log n)，扫描 O(n)。', lines: [11, 12] });
      } else {
        s.optimum = 0; s.phase = 'done'; emit({ title: '空输入', reason: '没有任务，最大数量为 0。' });
      }
      return frames;
    },
    render(frame, v) {
      const s = frame.state;
      let html = s.order.length ? panel('当前处理顺序', v.array(s.order, { active: [s.order.indexOf(s.current)], labels: s.order.map((_, i) => '第 ' + (i + 1) + ' 项') }), v) : '';
      html += panel('最早结束 · 已选 ' + s.selected.length + ' 个', timeline(s, v, 'correct'), v) +
        panel(s.wrongName + ' · 已选 ' + s.wrongSelected.length + ' 个', timeline(s, v, 'wrong'), v);
      if (s.exchange) html += panel('交换见证 · 数量与可行性都保持',
        note('交换前：' + s.exchange.before.join(' → ') + '；交换后：' + s.exchange.after.join(' → '), v) +
        note('f(g)=' + s.exchange.finishG + ' ≤ f(o)=' + s.exchange.finishO, v) + timeline(s, v, 'exchange'), v);
      return html;
    }
  };

  Object.assign(root.AlgoLabs, { '01': maximum, '02': twoSum, '03': bfsLab, '04': mergeLab, '05': greedyLab });
})(typeof window !== 'undefined' ? window : globalThis);
