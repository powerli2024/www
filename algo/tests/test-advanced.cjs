'use strict';
// 无依赖、可复跑的有限验证。直接枚举/求和 oracle 不读取 build 内部实现。
// 它们可发现轨迹和边界错误，不代替教材里的正确性与复杂度证明。
// 运行：node tests/test-advanced.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
global.window = { AlgoLabs: {} };
require(path.join(__dirname, '..', 'assets', 'labs-advanced.js'));
const labs = global.window.AlgoLabs;
const clone = x => JSON.parse(JSON.stringify(x));
const final = frames => frames[frames.length - 1];
const counts = { presets: 0, frames: 0, questions: 0, flow: 0, kmp: 0, reduction: 0, bit: 0, ski: 0, dp: 0 };
const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const v = {
  esc,
  array(values, options = {}) {
    for (const key of ['active', 'selected', 'rejected']) for (const i of options[key] || []) assert(Number.isInteger(i) && i >= 0 && i < values.length, 'array index');
    return '<div>' + values.map(esc).join(' ') + '</div>';
  },
  table(headers, rows, options = {}) {
    for (const row of rows) assert.equal(row.length, headers.length);
    for (const [r, c] of options.highlights || []) assert(r >= 0 && r < rows.length && c >= 0 && c < headers.length, 'table highlight');
    return '<table>' + [headers, ...rows].map(row => '<tr>' + row.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</table>';
  },
  graph({ nodes, edges, directed }) {
    assert.equal(typeof directed, 'boolean');
    const ids = new Set(nodes.map(node => node.id));
    assert.equal(ids.size, nodes.length);
    for (const node of nodes) {
      assert(Number.isFinite(node.x) && node.x >= 0 && node.x <= 600);
      assert(Number.isFinite(node.y) && node.y >= 0 && node.y <= 300);
    }
    for (const edge of edges) assert(ids.has(edge.u) && ids.has(edge.v));
    return '<svg>' + nodes.map(node => '<text>' + esc(node.label) + '</text>').join('') + '</svg>';
  }
};

// 契约、可重播性、互相独立快照及所有预设的 render 调用。
for (const id of ['10', '11', '12', '13', '14', '15']) {
  const lab = labs[id];
  assert(lab && lab.presets.length >= 2 && lab.code.length > 0);
  for (const preset of lab.presets) {
    const before = clone(preset.data), frames = lab.build(preset.data);
    assert.deepEqual(preset.data, before, 'build must not mutate input');
    assert.deepEqual(lab.build(preset.data), frames, 'deterministic rebuild');
    assert(frames.length >= 10 && frames.length <= 40, id + ' preset frame budget');
    assert(frames.filter(frame => frame.question).length >= 2);
    assert.equal(final(frames).done, true);
    for (const frame of frames) {
      for (const field of ['title', 'reason', 'invariant']) assert.equal(typeof frame[field], 'string');
      assert(frame.title && frame.reason && frame.invariant);
      assert(Array.isArray(frame.lines) && frame.lines.length > 0);
      for (const line of frame.lines) assert(Number.isInteger(line) && line >= 1 && line <= lab.code.length);
      assert(frame.metrics && typeof frame.metrics === 'object');
      const html = lab.render(frame, v);
      assert.equal(typeof html, 'string');
      assert(html.length > 0 && !html.includes('undefined'));
      if (frame.question) {
        const question = frame.question;
        assert(question.prompt && question.explain);
        assert(question.options.length >= 2 && new Set(question.options).size === question.options.length);
        assert(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < question.options.length);
        counts.questions++;
      }
    }
    const first = JSON.stringify(frames[0]);
    final(frames).metrics.__mutation_probe = 1;
    assert.equal(JSON.stringify(frames[0]), first, 'frame snapshots must be independent');
    counts.presets++; counts.frames += frames.length;
  }
}

// 10：枚举所有 s-t 割作为独立最优值；每帧检查原边容量与流守恒。
function cutOracle(n, edges, s, t) {
  let best = Infinity;
  for (let mask = 0; mask < (1 << n); mask++) {
    if (!(mask & (1 << s)) || (mask & (1 << t))) continue;
    const capacity = edges.reduce((sum, [u, w, c]) => sum + ((mask & (1 << u)) && !(mask & (1 << w)) ? c : 0), 0);
    best = Math.min(best, capacity);
  }
  return best;
}
function testFlow(data) {
  const frames = labs['10'].build(data), last = final(frames);
  assert.equal(last.value, cutOracle(data.nodes.length, data.edges, data.source, data.sink));
  assert.equal(last.value, last.cutCapacity);
  for (const frame of frames) {
    const balance = Array(data.nodes.length).fill(0);
    data.edges.forEach(([u, w, c], i) => {
      const flow = frame.flows[i];
      assert(flow >= 0 && flow <= c);
      balance[u] -= flow; balance[w] += flow;
    });
    balance.forEach((net, i) => assert.equal(net, (i === data.source ? -frame.value : i === data.sink ? frame.value : 0) || 0));
    for (const edge of frame.residual) assert(edge.rem > 0);
  }
  counts.flow++;
  return frames;
}
const matchingFrames = testFlow(labs['10'].presets[0].data);
assert(matchingFrames.some(frame => frame.phase === 'augmented' && frame.path.some(edge => edge.reverse)), 'reverse augmentation must actually happen');
assert.deepEqual(final(matchingFrames).flows, [1, 1, 0, 1, 1, 1, 1]);
testFlow(labs['10'].presets[1].data);
let seed = 20261023;
const random = limit => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % limit; };
for (let run = 0; run < 100; run++) {
  const n = 2 + random(5), edges = [];
  for (let u = 0; u < n; u++) for (let w = 0; w < n; w++) if (u !== w && random(4) === 0 && edges.length < 20) edges.push([u, w, random(5)]);
  // 有向反平行边、零容量与不连通实例均允许；额外加入平行原边。
  if (run % 7 === 0) edges.push([0, n - 1, 2], [0, n - 1, 1]);
  testFlow({ nodes: Array.from({ length: n }, (_, i) => String(i)), edges, source: 0, sink: n - 1 });
}

