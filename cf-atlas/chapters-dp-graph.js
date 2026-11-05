/* Codeforces 算法图谱：动态规划、图论与并查集。所有演示均由输入实时计算。 */
(function () {
'use strict';
const copy = x => JSON.parse(JSON.stringify(x));
const nums = n => Array.from({length:n},(_,i)=>i);
const fail = message => { throw new Error(message); };
function object(x) { if (!x || typeof x !== 'object' || Array.isArray(x)) fail('输入必须是 JSON 对象。'); }
function integer(x,lo,hi,name) { if (!Number.isInteger(x)||x<lo||x>hi) fail(name+'必须是 '+lo+' 到 '+hi+' 之间的整数。'); }
function list(x,hi,name) { if (!Array.isArray(x)||x.length>hi) fail(name+'必须是长度不超过 '+hi+' 的数组。'); }
function rng(seed) { let s=seed>>>0; return (lo,hi)=>{ s=(s+0x6d2b79f5)>>>0; let t=Math.imul(s^(s>>>15),s|1); t^=t+Math.imul(t^(t>>>7),t|61); return lo+Math.floor((((t^(t>>>14))>>>0)/4294967296)*(hi-lo+1)); }; }
const show = a => a.map(x=>Number.isFinite(x)?x:'∞');
function push(frames,title,explanation,code,visual) { const frame=copy(Object.assign({title,explanation,_code:Array.isArray(code)?code:[code]},visual)); if(!frames.length||JSON.stringify(frames[frames.length-1])!==JSON.stringify(frame))frames.push(frame); }
function table(label,columns,rows,activeRows=[],activeCells=[]) { return {label,columns,rows,activeRows,activeCells}; }
function arr(label,values,active=[],done=[],marks={}) { return {label,values,active,done,marks}; }
function graph(n,edges,directed,active=[],done=[],edgeActive=-1,labels=null,edgeDone=[]) {
  return {directed,nodes:nums(n).map(i=>({id:i,label:labels?String(labels[i]):String(i),...(active.includes(i)?{state:'active'}:done.includes(i)?{state:'done'}:{})})),edges:edges.map((e,i)=>({from:e[0],to:e[1],...(e.length>2?{label:String(e[2])}:{}),...(i===edgeActive?{state:'active'}:edgeDone.includes(i)?{state:'done'}:{})}))};
}
function graphInput(x,{maxN=12,maxM=40,weighted=false,negative=false,source=false}={}) {
  object(x); integer(x.n,0,maxN,'n'); list(x.edges,maxM,'edges'); if(x.n===0&&x.edges.length)fail('空图不允许有边；n=0 时 edges 必须为空数组。');
  for (let i=0;i<x.edges.length;i++) {
    const e=x.edges[i]; if (!Array.isArray(e)||e.length!==(weighted?3:2)) fail('edges['+i+'] 必须是 '+(weighted?'[起点,终点,权重]':'[起点,终点]')+'。');
    integer(e[0],0,x.n-1,'边的起点'); integer(e[1],0,x.n-1,'边的终点');
    if (weighted) integer(e[2],negative?-30:0,30,'边权（本章'+(negative?'支持负权':'不允许负权')+'）');
  }
  if (source) integer(x.source,0,Math.max(0,x.n-1),'source（空图只接受 0）');
}
function adjacency(n,edges,directed=false) { const a=nums(n).map(()=>[]); edges.forEach((e,i)=>{a[e[0]].push([e[1],e.length>2?e[2]:1,i]);if(!directed)a[e[1]].push([e[0],e.length>2?e[2]:1,i]);}); return a; }
function treeInput(n,edges) {
  integer(n,0,12,'节点数'); list(edges,11,'edges');
  if(edges.length!==Math.max(0,n-1)) fail('树必须恰好有 n−1 条边；空树必须没有边。');
  const a=nums(n).map(()=>[]),seen=new Set();
  edges.forEach(e=>{if(!Array.isArray(e)||e.length!==2)fail('树边必须是 [u,v]。');integer(e[0],0,n-1,'树边端点');integer(e[1],0,n-1,'树边端点');if(e[0]===e[1])fail('树不允许自环。');const key=[Math.min(...e),Math.max(...e)].join(',');if(seen.has(key))fail('树不允许重复边。');seen.add(key);a[e[0]].push(e[1]);a[e[1]].push(e[0]);});
  if(n){const visited=new Set([0]),q=[0];for(let h=0;h<q.length;h++)for(const v of a[q[h]])if(!visited.has(v)){visited.add(v);q.push(v);}if(visited.size!==n)fail('树必须连通，不能包含环或孤立分量。');}
}
function treeLayout(n,edges,root) {
  if(!n)return [];
  const a=adjacency(n,edges),depth=Array(n).fill(0),position=Array(n).fill(0);let leaves=0,maxDepth=0;
  function visit(u,p){const children=a[u].map(e=>e[0]).filter(v=>v!==p);maxDepth=Math.max(maxDepth,depth[u]);for(const v of children){depth[v]=depth[u]+1;visit(v,u);}position[u]=children.length?children.reduce((sum,v)=>sum+position[v],0)/children.length:leaves++;}
  visit(root,-1);const horizontal=maxDepth>=6;
  return nums(n).map(i=>{const across=leaves<=1?50:position[i]*100/(leaves-1),along=maxDepth?depth[i]*100/maxDepth:50;return horizontal?{x:along,y:across}:{x:across,y:along};});
}
function place(g,positions){g.nodes.forEach((node,i)=>Object.assign(node,positions[i]));return g;}
function groupsFromReach(reach) { const seen=new Set(),groups=[]; for(let i=0;i<reach.length;i++)if(!seen.has(i)){const g=[];for(let j=0;j<reach.length;j++)if(reach[i][j]&&reach[j][i]){g.push(j);seen.add(j);}groups.push(g);}return groups; }
function closure(n,edges,directed) { const r=nums(n).map(i=>nums(n).map(j=>i===j));for(const [u,v]of edges){r[u][v]=true;if(!directed)r[v][u]=true;}for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)r[i][j]=r[i][j]||(r[i][k]&&r[k][j]);return r; }
function canonical(groups) { return groups.map(g=>g.slice().sort((a,b)=>a-b)).sort((a,b)=>a[0]-b[0]); }
class Heap {
  constructor(compare){this.a=[];this.compare=compare;}
  push(v){const a=this.a;a.push(v);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(this.compare(a[p],a[i])<=0)break;[a[p],a[i]]=[a[i],a[p]];i=p;}}
  pop(){const a=this.a,r=a[0],v=a.pop();if(a.length){a[0]=v;let i=0;for(;;){let j=i,l=2*i+1,r=l+1;if(l<a.length&&this.compare(a[l],a[j])<0)j=l;if(r<a.length&&this.compare(a[r],a[j])<0)j=r;if(j===i)break;[a[i],a[j]]=[a[j],a[i]];i=j;}}return r;}
  get length(){return this.a.length;}
}
function register(c) {
  c.lesson.complexity.conditions += ' 所列复杂度指算法本体；教学回放另存快照，C++ 不保存这些快照。';
  const run=c.run,oracle=c.oracle;
  const lines=c.cpp.split('\n');
  c.run=input=>{c.input.validate(input);const out=run(input);for(const f of out.frames){f.lines=f._code.map(k=>{const i=lines.findIndex(s=>s.includes('// @'+k));if(i<0)throw new Error(c.id+' 缺少源码标签 '+k);return i+1;});delete f._code;}return out;};
  c.oracle=input=>{c.input.validate(input);return oracle(input);};
  c.codeNotes=(c.notes||[]).map(([key,text])=>({line:lines.findIndex(s=>s.includes('// @'+key))+1,text}));
  delete c.notes; CF.register(c);
}
const source=(title,url,note)=>({title,url,note});
const scalarOutput=key=>output=>{const s=output.trim();if(!/^-?\d+$/.test(s))throw new Error('C++ 输出应为一个整数。');return {[key]:Number(s)};};

register({
  id:'knapsack',section:'dp',title:'0/1 背包',subtitle:'把“选哪些物品”压缩成容量状态，再用逆序保护上一层',level:'核心',tags:['动态规划','状态压缩','逆序枚举'],prerequisites:['complexity'],
  summary:'求每件物品至多取一次、总重量不超过容量的最大价值。完整演示二维状态到一维逆序更新；本章不冒充完全背包、多重背包或恰好装满的统一模板。',
  lesson:{
    recognize:['每个物品独立决定选或不选，重量是正整数，目标是容量上限内最大化价值。','物品数大到不能枚举 2^n，但容量 W 较小，nW 可接受；W 极大时本章并不合适。','允许不选任何物品，因此负价值物品可以全部舍弃；“必须选若干件”或“恰好装满”要重新定义状态。'],
    derive:[
      {title:'第一步：枚举选择，发现重复子问题',text:'最直接的做法枚举 n 个二进制决策，共 2^n 个子集。处理前 i 件之后，未来真正关心的是还剩多少容量，而不必记住选了哪些编号。把不同历史按相同容量和已处理前缀合并。'},
      {title:'第二步：先写清二维语义',text:'令 F[i][c] 为“只考虑前 i 件、总重量不超过 c”的最大价值。第 i 件重量 w、价值 v：不选得到 F[i−1][c]；若 c≥w，选它得到 F[i−1][c−w]+v。取两者最大。F[0][c]=0，因为空集总合法。'},
      {title:'第三步：一维数组到底保存哪一层',text:'转移只读上一层，可用 dp[c] 覆盖 F[i][c]。但必须 c 从 W 下降到 w。这样读 dp[c−w] 时，那一格还未被本轮覆盖，仍属于 i−1 层；dp[c] 的旧值也是上一层。动画会同时标出写入容量与来源容量。'},
      {title:'第四步：用反例理解循环方向',text:'只有物品 (w=2,v=3)、W=4 时，正序先把 dp[2] 变成 3，又用这个本轮结果把 dp[4] 变成 6，相当于取了两件。逆序只会得到 3。循环方向不是代码风格，而是在表达物品能使用几次。'},
      {title:'第五步：知道何时换模型',text:'完全背包允许重复使用，正序才有对应语义。恰好装满应令 dp[0]=0、其他容量为负无穷，并跳过不可达来源。若价值和较小、容量巨大，可改成“达到价值的最小重量”；它不是本章代码只改一个变量就自动成立。'}
    ],
    invariant:{title:'逆序扫描保护旧层',text:'处理第 i 件、即将更新容量 c 时，所有容量大于 c 的状态已属于第 i 层；容量不超过 c 的状态仍属于第 i−1 层。',proof:['初始 c=W，所有格都是上一层，不变量成立。','因 w>0，c−w<c，来源格没有被当前物品更新，因此取分支确实只使用一次当前物品。','两分支分别覆盖“不取”和“取一次”，互斥且穷尽；取最大值得到新层最优值。','处理完 w 后，较小容量放不下当前物品，保留旧值正确；归纳得到 dp[W]=F[n][W]。']},
    complexity:{time:'O(nW)',space:'O(W) 工作空间；演示另保存步骤快照',conditions:'n 为物品数，W 为非负整数容量。这是伪多项式复杂度，并非关于 W 的二进制位数多项式。教学输入 n≤10、W≤18。'},
    pitfalls:[
      {title:'0/1 背包写成正序',text:'来源状态被当前物品污染，实质转成可重复选。',counterexample:'items=[(2,3)]、W=4，正确答案 3；正序会产生 6。'},
      {title:'把“不超过”误当“恰好”',text:'全零初始化只对应容量上限语义；它会把不存在的精确重量当成价值 0 的可达状态。',counterexample:'只有重量 2、价值 5，要求恰好重量 3 时无解；本章容量 3 的答案为 5，含义完全不同。'},
      {title:'按价值/重量比贪心',text:'物品不可分割时局部性价比不能保证全局最优。',counterexample:'W=4，物品 (3,5)、(2,3)、(2,3)。比值优先取 (3,5) 得 5，最优是后两件得 6。'},
      {title:'忽视空集与负值',text:'本章允许空集，负价值不会强迫你选；如果题目要求至少选一件，初始化必须改。',counterexample:'W=2，唯一物品 (1,−4)，本章答案为 0，不是 −4。'}
    ],
    applications:['有预算上限、每项仅能选择一次的收益最大化：重量映射为成本，价值映射为收益。','子集和可达性：把 max/value 状态改成布尔可达，但仍需逆序以避免一件物品重复使用。'],
  },
  input:{description:'capacity 为 0..18；items 最多 10 件，每件 {weight:1..20,value:−20..40}。空物品表合法，物品可不选。',default:{capacity:7,items:[{weight:2,value:4},{weight:3,value:5},{weight:4,value:7}]},presets:[{name:'正序更新的最小反例',data:{capacity:4,items:[{weight:2,value:3}]}},{name:'全部负收益',data:{capacity:4,items:[{weight:1,value:-5},{weight:2,value:-1}]}},{name:'零容量与空物品',data:{capacity:0,items:[]}}],validate(x){object(x);integer(x.capacity,0,18,'capacity');list(x.items,10,'items');for(const v of x.items){object(v);integer(v.weight,1,20,'weight');integer(v.value,-20,40,'value');}}},
  random(seed){const r=rng(seed),n=r(0,8);return {capacity:r(0,18),items:nums(n).map(()=>({weight:r(1,12),value:r(-8,25)}))};},
  run(x){const dp=Array(x.capacity+1).fill(0),frames=[];push(frames,'空前缀：全部容量取空集','dp[c] 表示容量不超过 c 的最优值，初始化全为 0。','init',{arrays:[arr('dp：容量上限 → 最大价值',dp)]});x.items.forEach((item,i)=>{if(item.weight>x.capacity)push(frames,'物品 '+i+' 放不进背包','重量 '+item.weight+' 大于容量 '+x.capacity+'，整层状态保持不变，转到下一件。','loop',{arrays:[arr('dp',dp)],metrics:[{label:'物品',value:i},{label:'重量',value:item.weight}]});for(let c=x.capacity;c>=item.weight;c--){const before=dp[c],candidate=dp[c-item.weight]+item.value;dp[c]=Math.max(before,candidate);push(frames,'物品 '+i+' · 容量 '+c,'不取='+before+'；取一次=旧层 dp['+(c-item.weight)+']+'+item.value+'='+candidate+'。选择 '+dp[c]+'，随后向较小容量移动。','relax',{arrays:[arr('dp（亮格为写入/读取）',dp,[c,c-item.weight],[],{[c]:'写',[c-item.weight]:'旧层读'})],metrics:[{label:'当前物品',value:i},{label:'候选价值',value:candidate}]});}});push(frames,'答案已确定','所有物品处理完毕，容量上限 '+x.capacity+' 的最大价值为 '+dp[x.capacity]+'。','answer',{arrays:[arr('最终 dp',dp,[x.capacity],nums(dp.length))]});return {frames,result:{value:dp[x.capacity]}};},
  oracle(x){let best=0;for(let mask=0;mask<(1<<x.items.length);mask++){let w=0,v=0;for(let i=0;i<x.items.length;i++)if(mask>>i&1){w+=x.items[i].weight;v+=x.items[i].value;}if(w<=x.capacity)best=Math.max(best,v);}return {value:best};},
  exercises:[
    {question:'W=4，只有物品 (2,3)。一维数组按容量 2、3、4 正序更新会输出多少？',options:['6','3','0'],answer:0,explanation:'先 dp[2]=3，更新 dp[4] 时读到本轮 dp[2]，得到 6。正确 0/1 答案是 3，因此必须逆序。'},
    {question:'将任务改成“恰好装满 W”，哪种初始化正确？',options:['所有 dp[c]=0','所有 dp[c]=正无穷','dp[0]=0，其余为不可达的负无穷'],answer:2,explanation:'只有重量 0 的空集初始可达。做最大化时用负无穷标记其他精确重量，并避免从不可达状态加价值。'},
    {question:'n=60，W=10^12，但价值都是小正整数，最值得尝试的状态转换是？',options:['继续申请 W 个格子','按价值记录达到该价值的最小重量','只选价值最大的物品'],answer:1,explanation:'令 dp[v] 为最小重量，转移仍是选/不选，最后找重量≤W 的最大 v。复杂度依赖价值总和，而不是巨大 W。'}
  ],
  sources:[source('cp-algorithms · Knapsack Problem','https://cp-algorithms.com/dynamic_programming/knapsack.html','核对 0/1 与完全背包的更新顺序及状态不变量；本章例子与文字为原创。')],
  cpp:`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, W; if (!(cin >> n >> W)) return 0;
    vector<long long> dp(W + 1, 0); // @init
    for (int i = 0; i < n; ++i) { // @loop
        int w; long long v; cin >> w >> v;
        for (int c = W; c >= w; --c) {
            dp[c] = max(dp[c], dp[c - w] + v); // @relax
        }
    }
    cout << dp[W] << '\\n'; // @answer
}
`,
  cppInput:x=>x.items.length+' '+x.capacity+'\n'+x.items.map(v=>v.weight+' '+v.value).join('\n')+'\n',cppOutput:scalarOutput('value'),notes:[['init','全零只适用于“不超过容量、允许空集”。'],['loop','外层枚举物品，每件只出现一次。'],['relax','倒序保证 dp[c−w] 属于上一层。']],
  transfer:{contrast:'完全背包允许重用物品，所以正序读当前层；0/1 背包倒序保护旧层。二者不是机械替换循环方向之外就完全等价。',next:['lis','interval-dp','subset-dp'],challenge:'把价值改为可为负且要求恰好装满：说明不可达状态如何表示，并给出不能全零初始化的测试。'}
});

