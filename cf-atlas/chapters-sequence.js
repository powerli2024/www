/* 序列、数据结构与字符串：所有区间均为零基半开区间 [l,r)。 */
(function () {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const fail = message => { throw new Error(message); };
  const record = (x, name = '输入') => { if (!x || typeof x !== 'object' || Array.isArray(x)) fail(name + '必须是对象。'); };
  const integer = (x, lo, hi, name) => { if (!Number.isSafeInteger(x) || x < lo || x > hi) fail(name + '必须是 ' + lo + ' 到 ' + hi + ' 的整数。'); };
  const list = (x, max, name) => { if (!Array.isArray(x) || x.length > max) fail(name + '必须是长度不超过 ' + max + ' 的数组。'); };
  const nums = (a, max = 16, lo = -20, hi = 20) => { list(a, max, 'a'); for (const x of a) integer(x, lo, hi, 'a 中的数'); };
  const word = (s, max, name) => { if (typeof s !== 'string' || s.length > max || !/^[a-z]*$/.test(s)) fail(name + '必须是长度不超过 ' + max + ' 的小写英文字母字符串，可以为空。'); };
  const range = (l, r, n, name) => { integer(l, 0, n, name + ' 的 l'); integer(r, l, n, name + ' 的 r'); };
  const tuple = (x, n, name) => { if (!Array.isArray(x) || x.length !== n) fail(name + '必须包含恰好 ' + n + ' 个数。'); };
  const random = seed => { let state = seed >>> 0; return (lo, hi) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return lo + state % (hi - lo + 1); }; };
  const span = (l, r) => Array.from({ length: Math.max(0, r - l) }, (_, i) => l + i);
  const ar = (label, values, active = [], marks = {}, done = []) => ({ label, values, active, marks, done });
  const tb = (label, columns, rows, activeRows = []) => ({ label, columns, rows, activeRows });
  const metric = (label, value) => ({ label, value });
  function code(cpp, notes) {
    const lines = {};
    cpp.split('\n').forEach((s, i) => { const m = s.match(/@([a-zA-Z0-9_]+)/); if (m) lines[m[1]] = i + 1; });
    return { cpp, lines, notes: Object.entries(notes).map(([tag, text]) => ({ line: lines[tag], text })) };
  }
  function frame(frames, c, title, explanation, tags, visuals, metrics = []) {
    frames.push(copy({ title, explanation, lines: tags.map(tag => c.lines[tag]), metrics, ...visuals }));
  }
  function register(chapter, c) { chapter.cpp = c.cpp; chapter.codeNotes = c.notes; CF.register(chapter); }
  const numbersOut = output => output.trim() ? output.trim().split(/\s+/).map(Number) : [];
  const source = (title, url, note) => ({ title, url, note });
  const ex = (question, options, answer, explanation) => ({ question, options, answer, explanation });
  const pit = (title, text, counterexample) => ({ title, text, counterexample });

  const prefixCode = code(`#include <iostream>
#include <vector>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> a(n), p(n + 1, 0); // @init
    for (auto &x : a) cin >> x;
    for (int i = 0; i < n; ++i) p[i + 1] = p[i] + a[i]; // @build
    while (q--) {
        int l, r; cin >> l >> r;
        cout << p[r] - p[l] << '\\n'; // @query
    }
    return 0; // @finish
}`, { init: 'p 比 a 多一个位置，p[0]=0 表示空前缀。', build: 'p[i+1] 对应 a[0..i]，数组下标与前缀长度不要混淆。', query: '半开区间 [l,r) 的答案固定为 p[r]-p[l]。' });
  function validatePrefix(d) {
    record(d); nums(d.a); list(d.queries, 16, 'queries');
    for (const q of d.queries) { tuple(q, 2, '查询'); range(q[0], q[1], d.a.length, '查询'); }
  }
  register({
    id: 'prefix-sum', section: 'foundation', title: '前缀和', subtitle: '把一段求和，变成两段前缀的相减', level: '基础',
    tags: ['区间查询', '静态数组', '可逆运算'], prerequisites: [],
    summary: '预处理 p[k]=前 k 个数之和，把静态数组的任意 [l,r) 区间和从逐项累加降为一次相减。负数不影响正确性。',
    lesson: {
      recognize: ['同一数组上有很多区间求和，查询之间没有修改。', '答案可以由两个前缀相消得到，例如加法与异或；最小值不能直接相减。', '数组允许负数与空数组。若频繁修改元素，应考虑树状数组或线段树，而不是反复重建。'],
      derive: [
        { title: '先看重复劳动', text: '对每个 [l,r) 扫描 r-l 项，q 次查询最坏 O(nq)。相邻查询往往反复累加同一批元素。' },
        { title: '保存从固定起点出发的答案', text: '定义 p[0]=0，p[k] 是 a[0] 到 a[k-1] 的和。已经知道 p[i] 后，只加 a[i] 就得到 p[i+1]，因此全部前缀只需一次扫描。' },
        { title: '用公共部分抵消', text: 'p[r] 包含 [0,l) 和 [l,r)；减去 p[l] 恰好消掉 [0,l)。例如 a=[3,-2,5]，p=[0,3,1,6]，区间 [1,3) 为 6-3=3。' },
        { title: '把边界统一进公式', text: '空前缀使 l=0 不必特判；空区间 l=r 的答案自然为零。推广到二维时，用容斥去掉两条多余前缀，再补回被重复减掉的交集。' }
      ],
      invariant: { title: 'p[k] 始终是恰好前 k 项之和', text: '构造结束后，对所有 0≤k≤n，p[k]=Σ a[i]（0≤i<k）。', proof: ['基例 k=0：空集合之和定义为 0，与初始化相符。', '归纳：若 p[k] 正确，p[k+1]=p[k]+a[k] 正好补上唯一缺失的第 k 项。', '任意 [l,r) 的前缀差中，[0,l) 的每项一次加、一次减，只有目标区间留下；元素符号不影响相消。'] },
      complexity: { time: '预处理 O(n)，每次查询 O(1)，总计 O(n+q)。', space: '辅助前缀 O(n)，另需 O(q) 保存演示输出。', conditions: 'n 为数组长度，q 为查询数。数组在查询间不变；和必须可由所选数值类型表示。C++ 用 long long。教学输入 n,q≤16，动画快照的复制开销不计入算法复杂度。' },
      pitfalls: [
        pit('把闭区间公式套到半开区间', '本章 r 不属于区间；如果题面是闭区间 [L,R]，先转换为 [L,R+1)。', 'a=[2,7]，查询 [0,1) 应为 2，不是 p[2]-p[0]=9。'),
        pit('前缀最小值不能相减', '求和依赖可逆性，并不是所有区间运算都能用两个前缀恢复。', 'a=[1,5,3] 的两个相关前缀最小值都为 1，但 [1,3) 的最小值是 3。'),
        pit('修改后仍用旧前缀', '一次 a[i] 修改会影响所有 k>i 的 p[k]。', 'a=[1,2] 原 p[2]=3；将 a[0] 改为 5 后，整段答案变为 7。'),
        pit('总和溢出', '单个元素能放进 int 不代表 n 项之和也能。', '3 个 10^9 的和是 3×10^9，超出有符号 32 位整数。')
      ],
      applications: ['静态区间总量、统计区间中某类字符个数：先把条件映射为 0/1。', '子数组和等于 K：枚举右端点，统计此前出现过多少个 p[r]-K；这里还需要频次表。'],
    },
    input: { description: 'a：最多16个 [-20,20] 整数；queries：最多16个 [l,r]，表示零基半开区间 [l,r)。允许空数组和空区间。', default: { a: [3,-2,5,1,-4,6], queries: [[0,3],[1,5],[3,3],[0,6]] }, presets: [{ name: '负数也能相消', data: { a: [-3,4,-2], queries: [[0,3],[1,3],[0,0]] } }, { name: '空数组', data: { a: [], queries: [[0,0]] } }], validate: validatePrefix },
    random(seed) { const r=random(seed), n=r(0,12), a=Array.from({length:n},()=>r(-10,10)), queries=[]; for(let i=0;i<r(2,8);i++){const l=r(0,n); queries.push([l,r(l,n)]);} return {a,queries}; },
    run(d) {
      validatePrefix(d); const {a,queries}=d, p=Array(a.length+1).fill(0), answers=[], frames=[];
      const show=(title,text,tags,active=[],pq=[])=>frame(frames,prefixCode,title,text,tags,{arrays:[ar('原数组 a',a,active),ar('前缀 p：下标表示前缀长度',p,pq)],tables:[tb('已回答的查询',['l','r（不含）','和'],answers.map((v,i)=>[...queries[i],v]))]});
      show('从空前缀开始','p[0]=0。尚未构造的其他位置暂存 0，不表示它们已经正确。',['init'],[],[0]);
      for(let i=0;i<a.length;i++){p[i+1]=p[i]+a[i];show('接入 a['+i+']','p['+(i+1)+'] = p['+i+'] + '+a[i]+' = '+p[i+1]+'。',['build'],[i],[i,i+1]);}
      queries.forEach(([l,r],i)=>{answers.push(p[r]-p[l]); show('回答查询 '+(i+1), '['+l+','+r+')：'+p[r]+' - '+p[l]+' = '+answers[i]+'。',['query'],span(l,r),[l,r]);});
      show('查询完成','所有前缀已固定。'+queries.length+' 次查询仅各做一次减法。',['finish']); return {frames,result:{answers}};
    },
    oracle(d) { validatePrefix(d); return {answers:d.queries.map(([l,r])=>{let s=0;for(let i=l;i<r;i++)s+=d.a[i];return s;})}; },
    exercises: [ex('a=[4,-1,2]，p[2] 表示什么？',['a[2] 的值 2','前两项之和 3','前三项之和 5'],1,'p 的下标是前缀长度，所以 p[2]=a[0]+a[1]=3。'),ex('空区间 [2,2) 的和为什么是 0？',['输入不合法','p[2]-p[2] 自动为 0','必须在每次查询中单独特判'],1,'本章允许空区间，统一公式已经覆盖它。'),ex('数组每次先改一个元素，再问区间和，最直接的升级是什么？',['继续用最初的 p','把值排序后用 p','维护树状数组或线段树'],2,'旧前缀会失效。动态数据结构用对数复杂度维护修改影响，且保留原下标顺序。')],
    sources: [source('USACO Guide · Introduction to Prefix Sums','https://usaco.guide/silver/prefix-sums','核查静态区间和、空前缀与可逆运算；本章采用零基半开区间重新组织推导。')],
    cppInput: d => `${d.a.length} ${d.queries.length}\n${d.a.join(' ')}\n${d.queries.map(q=>q.join(' ')).join('\n')}\n`, cppOutput: out => ({answers:numbersOut(out)}),
    transfer: { contrast: '前缀和把“查询很多次”变便宜；差分把“区间修改很多次”变便宜。二者互为离散累加与相邻相减。', next: ['difference','fenwick'], challenge: '把每个偶数映射为1、奇数映射为0，设计任意区间偶数个数查询，再思考二维矩形如何容斥。' }
  }, prefixCode);

  const differenceCode = code(`#include <iostream>
#include <vector>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> a(n), d(n + 1, 0); // @init
    for (auto &x : a) cin >> x;
    for (int i = 0; i < n; ++i) d[i] = a[i] - (i ? a[i - 1] : 0); // @build
    if (n) d[n] = -a[n - 1]; // @sentinel
    while (q--) {
        int l, r; long long v; cin >> l >> r >> v;
        d[l] += v; d[r] -= v; // @update
    }
    long long cur = 0;
    for (int i = 0; i < n; ++i) {
        cur += d[i]; // @recover
        cout << cur << (i + 1 == n ? '\\n' : ' ');
    }
    return 0; // @finish
}`, { build: '差分是相邻值之差；第一个元素相对虚拟的0。', update: '[l,r) 加 v，只有进入 l 和离开 r 两个边界产生变化。', recover: '前缀累加差分，恢复所有已叠加的区间修改。' });
  function validateDifference(d) { record(d); nums(d.a); list(d.updates,16,'updates'); for(const u of d.updates){tuple(u,3,'修改');range(u[0],u[1],d.a.length,'修改');integer(u[2],-20,20,'增量');} }
  register({
    id:'difference',section:'foundation',title:'差分数组',subtitle:'一整段一起加，只记录变化的两端',level:'基础',tags:['批量区间加','离线','边界事件'],prerequisites:['prefix-sum'],
    summary:'若一批区间加法结束后才需要最终数组，就把每次整段修改变成两个边界事件，最后用一次前缀累加还原。',
    lesson:{
      recognize:['操作是给连续区间每个位置加同一个量，正负增量均可。','允许先收集所有修改，再统一恢复最终数组；不是修改后立即任意区间求和的万能结构。','区间可为空，右端点可以恰好等于 n；用 n+1 个差分格保存退出边界。'],
      derive:[{title:'朴素做法反复涂同一段',text:'每次 [l,r) 加 v 都循环更新 r-l 项，q 次最坏 O(nq)。重叠区间的元素被多次访问。'},{title:'关注相邻位置之间的变化',text:'定义 d[0]=a[0]，d[i]=a[i]-a[i-1]。把整段抬高 v 后，段内部相邻两项一起变化，所以内部差值完全不变。'},{title:'只有入口与出口改变',text:'在 l 处相对左侧多出 v，因此 d[l]+=v；到 r 处恢复原高度，因此 d[r]-=v。维护虚拟 a[n]=0，d[n] 是出口哨兵，不属于结果。'},{title:'事件叠加后统一还原',text:'按从左到右扫描，用 cur 累加 d[i]。例如长度4的零数组，对 [1,3) 加5，差分为 [0,5,0,-5,0]，恢复为 [0,5,5,0]。每次更新仅改两格。'}],
      invariant:{title:'前缀中的边界事件恰好等于当前位置的净增量',text:'处理任意数量的更新后，Σ d[j]（0≤j≤i）等于初始 a[i] 加上覆盖 i 的全部更新量。',proof:['初始差分累加时相邻项相消，留下原 a[i]。','对一条 [l,r) 加 v：i<l 时两个事件都未进入前缀，贡献0；l≤i<r 时只有 +v；i≥r 时 +v 和 -v 抵消。','多条操作的贡献按加法叠加，所以顺序不影响最终数组；l=r 时两个事件在同一格立即抵消。']},
      complexity:{time:'构造 O(n)，每条更新 O(1)，最终恢复 O(n)，共 O(n+q)。',space:'差分 O(n)，恢复结果 O(n)。',conditions:'n 为元素数，q 为区间加次数，所有更新结束后才取最终数组。若每条更新后重建，仍会退回 O(nq)。教学 n,q≤16，C++ 用 long long 存叠加值。'},
      pitfalls:[pit('把退出事件放错位置','[l,r) 的退出点是 r；闭区间 [l,r] 才应在 r+1 减。','零数组长3，对 [0,2) 加4，应得 [4,4,0]，若在 d[1] 减就只改到第一项。'),pit('把有初值的数组当作全零','必须先由原数组构造差分，否则更新后丢掉原始数据。','a=[2,5]，对 [0,2) 加1，答案是 [3,6]，不是 [1,1]。'),pit('忘记 n 位置的哨兵','允许 r=n 时，d 必须能够访问 d[n]；这一格不能输出为真实元素。','a=[0,0]，给全段加3需要 d[0]+=3、d[2]-=3。只分配2格会越界。'),pit('直接拿差分回答元素值','d[i] 是变化，不是恢复后的高度。','差分 [0,5,0,-5] 对应前三项 [0,5,5]；d[2]=0 不意味着 a[2]=0。')],
      applications:['批量增加区间分数、路段流量或覆盖次数：操作完成后扫描一次即可。','把时间区间变成开始 +1、结束 -1 的事件，计算同时存在数量；若坐标很大，先排序或离散化，并保留真实段长。']
    },
    input:{description:'a：最多16个 [-20,20] 整数。updates：最多16条 [l,r,delta]，将半开区间 [l,r) 全部加 delta，delta∈[-20,20]。',default:{a:[1,3,2,0,4,1],updates:[[1,5,3],[0,3,-2],[4,6,2]]},presets:[{name:'空修改与全段修改',data:{a:[2,5],updates:[[0,2,1],[1,1,7]]}},{name:'空数组的空区间',data:{a:[],updates:[[0,0,4]]}}],validate:validateDifference},
    random(seed){const r=random(seed),n=r(0,12),a=Array.from({length:n},()=>r(-8,8)),updates=[];for(let i=0;i<6;i++){const l=r(0,n);updates.push([l,r(l,n),r(-6,6)]);}return {a,updates};},
    run(d){validateDifference(d);const {a,updates}=d,n=a.length,diff=Array(n+1).fill(0),result=[],frames=[];const show=(title,text,tags,active=[])=>frame(frames,differenceCode,title,text,tags,{arrays:[ar('初始 a',a),ar('边界差分 d（最后一格为哨兵）',diff,active),ar('已恢复的最终值',result)],tables:[tb('区间更新',['l','r（不含）','增量'],updates)]});
      show('准备 n+1 个边界','最后一格代表离开整个数组后的边界，不是输出元素。',['init']);
      for(let i=0;i<n;i++){diff[i]=a[i]-(i?a[i-1]:0);show('构造差分 '+i,'d['+i+']='+a[i]+'-'+(i?a[i-1]:0)+'='+diff[i]+'。',['build'],[i]);}
      if(n){diff[n]=-a[n-1];show('关闭初始高度','虚拟 a[n]=0，因此 d[n]=-a[n-1]。',['sentinel'],[n]);}
      updates.forEach(([l,r,v],i)=>{diff[l]+=v;diff[r]-=v;show('叠加操作 '+(i+1),l===r?'这是空区间，同一位置的 +'+v+' 与 -'+v+' 抵消。':'入口 '+l+' 加 '+v+'，出口 '+r+' 减 '+v+'，内部差分不动。',['update'],[l,r]);});
      let cur=0;for(let i=0;i<n;i++){cur+=diff[i];result.push(cur);show('恢复位置 '+i,'累加到 d['+i+'] 后，高度为 '+cur+'。',['recover'],[i]);}
      show('批量修改完成','输出 '+n+' 项，不输出末尾哨兵。',['finish']);return {frames,result:{array:result}};
    },
    oracle(d){validateDifference(d);const a=d.a.slice();for(const [l,r,v]of d.updates)for(let i=l;i<r;i++)a[i]+=v;return {array:a};},
    exercises:[ex('对 [2,5) 加7，应修改哪两个差分位置？',['d[2]+=7，d[4]-=7','d[2]+=7，d[5]-=7','d[1]+=7，d[5]-=7'],1,'位置5不在区间中，增量从那里退出。'),ex('同一空区间 [1,1) 加10，会发生什么？',['数组第1项增加10','必须修改整个后缀','两个边界事件抵消，数组不变'],2,'入口和出口重合，所以没有被覆盖的元素。'),ex('每次区间加后还要立即查询某点，如何复用这个思想？',['在差分上用树状数组维护点加与前缀和','每次仅输出 d[i]','先把全部查询丢弃'],0,'点值是差分前缀和。树状数组动态维护差分，可把这两步组合成 O(log n) 操作。')],
    sources:[source('USACO Guide · More on Prefix Sums','https://usaco.guide/silver/more-prefix-sums','核查 Difference Arrays 小节与批量区间更新思想。')],
    cppInput:d=>`${d.a.length} ${d.updates.length}\n${d.a.join(' ')}\n${d.updates.map(x=>x.join(' ')).join('\n')}\n`,cppOutput:out=>({array:numbersOut(out)}),
    transfer:{contrast:'前缀和预存答案，差分预存变化。需要在线处理时，把差分作为树状数组维护的对象即可继续升级。',next:['fenwick','segment-tree'],challenge:'用两个差分层分别统计“每条操作被执行几次”和“每个元素增加多少”，解释为什么不能简单重复执行所有操作。'}
  },differenceCode);

  const windowCode = code(`#include <iostream>
#include <vector>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; long long limit; cin >> n >> limit;
    vector<long long> a(n); for (auto &x : a) cin >> x;
    int l = 0, bestL = 0, bestR = 0; long long sum = 0; // @init
    for (int r = 0; r < n; ++r) {
        sum += a[r]; // @expand
        while (sum > limit) { sum -= a[l]; ++l; } // @shrink
        if (r + 1 - l > bestR - bestL) { bestL = l; bestR = r + 1; } // @best
    }
    cout << bestR - bestL << ' ' << bestL << ' ' << bestR << '\\n'; // @finish
}`,{expand:'右端点逐个加入，sum 对应当前窗口。',shrink:'仅在非负元素条件下，去掉左端点才能保证和不增加。',best:'只在长度严格更大时更新，因此相同长度保留最早的左端点。'});
  function validateWindow(d){record(d);nums(d.a,20,0,20);integer(d.limit,0,400,'limit');}
  register({
    id:'sliding-window',section:'sequence',title:'双指针与滑动窗口',subtitle:'右端点扩张，左端点只向前修复',level:'核心',tags:['同向双指针','非负数组','单调边界'],prerequisites:['prefix-sum'],
    summary:'在非负数组中，求和不超过 limit 的最长连续区间。维护一个活动窗口，让左右端点各走一次；同长时返回最早区间。',
    lesson:{recognize:['目标是连续子数组，而不是可任意跳选的子序列。','加入右侧元素只会让和不减，删除左侧元素只会让和不增：本章要求 a[i]≥0。','约束界线随右端点单调前进。存在负数时，当前超标的窗口可能在未来重新合法，不能照搬。'],
      derive:[{title:'枚举左右端点',text:'朴素枚举 O(n²) 个区间，逐项累加还会更慢；前缀和能将每次判断降为 O(1)，但仍保留二次枚举。'},{title:'固定右端点，找最早合法左端点',text:'非负数组中，删去左侧元素不会使和增加。若 [l,r] 超限，就持续删除 a[l]，直到得到当前右端点下最长的合法后缀。'},{title:'左边界无需重新从0出发',text:'上一步已经淘汰的左端点，在增加一个非负元素后仍然不可能合法。因此 l 只增不减，不需要对每个 r 重新搜索。'},{title:'沿移动边界更新答案',text:'每加入一个元素，先恢复 sum≤limit，再比较长度 r+1-l。只在严格变长时替换，保证相同长度保留最早左端点；全无可选元素时保留空区间 [0,0)。'}],
      invariant:{title:'修复后窗口合法，且没有遗漏更长的同右端点答案',text:'每轮结束时 sum=Σa[l..r]≤limit；所有更小的左端点已经因为和超限而被永久排除。',proof:['初始空窗口和为0，limit≥0，所以合法。','加入 a[r] 后，循环每次准确减去即将离开的 a[l]，sum 始终对应真实窗口；最坏删空后和为0，循环一定停止。','某左端点被删除时对应区间已超限，未来再加入非负项不会降低它的和，因此永远不必回退。','当前保留的是该右端点下最早合法的左端点，故其长度最大；遍历所有右端点就覆盖全局最优。']},
      complexity:{time:'O(n)：右端点移动 n 次，左端点总共至多 n 次。',space:'算法额外空间 O(1)，不计输入、输出和教学帧。',conditions:'n 为数组长度，所有 a[i]≥0、limit≥0。不能仅看 while 嵌套就断言 O(n²)，应累计指针移动次数。教学 n≤20。'},
      pitfalls:[pit('把负数悄悄混进输入','非负性是永久淘汰左端点的依据，不是实现细节。','a=[5,-4]，limit=1。若见到5就删掉它，会漏掉长度2且和为1的整段。'),pit('只缩一次就更新答案','一次删除未必足以恢复约束，必须 while。','a=[1,1,1,4]，limit=4，加入4后和为7；只删一个1仍为6，必须继续缩。'),pit('边界与长度混淆','循环中的 r 是刚加入的元素下标，输出 right 是不包含的端点。','a=[1]，limit=1，正确区间 [0,1) 长度1，而不是 [0,0)。'),pit('忽视零与无解情形','零不增加和，可能延长答案；若没有非空合法区间，明确返回空区间。','a=[0,0]，limit=0，答案长2；a=[3]，limit=0，答案是 [0,0)。')],
      applications:['限定总阅读时间内的最长连续书段、非负费用下的最长连续活动。','窗口内不同值最多 K 种：用频次表维护约束，但需要另行证明右扩与左缩的合法性单调。']},
    input:{description:'a：最多20个 [0,20] 整数，禁止负数。limit：0到400。返回 length 与半开区间 [left,right)，同长选最早，空数组返回 [0,0)。',default:{a:[2,1,4,2,1,1,3],limit:6},presets:[{name:'零也延长窗口',data:{a:[0,0,3,0,0],limit:0}},{name:'所有单项都超标',data:{a:[4,5],limit:2}},{name:'空数组',data:{a:[],limit:0}}],validate:validateWindow},
    random(seed){const r=random(seed);return {a:Array.from({length:r(0,16)},()=>r(0,9)),limit:r(0,25)};},
    run(d){validateWindow(d);const {a,limit}=d,frames=[];let l=0,sum=0,bestL=0,bestR=0;const show=(title,text,tags,r=-1)=>frame(frames,windowCode,title,text,tags,{arrays:[ar('数组与当前窗口',a,span(l,r+1),{...(l<a.length?{[l]:'l'}:{}),...(r>=0?{[r]:'r（含）'}:{})})],tables:[tb('最优半开区间',['left','right','length'],[[bestL,bestR,bestR-bestL]])]},[metric('当前和',sum),metric('上限',limit),metric('窗口长度',Math.max(0,r+1-l))]);
      show('从空窗口开始','sum=0，最优答案初始化为 [0,0)。',['init']);
      for(let r=0;r<a.length;r++){sum+=a[r];show('向右加入 '+r,'加入 '+a[r]+' 后，检查窗口是否超过 '+limit+'。',['expand'],r);while(sum>limit){const removed=l;sum-=a[l++];show('移除左端 '+removed,'原窗口超限，减去 '+a[removed]+'，l 前进到 '+l+'。',['shrink'],r);}if(r+1-l>bestR-bestL){bestL=l;bestR=r+1;show('找到更长区间','记录 ['+bestL+','+bestR+')，长度 '+(bestR-bestL)+'。',['best'],r);}else{show('保持当前最优','合法窗口长度 '+(r+1-l)+' 未严格超过已有答案；同长保留最早区间。',['best'],r);}}
      frame(frames,windowCode,'扫描结束','左右指针都不回退，最优区间已确定。',['finish'],{arrays:[ar('最终选择',a,span(bestL,bestR))]},[metric('最长长度',bestR-bestL)]);return {frames,result:{length:bestR-bestL,left:bestL,right:bestR}};},
    oracle(d){validateWindow(d);let left=0,right=0;for(let l=0;l<d.a.length;l++){let sum=0;for(let r=l;r<d.a.length;r++){sum+=d.a[r];if(sum<=d.limit&&r+1-l>right-left){left=l;right=r+1;}}}return {length:right-left,left,right};},
    exercises:[ex('为什么 a=[5,-4]、limit=1 不能套用此算法？',['数组太短','被删去的5以后可能因负数到来而重新合法','窗口不能包含两个数'],1,'整段和为1，长度2；删除5后无法回退，所以会漏解。'),ex('a=[0,0,1]、limit=0 的最优区间是？',['[0,2)','[0,0)','[0,3)'],0,'零满足约束且会增长长度，前两个零组成最长合法区间。'),ex('两层循环为什么仍是 O(n)？',['因为每轮 while 只执行一次','因为输入已经排序','因为 l 在整个程序里最多前进 n 次'],2,'均摊分析关注总移动次数。单轮可以缩很多次，但全部轮次合计不超过 n 次。')],
    sources:[source('USACO Guide · Two Pointers','https://usaco.guide/silver/two-pointers','核查滑动窗口、Books 示例与双指针的总移动次数。')],
    cppInput:d=>`${d.a.length} ${d.limit}\n${d.a.join(' ')}\n`,cppOutput:out=>{const [length,left,right]=numbersOut(out);return {length,left,right};},transfer:{contrast:'前缀和缩短单次查询，双指针进一步减少需要检查的区间数量。单调队列则能维护移动窗口中的极值。',next:['monotonic-deque','binary-answer'],challenge:'将条件改为“窗口中不同数字最多 K 个”，写出加入、删除时频次的变化，并证明左端点仍不必回退。'}
  },windowCode);

  const binaryCode=code(`#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, k; cin >> n >> k;
    vector<long long> a(n); for (auto &x : a) cin >> x;
    if (n == 0) { cout << 0 << '\\n'; return 0; } // @empty
    long long lo = *max_element(a.begin(), a.end());
    long long hi = accumulate(a.begin(), a.end(), 0LL); // @init
    auto feasible = [&](long long cap) {
        int groups = 1; long long sum = 0; // @check
        for (long long x : a) {
            if (sum + x > cap) { ++groups; sum = 0; } // @split
            sum += x; // @append
        }
        return groups <= k; // @verdict
    };
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2; // @mid
        if (feasible(mid)) hi = mid; // @yes
        else lo = mid + 1; // @no
    }
    cout << lo << '\\n'; // @finish
}`,{init:'每段至少容纳其中最大元素，上界是把整段放在一起的总和。',split:'对于给定容量，尽可能延长当前段，满了才开新段。',yes:'mid 可行时保留 mid，因为它仍可能是最小答案。',no:'mid 不可行时，所有不大于 mid 的容量都不可能成为答案。'});
  function validateBinary(d){record(d);nums(d.a,12,0,20);integer(d.k,d.a.length?1:0,d.a.length,'k');}
  register({
    id:'binary-answer',section:'sequence',title:'二分答案',subtitle:'把求最优值，改成“这个上限够不够”',level:'核心',tags:['判定单调性','最小可行值','贪心检查'],prerequisites:['sliding-window'],
    summary:'将非负数组切成至多 k 个非空连续段，最小化各段和的最大值。二分容量，用一次贪心扫描判断是否能装下。',
    lesson:{recognize:['题目问最小可能的最大值，直接选择切点有指数种方案。','给定候选容量 C 后，能在线性时间检查是否只需至多 k 段。','可行性对 C 单调：容量足够后再增大仍足够。本章非负元素保证贪心检查正确，不能只凭“求最值”就二分。'],derive:[{title:'先写出昂贵的原问题',text:'n 项之间有 n-1 个缝隙，枚举哪些缝隙切开共有 2^(n-1) 种分段。真正困难的是同时决定多个切点。'},{title:'把最优值当作外部限制',text:'假设每段和最多为 C，问题只剩“需要几段”。从左到右尽量塞进当前段；下一个数放不下时才开新段。若段数≤k，C 可行。'},{title:'证明判定具有单调性',text:'若某个分段方案在 C 下合法，同一方案在更大的容量下仍然合法，因此可行性是先假后真。无需枚举每一个容量。'},{title:'维持包含答案的闭区间',text:'非空数组的答案在 [max(a),sum(a)]。取 mid=lo+(hi-lo)/2；可行则 hi=mid，不可行则 lo=mid+1。lo=hi 时唯一剩下的数就是最小可行容量。'}],
      invariant:{title:'二分保留最优答案，判定使用最少段数',text:'每轮开始时最小可行容量 C* 在 [lo,hi]，hi 始终可行。',proof:['任意方案都必须装下最大单项，而整段总和一定可行，所以初始区间包含 C*。','对固定容量，贪心第一段覆盖的前缀不短于任何合法第一段。若贪心前 t-1 段覆盖得至少一样远，非负性保证从这个更晚起点到对方第 t 段末尾仍放得下，所以贪心第 t 段也不会落后。','因此贪心以最少段数覆盖数组，groups≤k 的判断可靠；容量增大不破坏任何已存在的方案。','mid 可行意味着 C*≤mid；不可行意味着 C*>mid。两种更新都保留 C* 且缩小区间，最终 lo=hi=C*。']},
      complexity:{time:'一次判定 O(n)，含初始化共 O(n·(1+log(S-M+1)))；S=M 时不进入二分。',space:'算法额外空间 O(1)，输入数组占 O(n)。',conditions:'n 为长度，S=sum(a)，M=max(a)，n>0 时 1≤k≤n 且所有数非负；空数组只接受 k=0，答案定义为0。教学 n≤12，暴力 oracle 枚举切点而非复用贪心。'},
      pitfalls:[pit('只知道答案有序，却没证明判定','二分需要可靠的单调布尔谓词。非负性还支撑“尽量装满”这一判定。','a=[4,-3]、k=1 的最优最大段和为1，max(a)=4 已不是合法下界，整套本章前提失效。'),pit('可行时丢掉 mid','搜索第一个真时，mid 可能正是答案。','a=[2,2,2]、k=2，正确答案4。初始 [2,6] 的 mid=4 可行；若误写 hi=mid-1，会把答案4排除，最终可能返回不可行的3。'),pit('把最多 k 段当成必须 k 段并乱补空段','本章判定最多 k 个非空段；非空数组 k≤n，非负数允许继续分裂成恰好 k 段而不增大最大和。','a=[0,0]、k=2，贪心容量0只需1段仍可行；可在中间再切开，不能误判为不满足。'),pit('中点或总和溢出','使用足够宽的总和类型，并用 lo+(hi-lo)/2。','lo=1.5×10^9、hi=2×10^9 时 lo+hi 超过32位，而中点本身没有超限。')],applications:['连续任务分批、按顺序运输、最小化最大工作量：当切段判定能贪心时使用。','最大化最小间距也可二分，但谓词方向会反过来，应重新定义不变量，不能照抄边界更新。']},
    input:{description:'a：最多12个 [0,20] 整数。非空时 k∈[1,n]，代表至多 k 个非空连续段；空数组要求 k=0，答案为0。',default:{a:[7,2,5,10,8],k:2},presets:[{name:'全零与多个允许段',data:{a:[0,0,0],k:3}},{name:'每项独立',data:{a:[4,1,7],k:3}},{name:'空任务',data:{a:[],k:0}}],validate:validateBinary},
    random(seed){const r=random(seed),n=r(0,10);return {a:Array.from({length:n},()=>r(0,15)),k:n?r(1,n):0};},
    run(d){validateBinary(d);const {a,k}=d,frames=[];if(!a.length){frame(frames,binaryCode,'空数组','没有任务，约定 k=0、最小容量为0。',['empty'],{arrays:[ar('输入',[])]});frame(frames,binaryCode,'返回0','空问题已结束，不进入二分。',['empty'],{tables:[tb('答案',['capacity'],[[0]])]});return {frames,result:{capacity:0}};}
      let lo=Math.max(...a),hi=a.reduce((s,x)=>s+x,0);const history=[];const show=(title,text,tags,mid='—',groups=[],active=[])=>frame(frames,binaryCode,title,text,tags,{arrays:[ar('原序列，必须保持顺序',a,active)],tables:[tb('本次贪心分段',['段号','l','r（不含）','段和'],groups.map((g,i)=>[i+1,g.l,g.r,g.sum])),tb('二分记录',['容量','所需段数','是否≤k'],history)]},[metric('lo',lo),metric('hi',hi),metric('mid',mid),metric('允许段数',k)]);
      show('确定答案范围','最大单项为下界，总和为可行上界。',['init']);
      while(lo<hi){const mid=lo+Math.floor((hi-lo)/2),groups=[{l:0,r:0,sum:0}];show('尝试容量 '+mid,'先构造一个空的当前段，随后逐个放入元素。',['mid','check'],mid,groups);for(let i=0;i<a.length;i++){let g=groups[groups.length-1];if(g.sum+a[i]>mid){groups.push({l:i,r:i,sum:0});g=groups[groups.length-1];show('原段放不下','加入 '+a[i]+' 将超出容量，必须在 '+i+' 前切开。',['split'],mid,groups,[i]);}g.sum+=a[i];g.r=i+1;show('装入位置 '+i,'当前段和为 '+g.sum+'，目前用了 '+groups.length+' 段。',['append'],mid,groups,[i]);}const ok=groups.length<=k;history.push([mid,groups.length,ok?'可行':'不可行']);show('判定 '+(ok?'通过':'失败'),groups.length+' 段 '+(ok?'≤':' > ')+k+'。',['verdict'],mid,groups);if(ok){hi=mid;show('向更小容量探索','mid 仍可能是最优值，因此保留它并令 hi=mid。',['yes'],mid,groups);}else{lo=mid+1;show('排除过小容量','所有不大于 mid 的容量都不可行，令 lo=mid+1。',['no'],mid,groups);}}
      show('左右边界相遇','最小可行容量为 '+lo+'。',['finish']);return {frames,result:{capacity:lo}};},
    oracle(d){validateBinary(d);const n=d.a.length;if(!n)return {capacity:0};let best=Infinity;for(let mask=0;mask<(1<<(n-1));mask++){let groups=1,sum=d.a[0],maximum=0;for(let i=1;i<n;i++){if(mask&(1<<(i-1))){maximum=Math.max(maximum,sum);sum=0;groups++;}sum+=d.a[i];}maximum=Math.max(maximum,sum);if(groups<=d.k)best=Math.min(best,maximum);}return {capacity:best};},
    exercises:[ex('a=[3,1,4]、k=2，最小容量是多少？',['4','5','8'],0,'切成 [3,1] 与 [4]，最大和4；单项4又给出下界，所以最优恰为4。'),ex('mid 可行时为什么写 hi=mid？',['因为 mid 必须是答案','因为 mid 仍可能是最小可行值','为了跳过 mid'],1,'可行只能证明答案不大于 mid，不能证明严格小于 mid。'),ex('a=[0,0,0]、k=3，容量0的贪心只用1段，应该怎样判定？',['不可行，必须用3段','出现死循环','可行，题目要求至多3段'],2,'0容量已经装下整段。若要恰好3个非空段，也能切成三个零。')],
    sources:[source('cp-algorithms · Binary Search','https://cp-algorithms.com/num_methods/binary_search.html','核查任意单调谓词二分、答案二分与中点溢出处理。')],cppInput:d=>`${d.a.length} ${d.k}\n${d.a.join(' ')}\n`,cppOutput:out=>({capacity:Number(out.trim())}),transfer:{contrast:'二分本身只负责缩小值域，最难部分通常是构造并证明判定。这里判定内部又用了贪心。',next:['greedy-interval'],challenge:'若每段还要求长度不超过 L，你的贪心检查应如何同时维护容量与长度？证明最少段数结论仍成立。'}
  },binaryCode);

  const intervalCode=code(`#include <iostream>
#include <vector>
#include <algorithm>
#include <limits>
using namespace std;
struct Interval { int l, r, id; };
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n; vector<Interval> a(n);
    for (int i = 0; i < n; ++i) { cin >> a[i].l >> a[i].r; a[i].id = i; }
    sort(a.begin(), a.end(), [](const Interval &x, const Interval &y) { // @sort
        if (x.r != y.r) return x.r < y.r;
        if (x.l != y.l) return x.l < y.l;
        return x.id < y.id;
    });
    int last = numeric_limits<int>::min(), count = 0; // @init
    for (const auto &x : a) {
        if (x.l >= last) { ++count; last = x.r; } // @choose
    }
    cout << count << '\\n'; // @finish
}`,{sort:'以结束时间为第一关键字，不是开始时间或长度。',init:'允许负的时间坐标，初始结束时间应小于一切输入。',choose:'半开区间首尾相接不冲突，所以用 >=。'});
  function validateIntervals(d){record(d);list(d.intervals,12,'intervals');for(const x of d.intervals){tuple(x,2,'区间');integer(x[0],-20,19,'开始时间');integer(x[1],x[0]+1,20,'结束时间');}}
  register({id:'greedy-interval',section:'sequence',title:'区间贪心与交换论证',subtitle:'先结束的选择，为未来留下最多空间',level:'核心',tags:['区间调度','贪心证明','交换论证'],prerequisites:['merge-sort'],summary:'从一组等权、非空时间区间中选尽可能多的互不重叠区间。按结束时间排序，遇到能接上的区间就选。',
    lesson:{recognize:['每个区间的收益相同，目标是最大化选择数量，而非权重总和。','同一时刻只能执行一个区间，区间为 [start,end)，首尾相接允许共存。','区间不能拆开或改变时长；若带权，最早结束策略可能失败，应转向动态规划。'],derive:[{title:'从所有子集出发',text:'枚举 n 个区间的所有子集，检查是否重叠，最坏有 2^n 种选择。需要找到一个可以放心先确定的决策。'},{title:'开始早和长度短都不够',text:'开始最早的长区间可能堵住后续很多机会；最短区间也可能横跨两条本可同时选的区间。对未来真正重要的是“当前结束后，最早何时重新可用”。'},{title:'选择结束最早的可选区间',text:'让当前结束时间 last 尽可能小，未来可接上的区间只会更多。将所有区间按结束时间升序排列，每次只要 start≥last 就接受，并更新 last=end。'},{title:'不要把“看起来合理”当成证明',text:'取任一最优方案，把它的第一条替换成最早结束的区间，后续区间仍能衔接，且数量不变。完成这次交换后，问题缩小为当前结束时间之后的同类问题。'}],invariant:{title:'已选前缀可以扩展成某个最优方案',text:'贪心每次选择后，都存在一个最大数量方案，其前若干个选择恰好就是当前贪心前缀。',proof:['开始时任取一个最优方案，空前缀与它一致。','固定已有前缀，设某个最优扩展的下一条为 o，贪心选 g。g 在全部可接区间中结束最早，所以 end(g)≤end(o)。','将 o 替换为 g：g 能接上已有前缀，原方案后续的开始时间不早于 end(o)，也不早于 end(g)，因此仍合法且数量不变。','重复交换直到没有可选区间，此时任何更长的最优扩展也不可能存在，故贪心得到最大数量。']},complexity:{time:'排序 O(n log n)，扫描 O(n)；已按结束时间排序时只需 O(n)。',space:'保存排序后的区间 O(n)；C++ sort 通常使用 O(log n) 调用栈。',conditions:'n 为区间数；每个区间 start<end，收益相同，端点以半开区间解释。空集合答案为0。教学 n≤12，暴力枚举只用于小规模验证。'},pitfalls:[pit('按开始时间排序就选','先开始不代表先释放资源。','区间 [0,10)、[1,2)、[2,3)：选最早开始的只能拿1条，最优可拿后两条。'),pit('按长度最短优先','短区间可能横跨两个本来能共存的区间。','[0,3)、[3,6)、[2,4)：最短的 [2,4) 同时挡住前两条，只能得1而非2。'),pit('把接触端点视为重叠','本章采用半开区间，end=start 时没有公共时间点。','[0,2) 与 [2,4) 可以同时选择，判断条件应是 start≥last。'),pit('有权重时仍只看结束时间','交换不能保证权重不下降，证明前提已变。','[0,1) 权重1、[0,2) 权重100；最早结束只拿1，最大权重应选后者。')],applications:['最大不冲突会议数量、最大可参加活动数：等权且不可分割时使用。','删除最少区间使剩余不重叠：先求最多保留数量，答案为 n-最大数量。']},
    input:{description:'intervals：最多12个 [start,end]，整数端点 -20≤start<end≤20。每条收益相同；相接端点允许共存，返回最大数量。',default:{intervals:[[0,4],[1,2],[2,5],[4,6],[5,7],[7,9]]},presets:[{name:'最早开始的陷阱',data:{intervals:[[0,10],[1,2],[2,3]]}},{name:'相接与重复',data:{intervals:[[0,2],[2,4],[0,2],[-2,0]]}},{name:'空集合',data:{intervals:[]}}],validate:validateIntervals},
    random(seed){const r=random(seed);return {intervals:Array.from({length:r(0,10)},()=>{const l=r(-8,12);return [l,r(l+1,20)];})};},
    run(d){validateIntervals(d);const frames=[],sorted=d.intervals.map(([l,r],id)=>({l,r,id})),selected=[],status={};let last=null;const show=(title,text,tags,current=-1)=>frame(frames,intervalCode,title,text,tags,{tables:[tb('按当前顺序检查区间',['原编号','开始','结束（不含）','决策'],sorted.map(x=>[x.id,x.l,x.r,status[x.id]||'待检查']),current<0?[]:[current])],arrays:[ar('已选择的原始编号',selected)]},[metric('已选数量',selected.length),metric('上次结束',last===null?'尚未选择':last)]);
      show('原始区间','所有区间等权。先关注结束时间，而不是原始输入顺序。',['init']);sorted.sort((a,b)=>a.r-b.r||a.l-b.l||a.id-b.id);show('按结束时间排序','结束早的先检查；结束相同再按开始时间、原始编号稳定决定。',['sort']);sorted.forEach((x,i)=>{if(last===null||x.l>=last){selected.push(x.id);last=x.r;status[x.id]='选择';show('选择区间 #'+x.id,'开始 '+x.l+' 不早于之前结束点，选它后 last='+last+'。',['choose'],i);}else{status[x.id]='冲突，跳过';show('跳过区间 #'+x.id,'开始 '+x.l+' 早于已选末端 '+last+'，存在重叠。',['choose'],i);}});show('达到最大数量','通过交换论证，'+selected.length+' 是最多能选择的区间数。',['finish']);return {frames,result:{count:selected.length}};},
    oracle(d){validateIntervals(d);let best=0;const n=d.intervals.length;for(let mask=0;mask<(1<<n);mask++){const chosen=[];for(let i=0;i<n;i++)if(mask&(1<<i))chosen.push(d.intervals[i]);chosen.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let ok=true;for(let i=1;i<chosen.length;i++)if(chosen[i][0]<chosen[i-1][1])ok=false;if(ok)best=Math.max(best,chosen.length);}return {count:best};},
    exercises:[ex('区间 [0,2)、[2,5)、[1,4) 最多选几条？',['1','2','3'],1,'选择前两条，端点2处相接不冲突。第三条与两者都冲突。'),ex('交换论证里，为什么替换成更早结束的区间不会损害后续？',['后续区间的长度会变短','后续开始时间原本≥旧结束，也就≥新结束','因为所有区间都相同'],1,'关键是 end(g)≤end(o)，替换后留给后续的可用时间不减少。'),ex('若每个区间收益不同，应如何看待本章策略？',['仍总是最优','改成按收益排序就一定正确','证明失效，考虑带权区间调度 DP'],2,'最大数量与最大权重不同。结束更早的区间可能收益极低，交换会降低目标值。')],sources:[source('Competitive Programmer’s Handbook · Greedy Algorithms','https://cses.fi/book/book.pdf','原作者 Antti Laaksonen 教材，第6章事件调度；核查最早结束贪心及交换思想。')],cppInput:d=>`${d.intervals.length}\n${d.intervals.map(x=>x.join(' ')).join('\n')}\n`,cppOutput:out=>({count:Number(out.trim())}),transfer:{contrast:'贪心需要证明某个局部决策可以进入最优解；有权重时往往要把“选择或跳过”保留下来，改用 DP。',next:['interval-dp','lis'],challenge:'为每条区间加入权重，构造结束时间排序后的 DP，并用二分寻找最后一个能与当前区间衔接的位置。'}
  },intervalCode);

  const stackCode=code(`#include <iostream>
#include <vector>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n; vector<int> a(n), answer(n, -1), st; // @init
    for (auto &x : a) cin >> x;
    for (int i = 0; i < n; ++i) { // @scan
        while (!st.empty() && a[st.back()] < a[i]) {
            answer[st.back()] = i; st.pop_back(); // @pop
        }
        st.push_back(i); // @push
    }
    for (int i = 0; i < n; ++i) cout << answer[i] << (i + 1 == n ? '\\n' : ' '); // @finish
}`,{init:'-1 表示尚未找到；扫描结束后仍为 -1 的位置确实没有答案。',pop:'只有严格更大才解决栈顶，等值不能弹出。',push:'栈存下标而非仅存值，才能写回每个位置的答案。'});
  function validateStack(d){record(d);nums(d.a,20,-20,20);}
  register({id:'monotonic-stack',section:'structures',title:'单调栈',subtitle:'让尚未解决的位置排成一条等待链',level:'核心',tags:['下一个更大元素','均摊分析','候选淘汰'],prerequisites:['complexity'],summary:'为每个位置寻找右侧第一个严格更大的元素下标。维护值不递增的下标栈，新元素一次解决所有比它小的栈顶。',
    lesson:{recognize:['问题含有“左边/右边第一个更大/更小”，且需对所有位置求答案。','可以从一端扫描，用当前元素解决一批尚未找到答案的位置。','严格与非严格比较必须先定义清楚；本章求严格大于，不把相等元素算作答案。'],derive:[{title:'独立向右寻找会重复比较',text:'每个 i 都从 i+1 向右扫描，最坏如全递减数组需要 O(n²) 次比较。重复工作在于很多位置等待同样的未来大数。'},{title:'保存尚未得到答案的下标',text:'扫描到 i 前，把仍没有遇到更大值的位置放在栈中。栈从底到顶的值不递增，因为一旦新值更大，会先解决比它小的栈顶。'},{title:'新元素触发一串确定答案',text:'若 a[i]>a[栈顶]，i 就是栈顶等待的第一个更大位置，记录并弹出；继续比较新的栈顶，直到遇到不小于 a[i] 的值。然后把 i 入栈。'},{title:'用次数而不是嵌套层数分析',text:'每个下标只入栈一次、最多出栈一次。即使某轮弹出很多项，它们也不会再次出现，全部弹栈总次数不超过 n。'}],invariant:{title:'栈中恰好保存已扫描但尚无答案的位置',text:'处理完一个新元素并将它入栈后，栈内下标严格递增，对应值从底到顶不递增；这些位置到已处理边界之间还没有出现严格更大的值。弹栈中间帧正在逐个结算当前元素带来的答案。',proof:['空栈显然满足性质。','若栈顶 t 的值小于 a[i]，过去没有更大值（否则 t 已弹出），所以当前 i 是首个严格更大位置。弹出它并记录答案正确。','遇到不小于 a[i] 的栈顶后，更底部的值只会更大，也不能由 i 解决；把 i 入栈保持非递增值顺序。','扫描结束后还留在栈内的位置，在全部右侧都未遇见更大值，因此答案应保持 -1。']},complexity:{time:'O(n) 均摊，总入栈 n 次，总出栈至多 n 次。',space:'栈 O(n)，答案数组 O(n)。',conditions:'n 为数组长度，元素可正、负、重复。求“第一个严格更大”使用 < 弹栈；改变比较方向或严格性时必须同步修改不变量。教学 n≤20。'},pitfalls:[pit('把 < 写成 <=','等于不是严格更大。','a=[2,2]，两个答案都应是 -1；用 <= 会错误地让第0项指向第1项。'),pit('只保存值，不保存位置','重复值有不同下标，写回答案需要位置。','a=[2,2,3]，前两项答案都是2，但必须分别写进 answer[0] 和 answer[1]。'),pit('弹一次就停止','当前元素可能同时解决多个等待者，必须循环。','a=[5,3,1,6]，最后的6要依次解决下标2、1、0。'),pit('把答案写成更大值而不是下标','本章结果约定是位置，题目要求数值时才取 a[answer[i]]。','a=[4,9]，第0项答案是下标1，不是数值9。')],applications:['下一个更暖的天气、右侧首个更高柱子：答案若是距离，最后计算 next[i]-i。','直方图最大矩形、子数组最小值贡献：先找左右边界；重复值要采用一致的归属规则，不能两边随意用同一种严格性。']},
    input:{description:'a：最多20个 [-20,20] 整数。返回 next[i]：右侧第一个严格更大元素的零基下标，若不存在则为 -1。',default:{a:[5,2,2,4,1,6,3]},presets:[{name:'重复值不是更大',data:{a:[2,2,3]}},{name:'一项解决整栈',data:{a:[5,3,1,6]}},{name:'空数组',data:{a:[]}}],validate:validateStack},
    random(seed){const r=random(seed);return {a:Array.from({length:r(0,18)},()=>r(-7,7))};},
    run(d){validateStack(d);const {a}=d,st=[],next=Array(a.length).fill(-1),frames=[];const show=(title,text,tags,i=-1,popped=-1)=>frame(frames,stackCode,title,text,tags,{arrays:[ar('原数组',a,[i,popped].filter(x=>x>=0)),ar('右侧首个严格更大的下标',next,popped>=0?[popped]:[]),ar('等待栈（底 → 顶）：原下标',st,st.length?[st.length-1]:[]),ar('等待栈（底 → 顶）：值',st.map(x=>a[x]),st.length?[st.length-1]:[])]});show('所有位置等待答案','答案初始化为 -1；这里只表示还未找到，扫描结束才最终确定。',['init']);for(let i=0;i<a.length;i++){show('扫描位置 '+i,'当前值 '+a[i]+'，检查是否能解决栈顶。',['scan'],i);while(st.length&&a[st[st.length-1]]<a[i]){const t=st.pop();next[t]=i;show('解决位置 '+t,a[i]+' > '+a[t]+'，并且这是它右侧第一次遇到更大值。',['pop'],i,t);}st.push(i);show('位置 '+i+' 入栈','留下的栈顶不小于当前值，入栈后仍保持值不递增。',['push'],i);}show('扫描结束','仍在栈中的位置没有更大右邻，保留 -1。',['finish']);return {frames,result:{next}};},
    oracle(d){validateStack(d);return {next:d.a.map((x,i)=>{for(let j=i+1;j<d.a.length;j++)if(d.a[j]>x)return j;return -1;})};},exercises:[ex('a=[3,3,4] 的 next 是？',['[1,2,-1]','[2,2,-1]','[4,4,-1]'],1,'相等的3不能互为答案，二者都等到下标2的4。'),ex('扫描结束仍在栈里的下标意味着什么？',['右侧不存在严格更大的值','这些位置被漏处理了','应该全部指向最后一项'],0,'如果右侧出现更大值，它们当时就会被弹出；留下本身就是不存在答案的证据。'),ex('若题目要求右侧第一个大于等于元素，弹栈条件应如何改？',['从 < 改为 <=','仍用 <','把所有值排序'],0,'相等值此时也能解决等待者。排序会破坏“右侧第一个”的位置语义。')],sources:[source('USACO Guide · Stacks','https://usaco.guide/gold/stacks','核查单调栈与最近更小元素；本章转换为右侧首个严格更大并单独证明。')],cppInput:d=>`${d.a.length}\n${d.a.join(' ')}\n`,cppOutput:out=>({next:numbersOut(out)}),transfer:{contrast:'单调栈靠新元素淘汰不再等待的栈顶；单调队列再加上左端过期删除，用来处理固定窗口极值。',next:['monotonic-deque'],challenge:'求每个位置左侧第一个严格更小元素，先写出栈值应递增还是递减，再用 [2,2,1] 检查等号方向。'}
  },stackCode);

  const dequeCode=code(`#include <iostream>
#include <vector>
#include <deque>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, w; cin >> n >> w; vector<int> a(n); for (auto &x : a) cin >> x;
    deque<int> dq; vector<int> answer; // @init
    for (int i = 0; i < n; ++i) {
        while (!dq.empty() && dq.front() <= i - w) dq.pop_front(); // @expire
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back(); // @dominate
        dq.push_back(i); // @push
        if (i + 1 >= w) answer.push_back(a[dq.front()]); // @answer
    }
    for (int i = 0; i < (int)answer.size(); ++i) cout << answer[i] << (i + 1 == (int)answer.size() ? '\\n' : ' '); // @finish
}`,{expire:'先按下标删除已经不在窗口中的候选。',dominate:'新值至少一样大、而且更晚过期，旧队尾永远不必再用。',answer:'凑够 w 个元素后才输出一个完整窗口的最大值。'});
  function validateDeque(d){record(d);nums(d.a,20,-20,20);integer(d.w,d.a.length?1:0,d.a.length,'w');}
  register({id:'monotonic-deque',section:'structures',title:'单调队列',subtitle:'只保留尚未过期、也未被新值压倒的候选',level:'核心',tags:['滑动窗口最大值','双端队列','支配关系'],prerequisites:['sliding-window','monotonic-stack'],summary:'计算每个长度 w 的连续窗口最大值。队首负责过期，队尾负责淘汰被支配的旧值，最大值始终在队首。',
    lesson:{recognize:['窗口按固定方向移动，需要重复求最大值或最小值。','新元素若更大且更晚过期，就能永久取代较小的旧候选。','本章只返回最大值。若还要求最早最大值下标，等值时的淘汰规则需要改变。'],derive:[{title:'每个窗口重新扫描',text:'n-w+1 个窗口，每个扫描 w 项，最坏 O(nw)。相邻窗口只有一个元素离开、一个元素进入，大部分工作可以共享。'},{title:'先理解支配关系',text:'设旧下标 j<i 且 a[j]≤a[i]。从 i 加入开始，任何仍含 j 的未来窗口也会含 i；i 不小且更晚离开，所以 j 不可能再成为必要的最大值候选。'},{title:'两端分别负责两种删除',text:'队列下标递增，因此过期位置一定在队首；队列值递减，因此新值可以从队尾连续淘汰所有不比它大的值。最后加入 i。'},{title:'队首直接回答窗口',text:'清理后队内只含当前窗口的有效候选，且值从大到小排列。凑够 w 项时，队首即最大值。等值保留较新的位置，是为了让候选更晚过期。'}],invariant:{title:'队列保存足以代表当前窗口最大值的候选',text:'队列下标严格递增、对应值严格递减；每个被队尾删除的旧位置，都被一个不更小且更晚的位置代表。',proof:['队首清理保证所有留下的下标至少为 i-w+1，属于当前窗口。','若旧队尾 j 被新位置 i 删除，则 a[i]≥a[j] 且 i>j。只要 j 还没过期，i 必然也没过期，因此删除不影响未来答案。','入队前删完不大的尾部，剩余队尾值严格大于 a[i]，故入队后保持值递减与下标递增。','所有不在队列的有效位置都有一个有效、不更小的代表，故最大值必在队列；递减顺序使队首就是它。']},complexity:{time:'O(n) 均摊：每个下标入队一次，至多从某一端删除一次。',space:'标准双端队列最多保留 O(w) 个下标，答案 O(n-w+1)。',conditions:'非空数组要求 1≤w≤n；空数组仅接受 w=0 且返回空结果。JavaScript 演示使用带头指针的缓冲数组以避免 shift 的线性搬移，缓冲历史最多 O(n)；C++ deque 辅助空间 O(w)。'},
      pitfalls:[pit('只按值、不按下标过期','同值可能来自不同位置，是否还在窗口取决于下标。','a=[9,1,2]、w=2：第二个窗口不能继续返回已离开的9，正确最大值是2。'),pit('窗口没凑满就输出','本章只输出长度恰为 w 的完整窗口。','a=[2,5,1]、w=3，只应有一个答案5，而不是 [2,5,5]。'),pit('删除等值会改变下标平局规则','<= 会保留最新的最大值；只求数值正确，若要求最早下标则需用 <。','a=[4,4]、w=2：最大值为4，但 <= 留下下标1，而最早下标应为0。'),pit('把队列当排序后的整个窗口','被支配项已经永久删掉，队列不是完整多重集合，不能直接求中位数。','窗口 [5,1,4] 的候选可为 [5,4]，被删除的1仍会影响中位数。')],applications:['长度固定的最高温、最大费用、局部极值过滤：每次只滑动一个位置。','某些 DP 形如 dp[i]=cost[i]+max(dp[j])，j 在随 i 移动的连续范围内时，可用单调队列维护候选。']},
    input:{description:'a：最多20个 [-20,20] 整数。非空时 w∈[1,n]；空数组必须 w=0。返回各完整窗口的最大值。',default:{a:[1,3,-1,-3,5,3,6,7],w:3},presets:[{name:'等值保留较新的',data:{a:[4,4,2,4],w:2}},{name:'最大值从队首过期',data:{a:[9,1,2,3],w:2}},{name:'空数组',data:{a:[],w:0}}],validate:validateDeque},
    random(seed){const r=random(seed),n=r(0,18);return {a:Array.from({length:n},()=>r(-9,9)),w:n?r(1,n):0};},
    run(d){validateDeque(d);const {a,w}=d,frames=[],dq=[],maxima=[];let head=0;const show=(title,text,tags,i=-1,changed=-1)=>frame(frames,dequeCode,title,text,tags,{arrays:[ar('数组与当前窗口',a,span(Math.max(0,i-w+1),i+1),changed>=0?{[changed]:'变化位置'}:{}),ar('候选队列（头 → 尾）：原下标',dq.slice(head),head<dq.length?[0]:[]),ar('候选队列（头 → 尾）：值',dq.slice(head).map(j=>a[j]),head<dq.length?[0]:[]),ar('已完成窗口的最大值',maxima)]},[metric('窗口宽度',w)]);show('空候选队列','尚未读入元素，只有凑满窗口后才产生答案。',['init']);for(let i=0;i<a.length;i++){while(head<dq.length&&dq[head]<=i-w){const old=dq[head++];show('移除过期队首 '+old,'位置 '+old+' 已在窗口左边界 '+(i-w+1)+' 之外。',['expire'],i,old);}while(head<dq.length&&a[dq[dq.length-1]]<=a[i]){const old=dq.pop();show('淘汰被支配的队尾 '+old,'新值 '+a[i]+' 不小于旧值 '+a[old]+'，而且更晚过期。',['dominate'],i,old);}dq.push(i);show('新位置 '+i+' 入队','下标保持递增，队列中的值保持严格递减。',['push'],i,i);if(i+1>=w){maxima.push(a[dq[head]]);show('输出窗口 ['+(i-w+1)+','+(i+1)+')','队首位置 '+dq[head]+' 的值 '+a[dq[head]]+' 是最大值。',['answer'],i,dq[head]);}}show('所有窗口完成','共得到 '+maxima.length+' 个完整窗口的最大值。',['finish']);return {frames,result:{maxima}};},
    oracle(d){validateDeque(d);const maxima=[];if(d.w)for(let l=0;l+d.w<=d.a.length;l++){let m=-Infinity;for(let j=l;j<l+d.w;j++)m=Math.max(m,d.a[j]);maxima.push(m);}return {maxima};},exercises:[ex('a=[9,1,2]、w=2 的结果是？',['[9,9]','[9,2]','[1,2]'],1,'第二个窗口是 [1,2]，位置0的9已经过期。'),ex('为什么新来的相等值可以替代旧值？',['因为它更大','因为旧值不再属于数组','因为值相同但新位置更晚过期'],2,'只求最大值时两者等价，新位置的有效期更长，所以旧位置被支配。'),ex('若窗口要求中位数，这个队列还能直接使用吗？',['不能，被删除的小值仍影响中位数','能，读队列中间即可','能，读队首即可'],0,'极值允许丢弃被支配元素，中位数依赖元素的完整数量与排序关系。')],sources:[source('cp-algorithms · Minimum Stack / Minimum Queue','https://cp-algorithms.com/data_structures/stack_queue_modification.html','核查候选队列的删除规则、滑动窗口极值与线性总复杂度。')],cppInput:d=>`${d.a.length} ${d.w}\n${d.a.join(' ')}\n`,cppOutput:out=>({maxima:numbersOut(out)}),transfer:{contrast:'双指针负责窗口边界，单调队列负责窗口内部的极值。窗口随意跳动时，线段树等一般区间结构更合适。',next:['segment-tree'],challenge:'改成窗口最小值，并额外返回最早达到最小值的位置。说明尾部比较符号为什么应改变严格性。'}
  },dequeCode);

  const fenwickCode=code(`#include <iostream>
#include <vector>
#include <string>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> a(n), bit(n + 1, 0), answers; // @init
    for (auto &x : a) cin >> x;
    auto add = [&](int index, long long delta) {
        for (int p = index + 1; p <= n; p += p & -p) bit[p] += delta; // @add
    };
    auto prefix = [&](int r) {
        long long sum = 0;
        for (int p = r; p > 0; p -= p & -p) sum += bit[p]; // @prefix
        return sum;
    };
    for (int i = 0; i < n; ++i) add(i, a[i]); // @build
    while (q--) {
        string type; cin >> type;
        if (type == "add") {
            int i; long long delta; cin >> i >> delta;
            a[i] += delta; add(i, delta); // @update
        } else {
            int l, r; cin >> l >> r;
            answers.push_back(prefix(r) - prefix(l)); // @query
        }
    }
    cout << answers.size() << '\\n';
    for (long long x : answers) cout << x << ' ';
    cout << '\\n' << n << '\\n';
    for (long long x : a) cout << x << ' ';
    cout << '\\n'; // @finish
}`,{add:'外部零基下标先加1；沿 p+=lowbit(p) 更新所有包含该点的块。',prefix:'r 是前缀长度；每次清掉最低位的1，拼出互不相交的前缀块。',query:'区间和仍是两个前缀和之差，只是前缀现在动态计算。'});
  function validateOperations(d,type,maxN){record(d);nums(d.a,maxN,-20,20);list(d.operations,16,'operations');for(const op of d.operations){record(op,'操作');if(op.type==='sum'){range(op.l,op.r,d.a.length,'sum');}else if(op.type===type){if(!d.a.length)fail('空数组不允许 '+type+'，只能查询 [0,0)。');integer(op.index,0,d.a.length-1,'index');integer(type==='add'?op.delta:op.value,-20,20,type==='add'?'delta':'value');}else fail('操作 type 只能是 '+type+' 或 sum。');}}
  function opsInput(d,type){return `${d.a.length} ${d.operations.length}\n${d.a.join(' ')}\n${d.operations.map(o=>o.type==='sum'?`sum ${o.l} ${o.r}`:`${type} ${o.index} ${type==='add'?o.delta:o.value}`).join('\n')}\n`;}
  function opsOutput(out){const t=numbersOut(out),q=t[0],answers=t.slice(1,q+1),n=t[q+1];return {answers,final:t.slice(q+2,q+2+n)};}
  function randomOps(seed,type,maxN){const r=random(seed),n=r(0,maxN),a=Array.from({length:n},()=>r(-8,8)),operations=[];for(let i=0;i<10;i++){if(n&&r(0,1)){const op={type,index:r(0,n-1)};op[type==='add'?'delta':'value']=r(-8,8);operations.push(op);}else{const l=r(0,n);operations.push({type:'sum',l,r:r(l,n)});}}return {a,operations};}
  function operationOracle(d,type,maxN){validateOperations(d,type,maxN);const a=d.a.slice(),answers=[];for(const o of d.operations){if(o.type==='sum'){let sum=0;for(let j=o.l;j<o.r;j++)sum+=a[j];answers.push(sum);}else if(type==='add')a[o.index]+=o.delta;else a[o.index]=o.value;}return {answers,final:a};}
  register({id:'fenwick',section:'structures',title:'树状数组 Fenwick Tree',subtitle:'用二进制长度的块，维护会变化的前缀和',level:'核心',tags:['单点增加','动态区间和','lowbit'],prerequisites:['prefix-sum','difference'],summary:'支持单点增加与任意区间求和。每个位置存一个以 lowbit 决定长度的区间块，用 O(log n) 个块组成动态前缀。',
    lesson:{recognize:['操作交替出现：对某个 a[i] 增加 delta，然后询问某段的和。','求和具有可逆性，所以区间答案仍可由两个前缀相减。','标准版本不是任意运算的通用结构；任意点赋值需要知道旧值并换算增量，动态最小值不能简单相减。'],derive:[{title:'前缀和的更新瓶颈',text:'普通前缀查询 O(1)，但修改 a[i] 会改变所有经过它的后缀前缀值，最坏 O(n)。完全不预处理则查询 O(n)。需要在两种操作之间平衡。'},{title:'按最低有效位划分区间',text:'内部用1基下标。lowbit(p)=p&(-p)，是 p 的最低位1代表的值。bit[p] 存零基区间 [p-lowbit(p),p) 的和。例如 bit[6] 管 [4,6)，bit[8] 管 [0,8)。'},{title:'查询向左拼块',text:'要查前 r 项，从 p=r 开始加 bit[p]，再 p-=lowbit(p)。每步去掉当前最右一块，块彼此不重叠，直到 p=0，恰好铺满 [0,r)。'},{title:'修改向上找包含它的块',text:'修改零基位置 i，从 p=i+1 开始，依次 p+=lowbit(p)。这些节点正好是 Fenwick 隐式树中包含该位置的祖先块；每个块加同一增量即可。'}],invariant:{title:'bit[p] 精确等于它负责的区间和',text:'建树完成、以及一次完整 add 操作结束后，对每个 1≤p≤n，bit[p]=Σ a[j]，其中 p-lowbit(p)≤j<p。更新进行中的帧只修复了父链上的一部分块。',proof:['初始全零的 bit 表示全零数组；依次把每个原始值做单点增加后建立不变量。','令 b=lowbit(p)，下一节点 q=p+b 的 lowbit 至少为2b，所以 q 的区间包含 p 的整块。p 与 q 之间的节点只管理 p 右侧的短块，不含起点 i；据此沿父链恰好枚举所有含 i 的块。只对这些块加 delta，区间和定义保持不变。','查询中当前块是 [p-lowbit(p),p)，随后 p 减到这个左端点；块首尾相接、不重叠，最后覆盖 [0,r)。','两次正确的前缀查询相减，消去 [0,l)，得到 [l,r) 的和。']},complexity:{time:'本实现建树 O(n log(n+1))；单点加、区间和各 O(log(n+1))（空数组查询 O(1)）。',space:'bit 与当前数组 O(n)，存 q 次操作的答案最多 O(q)。',conditions:'n 为长度，q 为操作数；内部1基、外部0基。也存在 O(n) 线性建树，但本章代码采用重复 add，不能把它标成 O(n)。教学 n≤12、操作≤16。'},pitfalls:[pit('从内部下标0开始更新','lowbit(0)=0，p+=lowbit(p) 会原地不动。','外部位置0必须转成 p=1；若直接 p=0，更新循环永不结束。'),pit('把前缀长度当元素下标','prefix(r) 包含前 r 个数，即 [0,r)，不包括 a[r]。','a=[2,5,7]，prefix(2)=7，而不是14。'),pit('把增量当新值','add(i,x) 表示增加 x，不表示赋值为 x。','原 a[1]=5，想改为2应 add(1,-3)，直接 add(1,2) 会变成7。'),pit('套用前缀最小值相减','最小值没有加法逆运算，普通 Fenwick 的区间差技巧不适用。','[1,5,3] 中两个前缀最小值都是1，但中间区间最小值3无法由1减1恢复。')],applications:['动态区间和、动态频次前缀统计。处理逆序对时，可先离散化值，再查询此前有多少更大或更小。','在差分数组上维护单点加与前缀和，可得到“区间加、单点查询”；两棵树还能进一步处理区间加与区间求和。']},
    input:{description:'a：最多12个 [-20,20] 整数。operations 最多16条：{type:"add",index,delta} 或 {type:"sum",l,r}。index 为零基；sum 查询 [l,r)。空数组只允许 [0,0) 查询。',default:{a:[3,1,4,1,5,9,2,6],operations:[{type:'sum',l:1,r:6},{type:'add',index:3,delta:7},{type:'sum',l:2,r:5},{type:'add',index:0,delta:-3},{type:'sum',l:0,r:8}]},presets:[{name:'边界点和空区间',data:{a:[2,5],operations:[{type:'add',index:0,delta:-2},{type:'sum',l:0,r:0},{type:'sum',l:0,r:2}]}},{name:'空数组',data:{a:[],operations:[{type:'sum',l:0,r:0}]}}],validate:d=>validateOperations(d,'add',12)},
    random:seed=>randomOps(seed,'add',12),
    run(d){validateOperations(d,'add',12);const a=d.a.slice(),n=a.length,bit=Array(n+1).fill(0),answers=[],frames=[];const show=(title,text,tags,active=[],ai=[])=>frame(frames,fenwickCode,title,text,tags,{arrays:[ar('当前数组 a（建树时已显示目标初值）',a,ai),ar('Fenwick bit，0号不使用',bit.map((v,i)=>i?v:'—'),active),ar('查询答案',answers)],tables:[tb('各节点负责的零基区间',['p','lowbit(p)','l','r（不含）','块和'],span(1,n+1).map(p=>[p,p&-p,p-(p&-p),p,bit[p]]),active.filter(p=>p>0).map(p=>p-1))]});show('以全零树开始','依次加入初始值建立每个块；当前展示的 a 已是目标初值。',['init']);const add=(index,delta,building)=>{for(let p=index+1;p<=n;p+=p&-p){bit[p]+=delta;show((building?'建树':'更新')+'：访问节点 '+p,'该块覆盖 ['+(p-(p&-p))+','+p+')，包含位置 '+index+'，块和增加 '+delta+'。',['add',building?'build':'update'],[p],[index]);}};for(let i=0;i<n;i++)add(i,a[i],true);const prefix=(r,label)=>{let sum=0;show('计算 '+label+' 前缀','目标是 [0,'+r+')，累积和从0开始。',['prefix']);for(let p=r;p>0;p-=p&-p){sum+=bit[p];show(label+'：取块 '+p,'加入 ['+(p-(p&-p))+','+p+') 的和 '+bit[p]+'，累计 '+sum+'；下一节点为 '+(p-(p&-p))+'。',['prefix'],[p],span(p-(p&-p),p));}return sum;};d.operations.forEach((o,i)=>{if(o.type==='add'){a[o.index]+=o.delta;show('操作 '+(i+1)+'：单点加','a['+o.index+'] 现在为 '+a[o.index]+'；接下来更新包含它的块。',['update'],[],[o.index]);add(o.index,o.delta,false);}else{const right=prefix(o.r,'右端'),left=prefix(o.l,'左端');answers.push(right-left);show('操作 '+(i+1)+'：区间答案','['+o.l+','+o.r+') = '+right+' - '+left+' = '+(right-left)+'。',['query'],[],span(o.l,o.r));}});show('动态操作完成','树状数组与最后的数组保持一致。',['finish']);return {frames,result:{answers,final:a}};},oracle:d=>operationOracle(d,'add',12),
    exercises:[ex('bit[6] 管理哪个零基区间？',['[0,6)','[4,6)','[5,7)'],1,'6 的二进制是110，lowbit=2，因此负责 [6-2,6)=[4,6)。'),ex('更新外部位置0时，内部第一步应访问哪里？',['bit[0]','bit[1]','bit[n]'],1,'外部0基转换成内部1基。bit[0] 的 lowbit 为0，不能作为更新起点。'),ex('原 a[2]=8，要赋值为3，应调用什么？',['add(2,3)','add(2,-5)','prefix(3)'],1,'本接口是增加量，所以需要新值减旧值：3-8=-5。')],sources:[source('cp-algorithms · Fenwick Tree','https://cp-algorithms.com/data_structures/fenwick.html','核查区间负责范围、1基实现、线性建树与区间操作扩展；本章明确使用重复单点加建树。')],cppInput:d=>opsInput(d,'add'),cppOutput:opsOutput,transfer:{contrast:'Fenwick 的结构紧凑，但区间查询依赖前缀可相消。线段树通过不相交节点合并，可处理更一般的结合运算。',next:['segment-tree'],challenge:'先给初始数组做差分，再将 [l,r) 加 v 变为两次 add。用 prefix(i+1) 恢复 a[i]，并解释 r=n 时如何处理。'}
  },fenwickCode);

  const segmentCode=code(`#include <iostream>
#include <vector>
#include <string>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> a(n), answers; for (auto &x : a) cin >> x;
    int base = 1; while (base < n) base *= 2; // @base
    vector<long long> tree(2 * base, 0);
    for (int i = 0; i < n; ++i) tree[base + i] = a[i]; // @leaves
    for (int p = base - 1; p > 0; --p) tree[p] = tree[2 * p] + tree[2 * p + 1]; // @build
    while (q--) {
        string type; cin >> type;
        if (type == "set") {
            int i; long long value; cin >> i >> value;
            a[i] = value; int p = base + i; tree[p] = value; // @set
            while (p > 1) { p /= 2; tree[p] = tree[2 * p] + tree[2 * p + 1]; } // @pull
        } else {
            int l, r; cin >> l >> r; l += base; r += base; long long sum = 0; // @query
            while (l < r) {
                if (l & 1) sum += tree[l++]; // @left
                if (r & 1) sum += tree[--r]; // @right
                l /= 2; r /= 2; // @up
            }
            answers.push_back(sum); // @answer
        }
    }
    cout << answers.size() << '\\n';
    for (long long x : answers) cout << x << ' ';
    cout << '\\n' << n << '\\n';
    for (long long x : a) cout << x << ' ';
    cout << '\\n'; // @finish
}`,{leaves:'把实际数组放到叶子层，多余叶子填加法单位元0。',pull:'点赋值后只影响叶子到根的一条祖先链。',left:'l 是右孩子时，它的左兄弟在查询外，必须单独取它再右移。',right:'r 是排除端点；若是右孩子，先左移才能取最后一个完整在范围内的节点。'});
  register({id:'segment-tree',section:'structures',title:'线段树',subtitle:'把区间拆成不重叠的树节点，再合并答案',level:'核心',tags:['点赋值','区间聚合','结合律'],prerequisites:['fenwick'],summary:'支持单点赋值与动态区间求和。用完全二叉树维护各段聚合值，每次查询把目标区间拆成 O(log n) 个节点。',
    lesson:{recognize:['查询与点修改交替出现，需要保持原数组顺序。','区间信息可由左右子区间结合得到：求和、最小值、最大值、矩阵乘法等；操作至少要满足结合律。','本章实现点赋值和区间和，不含区间加或懒标记。需要区间修改时必须另行设计标记组合与下传。'],derive:[{title:'不再只保存前缀',text:'Fenwick 擅长可相消的前缀；线段树改为保存一套层次化区间。根覆盖整体，两个孩子各负责左右一半，直到叶子是单个元素。'},{title:'从叶子向上构造',text:'令 base 是不小于 n 的最小2的幂。a[i] 放在 tree[base+i]，多余叶子填0；每个父节点等于左右孩子之和。这个树共有 O(n) 个节点。'},{title:'赋值只沿祖先链修复',text:'将某个叶子写成新值，然后不断除以2回到父节点，重新合并两个孩子。与该叶子不相交的子树完全不受影响，所以只改 O(log n) 个节点。'},{title:'用半开双指针分解查询',text:'将 [l,r) 映射到叶子层。l 为右孩子时，单独收下 l 并 l++；r 为右孩子时，先 --r 收下它。剩余部分恰能成对合并，再令 l/=2、r/=2 上升。'}],invariant:{title:'已收集节点与待处理区域恰好分割原查询',text:'每轮查询中，sum 是已选互不重叠节点的和；当前 [l,r) 表示还未纳入的区间部分。',proof:['建树通过叶子正确、父节点合并的归纳，保证每个节点值等于它覆盖区间之和。','若左边界 l 是右孩子，其左兄弟不在目标区间，因此该节点必须独立取走；右边界 r 为右孩子时，r-1 是最后一个独立完整节点。','剥离这两端后，剩余节点边界均为偶数，恰好按兄弟成对合并。升到父层不改变待处理的实际元素集合。','循环直到 l=r，未处理区域为空，所选节点无重复地覆盖原查询；点赋值后重新合并祖先又恢复全树不变量。']},complexity:{time:'建树 O(n)（n=0 时 O(1)）；点赋值与区间查询 O(log(n+1))，空查询 O(1)。',space:'树 O(n)，当前数组 O(n)，保存操作答案最多 O(q)。',conditions:'n 为数组长度，q 为操作数，base<2n（n>0），树约2base格。加法单位元为0，C++ 累计使用 long long。教学 n≤8、操作≤16。非交换运算要分别维护左、右答案并保持合并顺序。'},pitfalls:[pit('把点赋值写成增加量','set 是覆盖旧值，不是叠加。','a=[2,5]，set(1,3) 后总和5；若当成 add(1,3)，总和会错误变为10。'),pit('右端点先取再减','r 不在区间中。r 为奇数时应先 --r，再读取 tree[r]。','查询 [0,1) 只能包含第0项，直接取排除端点可能误收第1项。'),pit('填充值不是该运算的单位元','和的空块是0；最小值的空块应是正无穷，不是0。','数组 [5,7,8] 补到4叶时若用0做最小值空块，整树最小值会错误地变成0。'),pit('把非交换运算当作求和合并','结合律不等于交换律。右侧取出的块顺序相反，需从右往左拼。','字符串连接查询“abcd”，若按访问顺序随意 append，可能得到“adbc”而非原顺序。')],applications:['动态区间和、最值、gcd：用相应合并函数与单位元替换加法。','维护复杂节点信息，如区间总和、最大前缀、最大后缀和最大子段和，再用严格定义的合并公式支持点改。']},
    input:{description:'a：最多8个 [-20,20] 整数。operations 最多16条：{type:"set",index,value} 或 {type:"sum",l,r}。set 为赋值，sum 为 [l,r)。空数组只允许 [0,0) 查询。',default:{a:[3,1,4,1,5,9],operations:[{type:'sum',l:1,r:5},{type:'set',index:3,value:7},{type:'sum',l:2,r:6},{type:'sum',l:0,r:0}]},presets:[{name:'非2的幂与负数',data:{a:[5,-3,8],operations:[{type:'sum',l:0,r:3},{type:'set',index:2,value:-4},{type:'sum',l:1,r:3}]}},{name:'空数组',data:{a:[],operations:[{type:'sum',l:0,r:0}]}}],validate:d=>validateOperations(d,'set',8)},random:seed=>randomOps(seed,'set',8),
    run(d){validateOperations(d,'set',8);const a=d.a.slice(),n=a.length,answers=[],frames=[];let base=1;while(base<n)base*=2;const tree=Array(base*2).fill(0);let covered=[],acc=0;
      const nodeRange=p=>{const depth=Math.floor(Math.log2(p)),width=base/(2**depth),left=(p-2**depth)*width;return [left,left+width];};
      const show=(title,text,tags,active=[],ai=[])=>{const arrays=[ar('当前真实数组',a,ai)];for(let begin=1,depth=0;begin<tree.length;begin*=2,depth++){const end=Math.min(begin*2,tree.length);arrays.push(ar('树第 '+depth+' 层：节点编号 : 区间和',span(begin,end).map(p=>p+': '+tree[p]),active.filter(p=>p>=begin&&p<end).map(p=>p-begin)));}arrays.push(ar('查询答案',answers));frame(frames,segmentCode,title,text,tags,{arrays,tables:[tb('本次已选节点（覆盖互不相交）',['节点','l','r（不含）','节点和'],covered.map(p=>[p,...nodeRange(p),tree[p]]))]},[metric('叶层起点 base',base),metric('当前查询累计',acc)]);};
      show('确定完全树大小','base='+base+'。实际元素之外的补位叶子为0，不改变区间和。',['base']);for(let i=0;i<n;i++){tree[base+i]=a[i];show('放置叶子 '+(base+i),'位置 '+i+' 映射到 tree['+(base+i)+']。',['leaves'],[base+i],[i]);}for(let p=base-1;p>0;p--){tree[p]=tree[p*2]+tree[p*2+1];show('合并节点 '+p,tree[p*2]+' + '+tree[p*2+1]+' = '+tree[p]+'。',['build'],[p,p*2,p*2+1]);}
      d.operations.forEach((o,index)=>{covered=[];acc=0;if(o.type==='set'){a[o.index]=o.value;let p=base+o.index;tree[p]=o.value;show('操作 '+(index+1)+'：赋值叶子','将位置 '+o.index+' 改为 '+o.value+'，不是增加这个值。',['set'],[p],[o.index]);while(p>1){p=Math.floor(p/2);tree[p]=tree[p*2]+tree[p*2+1];show('向上修复节点 '+p,'重新合并两个孩子，得到 '+tree[p]+'。',['pull'],[p,p*2,p*2+1],[o.index]);}}else{let l=o.l+base,r=o.r+base;show('操作 '+(index+1)+'：分解查询','查询 ['+o.l+','+o.r+')，叶层边界 l='+l+'、r='+r+'。',['query'],[l,r].filter(p=>p<tree.length),span(o.l,o.r));while(l<r){if(l&1){covered.push(l);acc+=tree[l];show('取左侧独立节点 '+l,'左边界是右孩子，取它并令 l++。累计 '+acc+'。',['left'],[l],span(...nodeRange(l)));l++;}if(r&1){--r;covered.push(r);acc+=tree[r];show('取右侧独立节点 '+r,'先 --r，取最后一个位于范围内的完整块。累计 '+acc+'。',['right'],[r],span(...nodeRange(r)));}l=Math.floor(l/2);r=Math.floor(r/2);show('剩余区域上升一层','新层边界 l='+l+'、r='+r+'；已选节点不重复计算。',['up'],[l,r].filter(p=>p>0&&p<tree.length));}answers.push(acc);show('记录区间和 '+acc,'待处理区域为空，所有选中节点恰好覆盖原查询。',['answer'],[],span(o.l,o.r));}});show('全部操作完成','叶子与内部聚合值均反映最后的数组。',['finish']);return {frames,result:{answers,final:a}};},oracle:d=>operationOracle(d,'set',8),exercises:[ex('求最小值的线段树，多余叶子的单位元应是什么？',['0','正无穷','负无穷'],1,'min(x,+∞)=x。填0会污染全为正数的区间。'),ex('半开查询中 r 为奇数时，正确顺序是什么？',['先加 tree[r]，再 r--','先 --r，再加 tree[r]','直接忽略右边界'],1,'r 指向排除端点，先减1才能进入区间内。'),ex('维护字符串连接时，一份 sum 按访问顺序追加够不够？',['够，因为连接满足交换律','不够，需要左右分别累计以保持顺序','不够，因此线段树不能维护字符串'],1,'连接有结合律但没有交换律；左结果 append，右结果 prepend，最后合并两者。')],sources:[source('cp-algorithms · Segment Tree','https://cp-algorithms.com/data_structures/segment_tree.html','核查区间分解、线性建树、点更新和结合信息维护；迭代半开实现由本章独立编写。')],cppInput:d=>opsInput(d,'set'),cppOutput:opsOutput,transfer:{contrast:'前缀和靠相消，Fenwick 靠二进制前缀分块，线段树靠任意区间的层次分解。它们解决的更新模型与运算前提不同。',next:['tree-dp'],challenge:'把节点从一个和改成 {sum,prefix,suffix,best}，为最大子段和写合并公式，并明确是否允许空子段。'}
  },segmentCode);

  const kmpCode=code(`#include <iostream>
#include <vector>
#include <string>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string text, pattern; getline(cin, text); getline(cin, pattern);
    int n = (int)text.size(), m = (int)pattern.size();
    vector<int> pi(m, 0), positions; // @init
    for (int i = 1; i < m; ++i) {
        int j = pi[i - 1]; // @candidate
        while (j > 0 && pattern[i] != pattern[j]) j = pi[j - 1]; // @fallback
        if (pattern[i] == pattern[j]) ++j;
        pi[i] = j; // @prefix
    }
    if (m == 0) {
        for (int i = 0; i <= n; ++i) positions.push_back(i); // @empty
    } else {
        int j = 0;
        for (int i = 0; i < n; ++i) {
            while (j > 0 && text[i] != pattern[j]) j = pi[j - 1]; // @searchback
            if (text[i] == pattern[j]) ++j; // @advance
            if (j == m) {
                positions.push_back(i - m + 1); // @match
                j = pi[j - 1]; // @overlap
            }
        }
    }
    cout << pi.size() << '\\n'; for (int x : pi) cout << x << ' ';
    cout << '\\n' << positions.size() << '\\n'; for (int x : positions) cout << x << ' ';
    cout << '\\n'; // @finish
}`,{fallback:'当前候选边界失配时，次长候选是它自己的最长 border，不是 j-1。',searchback:'回退的是模式已匹配长度，文本指针不回退。',overlap:'完整匹配后保留最长 border，使重叠匹配不会漏掉。',empty:'本章将空模式定义为匹配文本的每个边界，包含末尾 n。'});
  function validateKMP(d){record(d);word(d.text,24,'text');word(d.pattern,12,'pattern');}
  function kmpOutput(out){const t=numbersOut(out),m=t[0],prefix=t.slice(1,m+1),count=t[m+1];return {prefix,positions:t.slice(m+2,m+2+count)};}
  register({id:'kmp',section:'strings',title:'KMP 与前缀函数',subtitle:'失配时，利用已匹配内容而不是重新开始',level:'核心',tags:['字符串匹配','border','前缀函数'],prerequisites:['complexity'],summary:'计算模式串每个前缀的最长真 border，再用失败链接寻找文本中所有匹配位置，包括重叠出现；文本下标始终只向前。',
    lesson:{recognize:['在一个文本中寻找一个模式串的全部精确出现位置。','重复前缀会导致朴素匹配频繁回退，例如大量 a 后接一个 b。','KMP 是确定性的精确匹配，不使用哈希；本演示只接受小写英文，避免 Unicode 编码单位混淆。'],derive:[{title:'朴素匹配丢弃了已经知道的事实',text:'从每个起点逐字符尝试，最坏 O(nm)。失配前已经匹配了 j 个字符，这些文本内容与模式前 j 项相同，不应全部忘掉。'},{title:'把可保留部分写成 border',text:'border 是既为前缀又为后缀、但短于整个串的字符串。pi[i] 表示 pattern[0..i] 的最长真 border 长度。例如 ababa 的 pi 为 [0,0,1,2,3]。'},{title:'失败链接跳过不可能的长度',text:'已匹配 j 项却在下一项失配时，可保留的文本后缀必须也是模式前 j 项的 border；最长候选就是 pi[j-1]。若继续失配，再沿其 border 链跳转，而不是每个长度都试。'},{title:'复用同样的状态推进文本',text:'扫描文本字符，失配则回退 j，匹配则 j++。当 j=m，记录起点 i-m+1，再令 j=pi[m-1]，保留可与下一次出现重叠的后缀。空模式单独约定匹配所有 n+1 个边界。'}],invariant:{title:'j 是当前已处理文本后缀可对应的模式前缀长度',text:'比较新字符前，j 描述已保留的匹配前缀；失配时，所有仍可能的更短候选都沿 pi 链出现。',proof:['任何保留下来的较短匹配都必须同时是已匹配模式前缀的后缀与模式前缀，因此一定是一个 border。','最长 border 是 pi[j-1]；若它也失配，其次长 border 又是自身的最长 border。逐次跳转不会漏掉可行候选。','当下一字符相等，扩展 j 得到合法的新匹配；当 j 退到0仍不相等，就没有非空前缀能匹配当前文本后缀。','j=m 时恰好匹配了完整模式，记录的起点正确；回到 pi[m-1] 保留重叠所需状态。每次前进最多增加 j 一次，回退总量不超过增加总量，故整体线性。']},complexity:{time:'构造 pi 为 O(m)，匹配 O(n)，加上输出 O(z)；空模式输出 n+1 个位置。',space:'前缀函数 O(m)，匹配结果 O(z)，扫描额外 O(1)。',conditions:'n 为文本长度，m 为模式长度，z 为出现次数。字符串按字符编号比较，本演示限 a-z，text≤24、pattern≤12；真实 UTF-8 的 byte 与字符必须另行统一。'},pitfalls:[pit('完整匹配后直接清零','会丢掉可重叠的匹配，应该回退到完整模式的最长 border。','text=aaaa、pattern=aa，应出现于0、1、2；每次 j 清零会漏掉1。'),pit('失配时只做 j--','这个长度未必仍是合法 border，可能虚构已经匹配的内容。','pattern=ababc，在 j=4 的 abab 后失配，合法次长候选是 pi[3]=2，不是长度3的 aba。'),pit('把 border 长度当下标','pi 存长度；失败跳转访问 pi[j-1]，不是 pi[j]。','pattern=aba，完整长度3的 border 长度为1，对应 pi[2]=1。访问 pi[3] 会越界。'),pit('未定义空模式','m=0 时直接读 pattern[j] 越界，必须约定语义。','text=ab、pattern=""，本章返回边界 [0,1,2]，不是崩溃或默认只返回0。')],applications:['精确查找模式、统计重叠出现、寻找字符串的周期与 border 链。','最短循环节候选为 m-pi[m-1]；若要由同一块完整重复构成，还必须检查 m 能被该长度整除。']},
    input:{description:'text：最多24个小写英文字母；pattern：最多12个小写英文字母。均可为空。返回 prefix 与所有零基 positions；空模式匹配0到n的每个边界。',default:{text:'ababcabababcab',pattern:'ababcab'},presets:[{name:'重叠匹配',data:{text:'aaaa',pattern:'aa'}},{name:'多次失败跳转',data:{text:'abababacaba',pattern:'ababaca'}},{name:'空模式',data:{text:'abc',pattern:''}},{name:'空文本',data:{text:'',pattern:'a'}}],validate:validateKMP},random(seed){const r=random(seed),s=n=>Array.from({length:n},()=>String.fromCharCode(97+r(0,2))).join('');return {text:s(r(0,22)),pattern:s(r(0,10))};},
    run(d){validateKMP(d);const {text,pattern}=d,n=text.length,m=pattern.length,prefix=Array(m).fill(0),positions=[],frames=[];let j=0;const show=(title,description,tags,i=-1,phase='模式预处理',matched=[])=>frame(frames,kmpCode,title,description,tags,{arrays:[ar('文本 text',text.split(''),phase==='文本匹配'&&i>=0?[i]:matched),ar('模式 pattern',pattern.split(''),phase==='模式预处理'&&i>=0?[i,...(j<m?[j]:[])]:span(0,j)),ar('前缀函数 pi：border 长度',prefix,phase==='模式预处理'&&i>=0?[i]:[]),ar('已发现起点',positions)]},[metric('阶段',phase),metric('已保留匹配长度 j',j)]);show('建立模式的失败链接','pi[i] 是截至 i 的前缀的最长真 border 长度；pi[0]=0。',['init']);for(let i=1;i<m;i++){j=prefix[i-1];show('从已有 border 尝试扩展','候选长度从 pi['+(i-1)+']='+j+' 开始。',['candidate'],i);while(j>0&&pattern[i]!==pattern[j]){const old=j;j=prefix[j-1];show('沿 border 链回退',pattern[i]+' 与 '+pattern[old]+' 不同，长度 '+old+' → '+j+'。',['fallback'],i);}if(pattern[i]===pattern[j])j++;prefix[i]=j;show('确定 pi['+i+']='+j,'当前最长真 border 长度为 '+j+'。',['prefix'],i);}j=0;if(!m){for(let i=0;i<=n;i++){positions.push(i);show('空模式匹配边界 '+i,'空串可放在字符之间，也可放在文本两端。',['empty'],-1,'空模式');}}else{for(let i=0;i<n;i++){while(j>0&&text[i]!==pattern[j]){const old=j;j=prefix[j-1];show('文本失配，模式回退','文本位置 '+i+' 不动；匹配长度 '+old+' → '+j+'。',['searchback'],i,'文本匹配');}const ok=text[i]===pattern[j];if(ok)j++;show('处理文本位置 '+i,ok?'字符相等，匹配长度增加到 '+j+'。':'已无可保留 border，这个字符也不匹配模式首字符。',['advance'],i,'文本匹配');if(j===m){positions.push(i-m+1);show('发现完整匹配','起点 '+(i-m+1)+'，覆盖 ['+(i-m+1)+','+(i+1)+')。',['match'],i,'文本匹配');j=prefix[j-1];show('保留重叠后缀','完整匹配后令 j=pi[m-1]='+j+'，继续扫描。',['overlap'],i,'文本匹配');}}}show('匹配结束','找到 '+positions.length+' 个位置，均为精确匹配。',['finish'],-1,'完成');return {frames,result:{prefix,positions}};},
    oracle(d){validateKMP(d);const prefix=[];for(let i=0;i<d.pattern.length;i++){let best=0;for(let len=1;len<=i;len++)if(d.pattern.slice(0,len)===d.pattern.slice(i+1-len,i+1))best=len;prefix.push(best);}const positions=[];for(let i=0;i+d.pattern.length<=d.text.length;i++)if(d.text.slice(i,i+d.pattern.length)===d.pattern)positions.push(i);return {prefix,positions};},
    exercises:[ex('text=aaaa、pattern=aa 的全部匹配起点是？',['[0,2]','[0,1,2]','[1,2,3]'],1,'匹配允许重叠，而且采用零基下标；完整匹配后需保留一个 a 的 border。'),ex('字符串 ababa 的最长真 border 是？',['ababa，长5','aba，长3','abab，长4'],1,'真 border 必须短于整个串；aba 同时是前缀和后缀。'),ex('pattern=ababab，pi[5]=4。候选循环节长度与完整重复判定是？',['长度2，且6可被2整除，因此成立','长度4，总是成立','长度6，必须只有一个重复块'],0,'m-pi[m-1]=2。整除检查保证能由若干个完整的 ab 组成。')],sources:[source('cp-algorithms · Prefix Function','https://cp-algorithms.com/string/prefix-function.html','核查 border 失败链接、线性证明、匹配与周期性质。')],cppInput:d=>d.text+'\n'+d.pattern+'\n',cppOutput:kmpOutput,transfer:{contrast:'pi 从每个前缀的末尾看最长 border；Z 从每个起点看与整串前缀能匹配多长。二者编码了相同字符串的不同重合关系。',next:['z-function','rolling-hash'],challenge:'用 pi 的失败链列出整个模式串的所有真 border 长度，并在 ababab 上手动验证顺序与终止条件。'}
  },kmpCode);

  const zCode=code(`#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; getline(cin, s); int n = (int)s.size();
    vector<int> z(n, 0); int l = 0, r = 0; // @init
    for (int i = 1; i < n; ++i) {
        if (i < r) z[i] = min(r - i, z[i - l]); // @reuse
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) ++z[i]; // @extend
        if (i + z[i] > r) { l = i; r = i + z[i]; } // @box
    }
    for (int i = 0; i < n; ++i) cout << z[i] << (i + 1 == n ? '\\n' : ' '); // @finish
}`,{init:'本章约定 z[0]=0；另一常见约定是 n，不能混用。',reuse:'盒内只能保证到 r 为止，所以必须截断成 min(r-i,z[i-l])。',box:'维护右端点最远的匹配盒 [l,r)，其中 s[l..r) 与前缀等长片段相等。'});
  function validateZ(d){record(d);word(d.s,24,'s');}
  register({id:'z-function',section:'strings',title:'Z 函数',subtitle:'从每个起点，与整串前缀能重合多长',level:'核心',tags:['前缀匹配','Z-box','线性字符串'],prerequisites:['kmp'],summary:'计算 z[i]：从位置 i 开始的后缀与整串前缀的最长公共前缀长度。利用最靠右的匹配区间复用比较，本章约定 z[0]=0。',lesson:{recognize:['需要知道每个位置与整串开头的相同长度。','可以把模式与文本拼接，用 Z 值判断模式在何处出现；分隔符必须不在原字符集中。','相比 KMP，Z 直接回答“从这里往右与开头相同多久”，而不是“截至这里有多长 border”。'],derive:[{title:'朴素地逐个起点比较',text:'对每个 i 从 z=0 开始比较 s[z] 和 s[i+z]，最坏全相同字符串会产生 O(n²) 次比较。'},{title:'记住已经匹配到最右边的一段',text:'维护 [l,r)，已知 s[l..r) 等于前缀 s[0..r-l)。这段区域称为 Z-box。若 i 在盒中，i 的局部内容与前缀里的 i-l 位置对应。'},{title:'利用盒内对应关系，但只相信边界以内',text:'初值可以取 min(z[i-l],r-i)。若 z[i-l] 完全落在盒内，答案可直接由旧比较决定；若触及右边界，盒外仍未知，必须继续实际比较。'},{title:'扩展右边界后更新盒子',text:'从已知长度起继续比较，直到失配或到末尾。若 i+z[i]>r，就把盒子改为 [i,i+z[i])。有效新比较推动 r 向右，而 r 总共最多移动 n 次。'}],invariant:{title:'[l,r) 是已处理起点中右端最远的正确匹配盒',text:'s[l..r)=s[0..r-l)，且当前所有已处理起点的 z 值正确。',proof:['空盒 [0,0) 正确。处理 i 时，若不在盒中，只能从长度0开始实际比较。','若 i<r，盒内字符与前缀逐项相同，所以至少能保证 min(z[i-l],r-i) 项相等，不能越过 r 无依据地复制。','之后的 while 只在字符真实相等时增长，并在第一处失配或串尾停止，因此最终 z[i] 是精确最长长度。','仅当 i+z[i] 更大时更新盒子，保持最右性质。盒内可直接确定的比较不重复扩张；真正成功的新扩展推进右边界，总计 O(n)。']},complexity:{time:'O(n)，每个位置只有常数次盒内判断，成功的盒外扩展总数 O(n)。',space:'Z 数组 O(n)，维护盒子额外 O(1)。',conditions:'n 为字符串长度；字符比较视为 O(1)。本章 z[0]=0，空串返回 []，单字符返回 [0]；只允许 a-z，长度≤24。'},pitfalls:[pit('直接复制 z[i-l] 不截断','旧匹配可能延伸到当前盒子以外，那里的字符未知。','s=aaaabaa：在盒 [1,4) 内处理 i=3 时，z[2]=2，但实际 z[3]=1，因为位置4是 b。'),pit('把 r 当作包含端点','本章盒是 [l,r)，可复用的长度是 r-i，不是 r-i+1。','盒 [1,4) 只含位置1、2、3；在 i=3 最多保证1项相等。'),pit('混淆 z[0] 的约定','本章固定0，不能拿采用 n 的答案直接比较而不归一。','s=abc，本章为 [0,0,0]，采用另一约定的资料可能写 [3,0,0]。'),pit('匹配拼接时使用会出现的分隔符','模式、分隔符、文本必须被可靠隔开，避免 Z 跨边界误读。','模式含 a，若仍用 a 作分隔符，就不能再假设匹配不会穿过分界；应选字符集之外的符号或整数哨兵。')],applications:['在 pattern+分隔符+text 上，文本起点的 Z 值至少为模式长度即为出现位置。','找前缀重复、border、字符串周期候选；若 i+z[i]=n，位置 i 的后缀也是整串的一个前缀。']},
    input:{description:'s：最多24个小写英文字母，可以为空。返回 z 数组，统一约定 z[0]=0。',default:{s:'aabcaabxaaaz'},presets:[{name:'盒内截断反例',data:{s:'aaaabaa'}},{name:'全相同字符',data:{s:'aaaaaa'}},{name:'空字符串',data:{s:''}}],validate:validateZ},random(seed){const r=random(seed);return {s:Array.from({length:r(0,24)},()=>String.fromCharCode(97+r(0,2))).join('')};},
    run(d){validateZ(d);const {s}=d,n=s.length,z=Array(n).fill(0),frames=[];let l=0,r=0;const show=(title,text,tags,i=-1,compared=[])=>frame(frames,zCode,title,text,tags,{arrays:[ar('字符串 s',s.split(''),compared,{...(l<n?{[l]:'盒左端 l'}:{}),...(r<n?{[r]:'r（不含）'}:{})},span(l,r)),ar('Z 数组',z,i>=0?[i]:[])]},[metric('当前起点 i',i<0?'—':i),metric('Z-box','['+l+','+r+')')]);show('从空盒开始','z[0]=0 是本章约定，其他起点等待计算。',['init']);for(let i=1;i<n;i++){if(i<r){z[i]=Math.min(r-i,z[i-l]);show('复用盒内信息','z['+i+']=min(r-i='+ (r-i)+', z['+(i-l)+']='+z[i-l]+')='+z[i]+'。',['reuse'],i);}else show('起点在盒外','没有可复用的保证，从长度0开始比较。',['reuse'],i);while(i+z[i]<n&&s[z[i]]===s[i+z[i]]){const a=z[i],b=i+z[i];z[i]++;show('字符相等，延长匹配','s['+a+'] 与 s['+b+'] 都为 '+s[a]+'，z['+i+'] 增至 '+z[i]+'。',['extend'],i,[a,b]);}show('最长长度已确定',i+z[i]===n?'匹配到字符串末尾，z['+i+']='+z[i]+'。':'下一字符不相等，停止在长度 '+z[i]+'。',['extend'],i,i+z[i]<n?[z[i],i+z[i]]:[]);if(i+z[i]>r){l=i;r=i+z[i];show('更新最右匹配盒','新盒 ['+l+','+r+') 的右端更远。',['box'],i);}}show('全部 Z 值完成','每个位置都知道与整串前缀重合的最大长度。',['finish']);return {frames,result:{z}};},oracle(d){validateZ(d);const z=Array(d.s.length).fill(0);for(let i=1;i<d.s.length;i++)while(i+z[i]<d.s.length&&d.s[z[i]]===d.s[i+z[i]])z[i]++;return {z};},exercises:[ex('s=aaaa，本章约定下的 Z 数组是？',['[4,3,2,1]','[0,3,2,1]','[0,1,2,3]'],1,'每个后缀都与开头匹配到串尾，但 z[0] 按本章约定为0。'),ex('i 在盒 [l,r) 内，为什么不能无条件复制 z[i-l]？',['因为字符串可能是空的','因为盒外字符没有被证明与前缀相同','因为 Z 值不能重复'],1,'盒子只承诺到 r 为止，因此需要 min(r-i,z[i-l])，再实际检查盒外。'),ex('若 i+z[i]=n，说明什么？',['整个串一定由两段相同串组成','位置 i 之后的后缀同时也是整串前缀','z[i] 一定为0'],1,'从 i 到串尾的每个字符都与同长度前缀相同，因此该后缀是一个 border（i>0时）。')],sources:[source('cp-algorithms · Z-function','https://cp-algorithms.com/string/z-function.html','核查半开 Z-box、复用截断、线性证明及匹配用途。')],cppInput:d=>d.s+'\n',cppOutput:out=>({z:numbersOut(out)}),transfer:{contrast:'KMP 和 Z 都做确定性精确匹配；哈希把长片段压缩成数字以支持更灵活比较，但必须面对碰撞风险。',next:['rolling-hash'],challenge:'设计 pattern+唯一分隔符+text 的匹配方法，推导文本下标与拼接串下标的换算，并说明空模式要如何处理。'}
  },zCode);

  const trieCode=code(`#include <iostream>
#include <vector>
#include <array>
#include <string>
using namespace std;
struct Node {
    array<int, 26> next; int pass = 0, terminal = 0;
    Node() { next.fill(-1); }
};
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q; string line; getline(cin, line);
    vector<Node> trie(1); // @init
    for (int k = 0; k < n; ++k) {
        string s; getline(cin, s); int v = 0; ++trie[v].pass; // @root
        for (char ch : s) {
            int c = ch - 'a';
            if (trie[v].next[c] == -1) {
                int id = (int)trie.size(); trie[v].next[c] = id;
                trie.emplace_back(); // @create
            }
            v = trie[v].next[c]; ++trie[v].pass; // @walk
        }
        ++trie[v].terminal; // @terminal
    }
    while (q--) {
        string type, s; getline(cin, type); getline(cin, s); int v = 0;
        for (char ch : s) {
            int next = trie[v].next[ch - 'a']; // @query
            if (next == -1) { v = -1; break; } // @missing
            v = next;
        }
        int answer = v == -1 ? 0 : (type == "exact" ? trie[v].terminal : trie[v].pass); // @answer
        cout << answer << '\\n';
    }
    return 0; // @finish
}`,{root:'空前缀经过根，因此每插入一个词（包括空词），根 pass 都增加。',terminal:'只有完整单词终点增加 terminal；路过某前缀不代表它作为完整单词出现。',create:'使用下标而不是持有 vector 元素引用，避免扩容后引用失效。',answer:'exact 读 terminal；prefix 读 pass，重复单词按插入次数计数。'});
  function validateTrie(d){record(d);list(d.words,8,'words');let total=0;for(const s of d.words){word(s,6,'单词');total+=s.length;}if(total>12)fail('words 的总字符数不能超过12，保证字典树图可以完整显示。');list(d.queries,10,'queries');for(const q of d.queries){record(q,'查询');if(q.type!=='exact'&&q.type!=='prefix')fail('查询 type 只能是 exact 或 prefix。');word(q.text,6,'查询 text');}}
  register({id:'trie',section:'strings',title:'Trie 字典树',subtitle:'相同前缀共享路径，终点与路过次数分开记',level:'核心',tags:['前缀检索','多重集合','字符树'],prerequisites:[],summary:'把多个单词插入共享前缀树，回答“完整单词出现几次”和“以某前缀开头的单词有几个”。重复词与空词都有明确计数语义。',lesson:{recognize:['同时保存许多字符串，并反复做完整单词或前缀计数。','大量词共享前缀时，公共路径可以复用；每条边表示一个字符。','本章字符集固定为26个小写字母。不提供任意文本多模式匹配，后者可在 Trie 上继续加入 AC 自动机失败链接。'],derive:[{title:'逐词扫描字典的瓶颈',text:'对每个查询遍历所有单词，逐字符检查，成本随字典大小增长。查询前缀可能与许多词共享同一段比较。'},{title:'让相同前缀只保存一次',text:'根表示空串。沿 a、b、c 的边走到的节点表示前缀 abc。插入时已有边就沿用，没有才建节点，因此每个不同前缀只出现一次。'},{title:'区分经过与终止',text:'pass 记录有多少次插入经过该节点；terminal 记录多少次插入恰好在这里结束。插入 a 与 ab 后，节点 a 的 pass=2、terminal=1。'},{title:'沿查询路径取答案',text:'路径缺边就返回0；到达末端后，exact 取 terminal，prefix 取 pass。空查询停在根：空前缀匹配所有词，而空完整单词只计真正插入的空词。'}],invariant:{title:'每个节点代表唯一前缀，计数反映插入多重集合',text:'每个单词完整插入结束后，对节点 v 所表示的前缀 p，pass[v] 等于以 p 开头的已插入单词数，terminal[v] 等于完整等于 p 的已插入单词数，均按重复次数计。插入中间帧尚在逐步更新这些计数。',proof:['根代表空前缀，初始没有单词，两种计数都为0。','插入一个词时，根和它每个前缀节点的 pass 各增加1；其他节点不变，恰好记录这个词属于哪些前缀集合。','只有最终节点 terminal 增加1，故共享路径不会把较长词误计成较短的完整词。','按查询字符走的路径唯一；缺边说明该前缀从未出现，到达后由计数定义直接得到答案。']},complexity:{time:'建树 O(Σ|word|+D)，一次查询 O(|query|+1)。',space:'至多 1+Σ|word| 个节点；C++ 每节点26条转移，空间 O(26V)=O(V)（固定字母表）。',conditions:'D 为插入词数，V 为节点数；额外的 D 项计数覆盖空单词。若字母表大小不固定，稠密数组成本是 O(σV)，稀疏映射的查找成本也需计入。教学词≤8、总字符≤12、查询≤10。'},pitfalls:[pit('把存在路径当成完整单词','路径存在只证明是某词前缀，必须检查 terminal。','仅插入 apple，查询 exact("app") 应为0，而 prefix("app") 为1。'),pit('把 pass 与 terminal 混用','前缀计数包含更长词，完整计数不包含。','插入 a、ab、a 后，节点 a 的 pass=3，terminal=2。'),pit('重复词是否去重没有说清','本章把字典当多重集合，每次插入都计一次。','插入 cat 两次，exact("cat")=2，不是1；若题目要求不同单词数，需另外去重。'),pit('忘记根也代表合法前缀','空前缀匹配所有词；空词在根结束。','插入 "" 与 a 后，prefix("")=2，exact("")=1。')],applications:['词典补全的候选数量、前缀分组与动态单词频次。','二进制 Trie 把边改为0/1，可用于最大异或；普通字符串 Trie 加失败链接可拓展到 AC 自动机，但查询语义与证明需重新建立。']},
    input:{description:'words：最多8个小写词，各长度≤6、总字符数≤12，允许空词和重复词。queries 最多10条 {type:"exact"|"prefix",text}，text 长度≤6。计数不去重。',default:{words:['a','ab','ac','ab','b'],queries:[{type:'prefix',text:'a'},{type:'exact',text:'a'},{type:'exact',text:'ab'},{type:'prefix',text:'ad'},{type:'prefix',text:''}]},presets:[{name:'终点不等于路过',data:{words:['ab','abc'],queries:[{type:'exact',text:'a'},{type:'prefix',text:'a'},{type:'exact',text:'ab'}]}},{name:'空词与重复词',data:{words:['','a','a'],queries:[{type:'exact',text:''},{type:'prefix',text:''},{type:'exact',text:'a'}]}},{name:'空字典',data:{words:[],queries:[{type:'prefix',text:''},{type:'exact',text:'a'}]}}],validate:validateTrie},random(seed){const r=random(seed),words=[];let remaining=12;for(let i=0,n=r(0,6);i<n;i++){const len=r(0,Math.min(3,remaining));words.push(Array.from({length:len},()=>String.fromCharCode(97+r(0,2))).join(''));remaining-=len;}const queries=Array.from({length:6},()=>({type:r(0,1)?'exact':'prefix',text:Array.from({length:r(0,3)},()=>String.fromCharCode(97+r(0,2))).join('')}));return {words,queries};},
    run(d){validateTrie(d);const nodes=[{next:{},pass:0,terminal:0,prefix:''}],answers=[],frames=[];const graph=(active=-1)=>{const depth=Math.max(1,...nodes.map(v=>v.prefix.length)),positions=new Map();let leaves=0;function place(i){const child=Object.values(nodes[i].next);if(!child.length){positions.set(i,leaves++);return positions.get(i);}const centers=child.map(place),center=(centers[0]+centers[centers.length-1])/2;positions.set(i,center);return center;}place(0);return {directed:true,height:Math.max(350,70+depth*66),caption:'节点内为编号，前缀和 pass/terminal 在下表',nodes:nodes.map((v,i)=>({id:String(i),label:String(i),description:'前缀 '+(v.prefix||'ε')+'，pass='+v.pass+'，terminal='+v.terminal,x:leaves===1?50:8+84*positions.get(i)/(leaves-1),y:100*v.prefix.length/depth,state:i===active?'active':'done'})),edges:nodes.flatMap((v,i)=>Object.entries(v.next).map(([ch,j])=>({from:String(i),to:String(j),label:ch,state:j===active?'active':'done'})))};};const show=(title,text,tags,active=0,chars='',at=-1)=>frame(frames,trieCode,title,text,tags,{graph:graph(active),arrays:[ar('当前字符串',chars.split(''),at>=0?[at]:[]),ar('查询答案',answers)],tables:[tb('节点编号对应的前缀与计数',['编号','前缀','pass','terminal'],nodes.map((v,i)=>[i,v.prefix||'ε',v.pass,v.terminal]),active>=0?[active]:[])]});show('根代表空串','每个节点对应一个唯一前缀；pass 与 terminal 初始均为0。',['init']);d.words.forEach((s,k)=>{let v=0;nodes[v].pass++;show('插入词 '+(k+1)+'：'+(s||'ε'),'所有词都经过空前缀，根 pass 增加1。',['root'],v,s);for(let i=0;i<s.length;i++){const ch=s[i];if(nodes[v].next[ch]===undefined){const id=nodes.length;nodes[v].next[ch]=id;nodes.push({next:{},pass:0,terminal:0,prefix:nodes[v].prefix+ch});show('创建字符边 '+ch,'此前没有这个前缀，为它新建节点 '+id+'。',['create'],id,s,i);}v=nodes[v].next[ch];nodes[v].pass++;show('经过前缀 '+nodes[v].prefix,'节点 '+v+' 的 pass 增加1，表示多一个词具有此前缀。',['walk'],v,s,i);}nodes[v].terminal++;show('单词在此结束','节点 '+v+' 的 terminal 增加1；较短的路过节点不增加 terminal。',['terminal'],v,s);});d.queries.forEach((q,k)=>{let v=0;show('查询 '+(k+1)+'：'+q.type+' '+(q.text||'ε'),'从根沿查询字符逐条边前进。',['query'],v,q.text);for(let i=0;i<q.text.length;i++){const next=nodes[v].next[q.text[i]];if(next===undefined){show('缺少字符边 '+q.text[i],'这个前缀不存在，答案直接为0。',['missing'],v,q.text,i);v=-1;break;}v=next;show('抵达前缀 '+nodes[v].prefix,'当前字符路径存在，继续检查后续字符。',['query'],v,q.text,i);}const answer=v<0?0:(q.type==='exact'?nodes[v].terminal:nodes[v].pass);answers.push(answer);show('记录答案 '+answer,q.type==='exact'?'完整词查询读取 terminal，不能只看路径存在。':'前缀查询读取 pass，重复插入分别计数。',['answer'],v,q.text);});show('字典查询完成','每个查询只沿自身长度的路径走，不扫描整个字典。',['finish'],-1);return {frames,result:{answers}};},oracle(d){validateTrie(d);return {answers:d.queries.map(q=>d.words.filter(s=>q.type==='exact'?s===q.text:s.startsWith(q.text)).length)};},exercises:[ex('插入 a、ab、a 后，exact("a") 与 prefix("a") 分别为？',['2 与3','3 与2','1 与2'],0,'重复词按次数计，只有两个完整的 a，但三个词都以 a 开头。'),ex('只插入 abc，节点 ab 存在，能否据此说单词 ab 存在？',['能','不能，还要检查 terminal','只有查询非空时能'],1,'存在路径说明它是前缀；terminal 才记录是否有完整词在这里结束。'),ex('插入空串与 a 后，prefix("") 是多少？',['0','1','2'],2,'空串是所有字符串的前缀，所以每次插入都应增加根的 pass。')],sources:[source('cp-algorithms · Aho–Corasick: Construction of the trie','https://cp-algorithms.com/string/aho_corasick.html','核查文中 Trie 基础构造小节；本章只使用字典树，不声称已经实现自动机。')],cppInput:d=>`${d.words.length} ${d.queries.length}\n${d.words.length?d.words.join('\n')+'\n':''}${d.queries.map(q=>q.type+'\n'+q.text+'\n').join('')}`,cppOutput:out=>({answers:numbersOut(out)}),transfer:{contrast:'KMP 是单模式的失败链接；Trie 是多模式共享前缀。将两种思想结合，才会得到 AC 自动机。',next:['kmp','rolling-hash'],challenge:'设计删除一个已有单词的操作。解释为什么必须先确认 terminal>0，且沿途 pass 不能变成负数。'}
  },trieCode);

  const hashCode=code(`#include <iostream>
#include <vector>
#include <string>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; getline(cin, s);
    long long base, mod; int q; cin >> base >> mod >> q;
    int n = (int)s.size(); vector<long long> h(n + 1, 0), power(n + 1, 1); // @init
    for (int i = 0; i < n; ++i) {
        power[i + 1] = power[i] * base % mod; // @power
        h[i + 1] = (h[i] * base + (s[i] - 'a' + 1)) % mod; // @prefix
    }
    auto hash = [&](int l, int r) {
        return (h[r] - h[l] * power[r - l] % mod + mod) % mod; // @extract
    };
    while (q--) {
        int l1, r1, l2, r2; cin >> l1 >> r1 >> l2 >> r2;
        bool sameLength = r1 - l1 == r2 - l2;
        bool hashEqual = sameLength && hash(l1, r1) == hash(l2, r2); // @fingerprint
        bool actualEqual = sameLength && s.compare(l1, r1 - l1, s, l2, r2 - l2) == 0; // @verify
        cout << hashEqual << ' ' << actualEqual << '\\n'; // @answer
    }
    return 0; // @finish
}`,{prefix:'使用左高右低的多项式方向，提取公式必须与这个方向一致。',extract:'先模乘再规范化负余数。参数限制保证两个小于 mod 的数之积不溢出 long long。',fingerprint:'同长且同哈希只是候选相等，不构成数学上的充分证明。',verify:'实际逐字符核验用于演示真值，会带来 O(长度) 的额外成本。'});
  function validateHash(d){record(d);word(d.s,24,'s');if(![5,7,101,1000000007].includes(d.mod))fail('mod 必须是 5、7、101 或 1000000007。');integer(d.base,2,Math.min(31,d.mod-1),'base');list(d.queries,12,'queries');for(const q of d.queries){tuple(q,4,'查询');range(q[0],q[1],d.s.length,'第一个片段');range(q[2],q[3],d.s.length,'第二个片段');}}
  const mulMod=(a,b,mod)=>Number((BigInt(a)*BigInt(b))%BigInt(mod));
  register({id:'rolling-hash',section:'strings',title:'字符串滚动哈希',subtitle:'用数字指纹快速筛选，并正视碰撞',level:'进阶',tags:['多项式哈希','子串比较','碰撞风险'],prerequisites:['prefix-sum','kmp'],summary:'用多项式前缀指纹在常数次数值运算内提取子串哈希，同时显示直接逐字符比较的真值。指纹相等可能碰撞，演示预设会真实展示这种情况。',lesson:{recognize:['大量比较任意子串，逐字符比较的重复成本很高。','可以接受有风险的指纹筛选，或在哈希相等后额外逐字符核验。不能把固定单哈希当作绝对可靠判等。','本章只处理 a-z，允许空子串；对比时先检查长度。小模数用于学习碰撞，不是推荐竞赛参数。'],derive:[{title:'直接比较可精确，但每次需逐字检查',text:'判断两个长度 L 的子串相等，朴素需要最坏 O(L) 字符比较。若有很多长子串查询，同一部分会反复读取。'},{title:'把字符序列编码成多项式',text:'把 a..z 映射为1..26，使用基数 B、模数 M。定义 H[0]=0，H[i+1]=(H[i]×B+code(s[i])) mod M；同时预处理 P[k]=B^k mod M。'},{title:'从前缀中扣掉无关部分',text:'H[r] 中 [0,l) 的贡献被右移了 r-l 位，是 H[l]×P[r-l]。因此 hash(l,r)=(H[r]-H[l]×P[r-l]) mod M；结果需规范到 [0,M)。'},{title:'把指纹判断与真实相等分开',text:'若等长片段的哈希不同，它们一定不等；若相同，只能说未被排除。本演示另做逐字符比较，分别输出 hashEqual 与 actualEqual，让真实碰撞可见。'}],invariant:{title:'前缀递推与截取公式都保留模 M 的多项式值',text:'对已经完成构造的前缀长度 k，H[k] 等于前 k 个字符的左高右低多项式对 M 的余数，P[k] 等于 B^k 对 M 的余数；未构造位置只是占位初值。全部构造完后，公式对所有 k 成立。',proof:['H[0]=0、P[0]=1 满足空前缀定义；每加入一个字符，将原多项式乘 B 后加新字符码，得到正确下一项。','在 H[r] 中把前 l 项与后 r-l 项分组，可写成 H[l]×B^(r-l)+目标子串多项式，模意义下仍成立。','相减并规范化余数即可得到子串指纹；相等字符串编码相同，因此不可能出现“真实相等但指纹不同”。','反方向不成立：有限 M 个余数不能一一对应无限多字符串。不同串可以落在同一余数上，实际相等必须由额外证据确认。']},complexity:{time:'只算指纹：预处理 O(n)，每次提取与同长比较 O(1)。本演示含直接核验，总计 O(n+Σ Lq+q)，最坏 O(n+qn)。',space:'前缀与幂数组 O(n)，保存 q 次结果 O(q)。',conditions:'Lq 为第 q 次等长比较的片段长度；n≤24、q≤12。JS 对提取时的大数乘法使用 BigInt 保证整数精确，C++ 参数限定 M≤10^9+7、B≤31，使乘积可放入 long long。固定参数没有通用的“碰撞概率必为1/M”保证。'},pitfalls:[pit('哈希相等就宣布精确相等','固定单模哈希一定存在碰撞；双模或随机基数只能降低风险，仍不构成无条件证明。','s=af、M=5、B=2：单字符 a 的编码1，f 的编码6，模5后都是1，但两串并不相等。'),pit('忘记长度也是字符串信息','不同长度可能同指纹，本章先检查长度，再比较指纹。','B=2、M=5 时，空串的哈希为0，单字符 e 的编码5也给出哈希0；两者长度不同，当然不是同一字符串。'),pit('取模后的负数未规范化','一些语言中负数 % M 仍为负，需要加 M 再取模。','H[r]=2、被减项模 M 为5、M=7 时，目标余数应为4，而不是-3。'),pit('JavaScript 普通乘法可能失去整数精度','H[l]×P[len] 可达到约10^18，超过 Number 的精确整数范围；必须用精确模乘。','两个接近10^9的余数相乘约10^18，大于2^53-1；误差可能让相同子串得到不同的提取结果。'),pit('偷偷加了核验，却仍宣称每次 O(1)','直接比较保证演示真值，但它读取字符，不是常数时间。','比较两个各长100000的相同片段，逐字符核验必须检查这些字符，最坏 O(100000)。')],applications:['重复片段与回文候选筛选、在字符串二分 LCP 时快速比较前缀指纹；必须说明随机化或碰撞处理策略。','需要绝对精确的单模式匹配时优先考虑 KMP/Z；大量任意子串比较可考虑后缀数组、LCP 与 RMQ 等确定性结构。']},
    input:{description:'s：最多24个 a-z 字符。mod 选 5、7、101 或1000000007；base 为2到min(31,mod-1)。queries 每条 [l1,r1,l2,r2] 比较两个半开片段，最多12条。返回指纹判断和精确真值两列。',default:{s:'abacaba',base:31,mod:101,queries:[[0,3,4,7],[0,2,1,3],[0,0,7,7],[0,1,0,2]]},presets:[{name:'真实可复现的碰撞',data:{s:'af',base:2,mod:5,queries:[[0,1,1,2],[0,1,0,1]]}},{name:'大模数精确整数运算',data:{s:'zzzzzzzzzzzzzzzzzzzzzzzz',base:31,mod:1000000007,queries:[[0,12,12,24],[3,18,5,20],[0,0,24,24]]}},{name:'空字符串',data:{s:'',base:2,mod:7,queries:[[0,0,0,0]]}}],validate:validateHash},
    random(seed){const r=random(seed),n=r(0,24),s=Array.from({length:n},()=>String.fromCharCode(97+r(0,6))).join(''),mod=[5,7,101,1000000007][r(0,3)],base=r(2,Math.min(31,mod-1)),queries=[];for(let i=0;i<8;i++){const l1=r(0,n),r1=r(l1,n),l2=r(0,n),r2=r(0,1)&&r1-l1<=n-l2?l2+r1-l1:r(l2,n);queries.push([l1,r1,l2,r2]);}return {s,base,mod,queries};},
    run(d){validateHash(d);const {s,base,mod,queries}=d,n=s.length,h=Array(n+1).fill(0),power=Array(n+1).fill(1),hashEqual=[],actualEqual=[],rows=[],frames=[];const show=(title,text,tags,active=[],hp=[],extra=[])=>frame(frames,hashCode,title,text,tags,{arrays:[ar('字符串 s',s.split(''),active),ar('前缀哈希 H',h,hp),ar('幂 P[k] = B^k mod M',power)],tables:[tb('指纹与真实语义分开',['片段1','片段2','哈希1','哈希2','同指纹且同长','真实相等','状态'],rows)]},[metric('B',base),metric('M',mod),...extra]);show('准备前缀与幂','H[0]=0、P[0]=1。尚未计算的位置暂存初始值，不代表已知。',['init']);for(let i=0;i<n;i++){power[i+1]=power[i]*base%mod;h[i+1]=(h[i]*base+s.charCodeAt(i)-96)%mod;show('接入字符 '+s[i]+'（码 '+(s.charCodeAt(i)-96)+'）','P['+(i+1)+']='+power[i+1]+'，H['+(i+1)+']=('+h[i]+'×'+base+'+'+(s.charCodeAt(i)-96)+') mod '+mod+'='+h[i+1]+'。',['power','prefix'],[i],[i,i+1]);}const extract=(l,r,label)=>{const product=mulMod(h[l],power[r-l],mod),value=(h[r]-product+mod)%mod;show('提取'+label+' ['+l+','+r+')','('+h[r]+' - '+h[l]+'×P['+(r-l)+']) mod '+mod+' = '+value+'。乘法用精确整数执行。',['extract'],span(l,r),[l,r],[metric('扣除项 mod M',product),metric('片段哈希',value)]);return value;};queries.forEach(([l1,r1,l2,r2])=>{const x=extract(l1,r1,'片段1'),y=extract(l2,r2,'片段2'),sameLength=r1-l1===r2-l2,hEq=sameLength&&x===y,aEq=s.slice(l1,r1)===s.slice(l2,r2);hashEqual.push(hEq);actualEqual.push(aEq);rows.push(['['+l1+','+r1+')','['+l2+','+r2+')',x,y,hEq?'是':'否',aEq?'是':'否',hEq&&!aEq?'碰撞！':aEq?'核验相等':'确定不等']);show(hEq&&!aEq?'发现真实碰撞':aEq?'核验：两片段相等':'核验：两片段不同',hEq&&!aEq?'指纹相同，但逐字符比较不同。不能把 hashEqual 当成精确语义。':!sameLength?'长度已经不同，因此无需把相同数字指纹当作相等。':aEq?'哈希与逐字符结果一致；本次正确不意味着永远不会碰撞。':'两列分别反映指纹筛选和真实字符串比较。',['fingerprint','verify','answer'],[...span(l1,r1),...span(l2,r2)]);});show('比较完成','共 '+queries.length+' 次查询，其中 '+hashEqual.filter((v,i)=>v&&!actualEqual[i]).length+' 次出现同长碰撞。精确核验成本已计入复杂度。',['finish']);return {frames,result:{hashEqual,actualEqual}};},
    oracle(d){validateHash(d);const naive=(l,r)=>{let h=0;for(let i=l;i<r;i++)h=(h*d.base+d.s.charCodeAt(i)-96)%d.mod;return h;};const hashEqual=[],actualEqual=[];for(const [l1,r1,l2,r2]of d.queries){hashEqual.push(r1-l1===r2-l2&&naive(l1,r1)===naive(l2,r2));let equal=r1-l1===r2-l2;for(let i=0;equal&&i<r1-l1;i++)if(d.s[l1+i]!==d.s[l2+i])equal=false;actualEqual.push(equal);}return {hashEqual,actualEqual};},
    exercises:[ex('两个等长子串的哈希不同，可以得出什么？',['一定不同','一定相同','什么都不能判断'],0,'同一编码规则下，相等字符串必有相同哈希，逆否命题说明哈希不同足以证明不等。'),ex('M=5，a编码1、f编码6，单字符哈希相等意味着什么？',['a 与 f 是同一个字符','发生碰撞，哈希相等不足以证明字符串相等','模运算实现一定出错'],1,'1 mod5 与6 mod5 相同，这是数学上的合法碰撞，不是程序 bug。'),ex('哈希相等后再逐字符核验，单次最坏复杂度是什么？',['仍为 O(1)','O(L)，L 是片段长度','一定 O(n²)'],1,'指纹提取常数次运算，但精确核验必须读取最多 L 个字符。')],sources:[source('cp-algorithms · String Hashing','https://cp-algorithms.com/string/string-hashing.html','核查多项式哈希、前缀子串提取与碰撞警告；本章使用左高右低方向并公开精确核验成本。')],cppInput:d=>`${d.s}\n${d.base} ${d.mod} ${d.queries.length}\n${d.queries.map(q=>q.join(' ')).join('\n')}\n`,cppOutput:out=>{const t=numbersOut(out),hashEqual=[],actualEqual=[];for(let i=0;i<t.length;i+=2){hashEqual.push(Boolean(t[i]));actualEqual.push(Boolean(t[i+1]));}return {hashEqual,actualEqual};},transfer:{contrast:'KMP/Z 用结构保证正确；哈希用压缩指纹换取比较灵活性。算法选择不仅看时间，还要区分确定性证明与概率风险。',next:['kmp','z-function','number-theory'],challenge:'在小模数下自动搜索同长不同串的碰撞，再比较固定单模、双模与逐字符核验各自能保证什么、需要付出什么代价。'}
  },hashCode);
})();