// 11：直接逐起点比较字符；最长 border 用所有长度穷举，不使用 pi 回退。
function wordList(alphabet, maxLength) {
  let level = ['']; const words = [''];
  for (let length = 1; length <= maxLength; length++) { level = level.flatMap(word => alphabet.map(ch => word + ch)); words.push(...level); }
  return words;
}
function matchOracle(text, pattern) {
  const t = Array.from(text), p = Array.from(pattern), result = [];
  for (let start = 0; start + p.length <= t.length; start++) if (p.every((ch, i) => ch === t[start + i])) result.push(start);
  return result;
}
function prefixOracle(pattern) {
  const p = Array.from(pattern);
  return p.map((_, end) => {
    let best = 0;
    for (let length = 1; length <= end; length++) if (p.slice(0, length).every((ch, i) => ch === p[end + 1 - length + i])) best = length;
    return best;
  });
}
function testKmp(data) {
  const frames = labs['11'].build(data), last = final(frames);
  assert.deepEqual(last.matches, matchOracle(data.text, data.pattern));
  assert.deepEqual(last.pi, prefixOracle(data.pattern));
  assert.deepEqual(last.next, [-1, ...last.pi]);
  let previousI = 0;
  for (const frame of frames) {
    assert(frame.i >= previousI, 'text pointer cannot move backwards');
    previousI = frame.i;
    if (frame.phase === 'fallback') assert(frame.j < frame.oldJ && frame.text[frame.i] !== undefined);
  }
  counts.kmp++;
}
for (const text of wordList(['a', 'b'], 5)) for (const pattern of wordList(['a', 'b'], 3)) testKmp({ text, pattern });
for (const preset of labs['11'].presets) testKmp(preset.data);
testKmp({ text: '甲😀甲😀甲', pattern: '甲😀甲' });
assert.deepEqual(final(labs['11'].build(labs['11'].presets[0].data)).next, [-1, 0, 1, 2, 0, 1, 2, 3, 0]);

// 12：源问题按“没有双选端点”，目标独立地按“每边有已选端点”枚举。
function reductionOracle(n, edges, k) {
  let independent = false, cover = false;
  for (let mask = 0; mask < (1 << n); mask++) {
    const size = mask.toString(2).replaceAll('0', '').length;
    if (size >= k && edges.every(([u, w]) => !((mask & (1 << u)) && (mask & (1 << w))))) independent = true;
    if (size <= n - k && edges.every(([u, w]) => (mask & (1 << u)) || (mask & (1 << w)))) cover = true;
  }
  return { independent, cover };
}
for (let n = 1; n <= 4; n++) {
  const pairs = [];
  for (let u = 0; u < n; u++) for (let w = u + 1; w < n; w++) pairs.push([u, w]);
  for (let graph = 0; graph < (1 << pairs.length); graph++) {
    const edges = pairs.filter((_, i) => graph & (1 << i));
    for (let k = 0; k <= n; k++) {
      const data = { n, edges, k, selected: [0] }, last = final(labs['12'].build(data));
      const oracle = reductionOracle(n, edges, k);
      assert.equal(last.isExists, oracle.independent);
      assert.equal(last.coverExists, oracle.cover);
      assert.equal(last.isExists, last.coverExists);
      assert.equal(last.budget, n - k);
      if (last.witness) {
        assert(last.witness.length >= k);
        assert(edges.every(([u, w]) => !last.witness.includes(u) || !last.witness.includes(w)));
      }
      counts.reduction++;
    }
  }
}