register({
  id:'lis',section:'dp',title:'最长严格递增子序列',subtitle:'从每个位置的 DP 到“同长度保留最小末尾”',level:'核心',tags:['LIS','二分','支配性'],prerequisites:['complexity'],
  summary:'计算严格递增子序列长度，演示 lower_bound 如何维护最小末尾。明确区分子序列、连续子数组，以及“末尾数组”与真实方案。',
  lesson:{recognize:['允许删除若干元素，但保留原相对顺序；不是要求连续。','严格递增意味着相等值不能接在彼此之后；若允许相等，应改为最长不下降子序列。','只求长度时最小末尾压缩足够；求方案需前驱与末尾位置，计数需更丰富的数据结构，不能直接读取 tails。'],derive:[
    {title:'每个结尾的朴素 DP',text:'令 f[i] 为以 a[i] 结尾的最长严格递增子序列长度。枚举 j<i 且 a[j]<a[i]，有 f[i]=1+max f[j]，空集合时取 1。逐对比较需要 O(n²)，但给出可靠的基线和验证算法。'},
    {title:'等长方案中谁更值得保留',text:'长度同为 k 时，末尾值较小的方案更容易接未来数字。若两个末尾为 4 与 9，任何能接在 9 后面的数也能接在 4 后面。于是只存 tails[k−1]：当前前缀中长度 k 的最小可能末尾。它是对未来延伸能力的支配关系。'},
    {title:'为什么可以二分',text:'tails 严格递增：某个长度 k+1 的最优方案删掉最后一项，得到长度 k 的方案，其末尾严格更小；长度 k 的最小末尾不会更大。因此新值 x 应替换第一个 ≥x 的位置 p，或在所有末尾都 <x 时追加。'},
    {title:'替换不会“破坏过去”',text:'p 之前的末尾 <x，存在长度 p 的方案可以接 x，所以长度 p+1 可行。第一个 ≥x 的位置意味着不能用 x 得到更长方案。替换只保留一个更小或相等的末尾，不声称这些 tails 元素来自同一条真实序列。'},
    {title:'从长度扩展到方案与计数',text:'重建方案时保存每个位置的前驱，另存每个长度对应的末尾位置，最终回溯。若要统计 LIS 条数，相同最优长度的不同历史不能只留一个末尾，可以离散化后用树状数组维护“最大长度、方案数”。'}
  ],invariant:{title:'tails[k−1] 是最小可能末尾',text:'处理任一前缀后，tails 的第 k−1 格恰好表示该前缀所有长度 k 严格递增子序列的最小末尾，tails.length 为 LIS 长度。',proof:['空前缀没有非空子序列，tails 为空，成立。','设 p 为第一个 tails[p]≥x 的位置。若 p>0，长度 p 的最优末尾小于 x，可接成长度 p+1；p=0 时单元素 [x] 合法。','不能用 x 产生长度 p+2：那要求一个长度 p+1 的旧方案末尾 <x。若 p 在旧表内，与 tails[p]≥x 矛盾；若 p 等于旧表长度，则这样的旧方案根本不存在。','其他长度不因 x 改善，位置 p 更新为更小或相同末尾；若 p=长度则最长长度增加 1。归纳完成。']},complexity:{time:'O(n log n)',space:'O(n)',conditions:'n 为元素个数。每个元素一次二分及一次替换/追加；教学数组 n≤20。仅求长度，未计算 LIS 方案数。'},pitfalls:[
    {title:'严格递增却用 upper_bound',text:'找第一个 >x 的位置会允许相等元素增长长度。',counterexample:'[2,2,2] 的严格 LIS 长度是 1，不下降子序列长度才是 3。'},
    {title:'把 tails 当成答案序列',text:'末尾状态来自不同历史，不保证按原数组下标排列。',counterexample:'[2,6,3,4,1,5] 的最终 tails=[1,3,4,5]，但 1 出现在 3、4 后面，它不是原数组子序列；长度 4 仍正确。'},
    {title:'混淆子序列与连续段',text:'子序列可以跳过不需要的元素，连续子数组不可以。',counterexample:'[1,9,2,8,3] 的 LIS 是 [1,2,3]，长度 3；最长连续严格递增段只有 2。'},
    {title:'相等末尾时累加长度',text:'替换相等的末尾只是合并同一长度的等价延伸能力，不应新增一层。',counterexample:'[1,2,2,3] 的 LIS 长度 3，不是 4。'}
  ],applications:['按时间先后选择越来越大的指标：保留顺序的最优链长度。','二维偏序问题：先按一维排序，再对另一维求 LIS，但同一第一维的排序与分组必须处理，不能无条件套用。']},
  input:{description:'values 是长度 0..20 的整数数组，每个数 −50..50。空数组答案为 0；相等元素不能同时延长严格递增序列。',default:{values:[2,6,3,4,1,5]},presets:[{name:'全部相同',data:{values:[2,2,2,2]}},{name:'严格下降',data:{values:[5,4,3,2,1]}},{name:'空数组',data:{values:[]}}],validate(x){object(x);list(x.values,20,'values');x.values.forEach(v=>integer(v,-50,50,'数组元素'));}},
  random(seed){const r=rng(seed);return {values:nums(r(0,20)).map(()=>r(-12,12))};},
  run(x){const frames=[],tails=[];push(frames,'没有元素，末尾表为空','tails[k−1] 将保存长度 k 的最小末尾。','init',{arrays:[arr('输入',x.values),arr('tails',tails)]});x.values.forEach((v,i)=>{let l=0,r=tails.length;while(l<r){const m=(l+r)>>1;push(frames,'寻找第一个 ≥ '+v+' 的末尾','二分区间 [l,r)=['+l+','+r+')，mid='+m+'，tails[mid]='+tails[m]+'。','search',{arrays:[arr('输入',x.values,[i]),arr('tails',tails,[m],[],{[l]:'l',[r]:'r'})],metrics:[{label:'l',value:l},{label:'r（不含）',value:r}]});if(tails[m]<v)l=m+1;else r=m;}const old=tails[l];tails[l]=v;push(frames,old===undefined?'增加一种更长长度':'改进相同长度的末尾','x='+v+' 放入位置 '+l+'，表示长度 '+(l+1)+' 的最小末尾。'+(old===undefined?'当前最长长度增加 1。':'旧末尾为 '+old+'，长度不变。'),'update',{arrays:[arr('输入',x.values,[i],nums(i)),arr('最小末尾 tails（不一定是同一方案）',tails,[l])],metrics:[{label:'LIS 长度',value:tails.length}]});});push(frames,'长度完成','末尾表有 '+tails.length+' 格，因此严格 LIS 长度为 '+tails.length+'。','answer',{arrays:[arr('tails',tails,[],nums(tails.length))]});return {frames,result:{length:tails.length}};},
  oracle(x){const f=x.values.map(()=>1);let best=0;for(let i=0;i<f.length;i++){for(let j=0;j<i;j++)if(x.values[j]<x.values[i])f[i]=Math.max(f[i],f[j]+1);best=Math.max(best,f[i]);}return {length:best};},
  exercises:[{question:'[3,1,2,2,4] 的最长严格递增子序列长度是？',options:['3','4','5'],answer:0,explanation:'可取 [1,2,4]，长度 3；两个 2 不能连续放入严格递增序列。'},{question:'最终 tails=[1,3,4,5] 能直接当成原数组的一条 LIS 输出吗？',options:['总是可以','不一定，需要保存前驱和原位置','只要数值递增就可以'],answer:1,explanation:'tails 的每个长度状态可能来自不同时间的方案。例 [2,6,3,4,1,5] 中 1 在 3、4 后面，无法组成该顺序的子序列。'},{question:'要求最长不下降子序列，二分应查找哪一个位置？',options:['第一个 ≥x','第一个 >x','最后一个 <x'],answer:1,explanation:'允许相等值延伸，需要跳过所有 ≤x 的末尾，即 upper_bound；[2,2] 就应得到长度 2。'}],
  sources:[source('cp-algorithms · Longest increasing subsequence','https://cp-algorithms.com/dynamic_programming/longest_increasing_subsequence.html','核对二次 DP、二分优化与重建方案的区别。')],
  cpp:`#include <iostream>
#include <vector>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; if (!(cin >> n)) return 0;
    vector<long long> tails; // @init
    for (int i = 0; i < n; ++i) {
        long long x; cin >> x;
        int l = 0, r = static_cast<int>(tails.size());
        while (l < r) { // @search
            int mid = l + (r - l) / 2;
            if (tails[mid] < x) l = mid + 1;
            else r = mid;
        }
        if (l == static_cast<int>(tails.size())) tails.push_back(x); // @update
        else tails[l] = x;
    }
    cout << tails.size() << '\\n'; // @answer
}
`,cppInput:x=>x.values.length+'\n'+x.values.join(' ')+'\n',cppOutput:scalarOutput('length'),notes:[['init','tails 不是已选序列，而是不同长度的最小末尾。'],['search','半开区间二分，第一个 ≥x 对应严格递增。'],['update','替换不增加长度，只有追加才增加。']],transfer:{contrast:'O(n²) DP 逐个比较前驱；tails 利用“同长度、较小末尾支配较大末尾”压缩状态。计数时不能丢弃所有其他历史。',next:['subset-dp','dijkstra'],challenge:'在重复值存在时重建一条 LIS，并证明记录的是原数组递增下标而非直接输出 tails。'}
});

register({
  id:'interval-dp',section:'dp',title:'区间 DP：相邻石子合并',subtitle:'倒着看最后一次合并，用区间长度组织依赖',level:'核心',tags:['区间DP','最后一步','前缀和'],prerequisites:['knapsack'],
  summary:'将线性排列的相邻石堆合并成一堆，每次付出合并后总重量，求最小费用。以闭区间 [l,r] 推导 O(n³) 转移，不声称覆盖所有区间 DP 或自动满足优化条件。',
  lesson:{recognize:['每次只能合并相邻两堆，所以任何中间堆都对应原数组的一个连续区间。','最终方案可以按“最后一次操作”拆成两个互不重叠的相邻子区间。','本章是线性、非负重量、两两合并的模型；环形排列、多堆同时合并、非加性费用都需要另建状态。'],derive:[
    {title:'从操作顺序穷举到区间结构',text:'直接试所有相邻合并顺序会反复求解同一段石子的最优合并代价。第一次合并位置未必好分析，改看最后一次：最后左右两堆必定分别来自 [l,k] 与 [k+1,r]。这里特意使用闭区间 [l,r]。'},
    {title:'确定状态、边界和最后一步',text:'令 dp[l][r] 为把闭区间 [l,r] 合成一堆的最小费用。单堆不用合并，dp[i][i]=0。若最后分割在 k，两个子任务各自完成后，最后一次的费用是该整个区间重量 sum(l,r)。'},
    {title:'枚举分割点而不是贪心首步',text:'dp[l][r]=min over l≤k<r of {dp[l][k]+dp[k+1][r]+sum(l,r)}。左、右子区间互不影响；若其中不是最优，就可替换成更便宜方案，严格改进整体，因此最优子结构成立。'},
    {title:'依赖决定填表次序',text:'长度 len 的区间只依赖更短区间，所以 len 从 2 到 n，枚举 l，再令 r=l+len−1。前缀和 pref[t] 表示前 t 堆总重，sum(l,r)=pref[r+1]−pref[l]，使每个候选分割的额外费用为 O(1)。'},
    {title:'优化需要额外定理',text:'O(n³) 来自 O(n²) 区间乘 O(n) 分割。本模型在适当非负条件下可研究 Knuth 优化，但需要证明最优分割点单调性；不能把枚举 k 的范围随意缩小。动画与 C++ 保留可直接证明的完整枚举。'}
  ],invariant:{title:'按长度归纳，所有依赖已最优',text:'开始处理长度 len 时，所有更短闭区间的 dp 都已等于真实最小合并费用。',proof:['长度 1 的唯一方案是不合并，费用为 0。','任一长度 len 的完整方案最后一步存在唯一分割 k，最后一步费用固定为整个区间重量。','根据归纳假设，dp[l][k]+dp[k+1][r] 不大于该方案最后一步之前的费用，因此枚举得到的最小值不大于任何可行方案。','反过来，任选 k 的两个最优子方案都可独立执行再合并，转移候选都可实现；取最小值即精确最优。']},complexity:{time:'O(n³)',space:'O(n²)',conditions:'n 为石堆数；用前缀和保证区间和 O(1)。教学 n≤8、重量 0..30，C++ 使用 long long；更大约束需核对总费用是否溢出。'},pitfalls:[
    {title:'照搬 Huffman 任意合并',text:'Huffman 允许任意两堆，本题要求相邻，不同约束不能共用结论。',counterexample:'[1,30,1] 中两个 1 不相邻，不能先合成 2。合法最优费用 31+32=63，任意合并会得到 2+32=34。'},
    {title:'每次合并最小的相邻和',text:'局部最小费用会改变后续堆形态，未必最优。',counterexample:'[6,4,4,6] 贪心先合并中间 4+4，随后付 14 和 20，共 42；先合并左右两对得 10+10+20=40。'},
    {title:'漏掉闭区间的 r+1',text:'前缀和使用半开前缀，区间状态使用闭区间，两套边界必须衔接。',counterexample:'[3,5] 的 sum(0,1)=pref[2]−pref[0]=8；若写 pref[1]−pref[0] 只得到 3。'},
    {title:'按 l、r 随意顺序填表',text:'右侧子区间可能尚未算完，默认零会假装它免费。',counterexample:'[1,2,3] 在 dp[1][2] 还是 0 时算 dp[0][2]，会误用 0+0+6=6，正确最小费用是 3+6=9。'}
  ],applications:['矩阵链乘法：最后一次乘法决定分割 k，但合并费用应改成矩阵维度乘积。','括号匹配、字符串删除等区间问题：先证明子区间如何独立，不能直接复制石子合并的加和费用。']},
  input:{description:'stones 为长度 0..8 的非负整数数组，重量 0..30。只允许相邻两堆合并；空数组或单堆的总费用为 0。',default:{stones:[6,4,4,6]},presets:[{name:'不能跨越中间堆',data:{stones:[1,30,1]}},{name:'全零也可合并',data:{stones:[0,0,0]}},{name:'空数组',data:{stones:[]}}],validate(x){object(x);list(x.stones,8,'stones');x.stones.forEach(v=>integer(v,0,30,'石堆重量'));}},
  random(seed){const r=rng(seed);return {stones:nums(r(0,7)).map(()=>r(0,15))};},
  run(x){const a=x.stones,n=a.length,dp=nums(n).map(i=>nums(n).map(j=>i===j?0:Infinity)),pref=[0],frames=[];a.forEach(v=>pref.push(pref[pref.length-1]+v));const vis=(l=-1,r=-1,k=-1)=>({arrays:[arr('原始石堆',a,l>=0?nums(r-l+1).map(i=>i+l):[]),arr('前缀和 pref[t]=前 t 堆总重',pref)],tables:[table('dp[l][r] · 闭区间最小费用',['l\\r',...nums(n).map(String)],dp.map((row,i)=>[i,...show(row)]),[],l>=0?[[l,r+1],[l,k+1],[k+1,r+1]]:[])]});push(frames,'单堆费用为零','对角线 dp[i][i]=0，其他区间尚未求解；∞ 表示当前没有候选。','init',vis());for(let len=2;len<=n;len++)for(let l=0;l+len<=n;l++){const r=l+len-1,sum=pref[r+1]-pref[l];for(let k=l;k<r;k++){const cand=dp[l][k]+dp[k+1][r]+sum,old=dp[l][r];dp[l][r]=Math.min(old,cand);push(frames,'区间 ['+l+','+r+'] · 最后分割 '+k,'左费用 '+dp[l][k]+' + 右费用 '+dp[k+1][r]+' + 最后合并重量 '+sum+' = '+cand+'；当前最优 '+dp[l][r]+'。','relax',vis(l,r,k));}}const cost=n?dp[0][n-1]:0;push(frames,'整段最小费用为 '+cost,'每个候选都来自可执行的左右子方案，因此取最小值得到全局最优。','answer',vis());return {frames,result:{cost}};},
  oracle(x){function brute(a){if(a.length<2)return 0;let best=Infinity;for(let i=0;i+1<a.length;i++){const sum=a[i]+a[i+1],b=a.slice(0,i).concat([sum],a.slice(i+2));best=Math.min(best,sum+brute(b));}return best;}return {cost:brute(x.stones)};},
  exercises:[{question:'[6,4,4,6] 每次取最小相邻和，和全局最优分别是多少？',options:['42 与 40','40 与 40','42 与 42'],answer:0,explanation:'贪心先合并中间得 8，再合并得 14，最后 20，总 42。左右各合成 10，再合成 20，总 40。'},{question:'为什么按区间长度递增，而不按 r 递减随意计算？',options:['为了让动画更整齐','因为转移依赖的两个子区间都严格更短','因为数组必须排序'],answer:1,explanation:'最后一步分割产生 [l,k]、[k+1,r]，长度都小于 r−l+1。长度递增是依赖图的一种拓扑顺序。'},{question:'把石堆放在环上后，最直接可证明的扩展是？',options:['只计算原线性顺序一次','将数组复制成两倍，枚举长度 n 的起始区间','随便选最小石堆作为唯一断点'],answer:1,explanation:'环的最终合并可以对应某个切口。复制后枚举 n 个长度 n 的窗口覆盖所有切口，再取最小；状态与边界也需相应扩大。'}],
  sources:[source('USACO Guide · Range DP','https://usaco.guide/gold/dp-ranges','核对按区间长度递增、枚举分割点的通用结构；石子模型与反例独立推导。'),source('AtCoder Educational DP · N Slimes','https://atcoder.jp/contests/dp/tasks/dp_n','与本章相邻合并、费用为合并重量的代表问题对应；题目使用正重量。')],
  cpp:`#include <iostream>
#include <vector>
#include <algorithm>
#include <limits>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; if (!(cin >> n)) return 0;
    vector<long long> pref(n + 1, 0);
    for (int i = 0; i < n; ++i) { long long x; cin >> x; pref[i + 1] = pref[i] + x; }
    const long long INF = numeric_limits<long long>::max() / 4;
    vector<vector<long long>> dp(n, vector<long long>(n, INF)); // @init
    for (int i = 0; i < n; ++i) dp[i][i] = 0;
    for (int len = 2; len <= n; ++len) {
        for (int l = 0; l + len <= n; ++l) {
            int r = l + len - 1;
            for (int k = l; k < r; ++k) {
                dp[l][r] = min(dp[l][r], dp[l][k] + dp[k + 1][r] + pref[r + 1] - pref[l]); // @relax
            }
        }
    }
    cout << (n ? dp[0][n - 1] : 0) << '\\n'; // @answer
}
`,cppInput:x=>x.stones.length+'\n'+x.stones.join(' ')+'\n',cppOutput:scalarOutput('cost'),notes:[['init','闭区间状态，对角线为零，其他位置初始不可用。'],['relax','k<r，确保左右两段非空且已按更短长度计算。'],['answer','空输入单独定义为费用 0，避免访问 dp[0]。']],transfer:{contrast:'背包按物品前缀分层；区间 DP 按区间长度分层。真正共同点是先找无环依赖，再决定填表顺序。',next:['tree-dp','topological-sort'],challenge:'把数组 [6,4,4,6] 的两种合并过程画成二叉树，解释 dp 的分割点与树中最后一个内部节点的关系。'}
});

