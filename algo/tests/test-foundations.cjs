'use strict';
// node tests/test-foundations.cjs
// Independent finite oracles check results and every intermediate snapshot.
const assert = require('node:assert/strict');
global.window = {};
require('../assets/labs-foundations.js');
const labs = window.AlgoLabs;
const report = { presets: [], cases: { maximum: 0, twoSum: 0, bfs: 0, inversions: 0, intervals: 0 }, renderedFrames: 0 };
const clone = x => JSON.parse(JSON.stringify(x));
const eq = (a, b, message) => assert.deepEqual(a, b, message);
const sum = a => a.reduce((s, x) => s + x, 0);

function eachArray(n, domain, run, prefix = []) {
  if (prefix.length === n) return run(prefix);
  for (const x of domain) eachArray(n, domain, run, prefix.concat(x));
}

function allIntervals(a) {
  const out = [];
  for (let l = 0; l < a.length; l++) for (let r = l; r < a.length; r++) {
    out.push({ l, r, value: sum(a.slice(l, r + 1)) });
  }
  return out;
}

function assertRange(indices, end, message) {
  assert(indices.length > 0, message);
  for (let i = 1; i < indices.length; i++) eq(indices[i], indices[i - 1] + 1, message);
  if (end !== undefined) eq(indices.at(-1), end, message);
}

function checkMaximum(values) {
  const data = { values }, before = clone(data), frames = labs['01'].build(data);
  eq(data, before, 'maximum builder must not modify input');
  const oracle = allIntervals(values);
  for (const frame of frames) {
    const s = frame.state;
    if (s.endAt >= 0) {
      eq(s.end, Math.max(...oracle.filter(x => x.r === s.endAt).map(x => x.value)), 'end has the required endpoint');
      assertRange(s.endRange, s.endAt, 'end range is contiguous and nonempty');
      eq(sum(s.endRange.map(i => values[i])), s.end, 'end range realizes end');
    }
    if (s.bestThrough >= 0) {
      eq(s.best, Math.max(...oracle.filter(x => x.r <= s.bestThrough).map(x => x.value)), 'best covers the committed prefix only');
      assertRange(s.bestRange, undefined, 'best range is contiguous and nonempty');
      assert(s.bestRange.at(-1) <= s.bestThrough);
      eq(sum(s.bestRange.map(i => values[i])), s.best, 'best range realizes best');
    }
    if (s.phase === 'consider' && frame.question) {
      eq(frame.question.correct, s.restart > s.extend ? 0 : s.restart < s.extend ? 1 : 2, 'restart prediction answer');
    }
  }
  eq(frames.at(-1).state.best, Math.max(...oracle.map(x => x.value)));
  report.cases.maximum++;
}

function checkTwoSum(values, target) {
  const data = { values, target }, before = clone(data), frames = labs['02'].build(data);
  eq(data, before, 'twoSum builder must not modify input');
  const solutions = [];
  for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) if (values[i] + values[j] === target) solutions.push([i, j]);
  let previousRejected = 0, previousComparisons = 0;
  for (const frame of frames) {
    const s = frame.state, rejected = s.pairs.filter(p => p.status === 'rejected');
    assert(rejected.length >= previousRejected, 'exclusion only accumulates');
    assert(s.comparisons >= previousComparisons);
    previousRejected = rejected.length; previousComparisons = s.comparisons;
    for (const p of s.pairs) {
      assert(p.i < p.j, 'distinct positions');
      eq(p.sum, values[p.i] + values[p.j]);
      if (p.status === 'rejected') assert(p.sum !== target, 'no solution can be excluded');
    }
    if (s.phase === 'compare') {
      eq(s.currentSum, values[s.l] + values[s.r]);
      if (frame.question) eq(frame.question.correct, s.currentSum < target ? 0 : s.currentSum > target ? 1 : 2);
    }
    if (s.phase === 'move') {
      for (const [i, j] of solutions) assert(i >= s.l && j <= s.r, 'every true solution survives all discarded endpoints');
    }
  }
  const s = frames.at(-1).state;
  eq(Boolean(s.result), solutions.length > 0, 'result agrees with complete enumeration');
  if (s.result) {
    assert(s.result[0] < s.result[1]);
    eq(values[s.result[0]] + values[s.result[1]], target);
  } else assert(s.pairs.every(p => p.status === 'rejected'), 'no-solution result has exhausted all pairs');
  assert(s.comparisons <= Math.max(0, values.length - 1), 'linear comparison limit');
  report.cases.twoSum++;
}

