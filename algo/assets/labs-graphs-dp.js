(function (root) {
  'use strict';
  const clone = value => {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
    return value;
  };
  const number = x => x === Infinity ? '∞' : x === -Infinity ? '−∞' : x === null ? '待求' : String(x);
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const numericQuestion = (prompt, answer, explain) => {
    const choices = answer === 0 ? ['1', '0', '2'] : [String(answer + 1), String(answer), String(answer - 1)];
    const shift = Array.from(prompt).reduce((sum, ch) => sum + ch.codePointAt(0), 0) % choices.length;
    return { prompt, options: [...choices.slice(shift), ...choices.slice(0, shift)], correct: (1 - shift + choices.length) % choices.length, explain };
  };
  function recorder(base) {
    const frames = [];
    return { frames, push: extra => frames.push(clone(Object.assign({}, base(), extra))) };
  }
  function graphInput(data) {
    if (!Array.isArray(data.nodes) || data.nodes.length < 1 || data.nodes.length > 8) throw new Error('演示需 1–8 个顶点。');
    const nodes = data.nodes.map((node, i) => {
      if (node == null || (typeof node === 'object' && node.id == null)) throw new Error('顶点必须有编号。');
      const id = String(typeof node === 'object' ? node.id : node);
      const angle = 2 * Math.PI * i / data.nodes.length - Math.PI / 2;
      const x = node.x ?? 300 + 210 * Math.cos(angle), y = node.y ?? 150 + 105 * Math.sin(angle);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('顶点位置必须是有限数。');
      return { id, label: id, x, y };
    });
    const ids = nodes.map(n => n.id);
    if (new Set(ids).size !== ids.length) throw new Error('顶点编号不能重复。');
    if (!Array.isArray(data.edges) || data.edges.length > 24) throw new Error('演示最多 24 条边。');
    const edges = data.edges.map((e, i) => {
      const u = String(e.u), v = String(e.v), w = Number(e.w);
      if (!ids.includes(u) || !ids.includes(v) || !Number.isFinite(w)) throw new Error('边的端点和权重必须有效。');
      return { id: 'e' + i, u, v, w };
    });
    return { nodes, ids, edges };
  }

  const knapsack = {
    title: '同一件物品，为什么不能拿两次？',
    subtitle: '0/1 背包逐格推导 · 上一行依赖 · 正倒序对照',
    concept: 'D[i,c] 只用前 i 件物品、总重量至多 c 的最大价值。先由取/不取推导二维表，再用单物品微实验解释倒序。容量为整数；O(nW) 是伪多项式，测试不替代分类证明。',
    presets: [
      { name: '三件物品，容量 5', data: { capacity: 5, items: [{ name: 'A', w: 2, v: 3 }, { name: 'B', w: 3, v: 4 }, { name: 'C', w: 4, v: 5 }] } },
      { name: '一件物品，检查重复取用', data: { capacity: 4, items: [{ name: 'A', w: 2, v: 3 }] } }
    ],
    code: ['D[0,c] = 0；其余格暂不求值', 'for i = 1..n:', '  for c = 0..W:',
      '    skip = D[i-1,c]', '    take = D[i-1,c-w[i]] + v[i]（装得下时）',
      '    D[i,c] = max(skip,take)', '按取/不取从 D[n,W] 回溯',
      '微实验：每次重新置 dp[0..4]=0，只处理一件(2,3)',
      '倒序 c=4..2：dp[c]=max(dp[c],dp[c-2]+3)',
      '正序 c=2..4：dp[c]=max(dp[c],dp[c-2]+3)',
      '比较两种扫描顺序：读取的是上一行，还是本行？'],
    build(data) {
      const W = Number(data.capacity), items = (data.items || []).map((a, i) => ({ name: String(a.name ?? i + 1), w: Number(a.w), v: Number(a.v) }));
      if (!Number.isInteger(W) || W < 0 || W > 10 || items.length > 4 || items.some(a => !Number.isInteger(a.w) || a.w < 1 || !Number.isFinite(a.v) || a.v < 0)) throw new Error('演示要求 0≤容量≤10，至多4件，正整数重量、非负价值。');
      const D = Array.from({ length: items.length + 1 }, (_, i) => Array(W + 1).fill(i === 0 ? 0 : null));
      let row = 0, cap = 0, highlights = [], choice = '', selectedItems = [], demo = null;
      const r = recorder(() => ({ items, capacity: W, table: D, row, cap, highlights, choice, selectedItems, demo,
        metrics: { '已考虑物品': row, '当前容量': cap, '完整表答案': D[items.length][W] === null ? '尚未求出' : D[items.length][W] },
        invariant: '已完成的 D[i,c] 只使用前 i 件物品；重量至多 c，可以留空。取第 i 件时只读取上一行。' }));
      r.push({ title: '没有物品时，任意容量的最优价值都是 0', reason: '空集合法。空白格表示尚未求值，不等于不可达或数值 0。', lines: [1], phase: 'init' });
      let asked = 0;
      for (row = 1; row <= items.length; row++) {
        const item = items[row - 1]; cap = 0;
        r.push({ title: '开始考虑物品 ' + item.name, reason: `重量 ${item.w}，价值 ${item.v}。这一行仍然每件最多取一次。`, lines: [2, 3], phase: 'row' });
        for (cap = 0; cap <= W; cap++) {
          const skip = D[row - 1][cap], take = cap >= item.w ? D[row - 1][cap - item.w] + item.v : -Infinity;
          const best = Math.max(skip, take);
          highlights = [[row - 1, cap + 1]];
          if (take !== -Infinity) highlights.push([row - 1, cap - item.w + 1]);
          if ((asked === 0 && take !== -Infinity) || (row === items.length && cap === W)) {
            r.push({ title: '先预测下一格', reason: '黄色目标格尚未写入。比较蓝色上一行来源；装不下时只能跳过。', lines: [4, 5], phase: 'predict',
              question: numericQuestion(`D[${row},${cap}] 应是多少？`, best, `不取为 ${skip}；${take === -Infinity ? '装不下，没有取的候选' : '取为 ' + take}。取较大者 ${best}。`) });
            asked++;
          }
          D[row][cap] = best;
          choice = take > skip ? '取' : '不取（同分也跳过）';
          r.push({ title: `写入 D[${row},${cap}] = ${best}`, reason: `不取：${skip}；取：${take === -Infinity ? '装不下' : take}。本格选择${choice}。`, lines: [4, 5, 6], phase: 'cell', skip, take });
        }
      }
      row = items.length; cap = W; highlights = [];
      let c = W;
      for (let i = items.length; i >= 1; i--) {
        if (D[i][c] > D[i - 1][c]) { selectedItems.unshift(i - 1); c -= items[i - 1].w; }
      }
      r.push({ title: '二维表完成：恢复一组物品', reason: `答案 ${D[items.length][W]}；选中 ${selectedItems.map(i => items[i].name).join('、') || '空集'}。取一件后，物品范围和剩余容量同时减小。`, lines: [7], phase: 'solution' });
      const demoAnswers = {};
      for (const direction of ['descending', 'ascending']) {
        demo = { direction, values: [0, 0, 0, 0, 0], active: [], reads: [], weight: 2, value: 3, capacity: 4 };
        r.push({ title: '独立微实验：' + (direction === 'descending' ? '容量倒序' : '容量正序'), reason: '重新清零，只处理一件重量 2、价值 3 的物品，容量 4；与上面的主例分开。', lines: [8], phase: 'demo-init' });
        const order = direction === 'descending' ? [4, 3, 2] : [2, 3, 4];
        for (const dc of order) {
          demo.active = [dc]; demo.reads = [dc - 2];
          const before = demo.values[dc], source = demo.values[dc - 2];
          if (direction === 'ascending' && dc === 4) {
            r.push({ title: '这一格读到的是哪一行？', reason: '先观察 dp[2] 是否已经被这件物品更新，再决定是否符合 0/1 语义。', lines: [10], phase: 'predict',
              question: { prompt: '现在用 dp[2]+3 更新 dp[4]，意味着什么？', options: ['仍只取一次', '把同一件物品再取一次', '不会改变结果'], correct: 1,
                explain: '正序已把 dp[2] 改为 3；再加 3 就取了两次。这适合完全背包，不能当成 0/1 背包。' } });
          }
          demo.values[dc] = Math.max(before, source + 3);
          r.push({ title: `${direction === 'descending' ? '倒序' : '正序'}更新 dp[${dc}]`, reason: `max(${before}, ${source}+3) = ${demo.values[dc]}。${direction === 'descending' ? '较小容量还没被当前件更新，来源是上一行。' : '较小容量可能已含当前物品，允许继续取。'}`, lines: [direction === 'descending' ? 9 : 10], phase: 'demo-step' });
        }
        demoAnswers[direction] = demo.values[4];
      }
      r.push({ title: '相同更新式，不同的状态含义', reason: '微实验倒序答案 3，正序答案 6。正序不是数算错，而是把问题变成了允许重复取。主例二维表仍保持 0/1 语义。', lines: [11], phase: 'final',
        result: { value: D[items.length][W], selectedItems, descending: demoAnswers.descending, ascending: demoAnswers.ascending } });
      return r.frames;
    },
    render(f, v) {
      const rows = f.table.map((line, i) => [i === 0 ? '无物品' : `前${i}件`, ...line.map(number)]);
      let html = '<h4>每件最多一次 · 完整二维表</h4>' + v.table(['可用范围 / 容量', ...Array.from({ length: f.capacity + 1 }, (_, i) => i)], rows,
        { active: [f.row, f.cap + 1], highlights: f.highlights });
      html += v.array(f.items.map(a => `${a.name}：重${a.w} / 值${a.v}`), { selected: f.selectedItems });
      if (f.demo) html += '<h4>独立微实验：一件 (2,3)，容量 4</h4><p>' + v.esc(f.demo.direction === 'descending' ? '按容量从大到小，观察读取位置' : '按容量从小到大，观察读取位置') + '</p>' +
        v.array(f.demo.values, { active: f.demo.active, selected: f.demo.reads, labels: ['c=0', 'c=1', 'c=2', 'c=3', 'c=4'] });
      return html;
    }
  };

  const lcs = {
    title: '删掉字符以后，什么信息仍然够用？', subtitle: 'LCS 逐格计算 · 回溯匹配 · 与连续子串对照',
    concept: 'L[i,j] 是两个前缀的最长公共子序列长度。相等用左上加一，不等舍弃一个末位置。子序列允许跳过，子串不允许。状态分类与前缀归纳给出证明，有限枚举用于核对实现。',
    presets: [{ name: 'ABC 与 BAC', data: { x: 'ABC', y: 'BAC' } }, { name: '字符可跳过，连续性不能偷换', data: { x: 'AXBYC', y: 'ABC' } }],
    code: ['L[0,j]=L[i,0]=0', 'for i=1..m，j=1..n:', '  若 X[i-1]==Y[j-1]：L[i,j]=L[i-1,j-1]+1',
      '  否则 L[i,j]=max(L[i-1,j],L[i,j-1])', '从 (m,n) 回溯',
      '  字符相等：记录字符；i--，j--', '  否则沿较大邻格；同分优先向上',
      '子串对照 H：相等时左上+1，不等时清零', 'LCS允许跳过；子串必须保持连续'],
    build(data) {
      const X = Array.from(String(data.x ?? '')), Y = Array.from(String(data.y ?? '')), m = X.length, n = Y.length;
      if (m > 8 || n > 8) throw new Error('逐格演示每个字符串最多 8 个字符。');
      const D = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 || j === 0 ? 0 : null));
      let i = 0, j = 0, highlights = [], selectedX = [], selectedY = [];
      const r = recorder(() => ({ X, Y, table: D, i, j, highlights, selectedX, selectedY,
        invariant: '已完成的 L[i,j] 只使用 X 的前 i 个和 Y 的前 j 个字符；允许跳过，但保留顺序。',
        metrics: { 'X前缀长度': i, 'Y前缀长度': j, '完整表答案': D[m][n] === null ? '尚未求出' : D[m][n] } }));
      r.push({ title: '两个空前缀边界', reason: '任意串与空串的公共子序列长度为 0；内部空格还没算。', lines: [1], phase: 'init' });
      for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
        const same = X[i - 1] === Y[j - 1], value = same ? D[i - 1][j - 1] + 1 : Math.max(D[i - 1][j], D[i][j - 1]);
        highlights = same ? [[i - 1, j]] : [[i - 1, j + 1], [i, j]];
        if ((i === 1 && j === 1) || (i === m && j === n)) r.push({ title: '先预测这一格', reason: '看两个末字符是否相等，再看已完成的邻格。目标仍为空白。', lines: [2], phase: 'predict',
          question: numericQuestion(`L[${i},${j}] 是多少？`, value, same ? `末字符相等，左上 ${D[i - 1][j - 1]} 加 1。` : `末字符不同，只能舍去至少一个末位置，取上/左最大值 ${value}。`) });
        D[i][j] = value;
        r.push({ title: `求出 L[${i},${j}] = ${value}`, reason: same ? `两个末字符都是 ${X[i - 1]}；存在一个最优解将它们配在最后，因此左上加 1。` : `${X[i - 1]} 与 ${Y[j - 1]} 不同；比较舍去 X 末位的 ${D[i - 1][j]} 与舍去 Y 末位的 ${D[i][j - 1]}。`, lines: [same ? 3 : 4], phase: 'cell' });
      }
      i = m; j = n; highlights = [];
      r.push({ title: '长度已经知道，开始找一组实际字符', reason: '从右下角沿产生这个值的来源回走；表值不变，选中的匹配位置逐步增加。', lines: [5], phase: 'trace-start' });
      while (i > 0 && j > 0) {
        const from = [i, j];
        if (X[i - 1] === Y[j - 1]) {
          selectedX.unshift(i - 1); selectedY.unshift(j - 1);
          const ch = X[i - 1]; i--; j--;
          r.push({ title: '配对字符 ' + ch, reason: `从 (${from}) 对角回到 (${i},${j})。这一对属于恢复的公共子序列。`, lines: [6], phase: 'trace' });
        } else if (D[i - 1][j] >= D[i][j - 1]) {
          i--; r.push({ title: '跳过 X 的一个末位置', reason: `从 (${from}) 回到 (${i},${j})；上格不小于左格。同分时选另一边也可能得到不同的最优解。`, lines: [7], phase: 'trace' });
        } else {
          j--; r.push({ title: '跳过 Y 的一个末位置', reason: `从 (${from}) 回到 (${i},${j})，沿较大的左格。跳过位置正是子序列允许的操作。`, lines: [7], phase: 'trace' });
        }
      }
      const H = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      let subLength = 0, subEndX = 0, subEndY = 0;
      for (let a = 1; a <= m; a++) for (let b = 1; b <= n; b++) {
        H[a][b] = X[a - 1] === Y[b - 1] ? H[a - 1][b - 1] + 1 : 0;
        if (H[a][b] > subLength) { subLength = H[a][b]; subEndX = a; subEndY = b; }
      }
      const result = { length: D[m][n], sequence: selectedX.map(k => X[k]).join(''), selectedX, selectedY,
        substringLength: subLength, substring: X.slice(subEndX - subLength, subEndX).join('') };
      r.push({ title: '把题目改成连续子串，会发生什么？', reason: `LCS 长度 ${result.length}，恢复出 ${result.sequence || '空串'}；最长公共子串长度只有 ${subLength}。对照表 H 只记以这两位置结尾的连续匹配长度，失配就归零。`,
        lines: [8, 9], phase: 'final', substringTable: H, substringX: Array.from({ length: subLength }, (_, k) => subEndX - subLength + k),
        substringY: Array.from({ length: subLength }, (_, k) => subEndY - subLength + k), result });
      return r.frames;
    },
    render(f, v) {
      const labels = f.Y.map((ch, i) => `${i + 1}:${ch}`);
      let html = '<h4>绿色字符是当前恢复出的子序列，可跳过中间字符</h4>' + v.array(f.X, { selected: f.selectedX, active: f.i ? [f.i - 1] : [] }) + v.array(f.Y, { selected: f.selectedY, active: f.j ? [f.j - 1] : [] });
      html += v.table(['X前缀 / Y前缀', '空', ...labels], f.table.map((row, i) => [i ? `${i}:${f.X[i - 1]}` : '空', ...row.map(number)]), { active: [f.i, f.j + 1], highlights: f.highlights });
      if (f.substringTable) html += '<h4>连续子串对照：失配归零，不从上/左保留旧长度</h4>' + v.table(['连续结尾长度', '空', ...labels], f.substringTable.map((row, i) => [i ? f.X[i - 1] : '空', ...row]), {}) + '<p>一个最长公共子串：<strong>' + v.esc(f.result.substring || '空串') + '</strong></p>';
      return html;
    }
  };

  const mst = {
    title: '轻边什么时候才是安全边？', subtitle: 'Kruskal · 连通分量 · 父数组与割性质',
    concept: '按权重尝试边，以并查集判断是否成环。连接不同分量时，当前边是一个相容割的最轻边，可进入某个最优树；同权不保证唯一。图不连通时返回最小生成森林，不能称为生成树。',
    presets: [
      { name: '五点图：遇到一条轻但成环的边', data: { nodes: [{ id: 'A', x: 65, y: 140 }, { id: 'B', x: 190, y: 50 }, { id: 'C', x: 305, y: 155 }, { id: 'D', x: 425, y: 50 }, { id: 'E', x: 520, y: 220 }], edges: [{ u: 'A', v: 'B', w: 1 }, { u: 'C', v: 'D', w: 1 }, { u: 'A', v: 'C', w: 2 }, { u: 'B', v: 'C', w: 2 }, { u: 'D', v: 'E', w: 3 }, { u: 'B', v: 'D', w: 4 }, { u: 'C', v: 'E', w: 5 }] } },
      { name: '两个分量：森林不是一棵树', data: { nodes: [{ id: 'A', x: 80, y: 80 }, { id: 'B', x: 220, y: 80 }, { id: 'C', x: 150, y: 225 }, { id: 'D', x: 380, y: 80 }, { id: 'E', x: 520, y: 80 }, { id: 'F', x: 450, y: 225 }], edges: [{ u: 'A', v: 'B', w: 1 }, { u: 'B', v: 'C', w: 2 }, { u: 'A', v: 'C', w: 3 }, { u: 'D', v: 'E', w: 1 }, { u: 'E', v: 'F', w: 2 }, { u: 'D', v: 'F', w: 3 }] } }
    ],
    code: ['每个顶点单独成组；parent[x]=x，size[x]=1', '按 (权重,规范端点,原编号) 排序边',
      '逐条考虑边 (u,v,w)', 'ru=find(u)，rv=find(v)；find沿实际路径压缩',
      '若 ru==rv：跳过，否则会成环', '否则选入；小树接大树，相等时取较小根',
      '该边是分量割的最轻跨边，可安全加入', '已有 V-1 条选边则结束', '不足 V-1 条：报告不连通，只得到森林'],
    build(data) {
      const { nodes, ids, edges } = graphInput(data), parent = Object.create(null), size = Object.create(null);
      ids.forEach(id => { parent[id] = id; size[id] = 1; });
      const peek = x => { while (parent[x] !== x) x = parent[x]; return x; };
      const find = x => { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; };
      const edgeKey = e => [e.u, e.v].sort(cmp).join('\u0000');
      const sorted = edges.slice().sort((a, b) => a.w - b.w || cmp(edgeKey(a), edgeKey(b)) || cmp(a.id, b.id));
      let selected = [], rejected = [], activeEdge = null, cut = [], total = 0;
      const r = recorder(() => ({ nodes, edges, sorted, parent, size, roots: Object.fromEntries(ids.map(id => [id, peek(id)])), selected, rejected, activeEdge, cut,
        metrics: { '已选边': selected.length, '总权重': total, '连通分量': new Set(ids.map(peek)).size },
        invariant: '已选边构成森林；并查集恰好表示这片森林的连通分量。父指针是分组表示，不是原图路径。' }));
      r.push({ title: '先给每个顶点一个独立集合', reason: '还没有边；根的 size 记录集合规模。排序同权边只固定演示次序，不影响最优权重。', lines: [1, 2], phase: 'init' });
      for (let k = 0; k < sorted.length && selected.length < ids.length - 1; k++) {
        const e = sorted[k]; activeEdge = e.id; cut = [];
        r.push({ title: `尝试 ${e.u}—${e.v}，权重 ${e.w}`, reason: '轻不等于能直接加入；先看两端是否已经通过选中的边连通。', lines: [3], phase: 'consider' });
        if (k === 0 || k === Math.min(3, sorted.length - 1)) {
          const same = peek(e.u) === peek(e.v);
          r.push({ title: '先预测：加入还是跳过？', reason: '只根据当前已选边和分组判断，不根据图上是否存在一条直接边。', lines: [4], phase: 'predict',
            question: { prompt: `${e.u}—${e.v} 该怎样处理？`, options: ['连接不同分量，接受', '两端已连通，跳过'], correct: same ? 1 : 0, explain: same ? '两端已由选边连接，再加一条将成环。' : '两端属于不同分量。排序保证它是相容分量割的最轻跨边，可用交换论证证明安全。' } });
        }
        let a = find(e.u), b = find(e.v);
        r.push({ title: `找到代表：${e.u}→${a}，${e.v}→${b}`, reason: '父数组只压缩刚访问的路径；没有访问的支路保持原指针，也能找到正确根。', lines: [4], phase: 'find' });
        if (a === b) {
          rejected.push(e.id);
          r.push({ title: '跳过：这条边会构成环', reason: '它不会减少连通分量。连通性要看所有已选边，而不只看当前两点的父指针是否相等。', lines: [5], phase: 'reject' });
        } else {
          cut = ids.filter(id => peek(id) === a);
          const crosses = edge => cut.includes(edge.u) !== cut.includes(edge.v);
          const cutMin = Math.min(...edges.filter(crosses).map(edge => edge.w));
          if (size[a] < size[b] || (size[a] === size[b] && cmp(a, b) > 0)) [a, b] = [b, a];
          parent[b] = a; size[a] += size[b]; selected.push(e.id); total += e.w;
          r.push({ title: '接受：连接两个分量', reason: `合并前的割 S={${cut.join(',')}}，最轻跨边权为 ${cutMin}，当前边权 ${e.w}。若最优树未含它，加边成环后换掉另一条不轻于它的跨边，总权不增加。`, lines: [6, 7], phase: 'accept', cutMin });
        }
      }
      activeEdge = null; cut = [];
      const components = new Set(ids.map(peek)).size;
      r.push({ title: components === 1 ? '得到最小生成树' : '图不连通：得到最小生成森林', reason: components === 1 ? `共 ${selected.length} 条边，总权 ${total}。每一步保留某个最优解，最终连接全部顶点。` : `仍有 ${components} 个分量，只有 ${selected.length} 条选边。不存在覆盖全图的一棵生成树；总权 ${total} 是最小生成森林的权。`,
        lines: [components === 1 ? 8 : 9], phase: 'final', result: { total, selected, components, isSpanningTree: components === 1 } });
      return r.frames;
    },
    render(f, v) {
      let html = v.graph({ directed: false, nodes: f.nodes.map(n => Object.assign({}, n, { state: f.cut.includes(n.id) ? 'active' : 'default', tag: '组 ' + f.roots[n.id] })),
        edges: f.edges.map(e => ({ u: e.u, v: e.v, label: String(e.w), state: f.rejected.includes(e.id) ? 'rejected' : e.id === f.activeEdge ? 'active' : f.selected.includes(e.id) ? 'selected' : 'default' })) });
      html += '<p>绿色：已选边；灰红：已跳过；高亮顶点：本次合并前的分量割。</p>';
      html += v.table(['顶点', 'parent', '当前根', '根的集合大小'], f.nodes.map(n => [n.id, f.parent[n.id], f.roots[n.id], f.size[f.roots[n.id]]]), {});
      html += v.array(f.sorted.map(e => `${e.u}—${e.v}:${e.w}`), { active: f.sorted.flatMap((e, i) => e.id === f.activeEdge ? [i] : []), selected: f.sorted.flatMap((e, i) => f.selected.includes(e.id) ? [i] : []), rejected: f.sorted.flatMap((e, i) => f.rejected.includes(e.id) ? [i] : []) });
      return html;
    }
  };

  function bellmanReference(ids, edges, source) {
    const dist = Object.fromEntries(ids.map(id => [id, Infinity])); dist[source] = 0;
    for (let k = 1; k < ids.length; k++) {
      let changed = false;
      for (const e of edges) if (dist[e.u] !== Infinity && dist[e.u] + e.w < dist[e.v]) { dist[e.v] = dist[e.u] + e.w; changed = true; }
      if (!changed) break;
    }
    const bad = new Set();
    for (const e of edges) if (dist[e.u] !== Infinity && dist[e.u] + e.w < dist[e.v]) bad.add(e.v);
    const queue = [...bad];
    for (let i = 0; i < queue.length; i++) for (const e of edges) if (e.u === queue[i] && !bad.has(e.v)) { bad.add(e.v); queue.push(e.v); }
    bad.forEach(id => { dist[id] = -Infinity; });
    return dist;
  }
  const shortest = {
    title: '确定距离，与尝试改善，是两件事', subtitle: 'Dijkstra 确定 / 松弛分帧 · 负边反例保留错误轨迹',
    concept: 'd[v] 是已找到路线的最好长度。所有边非负时，最小暂定距离才可永久确定。负边预设故意运行不适用的算法，每帧都会警告；末尾用独立 Bellman–Ford 参考值指出错误，不把错误轨迹当正确答案。',
    presets: [
      { name: '非负图：多次改善与不可达点', data: { source: 'S', nodes: [{ id: 'S', x: 50, y: 145 }, { id: 'A', x: 220, y: 60 }, { id: 'B', x: 180, y: 230 }, { id: 'C', x: 370, y: 150 }, { id: 'D', x: 535, y: 85 }, { id: 'Z', x: 535, y: 240 }], edges: [{ u: 'S', v: 'A', w: 4 }, { u: 'S', v: 'B', w: 1 }, { u: 'B', v: 'A', w: 2 }, { u: 'B', v: 'C', w: 5 }, { u: 'A', v: 'C', w: 1 }, { u: 'A', v: 'D', w: 7 }, { u: 'C', v: 'D', w: 3 }] } },
      { name: '错误示范：有负边、没有负环', data: { source: 'S', nodes: [{ id: 'S', x: 70, y: 150 }, { id: 'A', x: 285, y: 65 }, { id: 'B', x: 285, y: 240 }, { id: 'T', x: 520, y: 150 }], edges: [{ u: 'S', v: 'A', w: 2 }, { u: 'S', v: 'B', w: 5 }, { u: 'B', v: 'A', w: -4 }, { u: 'A', v: 'T', w: 2 }] } }
    ],
    code: ['d[S]=0；其余 d=∞；所有点未锁定', 'u = 未锁定点中 d 最小者（同分按编号）', '若 d[u]==∞：停止，剩余不可达',
      '锁定 u；只有非负权条件下才能据此证明距离正确', '逐条检查 u 的出边 u→v', '若 v 未锁定且 d[u]+w<d[v]:',
      '  d[v]=d[u]+w；prev[v]=u', '已经锁定的 v 不再修改（负边反例就在此失败）', '返回程序记录；负边示范另列正确参考，不覆盖错误值'],
    build(data) {
      const { nodes, ids, edges } = graphInput(data), source = String(data.source);
      if (!ids.includes(source)) throw new Error('源点必须存在。');
      const unsafe = edges.some(e => e.w < 0), dist = Object.fromEntries(ids.map(id => [id, Infinity])), prev = Object.fromEntries(ids.map(id => [id, null])), prevEdge = Object.fromEntries(ids.map(id => [id, null]));
      const reference = bellmanReference(ids, edges, source);
      dist[source] = 0;
      let done = [], activeNode = null, activeEdge = null;
      const warning = '错误轨迹示范：存在负边，程序“锁定”不代表最短距离已正确。';
      const r = recorder(() => ({ nodes, ids, edges, source, unsafe, dist, prev, prevEdge, done, activeNode, activeEdge,
        warning: unsafe ? warning : '', metrics: { '程序已锁定': done.length, '尚未锁定': ids.length - done.length, '非负权前提': unsafe ? '不满足' : '满足' },
        invariant: unsafe ? warning + ' 只能保证有限 d 来自某条已知路线；“锁定点已最优”的不变量没有依据。' : '已确定点的 d 是正确最短距离；其他有限 d 是已知路线给出的上界，仍可改善。' }));
      r.push({ title: unsafe ? '先声明：下面是不能用于求正确答案的演示' : '源点为 0，其他点尚不可达', reason: unsafe ? '这张图有负边。故意沿标准 Dijkstra 的锁定规则运行，观察负边为何来不及修正；不会把错误结果替换成正确结果后伪装成功。' : '非负权下 S 到自身的 0 已最优。接下来将锁定动作和每条边的松弛分开展示。', lines: [1], phase: 'init' });
      while (done.length < ids.length) {
        const unvisited = ids.filter(id => !done.includes(id)).sort((a, b) => dist[a] - dist[b] || cmp(a, b));
        const u = unvisited[0]; activeNode = null; activeEdge = null;
        if (dist[u] === Infinity) {
          r.push({ title: '剩下的暂定值全部为 ∞', reason: '没有已找到的路线能进入这些点；停止扫描，不凭空生成前驱。', lines: [2, 3], phase: 'unreachable' }); break;
        }
        if (done.length === 1 || done.length === 2) {
          const choiceIds = ids.filter(id => !done.includes(id));
          const options = choiceIds.map(id => `${id}（d=${number(dist[id])}）`);
          r.push({ title: '先预测程序下一步锁定谁', reason: unsafe ? '这里只预测程序动作；负边图不享有“锁定即正确”的保证。' : '比较所有未确定点的暂定距离；不要按单条边的权重选择。', lines: [2], phase: 'predict',
            question: { prompt: '按最小暂定距离规则，下一点是哪一个？', options, correct: choiceIds.indexOf(u),
              explain: `${u} 的暂定值 ${number(dist[u])} 最小。${unsafe ? '但前提失效，不能据此认定它是真正最短距离。' : '非负边保证其他未确定路线不能后来把它压低。'}` } });
        }
        activeNode = u; done.push(u);
        r.push({ title: (unsafe ? '程序锁定 ' : '确定 ') + `${u}，d=${number(dist[u])}`, reason: unsafe ? '红色锁定只是错误程序的不可撤销决定；不是一项已证正确的结论。' : '这是确定动作，还没有处理本点出边。非负性与最小暂定值共同支持这一步。', lines: [4], phase: 'settle' });
        for (const e of edges.filter(e => e.u === u)) {
          activeEdge = e.id;
          const old = dist[e.v], candidate = dist[u] + e.w;
          if (done.includes(e.v)) {
            r.push({ title: '终点已锁定，程序跳过修改', reason: `${e.u}→${e.v} 给候选 ${number(candidate)}，原值 ${number(old)}。${candidate < old ? '更短路线已经出现，却被锁定规则挡住：负边破坏了正确性前提。' : '本边不产生更短候选。'}`, lines: [5, 8], phase: 'skip-locked', candidate, old, target: e.v });
          } else {
            const improves = candidate < old;
            if (improves) { dist[e.v] = candidate; prev[e.v] = u; prevEdge[e.v] = e.id; }
            r.push({ title: (improves ? '松弛成功：' : '无需改变：') + `${e.u}→${e.v}`, reason: `比较经 ${u} 的候选 ${number(candidate)} 与旧值 ${number(old)}。${improves ? '更新距离及前驱；此终点尚未锁定。' : '保留当前距离和前驱。'}`, lines: improves ? [5, 6, 7] : [5, 6], phase: 'relax', candidate, old, target: e.v, improves });
          }
        }
      }
      activeNode = null; activeEdge = null;
      const mismatches = ids.filter(id => dist[id] !== reference[id]);
      r.push({ title: unsafe ? '保留错误结果，与独立参考对照' : '非负图运行完成', reason: unsafe ? `不修改错误轨迹。${mismatches.length ? '不一致顶点：' + mismatches.join('、') + '。' : '本例数值碰巧一致，仍不能恢复缺失的非负权保证。'}参考由 Bellman–Ford 求出；可达负环后继会标记 −∞。` : '已锁定距离与独立 Bellman–Ford 参考一致。不可达点保持 ∞。有限例题核对不能取代非负权下的归纳证明。', lines: [9], phase: 'final', reference,
        result: { distances: dist, reference, mismatches, validAssumptions: !unsafe } });
      return r.frames;
    },
    render(f, v) {
      let html = f.unsafe ? '<p class="lab-warning" role="note"><strong>' + v.esc(f.warning) + '</strong></p>' : '';
      html += v.graph({ directed: true, nodes: f.nodes.map(n => Object.assign({}, n, { state: n.id === f.activeNode ? 'active' : f.done.includes(n.id) ? (f.unsafe ? 'rejected' : 'selected') : 'default', tag: `d=${number(f.dist[n.id])}${f.done.includes(n.id) ? (f.unsafe ? ' · 锁定' : ' · 确定') : ''}` })),
        edges: f.edges.map(e => ({ u: e.u, v: e.v, label: String(e.w), state: e.id === f.activeEdge ? 'active' : f.prevEdge[e.v] === e.id ? 'selected' : 'default' })) });
      html += '<p>高亮：本步正在处理；绿色边：当前前驱（可能仍是暂定路线）。负边示范中的红点仅表示程序已经锁定。</p>';
      html += v.table(['顶点', '程序 d', 'prev', '状态', ...(f.reference ? ['正确参考', '比较'] : [])], f.ids.map(id => [id, number(f.dist[id]), f.prev[id] ?? '—', f.done.includes(id) ? (f.unsafe ? '已锁定，未获保证' : '已确定') : '未锁定', ...(f.reference ? [number(f.reference[id]), f.dist[id] === f.reference[id] ? '一致' : '不一致'] : [])]), {});
      return html;
    }
  };
  root.AlgoLabs = root.AlgoLabs || {};
  Object.assign(root.AlgoLabs, { '06': knapsack, '07': lcs, '08': mst, '09': shortest });
})(typeof window !== 'undefined' ? window : globalThis);