register({
  id:'tree-dp',section:'dp',title:'树形 DP：最大权独立集',subtitle:'给父子边一个边界状态，子树才能真正独立',level:'进阶',tags:['树形DP','后序遍历','边界状态'],prerequisites:['bfs','knapsack'],
  summary:'在带权树上选择互不相邻的顶点，使权重和最大。以“选/不选根”推导子树合并；说明为什么一般图、树上匹配和换根 DP 不能直接套这两条式子。',
  lesson:{recognize:['输入是无向连通无环的树，限制只发生在相邻顶点之间。','删去父子边后，两部分之间只有这一条约束，因此用根是否被选作为边界信息足够。','本章允许空集与负权；只求整树一次最优值，不是对每个根求答案的换根 DP，也不是边的最大匹配。'],derive:[
    {title:'暴力为什么要记住父子边',text:'枚举 2^n 个顶点子集，检查每条边两端不能都选。树的结构意味着不同子树没有横向边，难点只在于每个子树的根能不能被选。若不记录这个边界，就无法知道怎样与父节点组合。'},
    {title:'状态是对子树根的承诺',text:'任选 0 为根。take[u]：u 必须被选时，u 子树的最大权；skip[u]：u 必须不选时的最大权。叶子取 take[u]=weight[u]、skip[u]=0，即使 weight[u] 为负也保留“必须选”的语义。'},
    {title:'后序合并所有孩子',text:'若选 u，则每个孩子 v 必须不选：take[u]=weight[u]+Σ skip[v]。若不选 u，各孩子可独立选更优状态：skip[u]=Σ max(take[v],skip[v])。先算孩子再算父亲，正是后序遍历。'},
    {title:'为什么求和而不是再做一次背包',text:'本模型没有选点总数等全局资源约束，各子树在父节点状态固定后完全独立，所以每个孩子只需贡献一个最优数。若要求恰好选 k 个点，必须增加“数量”维度，再卷积合并子树，复杂度会改变。'},
    {title:'从子树 DP 到换根的边界',text:'本章答案 max(take[0],skip[0]) 与随意选择的计算根无关。若要回答“每个点被强制选/不选时整树最优值”，单向子树状态缺少父侧贡献，需要向下传递或有向边消息，扣除当前孩子贡献时也要避免重复计算。'}
  ],invariant:{title:'父节点状态固定后，子树独立',text:'完成节点 u 的后序处理后，take[u]、skip[u] 分别精确覆盖“u 选”和“u 不选”两类可行独立集。',proof:['叶子只有选或不选两种方案，边界值准确。','选 u 时任何合法方案都不选其孩子；由归纳假设，各孩子子树的最好贡献是 skip[v]。不同子树无边，可同时实现。','不选 u 时每个孩子可以选或不选，两种情况取 max；子树间没有额外约束，最大值可以相加。','两类方案互斥且覆盖整个子树的全部合法方案，因此根处取 max 得到整树最优。']},complexity:{time:'O(n)',space:'O(n)',conditions:'输入必须是树，边数 n−1；每条边处理常数次。教学 n≤12，递归安全；生产长链需要关注调用栈，改成迭代后序。'},pitfalls:[
    {title:'两个状态都取孩子最大值',text:'当父节点已选时，孩子不再有选择自由。',counterexample:'两点一条边，权重 [5,6]，若选父节点时仍加 max(take[1],skip[1])=6，会得到 5+6=11；正确答案只能为 6。'},
    {title:'负权叶子被强行改成零',text:'take 的语义是必须选，不能偷偷表示不选；是否选由父节点或最终 max 决定。',counterexample:'单点权重 −3 时 take=−3、skip=0，最终答案 0。把 take 改为 0 会在“强制选该点”的扩展中错误回答 0。'},
    {title:'在有环图上直接 DFS 套树公式',text:'非树边带来跨子树约束，两个子任务不再独立。',counterexample:'三角形三点权重都是 1，真实最大独立集大小为 1。忽略一条边当成路径会允许选两端，错误得到 2。'},
    {title:'前序就合并未完成的孩子',text:'孩子状态尚未覆盖其后代，默认值不能当成最终答案。',counterexample:'链 0−1−2 权重 [1,1,10]，若先给根使用尚未计算的 skip[1]=0，会漏掉根与节点 2 同选的 11。'}
  ],applications:['层级组织中相邻上下级不能同时参加，求最大满意度：顶点选择模型直接对应独立集。','树上点覆盖可建立相反边界：“不选父节点时必须选所有孩子”；仍需重新证明状态，而不是照抄 max。']},
  input:{description:'weights 最多 12 个，权重 −20..30；edges 是零基无向树边，非空树必须连通且恰好 n−1 条边，不允许自环或重边。空树答案 0。',default:{weights:[5,2,3,7,4,6],edges:[[0,1],[0,2],[1,3],[1,4],[2,5]]},presets:[{name:'负权允许舍弃',data:{weights:[-5,-2,-8],edges:[[0,1],[1,2]]}},{name:'长链跨层选择',data:{weights:[1,1,10],edges:[[0,1],[1,2]]}},{name:'空树',data:{weights:[],edges:[]}}],validate(x){object(x);list(x.weights,12,'weights');x.weights.forEach(v=>integer(v,-20,30,'顶点权重'));treeInput(x.weights.length,x.edges);}},
  random(seed){const r=rng(seed),n=r(0,10);return {weights:nums(n).map(()=>r(-8,15)),edges:nums(Math.max(0,n-1)).map(i=>[i+1,r(0,i)])};},
  run(x){const n=x.weights.length,a=adjacency(n,x.edges),layout=treeLayout(n,x.edges,0),take=Array(n).fill(null),skip=Array(n).fill(null),done=[],frames=[];const vis=(active=[],ei=-1)=>({graph:place(graph(n,x.edges,false,active,done,ei,nums(n).map(i=>i===0?'0 根':String(i))),layout),tables:[table('子树状态（空格为尚未计算）',['u','weight','take：必须选','skip：必须不选'],nums(n).map(i=>[i,x.weights[i],take[i]===null?'—':take[i],skip[i]===null?'—':skip[i]]),active)]});push(frames,n?'以 0 为根，先算孩子':'空树：空集是唯一选择',n?'固定根的选取状态后，不同孩子子树才可以独立组合。':'没有顶点和父子边，最大权独立集为空集，权重为 0。','init',vis());function dfs(u,p){take[u]=x.weights[u];skip[u]=0;push(frames,'进入节点 '+u,'先只考虑节点自己：take='+take[u]+'，skip=0；接下来递归求孩子。','enter',vis([u]));for(const [v,w,ei]of a[u])if(v!==p){dfs(v,u);take[u]+=skip[v];skip[u]+=Math.max(take[v],skip[v]);push(frames,'把孩子 '+v+' 合入 '+u,'选 '+u+' 只能加 skip['+v+']='+skip[v]+'；不选 '+u+' 可加 max('+take[v]+','+skip[v]+')。','merge',vis([u,v],ei));}done.push(u);push(frames,'节点 '+u+' 的两个状态完成','此时整棵子树已处理，take='+take[u]+'，skip='+skip[u]+'。','finish',vis([u]));}if(n)dfs(0,-1);const value=n?Math.max(take[0],skip[0]):0;push(frames,'整树最优值 '+value,'根可以选也可以不选，取两种边界条件中更好的；空树取空集。','answer',vis(n?[0]:[]));return {frames,result:{value}};},
  oracle(x){let best=0;for(let mask=0;mask<(1<<x.weights.length);mask++){if(x.edges.some(([u,v])=>(mask>>u&1)&&(mask>>v&1)))continue;let total=0;for(let i=0;i<x.weights.length;i++)if(mask>>i&1)total+=x.weights[i];best=Math.max(best,total);}return {value:best};},
  exercises:[{question:'链 0−1−2 的权重为 [1,1,10]，最大权独立集是多少？',options:['10','11','12'],answer:1,explanation:'选 0 和 2 不相邻，权重 11；三点全选不合法。树 DP 中 take[0]=1+skip[1]=11。'},{question:'要求“恰好选 k 个不相邻点”，为何当前两个标量不够？',options:['因为必须记住子树选了多少点，才能分配总名额','因为树必须先排序','因为不能使用动态规划'],answer:0,explanation:'不同子树的数量相互制约。状态应增加选点数，合并时枚举把多少名额分配给当前孩子，即树上背包。'},{question:'本章算法可以原样在三角形图上运行吗？',options:['可以，随便去掉一条边','可以，只要把起点换成最大权点','不可以，去掉边会丢失相邻不能同选的约束'],answer:2,explanation:'树公式依赖不同孩子子树之间没有边。三角形删边后产生的路径会允许两端同时选择，但原图中两端相邻。'}],
  sources:[source('USACO Guide · DP on Trees','https://usaco.guide/gold/dp-trees','核对以父子边界分状态、后序合并的树形 DP 方法；该文代表题为匹配，本章明确采用顶点独立集。'),source('AtCoder Educational DP · P Independent Set','https://atcoder.jp/contests/dp/tasks/dp_p','独立集的相邻限制示例；原题是计数，本章是最大权优化，运算不同但边界状态相通。')],
  cpp:`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
vector<vector<int>> g;
vector<long long> weight, takeValue, skipValue;
void dfs(int u, int parent) {
    takeValue[u] = weight[u]; skipValue[u] = 0; // @enter
    for (int v : g[u]) if (v != parent) {
        dfs(v, u);
        takeValue[u] += skipValue[v]; // @merge
        skipValue[u] += max(takeValue[v], skipValue[v]);
    } // @finish
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; if (!(cin >> n)) return 0;
    g.resize(n); weight.resize(n); takeValue.resize(n); skipValue.resize(n); // @init
    for (auto &w : weight) cin >> w;
    for (int i = 1; i < n; ++i) { int u, v; cin >> u >> v; g[u].push_back(v); g[v].push_back(u); }
    if (n) dfs(0, -1);
    cout << (n ? max(takeValue[0], skipValue[0]) : 0) << '\\n'; // @answer
}
`,cppInput:x=>x.weights.length+'\n'+x.weights.join(' ')+'\n'+x.edges.map(e=>e.join(' ')).join('\n')+'\n',cppOutput:scalarOutput('value'),notes:[['enter','take 必须选当前点，负权也保留，不偷换语义。'],['merge','先 dfs 孩子，再使用其完整子树状态。'],['answer','允许空集，整树答案自然不会小于 0。']],transfer:{contrast:'普通背包用容量描述跨阶段约束；树形 DP 用父子边界描述跨子树约束。若还有限定选择数量，两个维度需要同时保留。',next:['lca','subset-dp'],challenge:'推导树上最小权点覆盖的选/不选转移，解释它与独立集的边约束方向为何相反。'}
});

register({
  id:'subset-dp',section:'dp',title:'状压 DP：Hamilton 路径计数',subtitle:'访问过哪些点，还必须知道现在停在哪里',level:'进阶',tags:['状压DP','Hamilton路径','位运算'],prerequisites:['backtracking','knapsack'],
  summary:'计数从 0 出发、到 n−1 结束、每个点恰好访问一次的有向顶点序列。用 (mask,末尾) 合并等价历史；重边按相同顶点序列去重，自环不能增加路径。',
  lesson:{recognize:['规模很小而“每个对象最多一次”直接影响后续选择，适合用二进制集合记录已用对象。','路径下一步不仅取决于已访问集合，也取决于当前末尾，因此只有 mask 不足够。','本章计数的是顶点序列，不是区分平行边的路线；n≤9 保持精确整数，不取模。更大 n 的指数复杂度与溢出必须重新处理。'],derive:[
    {title:'从全排列开始',text:'固定起点 0，枚举其余顶点顺序，检查相邻顶点有向边与终点约束。朴素有约 (n−1)! 种历史。许多不同排列到达相同末尾并访问同一个集合，此后的可选动作完全相同。'},
    {title:'mask 是集合，不是顺序',text:'第 v 位为 1 表示 v 已访问。令 dp[mask][u] 为从 0 出发、访问集合恰好为 mask、最后停在 u 的路径数。初始化 dp[1][0]=1。顺序的不同通过计数累加保留，而不是写进状态。'},
    {title:'沿真实边扩展未访问顶点',text:'若 dp[mask][u]>0、存在 u→v 且 mask 的第 v 位为 0，就把这些路径加到 dp[mask | (1<<v)][v]。每次新增一位，状态依赖严格从小集合指向大集合；数值 mask 也严格增大，可从小到大处理。'},
    {title:'计数为何既不重不漏',text:'每条长度大于 1 的路径，删掉最后一个顶点 v 后有唯一前驱路径与末尾 u。因此不同扩展不会把同一顶点序列数两遍，所有合法完整路径都能逐点生成。若同一 u→v 输入两遍，本章先压成布尔邻接关系，避免重复计数。'},
    {title:'理解指数维度的代价',text:'共有 2^n 个集合和 n 个末尾，每个状态最多试 n 个下一点，所以 O(2^n n²)。这比阶乘好，但远非一般图的大规模算法。旅行商可把“方案数加法”换成“最小费用”，还要带上边权和回到起点的约束。'}
  ],invariant:{title:'所有计数都对应唯一的部分顶点序列',text:'处理 mask 时，dp[mask][u] 等于从 0 出发、每个集合内顶点恰好一次、末尾为 u 的合法路径数。',proof:['单点路径 [0] 是唯一初始路径；n=1 时它同时是完整答案。','每次扩展只选择未访问顶点且检查有向边，因此生成路径一定合法。','目标集合数值严格大于来源集合，来源在被处理时已收到所有更小集合的贡献。','任一目标路径删去最后顶点得到唯一来源，故转移构成无重复的分类；最终读取全集、末尾 n−1。']},complexity:{time:'O(2^n n²)',space:'O(2^n n)',conditions:'n 为顶点数，使用布尔邻接矩阵去重；教学 n≤9，最多 8! 条以固定起点出发的完整排列，计数在整数精度内。位运算在更大 n 时需注意 JS 32 位限制。'},pitfalls:[
    {title:'状态只保存访问集合',text:'同一集合不同末尾可以走向完全不同的后继。',counterexample:'集合 {0,1,2} 既可能停在 1 又可能停在 2，若只有 1→3 而无 2→3，则两类路径后续不同，不能合成一个 dp[mask]。'},
    {title:'遗漏“未访问”检查',text:'把 OR 当成自动防重是不够的；重复访问时 mask 不变，会形成错误循环。',counterexample:'边 0→1、1→0 不能构成每点一次后又回到 0 的 Hamilton 路径；位已存在时必须禁止扩展。'},
    {title:'重边语义不明确',text:'本章计算顶点序列，平行边不能让同一序列被重复计数。',counterexample:'n=2，输入两条 0→1，本章答案为 1；若题目明确区分航班编号，则可能是 2，需要把邻接改为边重数。'},
    {title:'把抵达终点等同于完成',text:'必须访问全集后才计入答案，不能只要碰到 n−1 就累加。',counterexample:'n=3，仅有 0→2。虽然能到终点 2，但遗漏顶点 1，Hamilton 路径数为 0。'}
  ],applications:['小规模旅行商：集合加末尾表达访问约束，转移从计数改为最小代价。','任务顺序带兼容关系且每项执行一次：mask 表示已做任务，末尾决定下一项是否可接。']},
  input:{description:'{n,edges}：n 为 0..9，有向边最多 36 条。固定起点 0、终点 n−1；平行边按存在关系去重，自环不能用于再次访问。n=0 答案 0，n=1 的空边单点路径计 1。',default:{n:5,edges:[[0,1],[0,2],[1,2],[2,1],[1,3],[2,3],[3,4],[1,4],[2,4]]},presets:[{name:'重边不重复计顶点序列',data:{n:2,edges:[[0,1],[0,1],[1,1]]}},{name:'终点可达但不能访问全集',data:{n:3,edges:[[0,2]]}},{name:'单点路径',data:{n:1,edges:[]}},{name:'空图',data:{n:0,edges:[]}}],validate(x){graphInput(x,{maxN:9,maxM:36});}},
  random(seed){const r=rng(seed),n=r(0,8),edges=[];for(let u=0;u<n;u++)for(let v=0;v<n;v++)if(u!==v&&r(0,3)===0)edges.push([u,v]);if(n&&edges.length&&r(0,1))edges.push(edges[0].slice());return {n,edges:edges.slice(0,36)};},
  run(x){const n=x.n,N=1<<n,adj=nums(n).map(()=>Array(n).fill(false)),dp=nums(N).map(()=>Array(n).fill(0)),frames=[];x.edges.forEach(([u,v])=>adj[u][v]=true);if(n)dp[1][0]=1;const bits=m=>m.toString(2).padStart(Math.max(1,n),'0');push(frames,n?'唯一初始路径 [0]':'空图：不存在起终点',n?'mask 的第 v 位表示是否已访问 v；单点路径 dp[1][0]=1。':'没有顶点，不存在从 0 到 n−1 的路径；本章将路径数定义为 0。','init',{graph:graph(n,x.edges,true,n?[0]:[]),arrays:[arr('初始末尾计数',n?dp[1]:[])]});for(let mask=1;mask<N;mask++){if(!dp[mask].some(Boolean))continue;let updates=[];const flush=()=>{if(!updates.length)return;const last=updates[updates.length-1];push(frames,'扩展集合 '+bits(mask),'每行是一条真实转移：旧值 + 来源路径数 = 新值。mask 按位或加入未访问终点，方向不可颠倒。','extend',{graph:graph(n,x.edges,true,[last[0],last[1]],nums(n).filter(i=>mask>>i&1)),arrays:[arr('当前集合各末尾路径数',dp[mask])],tables:[table('这一步累加的目标状态',['从 u','到 v','新 mask','旧值','加数','新值'],updates)],metrics:[{label:'当前 mask（二进制）',value:bits(mask)}]});updates=[];};for(let u=0;u<n;u++)if(dp[mask][u])for(let v=0;v<n;v++)if(adj[u][v]&&!(mask>>v&1)){const next=mask|1<<v,old=dp[next][v];dp[next][v]+=dp[mask][u];updates.push([u,v,bits(next),old,dp[mask][u],dp[next][v]]);if(updates.length===12)flush();}flush();}const count=n?dp[N-1][n-1]:0;push(frames,'读取全集且末尾为 '+(n?n-1:'不存在'),'只有访问所有顶点、恰好停在指定终点的路径计入答案，共 '+count+' 条。','answer',{graph:graph(n,x.edges,true,n?[n-1]:[],nums(n)),arrays:[arr('全集状态的各末尾计数',dp[N-1],n?[n-1]:[])],metrics:[{label:'合法顶点序列数',value:count}]});return {frames,result:{count}};},
  oracle(x){if(!x.n)return {count:0};const links=new Set(x.edges.map(e=>e.join(',')));let count=0;function perm(path,left){if(!left.length){if(path[path.length-1]===x.n-1)count++;return;}for(let i=0;i<left.length;i++){const v=left[i];if(links.has(path[path.length-1]+','+v))perm(path.concat(v),left.slice(0,i).concat(left.slice(i+1)));}}perm([0],nums(x.n).slice(1));return {count};},
  exercises:[{question:'n=3，边 0→1、1→2、0→2。Hamilton 路径从 0 到 2 有几条？',options:['1','2','3'],answer:0,explanation:'只有 0→1→2 访问了每个点。0→2 虽能到终点，但不是 Hamilton 路径。'},{question:'为何可以按数值 mask 从小到大处理，不必再进行图的拓扑排序？',options:['因为原图一定无环','因为每次增加一个未设置位，目标 mask 严格变大','因为计数结果与顺序无关'],answer:1,explanation:'原图可以有环，但状态图每次增加已访问点，无法回到旧集合。增加未置位的正权二进制位使数值严格增加。'},{question:'如果原题区分平行边所代表的不同航班，应该改什么？',options:['仍然去重，没有影响','将布尔邻接改成重数，转移乘对应边数','把所有自环也加入路径'],answer:1,explanation:'本章顶点序列语义下去重。若边身份也构成不同方案，从 u 到 v 的每种航班都可选择，贡献应乘平行边数；访问限制仍禁止自环重复访问。'}],
  sources:[source('USACO Guide · Bitmask DP','https://usaco.guide/gold/dp-bitmasks','核对集合加末尾状态及 Hamilton 路径计数复杂度；本章明确重边与空图语义。')],
  cpp:`#include <iostream>
#include <vector>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; if (!(cin >> n >> m)) return 0;
    vector<vector<bool>> edge(n, vector<bool>(n, false));
    for (int i = 0; i < m; ++i) { int u, v; cin >> u >> v; edge[u][v] = true; }
    int total = 1 << n;
    vector<vector<long long>> dp(total, vector<long long>(n, 0)); // @init
    if (n) dp[1][0] = 1;
    for (int mask = 1; mask < total; ++mask) {
        for (int u = 0; u < n; ++u) if (dp[mask][u]) {
            for (int v = 0; v < n; ++v) if (edge[u][v] && !(mask & (1 << v))) {
                dp[mask | (1 << v)][v] += dp[mask][u]; // @extend
            }
        }
    }
    cout << (n ? dp[total - 1][n - 1] : 0) << '\\n'; // @answer
}
`,cppInput:x=>x.n+' '+x.edges.length+'\n'+x.edges.map(e=>e.join(' ')).join('\n')+'\n',cppOutput:scalarOutput('count'),notes:[['init','2^n 行，每一行还需保留 n 种末尾。'],['extend','只加入原 mask 尚未访问的点，保证状态图无环。'],['answer','全集与指定终点两个条件缺一不可。']],transfer:{contrast:'树形 DP 通过树边隔开子问题；状压 DP 不依赖树结构，而是显式保存小规模集合。它换来普适性，同时支付指数代价。',next:['digit-dp','topological-sort'],challenge:'改成从 0 出发并最终回到 0 的最短 Hamilton 回路：何时检查最后一条回边，n=1 应怎样定义？'}
});

