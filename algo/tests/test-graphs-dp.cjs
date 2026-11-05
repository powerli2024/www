'use strict';
// Run: node tests/test-graphs-dp.cjs (from 网页), no packages/network needed.
// Finite independent oracles check data/trace logic, not browser layout or mastery.
const assert = require('node:assert/strict');
global.window = { AlgoLabs: {} };
require('../assets/labs-graphs-dp.js');
const labs = window.AlgoLabs;
const stats = { presets: 0, presetFrames: 0, renderedFrames: 0, knapsackCases: 0, lcsCases: 0, forestCases: 0, shortestCases: 0, negativeCases: 0, boundaryChecks: 0 };
const last = a => a[a.length - 1];
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
let renderedGraph;
const view = {
  esc,
  array(values, opts = {}) {
    for (const key of ['active', 'selected', 'rejected']) for (const i of opts[key] || []) assert.ok(Number.isInteger(i) && i >= 0 && i < values.length, 'array index');
    if (opts.labels) assert.equal(opts.labels.length, values.length);
    return '<div>' + values.map(esc).join('|') + '</div>';
  },
  table(headers, rows, opts = {}) {
    rows.forEach(row => assert.equal(row.length, headers.length, 'table column count'));
    for (const [r, c] of [...(opts.active ? [opts.active] : []), ...(opts.highlights || [])]) assert.ok(Number.isInteger(r) && r >= 0 && r < rows.length && Number.isInteger(c) && c >= 0 && c < headers.length, 'table highlight coordinates');
    return '<table>' + [headers, ...rows].map(row => '<tr>' + row.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</table>';
  },
  graph(g) {
    renderedGraph = g;
    assert.equal(typeof g.directed, 'boolean');
    const ids = g.nodes.map(n => n.id);
    assert.equal(new Set(ids).size, ids.length);
    g.nodes.forEach(n => { assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y)); assert.ok(['active', 'selected', 'rejected', 'default'].includes(n.state)); });
    g.edges.forEach(e => { assert.ok(ids.includes(e.u) && ids.includes(e.v)); assert.ok(['active', 'selected', 'rejected', 'default'].includes(e.state)); });
    return '<svg>' + [...g.nodes.map(n => n.label + ' ' + n.tag), ...g.edges.map(e => e.label)].map(esc).join(' ') + '</svg>';
  }
};
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
function validateFrames(id, frames) {
  assert.ok(frames.length > 0);
  for (const f of frames) {
    for (const key of ['title', 'reason', 'invariant']) assert.ok(typeof f[key] === 'string' && f[key].length > 0, `${id}:${key}`);
    assert.ok(f.metrics && typeof f.metrics === 'object');
    assert.ok(Array.isArray(f.lines) && f.lines.length > 0);
    f.lines.forEach(n => assert.ok(Number.isInteger(n) && n >= 1 && n <= labs[id].code.length));
    if (f.question) {
      const q = f.question;
      assert.ok(q.prompt && q.explain && q.options.length > 1);
      assert.equal(new Set(q.options).size, q.options.length);
      assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
      if (id === '06' && !f.demo) assert.equal(f.table[f.row][f.cap], null, 'predict before table update');
      if (id === '07') assert.equal(f.table[f.i][f.j], null, 'predict before table update');
      if (id === '08') assert.ok(!f.selected.includes(f.activeEdge) && !f.rejected.includes(f.activeEdge));
      if (id === '09') assert.equal(f.activeNode, null, 'prediction does not highlight its correct node');
    }
    const html = labs[id].render(f, view);
    assert.equal(typeof html, 'string');
    assert.ok(!html.includes('undefined') && !html.includes('NaN'), 'rendered values are defined');
    stats.renderedFrames++;
  }
}
for (const id of ['06', '07', '08', '09']) {
  const lab = labs[id];
  assert.ok(lab.title && lab.subtitle && lab.concept && lab.presets.length >= 2);
  for (const preset of lab.presets) {
    const input = freeze(structuredClone(preset.data));
    const frames = lab.build(input);
    assert.ok(frames.length >= 12 && frames.length <= 50, id + ' preset frame count');
    assert.ok(frames.filter(f => f.question).length >= 2, id + ' predictions');
    assert.deepEqual(frames, lab.build(input), 'deterministic trace');
    validateFrames(id, frames);
    // Separate snapshots: changing the returned first frame cannot rewrite later frames.
    const tail = structuredClone(last(frames));
    if (frames[0].table) frames[0].table[0][0] = 999;
    if (frames[0].parent) frames[0].parent.A = 'changed';
    if (frames[0].dist) frames[0].dist.S = 999;
    assert.deepEqual(last(frames), tail);
    stats.presets++; stats.presetFrames += frames.length;
  }
}