function graphOracle(data) {
  const ids = data.nodes.map(n => n.id), n = ids.length;
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 0 : Infinity));
  for (const e of data.edges) {
    const i = ids.indexOf(e.u), j = ids.indexOf(e.v);
    d[i][j] = Math.min(d[i][j], 1);
    if (!data.directed) d[j][i] = Math.min(d[j][i], 1);
  }
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
  return Object.fromEntries(ids.map((id, j) => [id, Number.isFinite(d[ids.indexOf(data.source)][j]) ? d[ids.indexOf(data.source)][j] : null]));
}

function checkBfs(data) {
  const before = clone(data), frames = labs['03'].build(data), expected = graphOracle(data);
  eq(data, before, 'BFS builder must not modify input');
  for (const frame of frames) {
    const s = frame.state;
    eq(new Set(s.queue).size, s.queue.length, 'no duplicate enqueues');
    eq(new Set(s.order).size, s.order.length, 'each node dequeued once');
    for (let i = 1; i < s.queue.length; i++) assert(s.dist[s.queue[i - 1]] <= s.dist[s.queue[i]], 'FIFO distances nondecreasing');
    for (const n of s.nodes) {
      if (s.dist[n.id] !== null) eq(s.dist[n.id], expected[n.id], 'distance is final at first discovery');
      if (s.parents[n.id] !== null) {
        const p = s.parents[n.id];
        eq(s.dist[n.id], s.dist[p] + 1);
        assert(s.edges.some(e => e.u === p && e.v === n.id || !s.directed && e.v === p && e.u === n.id), 'parent is a real traversable edge');
      }
    }
    if (s.phase === 'inspect' && frame.question) eq(Number(frame.question.options[frame.question.correct]), s.dist[s.current] + 1);
  }
  eq(frames.at(-1).state.dist, expected, 'BFS agrees with independent all-pairs distance oracle');
  report.cases.bfs++;
}

function inversionOracle(a) {
  const pairs = [];
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) pairs.push([i, j]);
  return pairs;
}

function checkInversions(values) {
  const before = values.slice(), frames = labs['04'].build({ values }), oracle = inversionOracle(values);
  eq(values, before, 'merge builder must not modify input');
  const keys = new Set(oracle.map(p => p.join(',')));
  let oldCount = 0;
  for (const frame of frames) {
    const s = frame.state;
    eq(s.count, s.countedPairs.length);
    assert(s.count >= oldCount); oldCount = s.count;
    eq(new Set(s.countedPairs.map(p => p.join(','))).size, s.count, 'no double counted pairs');
    for (const p of s.countedPairs) assert(keys.has(p.join(',')), 'only real strict inversions counted');
    for (const p of s.deltaPairs) assert(keys.has(p.join(',')));
    for (let i = 1; i < s.buffer.length; i++) assert(s.buffer[i - 1].value <= s.buffer[i].value, 'merge buffer stays sorted');
    if (s.phase === 'emit' || s.phase === 'merged') {
      const consumed = s.left.slice(0, s.li).concat(s.right.slice(0, s.ri)).map(t => t.id).sort((a, b) => a - b);
      eq(s.buffer.map(t => t.id).sort((a, b) => a - b), consumed, 'buffer contains exactly consumed tokens');
    }
    for (const t of s.work) eq(t.value, values[t.id], 'original position identity preserved');
    if (s.phase === 'merged') {
      const part = s.work.slice(s.range[0], s.range[1] + 1).map(t => t.value);
      eq(part, part.slice().sort((a, b) => a - b), 'completed subproblem sorted');
    }
    if (s.phase === 'merge-ready' && frame.question) eq(frame.question.correct, s.left[0].value <= s.right[0].value ? 0 : 1);
  }
  const end = frames.at(-1).state;
  eq(end.finalCount, oracle.length);
  eq(end.countedPairs.map(p => p.join(',')).sort(), oracle.map(p => p.join(',')).sort());
  eq(end.work.map(t => t.value), values.slice().sort((a, b) => a - b));
  report.cases.inversions++;
}