register({
  id:'digit-dp',section:'dp',title:'数位 DP：避开一个数字',subtitle:'tight 控制上界，started 区分前导零与真正的零',level:'进阶',tags:['数位DP','前导零','计数'],prerequisites:['knapsack','subset-dp'],
  summary:'统计闭区间 [0,bound] 中十进制表示不含指定数字的非负整数。逐位展开状态，显式处理上界与数字 0；这是数位 DP 的一个最小完整模型，不是任意数位性质的万能代码。',
  lesson:{recognize:['范围很大，不适合逐个枚举，但判定条件可以随着十进制位从高到低累积。','要统计的是数的通常十进制表示，不把为对齐长度补的前导零当作数字的一部分。','本章只限制禁用一个数字；数位和、相邻位关系、整除条件需要增加对应状态，不能只改最终判断。'],derive:[
    {title:'把数的枚举改成前缀的枚举',text:'逐个检查 0..B 需要 O(B log B)。把所有数补到 B 的位数 D，从最高位逐位选择。大量前缀的未来选择仅取决于是否已小于上界、是否已经开始构成数字，而不依赖前缀的具体数值。'},
    {title:'两个布尔状态分别负责什么',text:'tight=1 表示当前前缀与 B 的对应前缀完全相等，下一位不能超过 B 当前位；tight=0 已经严格小于上界，下一位可以选 0..9。started=1 表示此前出现过非零位，之后的零是真正数位。'},
    {title:'从四种状态逐位转移',text:'dp[tight][started] 是当前前缀方案数。枚举 d≤limit，nt=tight 且 d==上界当前位，ns=started 或 d!=0。只有 ns=1 且 d==forbidden 时拒绝，前导零不能触发禁用规则。初始 dp[1][0]=1。'},
    {title:'数字 0 是最后的特殊终态',text:'整段一直没有 started 的唯一序列对应整数 0，而不是“没有数字”。它的通常表示是字符 0，所以 forbidden=0 时必须剔除这一个方案；禁其他数字时应保留。已经 started 的状态只要每步通过检查就全部合法。'},
    {title:'迁移到区间与更多性质',text:'若 F(B) 统计 [0,B]，则闭区间 [L,R] 答案为 F(R)−F(L−1)，并定义 F(−1)=0。若限制数值对 m 的余数，追加余数状态 (old*10+d)%m；若限制数位和对 m 的余数，则用 (old+d)%m。相邻位关系还需记住上一位及未开始状态。'}
  ],invariant:{title:'每个数位前缀恰好落入一种状态',text:'处理前 pos 位之后，dp[tight][started] 精确统计未超上界、已出现的真实数字不含禁用位、且满足这两个布尔标记的前缀。',proof:['初始空前缀与上界相等、尚未开始，恰好一种，所以 dp[1][0]=1。','tight 限制下一位保证不超过上界；一旦前缀已小于上界，任意后缀仍不超界。','每个前缀与下一个数字唯一确定新状态，枚举 0..limit 不重不漏；只拒绝真实数位中的禁用数字。','末尾 started=0 只对应整数 0，按其表示单独判定后，所有整数与定长补零表示一一对应。']},complexity:{time:'O(D × 2 × 2 × 10)=O(D)',space:'O(2×2)=O(1) 滚动状态',conditions:'D 为 bound 的十进制位数。这里每位只有 4 个状态；若加入余数 m，复杂度将乘 m。教学 bound≤999999，精确计数安全。'},pitfalls:[
    {title:'把前导零也视为禁用数字',text:'补零只是统一长度的技术，不是通常十进制表示的一部分。',counterexample:'B=25、禁数字 0 时，数字 7 写成对齐形式 07 仍应合法；不能因补上的 0 拒绝它。'},
    {title:'忘记整数 0 的终态',text:'全程未开始的路径对应数字 0，其十进制表示确实含一个 0。',counterexample:'B=0、禁 0 时答案 0；B=0、禁 7 时答案 1。'},
    {title:'脱离上界后又恢复 tight',text:'tight 应为 oldTight && digit==boundDigit，不能只比较当前位。',counterexample:'B=255，先选百位 1 后已自由；十位选 5 不能重新标成 tight，否则个位会被误限为 ≤5，错误排除 156..159。'},
    {title:'缓存状态遗漏上界或必要信息',text:'不同上界的 tight 状态不能无条件共享缓存；增加性质时也必须保留其历史。',counterexample:'B=25、禁 9：十位选 1 后，个位可选 0..8 共 9 种；十位选 2 后，个位仅可选 0..5 共 6 种。同一 pos 的 tight 不同，不能共用一个值。'}
  ],applications:['求 [L,R] 中不含某模式的整数：先构建模式自动机状态，再与 tight/started 联合。','统计数位和或数值余数满足条件的数：增加有限状态维度，保留“只记对未来有影响的信息”的原则。']},
  input:{description:'bound 是 0..999999 的整数，forbidden 是 0..9。统计闭区间 [0,bound]；通常十进制表示不含禁用数字，0 的表示就是 “0”。',default:{bound:125,forbidden:0},presets:[{name:'禁零但不禁前导零',data:{bound:25,forbidden:0}},{name:'零不合法',data:{bound:0,forbidden:0}},{name:'零合法',data:{bound:0,forbidden:7}},{name:'上界本身被禁',data:{bound:19,forbidden:1}}],validate(x){object(x);integer(x.bound,0,999999,'bound');integer(x.forbidden,0,9,'forbidden');}},
  random(seed){const r=rng(seed);return {bound:r(0,6000),forbidden:r(0,9)};},
  run(x){const digits=String(x.bound).split('').map(Number),frames=[];let dp=[[0,0],[1,0]];const stateRows=a=>[0,1].flatMap(t=>[0,1].map(s=>[t,s,a[t][s]]));push(frames,'空前缀，尚未开始','初始 tight=1、started=0，对应一种空前缀。','init',{arrays:[arr('上界各位',digits)],tables:[table('前缀计数',['tight','started','ways'],stateRows(dp),[2])]});for(let pos=0;pos<digits.length;pos++){const next=[[0,0],[0,0]];for(let t=0;t<=1;t++)for(let s=0;s<=1;s++)if(dp[t][s]){const limit=t?digits[pos]:9;for(let d=0;d<=limit;d++){const nt=Number(t===1&&d===digits[pos]),ns=Number(s===1||d!==0);if(ns&&d===x.forbidden){push(frames,'第 '+pos+' 位：拒绝数字 '+d,'来源状态 ('+t+','+s+') 有 '+dp[t][s]+' 种前缀；加入 '+d+' 后属于真实数位，触犯禁用规则。','reject',{arrays:[arr('上界',digits,[pos])],tables:[table('当前层',['tight','started','ways'],stateRows(dp),[t*2+s]),table('下一层累计',['tight','started','ways'],stateRows(next))],metrics:[{label:'尝试数字',value:d}]});continue;}const old=next[nt][ns];next[nt][ns]+=dp[t][s];push(frames,'第 '+pos+' 位：选择 '+d,'('+t+','+s+') → ('+nt+','+ns+')，'+old+' + '+dp[t][s]+' = '+next[nt][ns]+(ns?'；这是实际数位。':'；仍为前导零，不触发禁用。'),'extend',{arrays:[arr('上界',digits,[pos])],tables:[table('来源层',['tight','started','ways'],stateRows(dp),[t*2+s]),table('下一层累计',['tight','started','ways'],stateRows(next),[nt*2+ns])],metrics:[{label:'本位允许上限',value:limit},{label:'选择数字',value:d}]});}}dp=next;push(frames,'已处理 '+(pos+1)+' 位','滚动到新一层，下一位只依赖这四种状态，不需保存所有具体前缀。','roll',{arrays:[arr('上界',digits,[],nums(pos+1))],tables:[table('当前层计数',['tight','started','ways'],stateRows(dp))]});}let count=dp[0][1]+dp[1][1];if(x.forbidden!==0)count+=dp[0][0]+dp[1][0];push(frames,'处理整数 0，得到 '+count,'started=0 的唯一数是 0。'+(x.forbidden===0?'禁用 0，因此不计这一项。':'禁用的不是 0，因此保留这一项。'),'answer',{tables:[table('最终状态',['tight','started','ways'],stateRows(dp))],metrics:[{label:'合法整数个数',value:count}]});return {frames,result:{count}};},
  oracle(x){let count=0;for(let v=0;v<=x.bound;v++)if(!String(v).includes(String(x.forbidden)))count++;return {count};},
  exercises:[{question:'在 [0,25] 中不含数字 0 的整数共有多少？',options:['23','24','25'],answer:0,explanation:'共有 26 个整数，排除 0、10、20，共 23 个。1..9 不受补齐为 01..09 的前导零影响。'},{question:'bound=0、forbidden=7 时答案为什么是 1？',options:['空集合也算一个数','唯一的整数 0 的表示不含 7','所有禁用数字都自动忽略'],answer:1,explanation:'范围中只有 0。全程 started=0 的路径对应它，而不是一个额外的空数；因为禁的是 7，所以合法。'},{question:'要增加“整数能被 3 整除”的条件，最合适的额外状态是？',options:['记住完整前缀整数','不需要状态，最后随便除以 3','记住前缀对 3 的余数'],answer:2,explanation:'下一位后余数为 (r*10+d)%3。只保留 3 种余数足以判定最终整除性，复杂度增加常数因子 3。'}],
  sources:[source('USACO Guide · Digit DP','https://usaco.guide/gold/digit-dp','核对按位计数、上界状态与 started 的基本建模；本章禁用数字模型及零边界独立推导。')],
  cpp:`#include <iostream>
#include <string>
#include <array>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string bound; int forbidden; if (!(cin >> bound >> forbidden)) return 0;
    array<array<long long, 2>, 2> dp{}; dp[1][0] = 1; // @init
    for (char ch : bound) {
        int digit = ch - '0';
        array<array<long long, 2>, 2> next{};
        for (int tight = 0; tight < 2; ++tight) for (int started = 0; started < 2; ++started) {
            int limit = tight ? digit : 9;
            for (int d = 0; d <= limit; ++d) {
                int nt = tight && (d == digit), ns = started || (d != 0);
                if (ns && d == forbidden) continue; // @reject
                next[nt][ns] += dp[tight][started]; // @extend
            }
        }
        dp = next; // @roll
    }
    long long answer = dp[0][1] + dp[1][1];
    if (forbidden != 0) answer += dp[0][0] + dp[1][0]; // @answer
    cout << answer << '\\n';
}
`,cppInput:x=>x.bound+' '+x.forbidden+'\n',cppOutput:scalarOutput('count'),notes:[['init','空前缀等于上界前缀，但没有真实数位。'],['reject','只有已经开始的数字才检查禁用位，前导零不误伤短数字。'],['answer','把全程未开始的路径解释为整数 0，再按禁用条件计入。']],transfer:{contrast:'状压 DP 保存过去使用过的对象；数位 DP 保存过去对未来约束的影响。二者都不是保存完整历史，而是保留足以继续计算的等价类。',next:['subset-dp','topological-sort'],challenge:'增加“相邻两位不能相等”，设计上一位状态；说明 started=0 时上一位为什么不能简单记为 0。'}
});

register({
  id:'bfs',section:'graph',title:'BFS：无权最短路',subtitle:'队列让第 k 层先于第 k+1 层扩展',level:'基础',tags:['BFS','队列','最短路'],prerequisites:['complexity'],
  summary:'在无向无权图上从指定源点求到各点的最少边数。动画展示入队即标记、逐边扫描与不连通结果；不把普通 BFS 当成任意带权最短路。',
  lesson:{recognize:['每条边代价相同（本章都为 1），目标是最少经过几条边。','状态能够表示成图：顶点可以是格子、字符串状态或局面，不一定显式给出。','图可以不连通、含环、自环或重边；普通 BFS 不适用于任意不等权边，0/1 边权需要双端队列版本。'],derive:[
    {title:'为什么不是随便 DFS 找一条路',text:'DFS 找到的第一条路径可能很长，而更短的路径还没探索。BFS 把所有走 0 步的状态、1 步的状态、2 步的状态依次扩展，让“第一次找到”具有最短性。'},
    {title:'队列如何形成层次',text:'先令 dist[source]=0 并入队。每次从队首取 u，扫描邻点 v。若 v 尚未发现，就设 dist[v]=dist[u]+1 并放队尾。由于先入先出，旧的一层会在新的一层之前被处理完。'},
    {title:'标记时机决定去重',text:'应在入队时标记，而不是出队时。否则同一层的多个父节点可能把同一个孩子反复放入队列。入队后 dist 已确定，重复边或回到已发现节点的边只需跳过。'},
    {title:'不可达也属于答案',text:'只从 source 出发，队列清空后仍未发现的点与源点不连通。页面使用 null 表示不可达，C++ 输出 −1；它不是距离 0，不能参与普通数值比较来误判为最短。'},
    {title:'多源与路径重建的扩展',text:'若要求到任一源的最近距离，可把所有源以距离 0 同时入队。若要输出一条路径，在第一次发现 v 时保存 parent[v]=u，最后从目标回溯。统计最短路条数则还需累加所有 dist[u]+1=dist[v] 的前驱贡献。'}
  ],invariant:{title:'队列按非递减距离排列',text:'每次取队首时，其距离已经是源点到它的真实最少边数；队列中距离只会是当前层或紧邻下一层。',proof:['源点距离 0 最优，初始队列满足不变量。','扫描距离 k 的 u 时，新发现邻点有长度 k+1 的真实路径，故赋值是可行上界。','如果 v 有不超过 k 的更短路径，它在那条路径上距离至多 k−1 的前驱早应出队并发现 v，与“未发现”矛盾。','新点只追加队尾，因此下一层不会抢在当前层之前扩展；归纳得到所有首次发现距离正确。']},complexity:{time:'O(n+m)',space:'O(n+m)（邻接表）与 O(n) 队列/距离',conditions:'n 为顶点数，m 为输入无向边数；每条边在邻接表中保存两次。教学 n≤12、m≤40。普通 BFS 要求等权边。'},pitfalls:[
    {title:'出队才标记',text:'多个前驱会重复安排同一顶点，队列和工作量可能膨胀。',counterexample:'菱形 0−1、0−2、1−3、2−3，若 3 直到出队才标记，1 与 2 都会把 3 入队。'},
    {title:'把带权最短路也按边数算',text:'BFS 优化的是边数，不是边权总和。',counterexample:'0→2 权重 10，0→1、1→2 权重各 1，BFS 先到 2 只用一条边，却不是权重最短的 2。'},
    {title:'漏写无向图反向边',text:'输入 [u,v] 表示两个方向都能走；只加 u→v 会变成另一张图。',counterexample:'n=2，边 [0,1]，source=1，正确距离 [1,0]；只存 0→1 会误判 0 不可达。'},
    {title:'不可达状态用 0',text:'源点距离与未访问不能同值，否则环中的源点可能被再次入队。',counterexample:'两个连通点距离应 [0,1]，另一个孤点应 null；三个零无法区分真实源点和未发现点。'}
  ],applications:['迷宫最少步数：每个可走格为顶点，每次移动代价一致。','无权社交关系或转换规则中的最少跳数；多源 BFS 可以同时求到最近设施或最近危险点的距离。']},
  input:{description:'{n,edges,source}：无向无权图，n=0..12、边≤40。支持环、自环、重边、断连。source 必须在图内；空图约定 source=0，返回空距离数组。',default:{n:7,edges:[[0,1],[0,2],[1,3],[2,3],[3,4],[5,6]],source:0},presets:[{name:'菱形去重',data:{n:4,edges:[[0,1],[0,2],[1,3],[2,3]],source:0}},{name:'自环重边与断连',data:{n:4,edges:[[0,0],[0,1],[0,1]],source:0}},{name:'反向走无向边',data:{n:2,edges:[[0,1]],source:1}},{name:'空图',data:{n:0,edges:[],source:0}}],validate(x){graphInput(x,{source:true});}},
  random(seed){const r=rng(seed),n=r(0,12),m=n?r(0,25):0;return {n,edges:nums(m).map(()=>[r(0,n-1),r(0,n-1)]),source:n?r(0,n-1):0};},
  run(x){const a=adjacency(x.n,x.edges),dist=Array(x.n).fill(null),q=[],done=[],frames=[];let head=0;const vis=(active=[],ei=-1)=>({graph:graph(x.n,x.edges,false,active,done,ei),arrays:[arr('dist（— 表示不可达/未发现）',dist.map(v=>v===null?'—':v),active),arr('待扩展队列（队首先出）',q.slice(head),[],[],{0:'front'})],metrics:[{label:'已发现',value:q.length},{label:'已扩展',value:done.length}]});if(x.n){dist[x.source]=0;q.push(x.source);}push(frames,x.n?'源点入队并立即标记':'空图：没有源点可入队',x.n?'源点距离为 0；其他顶点暂未发现。':'source=0 只是空输入占位，不代表图中存在顶点 0；返回空距离数组。','init',vis(x.n?[x.source]:[]));while(head<q.length){const u=q[head++];push(frames,'从队首取出 '+u,'当前距离 '+dist[u]+'，即将把未发现的邻点放到下一层。','pop',vis([u]));for(const [v,w,ei]of a[u]){if(dist[v]===null){dist[v]=dist[u]+1;q.push(v);push(frames,'第一次发现 '+v,'经 '+u+' 到 '+v+'，距离为 '+dist[u]+'+1='+dist[v]+'；立即标记并入队，防止重复安排。','discover',vis([u,v],ei));}else push(frames,'跳过已发现的 '+v,'该顶点距离已在更早或同层扩展中确定，自环/重边不会使它再次入队。','skip',vis([u,v],ei));}done.push(u);}push(frames,'队列为空，最少边数已确定','仍显示 — 的顶点无法从 source 到达，结果以 null 表示不可达。','answer',vis());return {frames,result:{dist}};},
  oracle(x){if(!x.n)return {dist:[]};const d=nums(x.n).map(i=>nums(x.n).map(j=>i===j?0:Infinity));x.edges.forEach(([u,v])=>{d[u][v]=Math.min(d[u][v],1);d[v][u]=Math.min(d[v][u],1);});for(let k=0;k<x.n;k++)for(let i=0;i<x.n;i++)for(let j=0;j<x.n;j++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);return {dist:d[x.source].map(v=>Number.isFinite(v)?v:null)};},
  exercises:[{question:'菱形图 0−1、0−2、1−3、2−3，source=0，到 3 的最短距离是？',options:['1','2','3'],answer:1,explanation:'路径 0−1−3 与 0−2−3 都有 2 条边。BFS 在扩展距离 1 的层时第一次发现 3。'},{question:'什么时候给顶点标记“已发现”最合适？',options:['第一次入队时','每次出队后','所有边扫描完之后'],answer:0,explanation:'入队即标记可保证每个点最多入队一次。出队才标记会让多个同层前驱重复入队同一顶点。'},{question:'所有边权都是 0 或 1 时，用哪个扩展最贴近 BFS 的层次思想？',options:['仍用普通 FIFO 且首次发现后永不更新','0-1 BFS：零权改善放队首，一权改善放队尾','按顶点编号排序'],answer:1,explanation:'零权边不增加距离，需要更早扩展，因此使用双端队列与松弛条件。普通 BFS 的每边 +1 假设不成立。'}],
  sources:[source('cp-algorithms · Breadth First Search','https://cp-algorithms.com/graph/breadth-first-search.html','核对 BFS 层次、复杂度、多源/路径扩展的基本原则。')],
  cpp:`#include <iostream>
#include <vector>
#include <queue>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m, source; if (!(cin >> n >> m >> source)) return 0;
    vector<vector<int>> g(n);
    for (int i = 0; i < m; ++i) { int u, v; cin >> u >> v; g[u].push_back(v); g[v].push_back(u); }
    vector<int> dist(n, -1); queue<int> q; // @init
    if (n) { dist[source] = 0; q.push(source); }
    while (!q.empty()) {
        int u = q.front(); q.pop(); // @pop
        for (int v : g[u]) {
            if (dist[v] != -1) continue; // @skip
            dist[v] = dist[u] + 1; q.push(v); // @discover
        }
    }
    for (int v = 0; v < n; ++v) cout << dist[v] << (v + 1 == n ? '\\n' : ' '); // @answer
    if (!n) cout << '\\n';
}
`,cppInput:x=>x.n+' '+x.edges.length+' '+x.source+'\n'+x.edges.map(e=>e.join(' ')).join('\n')+'\n',cppOutput:out=>({dist:out.trim()?out.trim().split(/\s+/).map(Number).map(v=>v===-1?null:v):[]}),notes:[['init','−1 表示未发现，不能用 0 与源点距离混淆。'],['discover','设置距离和入队是一次操作，避免重复入队。'],['answer','未发现顶点仍为 −1，页面转换为 null。']],transfer:{contrast:'BFS 的“第一次发现即最短”来自等权层次；Dijkstra 将队列换为按暂定距离选最小，并依赖非负权。',next:['dijkstra','topological-sort','tree-dp'],challenge:'为 BFS 加上 parent 数组，返回到目标的一条最短路；目标不可达时明确输出什么。'}
});