// 06 oracle enumerates subsets, not the DP recurrence.
function subsetValue(items, W) {
  let best = 0;
  for (let mask = 0; mask < 2 ** items.length; mask++) {
    let weight = 0, value = 0;
    items.forEach((a, i) => { if (mask & (1 << i)) { weight += a.w; value += a.v; } });
    if (weight <= W) best = Math.max(best, value);
  }
  return best;
}
function checkKnapsack(data) {
  const frames = labs['06'].build(data), result = last(frames).result;
  assert.equal(result.value, subsetValue(data.items, data.capacity));
  const chosen = result.selectedItems.map(i => data.items[i]);
  assert.equal(new Set(result.selectedItems).size, chosen.length);
  assert.ok(chosen.reduce((s, a) => s + a.w, 0) <= data.capacity);
  assert.equal(chosen.reduce((s, a) => s + a.v, 0), result.value);
  for (const f of frames.filter(f => f.phase === 'cell')) assert.equal(f.table[f.row][f.cap], subsetValue(data.items.slice(0, f.row), f.cap));
  assert.equal(result.descending, 3); assert.equal(result.ascending, 6);
  const demo = frames.filter(f => f.phase === 'demo-step');
  assert.deepEqual(demo.filter(f => f.demo.direction === 'descending').map(f => f.demo.values[4]), [3, 3, 3]);
  assert.deepEqual(demo.filter(f => f.demo.direction === 'ascending').map(f => f.demo.values[4]), [0, 0, 6]);
  stats.knapsackCases++;
}
const itemKinds = [1, 2].flatMap(w => [0, 1, 3].map(v => ({ w, v })));
function enumerateLists(alphabet, length, visit, prefix = []) {
  if (prefix.length === length) return visit(prefix);
  for (const value of alphabet) enumerateLists(alphabet, length, visit, [...prefix, value]);
}
for (let n = 0; n <= 3; n++) enumerateLists(itemKinds, n, items => { for (let capacity = 0; capacity <= 5; capacity++) checkKnapsack({ items, capacity }); });
assert.equal(last(labs['06'].build(labs['06'].presets[0].data)).result.value, 7);

// 07 oracle explicitly enumerates subsequences and contiguous slices.
function isSubsequence(xs, ys) { let i = 0; for (const y of ys) if (i < xs.length && xs[i] === y) i++; return i === xs.length; }
function lcsOracle(x, y) {
  const X = Array.from(x), Y = Array.from(y); let best = 0;
  for (let mask = 0; mask < 2 ** X.length; mask++) {
    const candidate = X.filter((_, i) => mask & (1 << i));
    if (candidate.length > best && isSubsequence(candidate, Y)) best = candidate.length;
  }
  return best;
}
function substringOracle(x, y) {
  const X = Array.from(x), Y = Array.from(y); let best = 0;
  for (let start = 0; start < X.length; start++) for (let end = start + 1; end <= X.length; end++) {
    const a = X.slice(start, end);
    for (let j = 0; j + a.length <= Y.length; j++) if (a.every((c, k) => c === Y[j + k])) best = Math.max(best, a.length);
  }
  return best;
}
function checkLCS(x, y) {
  const frames = labs['07'].build({ x, y }), f = last(frames), r = f.result, X = Array.from(x), Y = Array.from(y);
  assert.equal(r.length, lcsOracle(x, y)); assert.equal(r.substringLength, substringOracle(x, y));
  assert.equal(Array.from(r.sequence).length, r.length);
  assert.ok(isSubsequence(Array.from(r.sequence), X) && isSubsequence(Array.from(r.sequence), Y));
  assert.equal(r.sequence, r.selectedX.map(i => X[i]).join('')); assert.equal(r.sequence, r.selectedY.map(i => Y[i]).join(''));
  for (const selected of [r.selectedX, r.selectedY]) assert.ok(selected.every((v, i) => i === 0 || selected[i - 1] < v));
  for (const cell of frames.filter(f => f.phase === 'cell')) assert.equal(cell.table[cell.i][cell.j], lcsOracle(X.slice(0, cell.i).join(''), Y.slice(0, cell.j).join('')));
  stats.lcsCases++;
}
const strings = [''];
for (let n = 1; n <= 3; n++) enumerateLists(['A', 'B'], n, xs => strings.push(xs.join('')));
strings.forEach(x => strings.forEach(y => checkLCS(x, y)));
checkLCS('AXBYC', 'ABC'); checkLCS('😀甲😀乙', '甲😀'); checkLCS('AAA', 'AAAA');
assert.equal(last(labs['07'].build({ x: 'AXBYC', y: 'ABC' })).result.substringLength, 1);