function compatible(a, b) { return a.f <= b.s || b.f <= a.s; }
function optimalCount(list) {
  function visit(i, chosen) {
    if (i === list.length) return chosen.length;
    const without = visit(i + 1, chosen);
    return chosen.every(x => compatible(x, list[i])) ? Math.max(without, visit(i + 1, chosen.concat(list[i]))) : without;
  }
  return visit(0, []);
}

function checkGreedy(data) {
  const before = clone(data), frames = labs['05'].build(data), optimum = optimalCount(data.intervals);
  eq(data, before, 'greedy builder must not modify input');
  function valid(ids) {
    eq(new Set(ids).size, ids.length, 'no duplicate interval');
    const actual = ids.map(id => data.intervals.find(x => x.id === id));
    assert(actual.every(Boolean));
    for (let i = 0; i < actual.length; i++) for (let j = i + 1; j < actual.length; j++) assert(compatible(actual[i], actual[j]), 'selected intervals compatible');
  }
  for (const frame of frames) {
    const s = frame.state;
    valid(s.selected); valid(s.wrongSelected);
    assert(s.selected.length <= optimum && s.wrongSelected.length <= optimum);
    if (s.exchange) {
      valid(s.exchange.before); valid(s.exchange.after);
      eq(s.exchange.before.length, optimum, 'exchange begins with an actual optimum');
      eq(s.exchange.after.length, optimum, 'exchange preserves optimum cardinality');
      assert(s.exchange.finishG <= s.exchange.finishO, 'exchange boundary inequality');
      if (frame.lines.includes(11) || s.phase === 'done') eq(s.exchange.after[0], s.exchange.g, 'exchange makes first choice agree with greedy');
    }
  }
  eq(frames.at(-1).state.selected.length, optimum, 'earliest finish reaches independent optimum');
  report.cases.intervals++;
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = {
  esc,
  array(values, options = {}) {
    assert(Array.isArray(options.labels) && options.labels.length === values.length, 'every displayed array must explicitly define its pedagogical labels');
    return '<div>' + values.map(esc).join('|') + esc(JSON.stringify(options)) + '</div>';
  },
  table(headers, rows, options = {}) { return '<table>' + esc(JSON.stringify([headers, rows, options])) + '</table>'; },
  graph(spec) { return '<svg viewBox="0 0 600 300">' + esc(JSON.stringify(spec)) + '</svg>'; }
};

for (const id of ['01', '02', '03', '04', '05']) {
  const lab = labs[id];
  assert(lab && typeof lab.build === 'function' && typeof lab.render === 'function');
  assert(lab.title && lab.subtitle && lab.concept && lab.presets.length >= 2);
  for (const preset of lab.presets) {
    const frames = lab.build(preset.data);
    assert(frames.length >= 12 && frames.length <= 40, id + ' preset frame budget');
    assert(frames.filter(f => f.question).length >= 2, id + ' prediction stops');
    for (const f of frames) {
      assert(f.title && f.reason && f.invariant && Array.isArray(f.lines) && f.metrics && f.state);
      for (const line of f.lines) assert(Number.isInteger(line) && line >= 1 && line <= lab.code.length);
      if (f.question) {
        assert(f.question.prompt && f.question.explain && f.question.options.length >= 2);
        assert(Number.isInteger(f.question.correct) && f.question.correct >= 0 && f.question.correct < f.question.options.length);
      }
      const before = JSON.stringify(f), html = lab.render(f, view);
      assert(typeof html === 'string' && html.length);
      eq(JSON.stringify(f), before, 'render must be read-only');
      report.renderedFrames++;
    }
    const a = lab.build(preset.data), untouchedSecond = JSON.stringify(a[1]);
    a[0].state.__mutatedForIsolationTest = true;
    eq(JSON.stringify(a[1]), untouchedSecond, 'frame snapshots are independent');
    report.presets.push({ lesson: id, name: preset.name, frames: frames.length, predictions: frames.filter(f => f.question).length });
    if (id === '01') checkMaximum(preset.data.values);
    if (id === '02') checkTwoSum(preset.data.values, preset.data.target);
    if (id === '03') checkBfs(preset.data);
    if (id === '04') checkInversions(preset.data.values);
    if (id === '05') checkGreedy(preset.data);
  }
}

for (let n = 1; n <= 5; n++) eachArray(n, [-2, 0, 3], checkMaximum);
for (let n = 1; n <= 5; n++) eachArray(n, [-2, 0, 2], a => {
  if (a.some((x, i) => i && a[i - 1] > x)) return;
  for (let target = -4; target <= 4; target++) checkTwoSum(a, target);
});
for (let n = 0; n <= 5; n++) eachArray(n, [0, 1, 2], checkInversions);

const graphNodes = ['a', 'b', 'c', 'z'].map((id, i) => ({ id, x: 70 + i * 140, y: 150 }));
for (const directed of [false, true]) {
  const possible = directed ? [{ u: 'a', v: 'b' }, { u: 'a', v: 'c' }, { u: 'b', v: 'a' }, { u: 'b', v: 'c' }, { u: 'c', v: 'a' }, { u: 'c', v: 'b' }] :
    [{ u: 'a', v: 'b' }, { u: 'a', v: 'c' }, { u: 'a', v: 'z' }, { u: 'b', v: 'c' }, { u: 'b', v: 'z' }, { u: 'c', v: 'z' }];
  for (let mask = 0; mask < 2 ** possible.length; mask++) checkBfs({ nodes: graphNodes, source: 'a', directed, edges: possible.filter((_, i) => mask >> i & 1) });
}

const intervalPool = [{ id: 'a', s: 0, f: 1 }, { id: 'b', s: 0, f: 2 }, { id: 'c', s: 1, f: 2 },
  { id: 'd', s: 1, f: 3 }, { id: 'e', s: 2, f: 3 }, { id: 'f', s: 0, f: 3 }];
for (let mask = 0; mask < 2 ** intervalPool.length; mask++) for (const wrong of ['start', 'duration']) checkGreedy({ wrong, intervals: intervalPool.filter((_, i) => mask >> i & 1) });

assert.throws(() => labs['01'].build({ values: [] }));
assert.throws(() => labs['02'].build({ values: [3, 1, 2], target: 3 }));
assert.throws(() => labs['04'].build({ values: [Number.MAX_SAFE_INTEGER, 1] }));
assert.throws(() => labs['05'].build({ wrong: 'start', intervals: [{ id: 'a', s: 2, f: 2 }] }));
const malicious = '<img src=x onerror=alert(1)>';
const escapedFrames = labs['05'].build({ wrong: 'start', intervals: [{ id: malicious, s: 0, f: 1 }] });
for (const f of escapedFrames) assert(!labs['05'].render(f, view).includes('<img'), 'own SVG escapes task labels');

console.log(JSON.stringify({ status: 'pass', scope: '有限输入穷举、独立结果 oracle、逐帧状态不变量、纯函数与转义；不替代数学证明', ...report }, null, 2));