register({
  id:'topological-sort',section:'graph',title:'拓扑排序：Kahn 算法',subtitle:'不断删除没有未完成前置条件的点',level:'核心',tags:['拓扑排序','DAG','入度','最小堆'],prerequisites:['bfs'],
  summary:'在有向图中寻找满足所有前后依赖的顶点顺序，并检测环。使用最小堆取得字典序最小合法顺序；有环时返回失败，不把处理到的一段误称为拓扑序。',
  lesson:{recognize:['边 u→v 表示 u 必须在 v 之前，目标是安排所有顶点，而非求空间上的最短距离。','只有有向无环图 DAG 才存在完整拓扑序；无向图不能直接按本章入度解释。','可同时选择多个零入度点，合法答案通常不唯一；本章规定每次选最小编号，因此输出可重复验证。'],derive:[
    {title:'从排列检查到局部可行条件',text:'朴素枚举 n! 个排列，再检查每条 u→v 是否满足位置[u]<位置[v]。若某点还有未安排的前驱，它不可能是下一个；反之，剩余入度为 0 的点当前就没有未满足依赖，可以安全放在下一个。'},
    {title:'维护“剩余图”的入度',text:'先统计全部边的入度，所有入度 0 的点进入候选堆。每取一个 u 输出，相当于从剩余图删除 u 与它的出边，因此每条 u→v 令 indegree[v] 减 1；变成 0 时才放入堆。'},
    {title:'为什么卡住就能证明有环',text:'若还有顶点但没有零入度点，任选剩余点逆着入边不断找前驱。有限顶点必然重复，从而形成有向环。反过来，环上的每个点在环内都有前驱，不可能被彻底删除。'},
    {title:'字典序最小是额外规则',text:'普通队列足以得到任意拓扑序。本章用最小堆总选当前合法的最小编号：若另一合法答案在首个不同位置选了更大编号，就可把我们选的零入度点提前而不破坏任何依赖，因此我们得到字典序最小序列。'},
    {title:'拓扑顺序也是 DP 的计算顺序',text:'DAG 最长路、路径数或任务完成时间可沿拓扑序传播。必须先确认图无环；否则未处理点不是“值为零”，而是依赖没有合法计算顺序，可能需要 SCC 缩点或另一种模型。'}
  ],invariant:{title:'堆中恰好是剩余图的零入度点',text:'每次选点前，indegree[v] 等于来自尚未输出顶点的入边数，堆里包含全部未输出且该数为 0 的顶点。',proof:['初始统计每条输入边，恰是完整图入度；把所有零入度点加入堆。','输出 u 后只删除 u 的出边，逐条减入度正确反映剩余图，包括重复边的重复减法。','只有入度从正变零时入堆，每点最多一次；其他顶点的可行性不变。','所有输出都满足前驱已输出；若输出 n 点就是合法拓扑序，否则剩余图最小入度至少 1，包含有向环。']},complexity:{time:'O(n+m+n log n)',space:'O(n+m)',conditions:'n 为顶点数，m 含重复边；每点进出最小堆一次，每条边减入度一次。若不要求字典序可用队列降为 O(n+m)。教学 n≤8、m≤30。'},pitfalls:[
    {title:'把原始入度 0 当成永远可选集合',text:'删除前驱后会产生新的零入度点，必须动态更新。',counterexample:'链 0→1→2 初始只有 0 可选，但删除 0 后 1 可选，再删除 1 后 2 可选。'},
    {title:'只输出部分就宣称成功',text:'有环图可能仍有若干无关零入度点，处理它们不代表全图无环。',counterexample:'0→1、1→0，另有孤点 2。算法先输出 [2] 后卡住，完整拓扑序不存在。'},
    {title:'重边只减一次',text:'统计和删除必须采用相同的边语义。',counterexample:'两条 0→1 使 indegree[1]=2；处理 0 时应减两次。如果只减一次，会错误报告环。'},
    {title:'把编号递增等同拓扑序',text:'编号与依赖无关；最小堆只在当前可行点之间比较。',counterexample:'只有边 2→0，n=3。字典序最小拓扑序为 [1,2,0]，不是 [0,1,2]。'}
  ],applications:['课程先修、构建依赖、流水线任务：检查能否安排，并输出一种满足约束的次序。','DAG 动态规划：按照拓扑序确保所有前驱值已完成，例如有向无环图上的最长路径。']},
  input:{description:'{n,edges} 是有向图，n=0..8、边≤30。允许重边、自环、断连；自环意味着有环。成功返回字典序最小 order，失败 order=[]；空图成功且顺序为空。',default:{n:6,edges:[[0,2],[1,2],[1,3],[2,4],[3,4],[4,5]]},presets:[{name:'孤点先输出仍有环',data:{n:3,edges:[[0,1],[1,0]]}},{name:'重边需同步删除',data:{n:3,edges:[[0,1],[0,1],[1,2]]}},{name:'编号不是依赖',data:{n:3,edges:[[2,0]]}},{name:'空 DAG',data:{n:0,edges:[]}}],validate(x){graphInput(x,{maxN:8,maxM:30});}},
  random(seed){const r=rng(seed),n=r(0,6),edges=[];for(let u=0;u<n;u++)for(let v=0;v<n;v++)if(r(0,7)===0)edges.push([u,v]);if(edges.length&&r(0,1))edges.push(edges[0].slice());return {n,edges:edges.slice(0,30)};},
  run(x){const a=adjacency(x.n,x.edges,true),deg=Array(x.n).fill(0),heap=new Heap((a,b)=>a-b),order=[],frames=[];x.edges.forEach(e=>deg[e[1]]++);nums(x.n).forEach(i=>{if(!deg[i])heap.push(i);});const vis=(active=[],ei=-1)=>({graph:graph(x.n,x.edges,true,active,order,ei),arrays:[arr('剩余入度',deg,active),arr('当前零入度候选（按编号展示）',heap.a.slice().sort((a,b)=>a-b)),arr('已输出顺序',order)]});push(frames,'统计剩余入度','所有零入度顶点加入最小堆。每次只在合法候选里取编号最小者。','init',vis());while(heap.length){const u=heap.pop();order.push(u);push(frames,'输出当前最小合法点 '+u,'它的所有前驱都已输出，因此可以安排；接下来删除它的出边。','pop',vis([u]));for(const [v,w,ei]of a[u]){deg[v]--;if(deg[v]===0)heap.push(v);push(frames,'删除边 '+u+'→'+v,'剩余入度变成 '+deg[v]+(deg[v]===0?'，新候选入堆。':'，仍有未完成前驱。'),'remove',vis([u,v],ei));}}const acyclic=order.length===x.n;push(frames,acyclic?'所有顶点都已安排':'剩余图存在有向环',acyclic?'得到字典序最小的完整拓扑序。':'只输出了 '+order.length+'/'+x.n+' 个顶点。未输出子图无零入度点，因此存在环；返回 order=[] 表示失败。','answer',vis(nums(x.n).filter(i=>!order.includes(i))));return {frames,result:{acyclic,order:acyclic?order:[]}};},
  oracle(x){let found=null;const perm=[],used=Array(x.n).fill(false);function search(){if(found)return;if(perm.length===x.n){const pos=Array(x.n);perm.forEach((v,i)=>pos[v]=i);if(x.edges.every(([u,v])=>pos[u]<pos[v]))found=perm.slice();return;}for(let i=0;i<x.n;i++)if(!used[i]){used[i]=true;perm.push(i);search();perm.pop();used[i]=false;if(found)return;}}search();return {acyclic:found!==null,order:found||[]};},
  exercises:[{question:'n=3，只有边 2→0，字典序最小拓扑序是？',options:['[0,1,2]','[1,2,0]','[2,0,1]'],answer:1,explanation:'初始可选 1、2，先取 1，再取 2；删除 2→0 后 0 才可选。[2,0,1] 合法但字典序更大。'},{question:'输出了孤点 2 后剩余 0↔1，应该返回什么？',options:['成功，顺序 [2]','失败，因为不能安排所有点','成功，把 0、1 随便追加'],answer:1,explanation:'拓扑序必须覆盖所有顶点。环中每点始终还有环内前驱，任意追加都会违反至少一条边。'},{question:'不要求字典序最小，如何把堆的开销省掉？',options:['使用普通队列保存零入度点','不再维护入度','按编号直接输出'],answer:0,explanation:'任意零入度点都可以安全输出。FIFO 队列每点进出一次，与边扫描合计 O(n+m)。'}],
  sources:[source('cp-algorithms · Topological Sorting','https://cp-algorithms.com/graph/topological-sort.html','核对 DAG、拓扑序与有环边界；该页也介绍 DFS 方法，本章动画使用 Kahn 入度消除。')],
  cpp:`#include <iostream>
#include <vector>
#include <queue>
#include <functional>
#include <utility>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; if (!(cin >> n >> m)) return 0;
    vector<vector<int>> g(n); vector<int> indegree(n, 0);
    for (int i = 0; i < m; ++i) { int u, v; cin >> u >> v; g[u].push_back(v); ++indegree[v]; }
    priority_queue<int, vector<int>, greater<int>> ready; // @init
    for (int v = 0; v < n; ++v) if (!indegree[v]) ready.push(v);
    vector<int> order;
    while (!ready.empty()) {
        int u = ready.top(); ready.pop(); order.push_back(u); // @pop
        for (int v : g[u]) if (--indegree[v] == 0) ready.push(v); // @remove
    }
    bool acyclic = static_cast<int>(order.size()) == n; // @answer
    cout << acyclic << '\\n';
    if (acyclic) for (int v : order) cout << v << ' ';
    cout << '\\n';
}
`,cppInput:x=>x.n+' '+x.edges.length+'\n'+x.edges.map(e=>e.join(' ')).join('\n')+'\n',cppOutput:out=>{const a=out.trim().split(/\s+/).map(Number);return {acyclic:a[0]===1,order:a[0]===1?a.slice(1):[]};},notes:[['init','最小堆是为保证字典序最小，不是拓扑排序本身必须。'],['remove','每条输入边都对应一次入度减法，包括重边。'],['answer','完整输出 n 个点才证明无环。']],transfer:{contrast:'BFS 队列表示距离层；Kahn 候选集合表示依赖已满足。二者都有“取出一个点后激活后继”的外形，但不变量完全不同。',next:['scc','interval-dp'],challenge:'在拓扑排序时求各点的最早完成时间：先定义点耗时与边依赖的语义，再写出转移。'}
});

register({
  id:'dijkstra',section:'graph',title:'Dijkstra：非负权最短路',subtitle:'最小暂定距离可以定案，过期堆项必须丢弃',level:'核心',tags:['最短路','优先队列','贪心证明'],prerequisites:['bfs'],
  summary:'用惰性删除最小堆求有向非负权图的单源最短距离。真实展示松弛、重复入堆与过期项；负边会被拒绝，断连以 null 返回。',
  lesson:{recognize:['边权表示可相加的非负代价，路径可以经过多条不同权重的边。','图可以有向、有环、自环、零权边或平行边，但不能有负权边。','若权重全为 1，BFS 更简单；只有 0/1 可用 0-1 BFS；存在负边需考虑 Bellman-Ford 等算法并处理负环。'],derive:[
    {title:'从所有路径到最短距离估计',text:'枚举所有路径会重复走环。令 dist[v] 为目前找到的源点到 v 的最小代价，初始源点的距离为 0、其余为 ∞。扫描边 u→v 时，如果 dist[u]+w 更小，就用它改善 dist[v]，这一步称松弛。'},
    {title:'为什么先处理最小估计',text:'在尚未定案的点中选择 dist 最小的 u。任何绕过其他未定点再到 u 的路径，跨入未定区域时已经至少拥有不小于 dist[u] 的前缀；后续非负边不可能把它变得更短，因此 u 可以定案。'},
    {title:'用堆加速选最小',text:'每次松弛成功就把 (新距离,顶点) 放进最小堆。无需查找并删除旧记录，因此同一个点可能在堆里出现多次。取出 (du,u) 时，若 du!=dist[u]，它是被更好路径取代的旧记录，直接跳过。'},
    {title:'零权与平行边不会破坏证明',text:'零权边允许几个点拥有相同距离，但不会让后续路径变小；按严格小于才更新可避免零环反复入堆。平行边各自尝试松弛，较小的一条自然胜出，旧的较大堆项会在稍后被丢弃。'},
    {title:'未到达与可达最优要分清',text:'堆为空表示所有可从源点改善到的顶点都处理完了。仍为 ∞ 的点不可达，页面输出 null，C++ 使用 −1。生产代码应使用足够宽的整数与安全 INF，避免 dist+w 溢出；本演示权重上限保证安全。'}
  ],invariant:{title:'非过期的最小堆顶距离已经最优',text:'每次弹出满足 du=dist[u] 的最小候选时，dist[u] 等于真实最短距离；所有有限 dist 都来自实际路径，所以从不低估真实最短路。',proof:['源点有长度为 0 的空路径，初始估计准确；其他点 ∞ 只是未找到路径。','每次松弛把一条真实源点到 u 的路径接上 u→v，因此有限 dist 始终可实现。','若当前 u 存在更短路径，取该路径上第一个尚未定案点 y，其前驱已定案并扫描过边，故 dist[y] 不超过这条更短路径的前缀。','后续边非负，使该前缀不大于路径总长，从而 dist[y]<dist[u]，矛盾于 u 是最小候选；负边正是让这步失效的原因。']},complexity:{time:'O((n+m) log(m+2))，惰性堆实现',space:'O(n+m)',conditions:'n 顶点、m 条有向输入边，允许平行边，所以以堆可含 O(m) 条记录写 log(m+2)。每条边在顶点定案后扫描一次。教学 n≤12、m≤40、0≤w≤30。'},pitfalls:[
    {title:'允许负边却仍提前定案',text:'更晚到达的点可能通过负边把已定案点距离降低。',counterexample:'0→1 权 2，0→2 权 5，2→1 权 −10。先定案 1 为 2 是错的，真实距离 −5；本章验证器拒绝负权。'},
    {title:'没处理过期堆项',text:'旧记录不应再次扫描全部出边，否则会浪费大量工作，还容易配合错误 visited 逻辑产生错误。',counterexample:'0→1 权 10，0→2 权 1，2→1 权 1，堆里会同时出现 (10,1)、(2,1)；前者之后应直接跳过。'},
    {title:'用 ≤ 更新造成零环反复入堆',text:'只有严格改善才需要传播。相等距离不改变最短值，不能无限重复安排。',counterexample:'0→1 权 0、1→0 权 0，若相等也入堆，两点会永远互相加入候选。'},
    {title:'首次入堆就当作定案',text:'被发现的路径不一定最短；必须等到以全局最小、且未过期的候选出堆。',counterexample:'同样的三边图中，1 首次入堆的距离 10 后来被改进为 2，不能在入堆时锁死。'}
  ],applications:['交通或状态转移的非负总代价最小化：不同边耗时不同，普通 BFS 不足。','多源最短距离：所有源以 0 初始化；也可从目标在反向图运行，求所有点到该目标的距离。']},
  input:{description:'{n,edges,source}：有向边 [u,v,w]，n=0..12、边≤40、权重 0..30。明确拒绝负权；支持零权、自环、重边、断连。空图 source=0。',default:{n:6,edges:[[0,1,10],[0,2,1],[2,1,1],[1,3,2],[2,3,8],[3,4,0]],source:0},presets:[{name:'旧记录必须丢弃',data:{n:3,edges:[[0,1,10],[0,2,1],[2,1,1]],source:0}},{name:'零环与孤点',data:{n:4,edges:[[0,1,0],[1,0,0],[1,2,3]],source:0}},{name:'平行边取较短',data:{n:2,edges:[[0,1,8],[0,1,2]],source:0}},{name:'空图',data:{n:0,edges:[],source:0}}],validate(x){graphInput(x,{weighted:true,source:true});}},
  random(seed){const r=rng(seed),n=r(0,12),m=n?r(0,32):0;return {n,edges:nums(m).map(()=>[r(0,n-1),r(0,n-1),r(0,20)]),source:n?r(0,n-1):0};},
  run(x){const a=adjacency(x.n,x.edges,true),dist=Array(x.n).fill(Infinity),heap=new Heap((a,b)=>a[0]-b[0]||a[1]-b[1]),done=[],frames=[];if(x.n){dist[x.source]=0;heap.push([0,x.source]);}const vis=(active=[],ei=-1)=>({graph:graph(x.n,x.edges,true,active,done,ei),arrays:[arr('dist：当前最短估计',show(dist),active,done)],tables:[table('候选堆（按键排序展示前 12 项）',['距离','顶点'],heap.a.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]).slice(0,12))],metrics:[{label:'真实堆项数',value:heap.length},{label:'已定案',value:done.length}],note:heap.length>12?'这里只展示最小的 12 项，算法真实堆仍保留全部 '+heap.length+' 项。':''});push(frames,x.n?'源点距离 0，其余为 ∞':'空图：候选堆为空',x.n?'候选堆按 (距离,编号) 排序；非负权才允许最小候选定案。':'source=0 只是空输入占位，没有源点需要初始化；结果为空距离数组。','init',vis(x.n?[x.source]:[]));while(heap.length){const [du,u]=heap.pop();if(du!==dist[u]){push(frames,'丢弃过期记录 ('+du+','+u+')','目前 dist['+u+']='+dist[u]+' 更小，这个旧记录不再扫描出边。','stale',vis([u]));continue;}done.push(u);push(frames,'定案顶点 '+u+'：距离 '+du,'它是所有未处理候选中距离最小者，非负边保证再绕路无法改善它。','pop',vis([u]));for(const [v,w,ei]of a[u]){const cand=du+w,old=dist[v];if(cand<old){dist[v]=cand;heap.push([cand,v]);push(frames,'松弛成功 '+u+'→'+v,'候选 '+du+'+'+w+'='+cand+' 小于旧距离 '+(Number.isFinite(old)?old:'∞')+'，更新并新增堆项。','relax',vis([u,v],ei));}else push(frames,'松弛无需更新 '+u+'→'+v,'候选 '+cand+' 不小于现值 '+dist[v]+'。相等也不入堆，零权环不会无限重复。','skip',vis([u,v],ei));}}push(frames,'堆为空，所有可达最短距离确定','∞ 顶点不可达，结果以 null 表示。','answer',vis());return {frames,result:{dist:dist.map(v=>Number.isFinite(v)?v:null)}};},
  oracle(x){const d=Array(x.n).fill(Infinity);if(x.n)d[x.source]=0;for(let k=1;k<x.n;k++){let changed=false;for(const [u,v,w]of x.edges)if(d[u]+w<d[v]){d[v]=d[u]+w;changed=true;}if(!changed)break;}return {dist:d.map(v=>Number.isFinite(v)?v:null)};},
  exercises:[{question:'0→1(10)、0→2(1)、2→1(1)，顶点 1 的最终距离是？',options:['10','2','1'],answer:1,explanation:'先发现距离 10，但经 2 可改善为 2。记录 (2,1) 先出堆，旧的 (10,1) 随后被跳过。'},{question:'Dijkstra 为什么不能以“首次入堆”当成最终答案？',options:['此时可能还没发现更短的间接路径','堆不支持相同节点','因为图必须连通'],answer:0,explanation:'首次入堆只是发现一条路径。只有非过期的全局最小候选出堆时，非负权证明才足以让该距离定案。'},{question:'把边权范围扩展成含负数，本章最恰当的处理是？',options:['继续运行，反正也在做松弛','把负数直接变成绝对值','拒绝该输入并更换适用算法、考虑负环'],answer:2,explanation:'负边破坏贪心定案依据。Bellman-Ford 能处理负边并检测可达负环；改绝对值则改变了原问题。'}],
  sources:[source('cp-algorithms · Dijkstra','https://cp-algorithms.com/graph/dijkstra.html','核对非负权定案证明与最短路初始化。'),source('cp-algorithms · Dijkstra on sparse graphs','https://cp-algorithms.com/graph/dijkstra_sparse.html','核对优先队列的重复记录及过期项过滤。')],
  cpp:`#include <iostream>
#include <vector>
#include <queue>
#include <functional>
#include <utility>
#include <limits>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m, source; if (!(cin >> n >> m >> source)) return 0;
    vector<vector<pair<int, long long>>> g(n);
    for (int i = 0; i < m; ++i) { int u, v; long long w; cin >> u >> v >> w; g[u].push_back({v, w}); }
    const long long INF = numeric_limits<long long>::max() / 4;
    vector<long long> dist(n, INF); // @init
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    if (n) { dist[source] = 0; pq.push({0, source}); }
    while (!pq.empty()) {
        auto [du, u] = pq.top(); pq.pop(); // @pop
        if (du != dist[u]) continue; // @stale
        for (auto [v, w] : g[u]) {
            if (du + w >= dist[v]) continue; // @skip
            dist[v] = du + w; pq.push({dist[v], v}); // @relax
        }
    }
    for (int v = 0; v < n; ++v) cout << (dist[v] == INF ? -1 : dist[v]) << (v + 1 == n ? '\\n' : ' '); // @answer
    if (!n) cout << '\\n';
}
`,cppInput:x=>x.n+' '+x.edges.length+' '+x.source+'\n'+x.edges.map(e=>e.join(' ')).join('\n')+'\n',cppOutput:out=>({dist:out.trim()?out.trim().split(/\s+/).map(Number).map(v=>v===-1?null:v):[]}),notes:[['stale','同一点可多次入堆，但只有当前最短记录才扩展。'],['relax','严格改善才入堆，相等不入堆以避免零环反复。'],['answer','−1 只表示不可达，合法距离都非负。']],transfer:{contrast:'BFS 根据边数的天然层次出队；Dijkstra 根据最小总代价出堆。共同结构是“安全定案”，各自安全性的前提不能互换。',next:['mst','topological-sort'],challenge:'增加 parent 重建一条最短路径，使用严格改善更新前驱，并考虑零权边存在时为何不能任意用相等候选重写前驱。'}
});