// 08 oracle tries every edge subset and compares connectivity by BFS (no DSU).
function components(ids, edges) {
  const labels = Object.create(null); let count = 0;
  for (const start of ids) if (labels[start] === undefined) {
    const queue = [start]; labels[start] = count;
    for (let k = 0; k < queue.length; k++) for (const e of edges) {
      const next = e.u === queue[k] ? e.v : e.v === queue[k] ? e.u : null;
      if (next !== null && labels[next] === undefined) { labels[next] = count; queue.push(next); }
    }
    count++;
  }
  return { count, labels };
}
function forestOracle(ids, edges) {
  const target = components(ids, edges).count; let best = Infinity;
  for (let mask = 0; mask < 2 ** edges.length; mask++) {
    const chosen = edges.filter((_, i) => mask & (1 << i));
    if (chosen.length !== ids.length - target || components(ids, chosen).count !== target) continue;
    best = Math.min(best, chosen.reduce((s, e) => s + e.w, 0));
  }
  return { total: best, components: target };
}
function checkForest(data) {
  const ids = data.nodes.map(n => typeof n === 'object' ? n.id : n), frames = labs['08'].build(data), r = last(frames).result, expected = forestOracle(ids, data.edges);
  assert.equal(r.total, expected.total); assert.equal(r.components, expected.components); assert.equal(r.isSpanningTree, expected.components === 1);
  for (const f of frames) {
    const picked = f.edges.filter(e => f.selected.includes(e.id)), actual = components(ids, picked);
    assert.equal(picked.length, ids.length - actual.count, 'selected edges stay a forest');
    for (const u of ids) {
      let p = u, hops = 0; while (f.parent[p] !== p) { p = f.parent[p]; assert.ok(++hops < ids.length, 'parent pointers acyclic'); }
      assert.equal(p, f.roots[u]); assert.equal(f.size[p], ids.filter(v => f.roots[v] === p).length);
      for (const v of ids) assert.equal(f.roots[u] === f.roots[v], actual.labels[u] === actual.labels[v]);
    }
    if (f.phase === 'accept') {
      const e = f.edges.find(e => e.id === f.activeEdge);
      assert.equal(f.cut.includes(e.u) !== f.cut.includes(e.v), true);
      assert.equal(e.w, f.cutMin, 'accepted edge is light across displayed cut');
      assert.ok(picked.filter(a => a.id !== e.id).every(a => f.cut.includes(a.u) === f.cut.includes(a.v)), 'cut respects previously selected edges');
    }
  }
  stats.forestCases++;
}
const four = ['A', 'B', 'C', 'D'], undirectedPairs = [];
for (let i = 0; i < four.length; i++) for (let j = i + 1; j < four.length; j++) undirectedPairs.push([four[i], four[j]]);
enumerateLists([null, 1, 2], undirectedPairs.length, values => checkForest({ nodes: four, edges: values.flatMap((w, i) => w === null ? [] : [{ u: undirectedPairs[i][0], v: undirectedPairs[i][1], w }]) }));
checkForest({ nodes: ['A', 'B', 'C'], edges: [{ u: 'A', v: 'A', w: -8 }, { u: 'A', v: 'B', w: 3 }, { u: 'B', v: 'A', w: -2 }, { u: 'B', v: 'C', w: 0 }] });
checkForest({ nodes: ['alone'], edges: [] });
checkForest({ nodes: ['__proto__', 'constructor'], edges: [{ u: '__proto__', v: 'constructor', w: 1 }] });
assert.equal(last(labs['08'].build(labs['08'].presets[0].data)).result.total, 7);