// 13：普通数组作单点加，再直接逐项求区间和；验证每格 lowbit 区间。
function testBit(data) {
  const frames = labs['13'].build(data), last = final(frames), expected = data.a.slice();
  expected[data.index - 1] += data.delta;
  assert.deepEqual(last.a, expected);
  assert.equal(last.result, expected.slice(data.l - 1, data.r).reduce((sum, value) => sum + value, 0));
  expected.forEach((_, index) => {
    const i = index + 1;
    // 用整除求最低二进制位，避免复制实现中的位运算表达式。
    let length = 1; while (i % (length * 2) === 0) length *= 2;
    assert.equal(last.c[i], expected.slice(i - length, i).reduce((sum, value) => sum + value, 0));
  });
  for (const frame of frames.filter(f => f.phase === 'query' && f.active)) {
    assert.equal(new Set(frame.covered).size, frame.covered.length, 'prefix blocks must not overlap');
    assert.equal(frame.accumulator, frame.covered.reduce((sum, i) => sum + expected[i], 0));
  }
  counts.bit++;
}
for (const preset of labs['13'].presets) testBit(preset.data);
for (let run = 0; run < 150; run++) {
  const n = 1 + random(10), l = 1 + random(n), r = l + random(n - l + 1);
  testBit({ a: Array.from({ length: n }, () => random(15) - 7), index: 1 + random(n), delta: random(11) - 5, l, r });
}

// 14：离线 oracle 枚举第一天至最后一天购买，外加永不购买；比较相同历史前缀。
for (let B = 2; B <= 8; B++) {
  const histories = [];
  for (let days = 1; days <= 16; days++) {
    const last = final(labs['14'].build({ B, days }));
    const offline = Math.min(days, ...Array.from({ length: days }, (_, buyDayMinusOne) => buyDayMinusOne + B));
    assert.equal(last.opt, offline);
    assert.equal(last.cost, days < B ? days : 2 * B - 1);
    assert(last.cost / offline <= 2 - 1 / B + 1e-12);
    assert.equal(last.history.reduce((sum, row) => sum + row.pay, 0), last.cost);
    const buy = last.history.filter(row => row.action === '购买');
    assert.equal(buy.length, days >= B ? 1 : 0);
    if (buy.length) assert.deepEqual([buy[0].day, buy[0].pay], [B, B]);
    for (const old of histories) assert.deepEqual(last.history.slice(0, old.length), old, 'online decisions must not use horizon');
    histories.push(last.history);
    counts.ski++;
  }
}

// 15：独立递归枚举选/不选，不调用 DP 递推；核对每个前缀与恢复方案。
function nonadjacentOracle(a) {
  let best = 0;
  function enumerate(i, previousChosen, sum) {
    if (i === a.length) { best = Math.max(best, sum); return; }
    enumerate(i + 1, false, sum);
    if (!previousChosen) enumerate(i + 1, true, sum + a[i]);
  }
  enumerate(0, false, 0); return best;
}
function testDp(a) {
  const last = final(labs['15'].build({ a }));
  assert.equal(last.result, nonadjacentOracle(a));
  assert.equal(last.bruteBest, last.result);
  assert.deepEqual(last.F, Array.from({ length: a.length + 1 }, (_, i) => nonadjacentOracle(a.slice(0, i))));
  assert.equal(last.selected.reduce((sum, i) => sum + a[i], 0), last.result);
  assert(last.selected.every((i, at) => !at || i - last.selected[at - 1] > 1));
  counts.dp++;
}
let level = [[]];
for (let n = 0; n <= 5; n++) {
  for (const a of level) testDp(a);
  level = level.flatMap(a => [-2, 0, 3].map(value => [...a, value]));
}
for (const preset of labs['15'].presets) testDp(preset.data.a);

console.log(JSON.stringify({ status: 'passed', scope: 'finite independent-oracle and render-contract checks; not a proof or browser visual review', counts }, null, 2));