register({
  id:'mst',section:'graph',title:'最小生成森林：Kruskal',subtitle:'按权重连接不同分量，用割性质证明每一次选择',level:'核心',tags:['最小生成树','Kruskal','并查集','割性质'],prerequisites:['dsu'],
  summary:'求无向带权图每个连通分量的最小生成树，合起来得到最小生成森林。支持负权、平行边与断连；规范输出总权与连通分量，不把不唯一的选边方案误判为错误。',
  lesson:{recognize:['目标是连接同一原始连通分量内的所有顶点，最小化所选边总权，而非某一源点到每点的最短距离。','图必须无向，负边完全允许；有向最小树形图是不同问题。','若原图不连通，不存在覆盖全图的一棵生成树，但每个分量可各取最小生成树；本章明确输出森林。'],derive:[
    {title:'从所有边子集到无环结构',text:'朴素枚举边子集，要求与原图有相同连通分量且不成环，再比较总权。一个含 k 个点的树恰好有 k−1 条边，因此生成森林总边数为 n−c，c 是原图分量数。'},
    {title:'由便宜到昂贵地尝试边',text:'将边按权重升序排列。若边两端已经连通，加入它会形成环，跳过；否则连接两个分量。并查集只负责快速判断当前森林的连通性，不负责证明最优。相同权重按端点与输入顺序打破平局，方便动画重放。'},
    {title:'核心不是“便宜就好”，而是割性质',text:'当前一个连通块与其外部构成一个割。即将选中的边是跨越相应割的最轻候选之一，因为更轻的边都已考虑。对任何包含当前森林的最优解，若没有该边，加上后产生一个环，其中必有另一条跨割边；用不更重的新边替换，仍存在包含新森林的最优解。'},
    {title:'负权、自环和断连分别如何处理',text:'负权边排在前面并不影响交换论证。自环两端永远在同一个分量内，不能帮助生成森林，应跳过。断连图只能在各自分量内选边，最后得到森林，不应伪造连接所有点的边。'},
    {title:'答案比较应尊重不唯一性',text:'若多个边权相等，最小生成森林可能有不同合法边集。本章动画固定一个确定顺序，而结果只返回最小总权与排序后的原图分量；oracle 穷举所有候选森林检验最优权值，不要求选边编号恰好相同。'}
  ],invariant:{title:'已选森林可扩展为某个最优森林',text:'每次选择之前，已选边无环，且存在一个最小生成森林包含所有这些边。',proof:['空边集无环，可以包含在任意最优森林中。','同一并查集内的边会闭合已有路径成环，因此跳过不会丢失连接不同块所需的选择。','对于新选的跨块边 e，取一个包含旧森林的最优解。若它不含 e，加入 e 后的环中有跨同一割的另一条边 f，且 weight(f)≥weight(e)。','交换 f 为 e 得到不更贵且仍包含新森林的生成森林。结束后每个原始分量都已连接，已选森林本身就是最优。']},complexity:{time:'O(m log m + (n+m) α(n))',space:'O(n+m)',conditions:'n 为顶点数，m 为输入无向边数。排序通常主导，DSU 使用路径压缩与按大小合并。教学 n≤8、m≤14，暴力 oracle 才可穷举边子集。'},pitfalls:[
    {title:'把最短路径树当成最小生成树',text:'前者优化源点到各点距离，后者优化所有所选边的总和。',counterexample:'三角形边 0−1=2、0−2=2、1−2=1。从 0 的最短路径树总权 4；MST 可选权 2 和 1，总权 3。'},
    {title:'不连通却宣称得到一棵树',text:'原图没有跨分量边，任何算法都不能凭空连接。',counterexample:'n=4，只有 0−1 权 1、2−3 权 2，结果总权 3 但分量是 [[0,1],[2,3]]，不是一棵生成树。'},
    {title:'照搬 Dijkstra 的非负要求',text:'最小生成森林比较固定边集总权，负权不会破坏割交换证明。',counterexample:'两点之间边权 −5，唯一 MST 权重就是 −5；取绝对值或拒绝负权都改变了本题。'},
    {title:'要求与参考答案选完全相同的边',text:'等权会造成多个同样好的最小生成树，差分应比较目标值或验证合法性。',counterexample:'三角形每边权 1，任取两条都得到总权 2 的 MST，共三种合法边集。'}
  ],applications:['铺设网络、连接设施：按总建设成本最小化选边，但必须核对是否无向、是否允许共享线路。','离线连通阈值问题：边按权重逐渐加入，DSU 的分量变化描述不同阈值下的连通性。']},
  input:{description:'{n,edges}：无向边 [u,v,w]，n=0..8、边≤14、权重 −30..30。支持负权、自环、平行边、断连。结果为 {weight,components}，分量内部升序、分量按最小顶点升序。',default:{n:6,edges:[[0,1,4],[0,2,2],[1,2,1],[1,3,5],[2,3,3],[3,4,-1]]},presets:[{name:'等权树不唯一',data:{n:3,edges:[[0,1,1],[1,2,1],[0,2,1]]}},{name:'负权重边与自环',data:{n:3,edges:[[0,0,-20],[0,1,5],[0,1,-2],[1,2,0]]}},{name:'两个连通分量',data:{n:4,edges:[[0,1,1],[2,3,2]]}},{name:'空图',data:{n:0,edges:[]}}],validate(x){graphInput(x,{maxN:8,maxM:14,weighted:true,negative:true});}},
  random(seed){const r=rng(seed),n=r(0,7),m=n?r(0,10):0;return {n,edges:nums(m).map(()=>[r(0,n-1),r(0,n-1),r(-10,20)])};},
  run(x){const parent=nums(x.n),size=Array(x.n).fill(1),frames=[],chosen=[];let weight=0;function find(u){if(parent[u]!==u)parent[u]=find(parent[u]);return parent[u];}const sorted=x.edges.map((e,i)=>({u:Math.min(e[0],e[1]),v:Math.max(e[0],e[1]),w:e[2],i})).sort((a,b)=>a.w-b.w||a.u-b.u||a.v-b.v||a.i-b.i);const vis=(active=[],ei=-1)=>({graph:graph(x.n,x.edges,false,active,[],ei,null,chosen),arrays:[arr('DSU parent',parent,active)],metrics:[{label:'已选总权',value:weight},{label:'已选边数',value:chosen.length},{label:'当前分量数',value:x.n-chosen.length}]});push(frames,'从 n 个孤立点开始','按权重、规范端点、输入序号排序。初始边集为空，可扩展成最优森林。','init',Object.assign(vis(),{tables:[table('排序后的候选边',['u','v','w'],sorted.map(e=>[e.u,e.v,e.w]))]}));for(const e of sorted){let a=find(e.u),b=find(e.v);if(a===b){push(frames,'跳过 '+e.u+'−'+e.v+'（'+e.w+'）','两端已在同一块中，加入会产生环；自环同样跳过。','skip',vis([e.u,e.v],e.i));continue;}if(size[a]<size[b]||(size[a]===size[b]&&a>b))[a,b]=[b,a];parent[b]=a;size[a]+=size[b];weight+=e.w;chosen.push(e.i);push(frames,'选择 '+e.u+'−'+e.v+'（'+e.w+'）','连接两个不同分量。按割性质，这一步仍可扩展为某个最小生成森林。','join',vis([e.u,e.v],e.i));}const map=new Map();nums(x.n).forEach(i=>{const r=find(i);if(!map.has(r))map.set(r,[]);map.get(r).push(i);});const components=canonical(Array.from(map.values()));push(frames,'最小生成森林完成','总权 '+weight+'，共有 '+components.length+' 个分量。'+(components.length>1?'原图不连通，不能称为覆盖全图的一棵生成树。':'不比较具体边集，等权可能有多个最优方案。'),'answer',Object.assign(vis(),{tables:[table('规范连通分量',['分量','顶点'],components.map((g,i)=>[i,g.join(', ')]))]}));return {frames,result:{weight,components}};},
  oracle(x){const components=groupsFromReach(closure(x.n,x.edges,false)),need=x.n-components.length;let best=Infinity;const valid=x.edges.filter(e=>e[0]!==e[1]);for(let mask=0;mask<(1<<valid.length);mask++){let c=0;for(let t=mask;t;t&=t-1)c++;if(c!==need)continue;const chosen=[],g=nums(x.n).map(()=>[]);let total=0;for(let i=0;i<valid.length;i++)if(mask>>i&1){const [u,v,w]=valid[i];chosen.push(valid[i]);g[u].push(v);g[v].push(u);total+=w;}const seen=new Set(),groups=[];for(let i=0;i<x.n;i++)if(!seen.has(i)){const q=[i];seen.add(i);for(let h=0;h<q.length;h++)for(const v of g[q[h]])if(!seen.has(v)){seen.add(v);q.push(v);}groups.push(q.sort((a,b)=>a-b));}if(JSON.stringify(groups)===JSON.stringify(components))best=Math.min(best,total);}return {weight:Number.isFinite(best)?best:0,components};},
  exercises:[{question:'三角形边权 2、2、1 的最小生成树总权是？',options:['4','3','5'],answer:1,explanation:'选权 1 的边，再选任一权 2 的跨块边，连接全部三点且无环，总权 3。源点最短路径树未必这么选。'},{question:'n=4，仅有 0−1(1)、2−3(2)，本章返回的结果代表什么？',options:['两个分量组成的权重 3 的最小生成森林','一棵权重 3 的生成树','没有任何可输出结果'],answer:0,explanation:'每个原始分量分别连接最优，总权 3。没有跨分量边，所以不存在全图生成树，但最小生成森林明确存在。'},{question:'三角形每边权 1，算法和 oracle 选择了不同两条边，应判定算法错误吗？',options:['应当，参考边集唯一','必须强制选编号最小的边才能最优','不应，检查无环连通且总权 2 即可'],answer:2,explanation:'存在三种最优树。动画可规定确定的平局顺序，但数学正确性不能要求与某个参考边集完全相同。'}],
  sources:[source('cp-algorithms · Kruskal with DSU','https://cp-algorithms.com/graph/mst_kruskal_with_dsu.html','核对排序边与并查集组合；本章将断连输入明确解释为最小生成森林。'),source('cp-algorithms · Kruskal','https://cp-algorithms.com/graph/mst_kruskal.html','核对最优性与选边交换证明。')],
  cpp:`#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
#include <tuple>
using namespace std;
struct DSU {
    vector<int> p, size;
    explicit DSU(int n) : p(n), size(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b); if (a == b) return false;
        if (size[a] < size[b] || (size[a] == size[b] && a > b)) swap(a, b);
        p[b] = a; size[a] += size[b]; return true;
    }
};
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; if (!(cin >> n >> m)) return 0;
    vector<tuple<long long, int, int, int>> edges;
    for (int i = 0; i < m; ++i) { int u, v; long long w; cin >> u >> v >> w; if (u > v) swap(u, v); edges.emplace_back(w, u, v, i); }
    sort(edges.begin(), edges.end()); DSU dsu(n); long long total = 0; // @init
    for (auto [w, u, v, index] : edges) {
        (void)index;
        if (dsu.find(u) == dsu.find(v)) continue; // @skip
        dsu.unite(u, v); total += w; // @join
    }
    vector<vector<int>> byRoot(n), components;
    for (int v = 0; v < n; ++v) byRoot[dsu.find(v)].push_back(v);
    for (auto &group : byRoot) if (!group.empty()) components.push_back(group);
    sort(components.begin(), components.end()); // @answer
    cout << total << ' ' << components.size() << '\\n';
    for (auto &group : components) { cout << group.size(); for (int v : group) cout << ' ' << v; cout << '\\n'; }
}
`,cppInput:x=>x.n+' '+x.edges.length+'\n'+x.edges.map(e=>e.join(' ')).join('\n')+'\n',cppOutput:out=>{const a=out.trim().split(/\s+/).map(Number);let p=0;const weight=a[p++],k=a[p++],components=[];for(let i=0;i<k;i++){const n=a[p++];components.push(a.slice(p,p+n));p+=n;}return {weight,components};},notes:[['init','排序比较权重，负权无需特殊处理。'],['skip','同一分量的边会成环，自环也在此被过滤。'],['answer','规范化分量后输出，不要求不唯一的选边结果相同。']],transfer:{contrast:'Dijkstra 选择最小暂定源点距离；Kruskal 选择最小边来连接分量。一个优化路径，一个优化连通网络总权，证明与前提都不同。',next:['dsu','scc'],challenge:'在等权三角形中列出所有 MST，再解释为什么一条边最轻并不意味着它必须出现在每棵 MST 中。'}
});