// 09 independent Floyd–Warshall oracle, including reachable negative-cycle propagation.
function shortestOracle(ids, edges, source) {
  const n = ids.length, d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 0 : Infinity));
  edges.forEach(e => { const u = ids.indexOf(e.u), v = ids.indexOf(e.v); d[u][v] = Math.min(d[u][v], e.w); });
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] !== Infinity && d[k][j] !== Infinity) d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
  const s = ids.indexOf(source);
  return Object.fromEntries(ids.map((id, j) => [id, ids.some((_, k) => d[s][k] !== Infinity && d[k][k] < 0 && d[k][j] !== Infinity) ? -Infinity : d[s][j]]));
}
function checkShortest(data) {
  const ids = data.nodes.map(n => typeof n === 'object' ? n.id : n), frames = labs['09'].build(data), r = last(frames).result, expected = shortestOracle(ids, data.edges, data.source), unsafe = data.edges.some(e => e.w < 0);
  assert.deepEqual(r.reference, expected, 'Bellman–Ford reference vs independent Floyd');
  assert.equal(r.validAssumptions, !unsafe);
  assert.deepEqual(r.mismatches, ids.filter(id => r.distances[id] !== expected[id]));
  if (!unsafe) assert.deepEqual(r.distances, expected);
  const locked = new Map();
  for (let k = 0; k < frames.length; k++) {
    const f = frames[k];
    for (const [id, distance] of locked) assert.equal(f.dist[id], distance, 'trace never secretly fixes a locked point');
    if (unsafe) assert.ok(f.warning.includes('错误轨迹') && f.invariant.includes('没有依据'));
    if (f.phase === 'settle') {
      assert.equal(f.done.length, locked.size + 1);
      locked.set(f.activeNode, f.dist[f.activeNode]);
      if (!unsafe) assert.equal(f.dist[f.activeNode], expected[f.activeNode], 'settled value is optimal under nonnegative weights');
    }
    if (f.phase === 'relax' || f.phase === 'skip-locked') {
      const e = f.edges.find(e => e.id === f.activeEdge), before = frames[k - 1];
      assert.equal(f.candidate, before.dist[e.u] + e.w); assert.equal(f.old, before.dist[e.v]);
      assert.equal(f.dist[e.v], f.phase === 'relax' ? Math.min(f.old, f.candidate) : f.old);
    }
  }
  stats.shortestCases++; if (unsafe) stats.negativeCases++;
}
const three = ['S', 'A', 'B'], directedPairs = [];
for (const u of three) for (const v of three) if (u !== v) directedPairs.push([u, v]);
enumerateLists([null, 0, 2], directedPairs.length, values => checkShortest({ nodes: three, source: 'S', edges: values.flatMap((w, i) => w === null ? [] : [{ u: directedPairs[i][0], v: directedPairs[i][1], w }]) }));
const dagPairs = [['S', 'A'], ['S', 'B'], ['A', 'B']];
enumerateLists([null, -2, 0, 3], dagPairs.length, values => checkShortest({ nodes: three, source: 'S', edges: values.flatMap((w, i) => w === null ? [] : [{ u: dagPairs[i][0], v: dagPairs[i][1], w }]) }));
const negativeCycle = { nodes: ['S', 'A', 'B', 'T', 'Z'], source: 'S', edges: [{ u: 'S', v: 'A', w: 1 }, { u: 'A', v: 'B', w: 1 }, { u: 'B', v: 'A', w: -2 }, { u: 'B', v: 'T', w: 3 }, { u: 'Z', v: 'Z', w: -1 }] };
checkShortest(negativeCycle);
checkShortest({ nodes: ['S', 'A', 'B'], source: 'S', edges: [{ u: 'A', v: 'B', w: -2 }, { u: 'B', v: 'A', w: 1 }] });
for (const preset of labs['09'].presets) checkShortest(preset.data);
const failFrames = labs['09'].build(labs['09'].presets[1].data), failure = last(failFrames).result;
assert.equal(failure.distances.T, 4); assert.equal(failure.reference.T, 3); assert.equal(failure.distances.A, 2); assert.equal(failure.reference.A, 1);
assert.ok(failFrames.some(f => f.phase === 'skip-locked' && f.target === 'A' && f.candidate === 1 && f.old === 2));
const parallel = { nodes: ['S', 'A'], source: 'S', edges: [{ u: 'S', v: 'A', w: 5 }, { u: 'S', v: 'A', w: 2 }] };
checkShortest(parallel); labs['09'].render(last(labs['09'].build(parallel)), view);
assert.equal(renderedGraph.edges.filter(e => e.state === 'selected').length, 1, 'only the chosen parallel predecessor edge is highlighted');
assert.equal(renderedGraph.edges.find(e => e.state === 'selected').label, '2');

// Invalid input fails explicitly. Local render interpolation always passes user values through esc/helpers.
for (const [id, data] of [
  ['06', { capacity: -1, items: [] }], ['06', { capacity: 1, items: [{ w: 0, v: 2 }] }],
  ['07', { x: '123456789', y: '' }], ['08', { nodes: ['A', 'A'], edges: [] }],
  ['09', { nodes: ['S'], source: 'X', edges: [] }], ['08', { nodes: ['A'], edges: [{ u: 'A', v: 'B', w: 1 }] }]
]) { assert.throws(() => labs[id].build(data)); stats.boundaryChecks++; }
for (const id of ['06', '07', '08', '09']) {
  const data = id === '06' ? { capacity: 1, items: [{ name: '<img>', w: 1, v: 1 }] }
    : id === '07' ? { x: '<A>', y: 'A' }
      : { nodes: ['<img>', 'B'], source: '<img>', edges: [{ u: '<img>', v: 'B', w: 1 }] };
  for (const f of labs[id].build(data)) assert.ok(!labs[id].render(f, view).includes('<img>'));
  stats.boundaryChecks++;
}
console.log(JSON.stringify({ status: 'passed', ...stats, evidenceBoundary: '有限输入的算法值、状态轨迹、快照隔离、预测时机和渲染参数核验；不等于浏览器布局、用户掌握或所有输入证明。' }, null, 2));