register({
  id:'scc',section:'graph',title:'强连通分量：Kosaraju',subtitle:'先记录完成次序，再反向搜索隔离互达的块',level:'进阶',tags:['SCC','Kosaraju','缩点','DFS'],prerequisites:['topological-sort'],
  summary:'把有向图划分为极大互相可达集合，并生成去重的缩点 DAG。通过原图退出顺序和反图搜索展示 Kosaraju；规范分量编号不依赖 DFS 偶然顺序。',
  lesson:{recognize:['问题中的“同一组”要求双向可达，不是只需单向到达，也不是忽略方向的连通。','有向图可能有环，先把每个强连通块压成一点，块之间自然形成 DAG。','SCC 只压缩可达结构，不会自动保留所有带权最优值；缩点后怎样合并点权或边权必须根据题意另证。'],derive:[
    {title:'暴力互达给出正确语义',text:'可先求所有点对可达性：u 与 v 同属一个 SCC 当且仅当 u 能到 v 且 v 能到 u。这是等价关系，因此形成唯一划分。Floyd 闭包 O(n³) 可作为小图 oracle，但大图应利用 DFS 结构。'},
    {title:'第一遍记录退出，而非进入',text:'在原图做完整 DFS 森林。对节点 u 扫描全部出边，只有未访问邻点才触发递归，并等待这些子调用返回；已访问点不再递归，回边可以指向仍在栈中的祖先。完成扫描后才把 u 加入 finish。若缩点图有边 C→D，则 C 的最大退出时间大于 D 的最大退出时间；先遇到 C 会遍历完 D 再退出，先遇到 D 则 D 先完成。'},
    {title:'第二遍为什么要反图',text:'把所有边反向，按 finish 的逆序选择未分配的点做 DFS。该点所在分量在剩余原缩点图中没有入边，因此在反图中没有通往其他未分配分量的出边；搜索恰好收集一个 SCC，不会越界。'},
    {title:'覆盖全部节点，包括孤点',text:'第一遍必须从每个尚未访问节点启动 DFS，不可只从 0 出发。第二遍每次收集一个分量并标记已分配，后续搜索忽略它们。自环不改变分量划分，平行边不改变可达性。'},
    {title:'规范缩点，避免编号偶然性',text:'将每个分量内部按顶点升序，再按分量最小顶点排序并编号。扫描原边，若两端属于不同分量则加入缩点边，去重并按编号排序。数学上的 SCC 划分唯一，但 DFS 发现编号不唯一，所以显示与测试采用这个稳定形式。'}
  ],invariant:{title:'第二遍的每次搜索恰好一个 SCC',text:'按原图退出时间递减处理反图时，从任一未分配起点出发，能且只能访问其整个强连通分量中的未分配点。',proof:['反转所有边保持“互相可达”关系：原来的两条反向可达路径反转后仍给出互达。','原缩点图是 DAG；若有块间有向环，环上的块本来就互达，应合并，矛盾。','原图边 C→D 蕴含 finishMax(C)>finishMax(D)，因此当前最大未处理分量是剩余缩点图的源之一。','在反图它是剩余图的汇，没有边可逃到其他未分配分量；内部强连通又保证遍历全块。删除该块后归纳重复。']},complexity:{time:'O(n+m) 求分量；规范输出排序另有 O(n log n + m log m)',space:'O(n+m)',conditions:'n 为顶点数，m 为有向输入边数。两遍 DFS 分别扫描原图与反图。教学 n≤12、m≤40；生产长链应改迭代 DFS 以防递归栈溢出。'},pitfalls:[
    {title:'把单向可达当成同一分量',text:'强连通要求两边都可达。',counterexample:'只有边 0→1，两点是两个 SCC，而不是一个；因为 1 不能回到 0。'},
    {title:'第一遍记进入顺序',text:'进入顺序没有“所有后继已完成”的结构，不能替代完成顺序。',counterexample:'边 0→1，若进入序列 [0,1] 逆序从 1 在反图搜索，会通过 1→0 把两个 SCC 错合并。'},
    {title:'第二遍忘记反向',text:'在原图从最大退出时间点搜索，可能沿出边跑进别的 SCC。',counterexample:'只有 0→1，第一遍退出顺序 [1,0]；若第二遍仍在原图从 0 搜索，会错误合并 0、1。'},
    {title:'把 DFS 编号当成数学唯一答案',text:'邻接顺序不同会改变分量发现顺序，但不改变分量集合。',counterexample:'两个孤点 0、1，先遍历哪个都合法；应比较 [[0],[1]] 的规范划分，而不是某次 DFS 给它们的临时标签。'}
  ],applications:['依赖系统中查找相互循环依赖的一组模块，再在缩点 DAG 上分析层次。','有向图可达性、2-SAT 等任务的基础结构；2-SAT 还需要文字与否定点的映射及满足性证明，不能仅凭会 SCC 就省略建图。']},
  input:{description:'{n,edges}：有向图 n=0..12、边≤40。支持环、自环、平行边、断连。返回 components 规范划分，以及去重排序的 condensation 边 [分量编号,分量编号]。',default:{n:8,edges:[[0,1],[1,2],[2,0],[2,3],[3,4],[4,3],[4,5],[5,6],[6,5],[6,7]]},presets:[{name:'单向不等于强连通',data:{n:2,edges:[[0,1]]}},{name:'自环和重边',data:{n:3,edges:[[0,0],[0,1],[0,1],[1,0],[1,2]]}},{name:'孤点各自成块',data:{n:3,edges:[]}},{name:'空图',data:{n:0,edges:[]}}],validate(x){graphInput(x);}},
  random(seed){const r=rng(seed),n=r(0,12),m=n?r(0,35):0;return {n,edges:nums(m).map(()=>[r(0,n-1),r(0,n-1)])};},
  run(x){const g=adjacency(x.n,x.edges,true),reversed=x.edges.map(([u,v])=>[v,u]),rev=adjacency(x.n,reversed,true),seen=Array(x.n).fill(false),finish=[],stack=[],frames=[],groups=[],assigned=Array(x.n).fill(-1);const firstVis=active=>({graph:graph(x.n,x.edges,true,active,finish),arrays:[arr('DFS 调用栈',stack),arr('退出顺序（完成后追加）',finish)],metrics:[{label:'已退出',value:finish.length}]});push(frames,'第一遍：在原图寻找完成顺序','从每个未访问顶点启动 DFS，确保覆盖断连部分。','init',firstVis([]));function dfs(u){seen[u]=true;stack.push(u);push(frames,'进入 '+u,'进入不等于完成。扫描所有出边，遇到未访问邻点才递归并等待返回；已访问邻点（含栈内祖先）不再递归。','enter',firstVis([u]));for(const [v]of g[u])if(!seen[v])dfs(v);stack.pop();finish.push(u);push(frames,'退出 '+u+'，追加 finish','出边已全部扫描，本次新触发的 DFS 子调用均已返回；已访问邻点可能仍在调用栈中。将本点追加后，完成顺序为 '+finish.join(', ')+'。','finish',firstVis([u]));}for(let u=0;u<x.n;u++)if(!seen[u])dfs(u);push(frames,'第二遍：反向所有边，逆完成顺序','反图搜索会把当前最高完成时间分量隔离出来，不会进入其他未分配分量。','reverse',{graph:graph(x.n,reversed,true),arrays:[arr('第二遍启动顺序',finish.slice().reverse())]});function dfs2(u,id){assigned[u]=id;groups[id].push(u);push(frames,'反图：把 '+u+' 归入临时分量 '+id,'当前分量内互相可达，沿反图只进入尚未分配的顶点。','collect',{graph:graph(x.n,reversed,true,[u],nums(x.n).filter(i=>assigned[i]>=0)),arrays:[arr('临时分量编号',assigned.map(v=>v<0?'—':v),[u])],tables:[table('已收集的块',['临时块','顶点'],groups.map((a,i)=>[i,a.join(', ')]))]});for(const [v]of rev[u])if(assigned[v]<0)dfs2(v,id);}for(let i=finish.length-1;i>=0;i--){const u=finish[i];if(assigned[u]<0){groups.push([]);dfs2(u,groups.length-1);}}const components=canonical(groups),id=Array(x.n);components.forEach((g,i)=>g.forEach(v=>id[v]=i));const pairs=new Set();for(const [u,v]of x.edges)if(id[u]!==id[v])pairs.add(id[u]+','+id[v]);const condensation=Array.from(pairs,s=>s.split(',').map(Number)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);push(frames,'规范分量，并构造缩点 DAG','内部升序、按最小顶点给分量编号；原边跨块才保留，重边去重。','answer',{graph:graph(components.length,condensation,true,[],nums(components.length),-1,components.map((g,i)=>'C'+i)),tables:[table('规范 SCC',['分量','原顶点'],components.map((g,i)=>[i,g.join(', ')]))],metrics:[{label:'强连通分量数',value:components.length}]});return {frames,result:{components,condensation}};},
  oracle(x){const reach=closure(x.n,x.edges,true),components=groupsFromReach(reach),id=Array(x.n);components.forEach((g,i)=>g.forEach(v=>id[v]=i));const seen=new Set(),condensation=[];for(const [u,v]of x.edges){const a=id[u],b=id[v],k=a+','+b;if(a!==b&&!seen.has(k)){seen.add(k);condensation.push([a,b]);}}condensation.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return {components,condensation};},
  exercises:[{question:'边 0→1、1→0、1→2 的规范 SCC 是？',options:['[[0,1,2]]','[[0,1],[2]]','[[0],[1],[2]]'],answer:1,explanation:'0、1 双向可达；2 没有返回 0 或 1 的路径。缩点后只有 C0→C1。'},{question:'为什么第一遍必须记录“退出”顺序，而不能只记首次发现顺序？',options:['因为退出顺序更容易排序','因为完成时间能反映 SCC 之间的依赖先后','因为进入顺序无法覆盖孤点'],answer:1,explanation:'退出时所有新触发的 DFS 子调用都已返回，但已访问邻点仍可能在栈中；结合 SCC 的互达结构可证明跨分量完成时间关系。只有进入顺序没有该保证，0→1 就可构成误合并反例。'},{question:'把每个 SCC 压成一点后，为什么一定没有有向环？',options:['因为我们手动删除了所有环边','若块间成环，这些块就互相可达，本来应属于同一个 SCC','因为原图必须无环'],answer:1,explanation:'SCC 是极大的互达集合。块间存在环意味着沿环能从每块到其他块并返回，违反它们原本分开的极大性。'}],
  sources:[source('cp-algorithms · Strongly Connected Components','https://cp-algorithms.com/graph/strongly-connected-components.html','核对 Kosaraju 完成时间性质、反图第二遍与缩点 DAG。')],
  cpp:`#include <iostream>
#include <vector>
#include <algorithm>
#include <set>
#include <utility>
using namespace std;
vector<vector<int>> g, reverseGraph;
vector<int> visited, order, temporary, group;
void dfs1(int u) {
    visited[u] = 1; // @enter
    for (int v : g[u]) if (!visited[v]) dfs1(v);
    order.push_back(u); // @finish
}
void dfs2(int u, int id) {
    temporary[u] = id; group.push_back(u); // @collect
    for (int v : reverseGraph[u]) if (temporary[v] == -1) dfs2(v, id);
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; if (!(cin >> n >> m)) return 0;
    g.resize(n); reverseGraph.resize(n); visited.assign(n, 0); temporary.assign(n, -1); // @init
    vector<pair<int, int>> edges;
    for (int i = 0; i < m; ++i) { int u, v; cin >> u >> v; g[u].push_back(v); reverseGraph[v].push_back(u); edges.push_back({u, v}); }
    for (int u = 0; u < n; ++u) if (!visited[u]) dfs1(u);
    reverse(order.begin(), order.end()); // @reverse
    vector<vector<int>> components;
    for (int u : order) if (temporary[u] == -1) {
        group.clear(); dfs2(u, static_cast<int>(components.size())); sort(group.begin(), group.end()); components.push_back(group);
    }
    sort(components.begin(), components.end()); vector<int> id(n); // @answer
    for (int c = 0; c < static_cast<int>(components.size()); ++c) for (int v : components[c]) id[v] = c;
    set<pair<int, int>> condensed;
    for (auto [u, v] : edges) if (id[u] != id[v]) condensed.insert({id[u], id[v]});
    cout << components.size() << '\\n';
    for (auto &c : components) { cout << c.size(); for (int v : c) cout << ' ' << v; cout << '\\n'; }
    cout << condensed.size() << '\\n';
    for (auto [u, v] : condensed) cout << u << ' ' << v << '\\n';
}
`,cppInput:x=>x.n+' '+x.edges.length+'\n'+x.edges.map(e=>e.join(' ')).join('\n')+'\n',cppOutput:out=>{const a=out.trim().split(/\s+/).map(Number);let p=0;const k=a[p++],components=[],condensation=[];for(let i=0;i<k;i++){const n=a[p++];components.push(a.slice(p,p+n));p+=n;}const m=a[p++];for(let i=0;i<m;i++)condensation.push([a[p++],a[p++]]);return {components,condensation};},notes:[['finish','退出后追加，不能换成刚进入节点时追加。'],['reverse','顺序反转与在反图搜索缺一不可。'],['answer','规范化只改变编号，不改变 SCC 划分；缩点边随后重新映射。']],transfer:{contrast:'拓扑排序要求原图无环；SCC 先把互达的环状区域压缩，再在块之间恢复 DAG 结构。但块内问题仍要根据题意解决。',next:['topological-sort','dsu'],challenge:'画出 0↔1、1→2、2↔3 的缩点图，并说明为什么使用无向 DSU 会错误地把四个点全合并。'}
});

register({
  id:'lca',section:'graph',title:'最近公共祖先：倍增',subtitle:'把父指针组合成 2^k 步跳跃，再同时逼近分叉点',level:'进阶',tags:['LCA','倍增','树上查询'],prerequisites:['bfs'],
  summary:'在指定根的静态无向树上批量查询最近公共祖先。逐格建立倍增祖先表，先对齐深度再从大步到小步同时上跳；不支持在有环图上凭空定义唯一祖先。',
  lesson:{recognize:['输入是固定根的树，每点到根有唯一父链；查询很多次，值得预处理祖先跳跃。','LCA 指两点共同祖先中深度最大的一个，祖先关系包含自己。','树根改变会改变 LCA；图有环、边动态修改或输入是森林时，需要额外建模，不适用本章原样代码。'],derive:[
    {title:'朴素爬父链的基线',text:'先计算 parent 与 depth。每次查询把更深的点上移到相同深度，再让两点一起逐父节点上移直到相等。单次最坏需要 O(n)，长链上大量查询容易超时，但这给出了独立验证方法。'},
    {title:'把重复两次变成一张跳跃表',text:'定义 up[v][k] 为 v 向上走 2^k 条边后的祖先。up[v][0]=parent[v]，up[v][k]=up[up[v][k−1]][k−1]。根的所有祖先约定为根自己，避免越过根产生非法下标。'},
    {title:'先消除深度差',text:'若 depth[u]>depth[v]，将差值写成二进制。对每个置位 k，让 u=up[u][k]，总共 O(log n) 次跳跃。深度一致后若 u=v，答案就是它，包括一个点本来是另一个祖先的情况。'},
    {title:'不越过 LCA 的同步跳跃',text:'若 u≠v，从最大 k 向下检查。只有 up[u][k]≠up[v][k] 时才同时跳：两者还在 LCA 的不同下方分支，安全且能靠近答案；若祖先已经相同，跳过去可能越过真正 LCA，应缩小步长。结束时它们不同但父亲相同，返回 parent[u]。'},
    {title:'倍增不仅用于 LCA',text:'同样的组合可求第 k 个祖先，或在跳跃表旁维护路径上的最大值、最小值等可结合信息。树上无权距离则由 depth[u]+depth[v]−2*depth[LCA] 得到，但带权距离需要根到点的权重前缀。'}
  ],invariant:{title:'同步跳跃始终保持在 LCA 下方',text:'深度对齐后，若 u≠v，则两点深度相同、真实 LCA 不变；每次仅在 2^k 级祖先不同的时候跳跃，保证不会跳到 LCA 或其上方。',proof:['对齐只移动较深点，不会越过另一点深度，而 LCA 深度不超过两点较浅者，因此 LCA 保持不变。','同深度两点若跳到 LCA 或更上方，对应祖先必相同；检查“祖先不同”保证两者仍严格位于 LCA 下方。','从大到小尝试所有二进制步长后，无法再各向上走 1 步而保持不同，即 parent[u]=parent[v]。','当前 u、v 仍不同，公共父亲正是最近的会合点，所以返回该父亲。若对齐后已相等则立即返回本身。']},complexity:{time:'预处理 O(n log n)，每次查询 O(log n)',space:'O(n log n)',conditions:'n 为树顶点数，q 次查询总时间 O((n+q)log n)（n=0/1 按常数处理）。教学 n≤12、q≤15；根自指，输入验证必须先确认是树。'},pitfalls:[
    {title:'没对齐深度就同步跳',text:'相同跳数不代表处于可比较的分支位置，祖先不同的判定将失去语义。',counterexample:'链 0−1−2，root=0，查询 (2,1)，答案为 1；应先把 2 提升到深度 1，而不是让两点同时移动。'},
    {title:'祖先相同就立刻大步跳过去',text:'相同的高层祖先可能位于真正 LCA 的上方。',counterexample:'root=0，0−1，1−2、1−3。2 与 3 的 2 步祖先都是 0，但最近公共祖先是 1，直接返回 0 错误。'},
    {title:'根父亲为 −1 却继续索引',text:'倍增递推会把 −1 当作数组下标；需严格判空或让根自指。',counterexample:'单点树 root=0，up[0][0]=−1 时再求 up[up[0][0]][0] 会越界；本章统一 up[root][k]=root。'},
    {title:'忽略根改变答案',text:'最近公共祖先不是无根树的固有二元函数。',counterexample:'链 0−1−2，查询 (0,2)。root=0 时答案 0，root=1 时答案 1，root=2 时答案 2。'}
  ],applications:['树上两点距离与路径分解：LCA 把路径拆成两条向上的父链。','大量静态祖先/跳跃查询：倍增支持快速前进 2^k 步，并可附带可结合的路径统计信息。']},
  input:{description:'{n,edges,root,queries}：n=0..12，edges 为无向树，queries 最多15个 [u,v]。非空树必须连通且无重边/自环；空树只接受 root=0 且 queries=[]。',default:{n:9,edges:[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[4,7],[4,8]],root:0,queries:[[7,8],[3,7],[5,8],[4,7],[6,6]]},presets:[{name:'根改变 LCA',data:{n:3,edges:[[0,1],[1,2]],root:1,queries:[[0,2],[1,2],[0,0]]}},{name:'单点树',data:{n:1,edges:[],root:0,queries:[[0,0]]}},{name:'空树',data:{n:0,edges:[],root:0,queries:[]}}],validate(x){object(x);treeInput(x.n,x.edges);integer(x.root,0,Math.max(0,x.n-1),'root');list(x.queries,15,'queries');if(x.n===0&&x.queries.length)fail('空树没有可查询的顶点，queries 必须为空数组。');for(const q of x.queries){if(!Array.isArray(q)||q.length!==2)fail('每个查询必须是 [u,v]。');integer(q[0],0,x.n-1,'查询顶点');integer(q[1],0,x.n-1,'查询顶点');}}},
  random(seed){const r=rng(seed),n=r(0,12);return {n,edges:nums(Math.max(0,n-1)).map(i=>[i+1,r(0,i)]),root:n?r(0,n-1):0,queries:n?nums(r(0,12)).map(()=>[r(0,n-1),r(0,n-1)]):[]};},
  run(x){const n=x.n,g=adjacency(n,x.edges),layout=treeLayout(n,x.edges,x.root),depth=Array(n).fill(-1),parent=Array(n).fill(-1),frames=[],answers=[];let L=1;while(2**L<=Math.max(1,n))L++;const up=nums(n).map(()=>Array(L).fill(-1)),q=[];if(n){depth[x.root]=0;parent[x.root]=x.root;up[x.root][0]=x.root;q.push(x.root);}const vis=(active=[],cells=[])=>({graph:place(graph(n,x.edges,false,active,[], -1,nums(n).map(i=>i===x.root?i+' 根':String(i))),layout),tables:[table('倍增表 up[v][k]：向上 2^k 步',['v','depth',...nums(L).map(k=>'2^'+k)],up.map((row,i)=>[i,depth[i],...row.map(v=>v<0?'—':v)]),active,cells)],arrays:[arr('已有查询答案',answers)]});push(frames,n?'指定根 '+x.root+'，根的父亲是自己':'空树：没有祖先可预处理',n?'先遍历树建立 depth 与一层父亲，再逐层组合更远祖先。':'root=0 只是空输入占位；没有顶点，queries 必须为空，答案也为空。','init',vis(n?[x.root]:[]));for(let h=0;h<q.length;h++){const u=q[h];for(const [v]of g[u])if(depth[v]<0){depth[v]=depth[u]+1;parent[v]=u;up[v][0]=u;q.push(v);push(frames,'发现 '+v+' 的父亲 '+u,'depth['+v+']='+depth[v]+'，up['+v+'][0]='+u+'。','parent',vis([u,v],[[v,2]]));}}for(let k=1;k<L;k++)for(let v=0;v<n;v++){up[v][k]=up[up[v][k-1]][k-1];push(frames,'建立 up['+v+']['+k+']='+up[v][k],'先上跳 '+2**(k-1)+' 步到 '+up[v][k-1]+'，再上跳同样步数，共 '+2**k+' 步。','build',vis([v,up[v][k]],[[v,k+2],[up[v][k-1],k+1]]));}for(const query of x.queries){let [u,v]=query;if(depth[u]<depth[v])[u,v]=[v,u];push(frames,'查询 LCA('+query[0]+','+query[1]+')','先把较深点记为 u='+u+'，另一个为 v='+v+'，深度差 '+(depth[u]-depth[v])+'。','query',vis([u,v]));const diff=depth[u]-depth[v];for(let k=L-1;k>=0;k--)if(diff>>k&1){const old=u;u=up[u][k];push(frames,'对齐：'+old+' 上跳 '+2**k+' 步到 '+u,'深度差的第 '+k+' 位为 1，因此使用对应跳跃。','align',vis([u,v],[[old,k+2]]));}if(u!==v){for(let k=L-1;k>=0;k--){if(up[u][k]!==up[v][k]){const a=u,b=v;u=up[u][k];v=up[v][k];push(frames,'同步上跳 '+2**k+' 步','两个 '+2**k+' 步祖先不同，说明仍在 LCA 下方，可安全从 ('+a+','+b+') 移到 ('+u+','+v+')。','jump',vis([u,v],[[a,k+2],[b,k+2]]));}else push(frames,'不跳 '+2**k+' 步：会相遇或越过 LCA','两者该级祖先都为 '+up[u][k]+'，不能据此直接认定它就是最近者；继续减小步长。','check',vis([u,v],[[u,k+2],[v,k+2]]));}u=parent[u];}answers.push(u);push(frames,'本次答案：'+u,'对齐后重合则该点就是答案；否则最后停在不同的两个点，其共同父亲就是 LCA。','record',vis([u]));}push(frames,'全部查询完成','预处理可复用于同一棵树、同一个根的后续查询；修改树或根后需重新处理。','answer',vis());return {frames,result:{answers}};},
  oracle(x){if(!x.n)return {answers:[]};const g=adjacency(x.n,x.edges),p=Array(x.n).fill(-1),q=[x.root];p[x.root]=x.root;for(let h=0;h<q.length;h++)for(const [v]of g[q[h]])if(p[v]<0){p[v]=q[h];q.push(v);}const answers=x.queries.map(([u,v])=>{const anc=new Set();for(;;){anc.add(u);if(p[u]===u)break;u=p[u];}while(!anc.has(v))v=p[v];return v;});return {answers};},
  exercises:[{question:'root=0，边 0−1、1−2、1−3，LCA(2,3) 是？',options:['0','1','2'],answer:1,explanation:'两点最近在 1 会合。2 步祖先同为 0 并不表示 0 最近，倍增应避免过早越过 1。'},{question:'查询同一个点 LCA(u,u)，结果是什么？',options:['u 本身','u 的父亲','根'],answer:0,explanation:'祖先关系包含自己。对齐深度后两点已经相等，应直接返回 u。'},{question:'已知 depth[7]=4、depth[8]=5、depth[LCA]=2，无权距离是多少？',options:['7','5','9'],answer:1,explanation:'路径从 7 上行 4−2=2 条边，再下行到 8 共 5−2=3 条边，总共 5。'}],
  sources:[source('cp-algorithms · LCA Binary Lifting','https://cp-algorithms.com/graph/lca_binary_lifting.html','核对 2^k 祖先递推、预处理与查询复杂度。本章使用先对齐深度的等价查询形式。')],
  cpp:`#include <iostream>
#include <vector>
#include <queue>
#include <algorithm>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, root, queryCount; if (!(cin >> n >> root >> queryCount)) return 0;
    vector<vector<int>> g(n);
    for (int i = 1; i < n; ++i) { int u, v; cin >> u >> v; g[u].push_back(v); g[v].push_back(u); }
    int levels = 1; while ((1 << levels) <= max(1, n)) ++levels;
    vector<vector<int>> up(n, vector<int>(levels, 0)); vector<int> depth(n, -1); // @init
    queue<int> q;
    if (n) { depth[root] = 0; up[root][0] = root; q.push(root); }
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u]) if (depth[v] < 0) {
            depth[v] = depth[u] + 1; up[v][0] = u; q.push(v); // @parent
        }
    }
    for (int k = 1; k < levels; ++k) for (int v = 0; v < n; ++v) up[v][k] = up[up[v][k - 1]][k - 1]; // @build
    for (int i = 0; i < queryCount; ++i) {
        int u, v; cin >> u >> v; // @query
        if (depth[u] < depth[v]) swap(u, v);
        int difference = depth[u] - depth[v];
        for (int k = levels - 1; k >= 0; --k) if (difference & (1 << k)) u = up[u][k]; // @align
        if (u != v) {
            for (int k = levels - 1; k >= 0; --k) {
                if (up[u][k] != up[v][k]) { // @check
                    u = up[u][k]; v = up[v][k]; // @jump
                }
            }
            u = up[u][0];
        }
        cout << u << ' '; // @record
    }
    cout << '\\n'; // @answer
}
`,cppInput:x=>x.n+' '+x.root+' '+x.queries.length+'\n'+x.edges.map(e=>e.join(' ')).join('\n')+'\n'+x.queries.map(q=>q.join(' ')).join('\n')+'\n',cppOutput:out=>({answers:out.trim()?out.trim().split(/\s+/).map(Number):[]}),notes:[['build','两次 2^(k−1) 跳跃组成 2^k，前一列必须先算完。'],['align','先对齐深度，保持真实 LCA 不变。'],['check','祖先不同才跳，祖先相同则缩小步长。']],transfer:{contrast:'树形 DP 从孩子向父亲汇总答案；倍增把父指针自身做动态规划，之后快速回答路径结构查询。根与树结构都是预处理的一部分。',next:['tree-dp','scc'],challenge:'用同一个倍增表实现“第 k 个祖先”，并明确 k 超过深度时返回根还是无解；两种语义不能混用。'}
});

register({
  id:'dsu',section:'structures',title:'并查集：合并与连通性',subtitle:'代表元只代表集合，压缩路径不改变成员关系',level:'核心',tags:['DSU','路径压缩','按大小合并','摊还分析'],prerequisites:['complexity'],
  summary:'在线执行集合合并与两点是否连通的查询。真实展示父指针、按大小合并、路径压缩与规范分量；不把 DSU 当作支持删边或有向可达性的万能结构。',
  lesson:{recognize:['需要不断合并两个等价类，并判断两个元素是否属于同一个类。','无向图只有加边时，加入 u−v 等价于 union(u,v)，连通性就是 find(u)==find(v)。','普通 DSU 不支持拆分集合、在线删边、有向单向可达或直接输出真实图路径；这些任务需要额外结构或离线方法。'],derive:[
    {title:'朴素维护整组标签',text:'给每个元素一个集合编号。查询只比标签，但合并时要扫描所有元素，把一个组的标签改成另一个，单次 O(n)。如果频繁合并，可以用父指针森林把“谁属于哪个组”的更新集中到根上。'},
    {title:'用根作为代表元',text:'parent[x]=x 的节点是根，find(x) 沿父指针走到根。合并只需将一个根的父指针改为另一个根。代表元的编号没有业务含义，不能认为总是最小元素，也不能把 parent[x] 直接当作集合代表。'},
    {title:'按大小合并避免链变长',text:'始终让较小树的根挂到较大树根下。任一元素深度增加时，它所属集合大小至少翻倍，因此没有路径压缩时树高也不超过 O(log n)。本章平局时选较小根仅为确定显示，不是正确性条件。'},
    {title:'路径压缩让以后更快',text:'find 找到根后，把沿途节点直接接到根。这只缩短代表路径，不改变集合成员。与按大小合并一起，m 次操作摊还为 O(m α(n))，α 是增长极慢的反 Ackermann 函数；这不是说每一次操作严格 O(1)。'},
    {title:'集合结果与内部树形分开',text:'不同合并顺序会产生不同 parent 森林，但只要集合划分一样，就表示相同连通关系。最终输出各组成员升序、组按最小成员升序，避免把合法的不同代表元误判。可视化中的父边是数据结构指针，不是用户输入图中的原始边。'}
  ],invariant:{title:'根相同当且仅当属于同一集合',text:'parent 指针始终形成若干棵有根树；每个根存储其整个集合大小，find 返回该树根。',proof:['初始每点自己为根，集合为单点，size=1，成立。','union 先找两个根，若相同则集合已经一致，不改成员关系也不应累加大小。','不同根合并时只增加一条根到根指针，不可能形成环；新根的大小等于两组大小之和。','路径压缩把某点改接到同树的根，仍属于相同集合且没有产生跨组边，因此 find 等价关系不变。']},complexity:{time:'初始化 O(n)，m 次操作摊还 O(m α(n))',space:'O(n)',conditions:'同时使用按大小合并和路径压缩；单次操作不保证 O(1)。教学 n≤12、操作≤24。最终规范分组排序额外 O(n log n)。'},pitfalls:[
    {title:'直接比较 parent[u] 与 parent[v]',text:'非根节点的父亲可能还没压缩，两点在同一棵树却有不同直接父亲。',counterexample:'parent=[0,0,0,2] 时 1 与 3 同组，直接父亲分别 0 与 2；find 都返回 0。'},
    {title:'重复 union 还累加大小',text:'必须先判断两个根是否相同，否则重复边会虚增集合大小。',counterexample:'n=2，连续 union(0,1) 两次，集合大小始终 2，不是 4。'},
    {title:'把父指针当原图真实路径',text:'路径压缩产生的边只是代表关系，原图中可能不存在。',counterexample:'原图只有 0−1、1−2，压缩后 parent[2]=0，并不表示原图有边 2−0。'},
    {title:'普通 DSU 直接处理删边',text:'合并会丢弃原来的内部划分信息，删掉一条边后不能仅把某个 parent 拆开。',counterexample:'三角形 0−1−2−0 中删去 0−1 后仍连通；若把 parent[1] 设回自己就会错误拆分。'}
  ],applications:['只有加边的无向图连通性、朋友圈合并、等价关系维护。','Kruskal 最小生成森林：判断候选边是否连接不同分量；DSU 处理连通性，最优性由割性质另行证明。']},
  input:{description:'{n,operations}：n=0..12，最多24个操作，每个为 ["union",u,v] 或 ["same",u,v]。返回所有 same 的布尔结果与规范分量。空集合只允许空操作。',default:{n:7,operations:[['union',0,1],['union',2,3],['union',0,2],['same',1,3],['same',0,4],['union',4,5],['union',3,5],['same',0,5]]},presets:[{name:'查询触发路径压缩',data:{n:4,operations:[['union',0,1],['union',2,3],['union',0,2],['same',1,3]]}},{name:'重复合并与自己查询',data:{n:3,operations:[['union',0,1],['union',0,1],['same',2,2],['same',0,2]]}},{name:'空集合',data:{n:0,operations:[]}}],validate(x){object(x);integer(x.n,0,12,'n');list(x.operations,24,'operations');if(x.n===0&&x.operations.length)fail('空集合没有可操作的顶点，operations 必须为空数组。');for(const op of x.operations){if(!Array.isArray(op)||op.length!==3||!['union','same'].includes(op[0]))fail('操作必须是 ["union",u,v] 或 ["same",u,v]。');integer(op[1],0,x.n-1,'操作顶点');integer(op[2],0,x.n-1,'操作顶点');}}},
  random(seed){const r=rng(seed),n=r(0,12),m=n?r(0,24):0;return {n,operations:nums(m).map(()=>[r(0,1)?'union':'same',r(0,n-1),r(0,n-1)])};},
  run(x){const parent=nums(x.n),size=Array(x.n).fill(1),answers=[],frames=[];let operation=0;const vis=(active=[])=>({graph:graph(x.n,nums(x.n).filter(i=>parent[i]!==i).map(i=>[i,parent[i]]),true,active,nums(x.n).filter(i=>parent[i]===i)),arrays:[arr('parent 指针（不是原图边）',parent,active),arr('根的集合大小（非根无效）',size.map((v,i)=>parent[i]===i?v:'—')),arr('same 查询结果',answers)],metrics:[{label:'当前操作',value:operation},{label:'分量数',value:parent.filter((p,i)=>p===i).length}]});function find(u,trace=true){const path=[];let v=u;while(parent[v]!==v){path.push(v);if(trace)push(frames,'find('+u+') 沿 '+v+'→'+parent[v],'直接父亲不一定是代表元，继续向根走。','find',vis([v,parent[v]]));v=parent[v];}for(let i=path.length-1;i>=0;i--){const node=path[i],old=parent[node];parent[node]=v;if(trace&&old!==v)push(frames,'路径压缩：'+node+' 直接指向 '+v,'原父亲是 '+old+'，新父亲是同一集合的根 '+v+'；成员关系不变，未来查找更短。','compress',vis([node,v]));}return v;}push(frames,'每个元素最初单独成组','parent[i]=i，size[i]=1。父指针构成森林，而不是原图路径。','init',vis());for(const op of x.operations){operation++;let a=find(op[1]),b=find(op[2]);if(op[0]==='same'){const same=a===b;answers.push(same);push(frames,'same('+op[1]+','+op[2]+') = '+same,'两个根分别为 '+a+' 和 '+b+'，'+(same?'属于同一个集合。':'属于不同集合。'),'query',vis([op[1],op[2],a,b]));}else if(a===b)push(frames,'重复合并，无需改变','union('+op[1]+','+op[2]+') 的两端根同为 '+a+'，不能重复累加 size。','skip',vis([a]));else{if(size[a]<size[b]||(size[a]===size[b]&&a>b))[a,b]=[b,a];parent[b]=a;size[a]+=size[b];push(frames,'将根 '+b+' 接到根 '+a,'较小集合挂到较大集合，新根大小为 '+size[a]+'。平局用较小根仅为稳定展示。','union',vis([a,b]));}}const map=new Map();nums(x.n).forEach(i=>{const r=find(i,false);if(!map.has(r))map.set(r,[]);map.get(r).push(i);});const components=canonical(Array.from(map.values()));push(frames,'规范分组完成','为枚举分组对每点执行 find，可能进一步压平父链；输出按成员排序，不依赖根编号。','answer',Object.assign(vis(),{tables:[table('规范集合',['集合','成员'],components.map((g,i)=>[i,g.join(', ')]))]}));return {frames,result:{answers,components}};},
  oracle(x){const g=nums(x.n).map(()=>[]),answers=[];function reachable(start){const seen=new Set([start]),q=[start];for(let h=0;h<q.length;h++)for(const v of g[q[h]])if(!seen.has(v)){seen.add(v);q.push(v);}return seen;}for(const [op,u,v]of x.operations)if(op==='union'){g[u].push(v);g[v].push(u);}else answers.push(reachable(u).has(v));const used=new Set(),components=[];for(let i=0;i<x.n;i++)if(!used.has(i)){const group=Array.from(reachable(i)).sort((a,b)=>a-b);group.forEach(v=>used.add(v));components.push(group);}return {answers,components};},
  exercises:[{question:'parent=[0,0,0,2]，1 与 3 是否在同一集合？',options:['是，find 都得到 0','否，直接父亲不同','无法判断，必须有原图'],answer:0,explanation:'1→0，3→2→0，最终根一致。DSU 查询应比较 find，而不是直接 parent。'},{question:'连续两次 union(0,1)，size 应如何变化？',options:['先变 2，再变 4','第一次合并变 2，第二次同根不改变','每次都重置为 1'],answer:1,explanation:'第二次 find 的两个根已相同，没有新增任何成员；重复合并必须立即返回。'},{question:'路径压缩后出现 parent[2]=0，能说明原图有边 2−0 吗？',options:['能，parent 就是原图边','不能，它只是同一集合的代表指针','只有 size[0]>2 时能'],answer:1,explanation:'原图可能仅有 2−1−0。压缩把代表路径缩短，不创建真实图边，也不保存真实最短路径。'}],
  sources:[source('cp-algorithms · Disjoint Set Union','https://cp-algorithms.com/data_structures/disjoint_set_union.html','核对路径压缩、按大小/秩合并、摊还复杂度与应用边界。')],
  cpp:`#include <iostream>
#include <vector>
#include <string>
#include <numeric>
#include <algorithm>
using namespace std;
struct DSU {
    vector<int> parent, size;
    explicit DSU(int n) : parent(n), size(n, 1) { iota(parent.begin(), parent.end(), 0); } // @init
    int find(int x) {
        if (parent[x] == x) return x; // @find
        return parent[x] = find(parent[x]); // @compress
    }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return; // @skip
        if (size[a] < size[b] || (size[a] == size[b] && a > b)) swap(a, b);
        parent[b] = a; size[a] += size[b]; // @union
    }
};
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; if (!(cin >> n >> m)) return 0;
    DSU dsu(n); vector<int> answers;
    for (int i = 0; i < m; ++i) {
        string op; int u, v; cin >> op >> u >> v;
        if (op == "union") dsu.unite(u, v);
        else answers.push_back(dsu.find(u) == dsu.find(v)); // @query
    }
    vector<vector<int>> byRoot(n), components;
    for (int v = 0; v < n; ++v) byRoot[dsu.find(v)].push_back(v);
    for (auto &g : byRoot) if (!g.empty()) components.push_back(g);
    sort(components.begin(), components.end()); // @answer
    cout << answers.size(); for (int value : answers) cout << ' ' << value; cout << '\\n';
    cout << components.size() << '\\n';
    for (auto &g : components) { cout << g.size(); for (int v : g) cout << ' ' << v; cout << '\\n'; }
}
`,cppInput:x=>x.n+' '+x.operations.length+'\n'+x.operations.map(op=>op.join(' ')).join('\n')+'\n',cppOutput:out=>{const a=out.trim().split(/\s+/).map(Number);let p=0;const q=a[p++],answers=a.slice(p,p+q).map(Boolean);p+=q;const k=a[p++],components=[];for(let i=0;i<k;i++){const n=a[p++];components.push(a.slice(p,p+n));p+=n;}return {answers,components};},notes:[['compress','递归返回根时，把沿途指针改成直接指根。'],['skip','同根时不改变 parent，也不重复累加 size。'],['union','只把根挂到根，且小集合挂到大集合。']],transfer:{contrast:'DSU 合并的是无向连通/等价关系；SCC 需要双向有向可达，不能把每条有向边直接 union。Kruskal 则只借用 DSU 的连通判定。',next:['mst','scc'],challenge:'用三角形说明为什么在线删边不能直接撤销一次 union；再思考离线倒序加边如何避开这一困难。'}
});
})();
