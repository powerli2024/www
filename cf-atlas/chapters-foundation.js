/* 基础与数论：所有动画状态由算法真实执行生成。 */
(function () {
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const loc=(code,s)=>code.split('\n').findIndex(x=>x.includes(s))+1;
  const rng=seed=>{let s=seed>>>0;return (lo,hi)=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return lo+s%(hi-lo+1);};};
  function obj(v){if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('请输入 JSON 对象。');}
  function integer(v,name,lo,hi){if(!Number.isSafeInteger(v)||v<lo||v>hi)throw new Error(name+' 必须是 '+lo+' 到 '+hi+' 的整数。');}
  function array(v,name,max,lo,hi){if(!Array.isArray(v)||v.length>max)throw new Error(name+' 必须是长度不超过 '+max+' 的数组（允许空数组）。');v.forEach(x=>integer(x,name+' 中的元素',lo,hi));}
  function checkA(d,max){obj(d);array(d.a,'a',max,-1000,1000);}
  const nums=s=>s.trim()?s.trim().split(/\s+/).map(Number):[];
  function mergesOracle(a){if(a.length<2)return {a:a.slice(),inv:0};const m=a.length>>1,L=mergesOracle(a.slice(0,m)),R=mergesOracle(a.slice(m));let i=0,j=0,inv=L.inv+R.inv,out=[];while(i<L.a.length||j<R.a.length){if(j===R.a.length||(i<L.a.length&&L.a[i]<=R.a[j]))out.push(L.a[i++]);else{out.push(R.a[j++]);inv+=L.a.length-i;}}return {a:out,inv};}

  const bruteCpp=`#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n; cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    long long inversions = 0, comparisons = 0;
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            ++comparisons;
            if (a[i] > a[j]) ++inversions;
        }
    }
    cout << inversions << ' ' << comparisons << '\\n';
}`;
  CF.register({
    id:'complexity',section:'foundation',title:'枚举、模拟与复杂度',subtitle:'先把所有可能数清楚，再谈如何更快。',level:'基础',tags:['暴力','枚举','模拟','复杂度','逆序对','long long','数据表示'],prerequisites:[],
    summary:'用逆序对这个小问题，走完定义答案、无重无漏枚举、统计工作量、选择整数类型的完整过程。慢算法不是废稿，它也是之后所有优化的校验器。',
    lesson:{
      recognize:['输入规模很小、所有候选可以列出时，完整枚举通常最稳妥。这里候选是下标对 (i,j)，且 i < j。','“模拟”要求忠实实现规则；“枚举”要求覆盖所有候选。先把合法状态和答案定义说清，比套复杂度公式更重要。','看到 n ≤ 2×10⁵ 时，约 2×10¹⁰ 对候选已提示本章 O(n²) 解法不合适；不要把某台机器每秒多少操作当作通用保证。'],
      derive:[
        {title:'01 · 先定义对象，不先写循环',text:'给定数组 a，逆序对是满足 0 ≤ i < j < n 且 a[i] > a[j] 的下标对。相同值不算逆序；两个值相同但下标不同仍然是不同元素。比如 [3,1,2] 有 (0,1)、(0,2) 两对。'},
        {title:'02 · 用一个顺序消除重复',text:'如果 i 和 j 都遍历整个数组，一对元素会被看两遍，还会遇到 i = j。固定左下标 i，只让 j 从 i+1 开始，恰好把每个合法下标对覆盖一次。此时只需检查一次大小关系。'},
        {title:'03 · 数次数，而不是数循环层',text:'内层依次执行 n−1、n−2、…、0 次，总和是 n(n−1)/2。这是 Θ(n²)，不是因为“有两个 for”就下结论。后面的双指针和单调栈也可能写嵌套循环，却只做 O(n) 次关键移动。'},
        {title:'04 · 从瓶颈走向可复用结构',text:'瓶颈是逐对比较。若左右两半各自有序，当右元素小于左侧最小剩余元素时，就能一次确定它与整段左元素构成逆序。下一章归并排序正是把“一个一个数”改成“整块数”。'},
        {title:'05 · 数据表示属于算法的一部分',text:'n=100000 的严格降序数组有 4,999,950,000 对，超过 32 位有符号整数上限。C++ 计数用 long long；写公式也应先提升类型，例如 1LL*n*(n-1)/2。动画只允许小数组是为可读性，不是说生产算法只能处理这些数。'}
      ],
      invariant:{title:'已处理的候选，恰好贡献一次',text:'开始检查 (i,j) 前，计数器等于所有字典序早于 (i,j) 的合法下标对中逆序对的数量。',proof:['初始化时还没有候选，计数为 0，命题成立。','每步只检查一个此前没处理的合法下标对，满足 a[i]>a[j] 才加 1，因此既不漏计也不重复。','双重循环结束时所有 i<j 都被处理，计数就是定义中的答案。这个证明不依赖数组是否有重复、负数或已经有序。']},
      complexity:{time:'Θ(n²)，精确进行 n(n−1)/2 次大小比较；读入 O(n)。',space:'算法辅助空间 O(1)，存输入数组 O(n)。动画历史另行保存，不计入模板复杂度。',conditions:'n 是数组长度；比较和 long long 加法按机器字 O(1) 计。空数组和单元素数组都输出 0。'},
      pitfalls:[
        {title:'值相等不等于逆序',text:'判断必须是严格大于，不能写成大于等于。',counterexample:'[2,2] 的答案是 0，不是 1。'},
        {title:'枚举所有方向会重复',text:'i<j 是问题定义，不是可以省去的小优化。',counterexample:'[2,1] 只有下标对 (0,1)；枚举 (1,0) 不属于同一问题的合法候选。'},
        {title:'换了类型也可能先溢出',text:'long long ans = n*(n-1)/2 里右侧可能先按 int 计算；把 1LL 放进乘法。',counterexample:'n=100000，n*(n-1) 约 10¹⁰，已超出 int。'},
        {title:'大 O 不提供运行秒数',text:'同是 O(n²)，比较整数和复制长字符串的成本不同；总输入规模也要累计。',counterexample:'10000 组长度 1000 的输入，不能只按单组约 5×10⁵ 次比较估算。'}
      ],
      applications:['用小规模枚举写可靠 oracle，给贪心、DP、数据结构做可复现对拍。','按题目数据范围筛选候选复杂度，再考虑常数、内存与总测试规模。']
    },
    input:{description:'a：长度 0–12 的整数数组，元素在 −1000 到 1000。每一步检查一个 i<j。',default:{a:[4,1,3,2,2]},presets:[{name:'重复值也有不同下标',data:{a:[4,1,3,2,2]}},{name:'已经有序',data:{a:[1,2,3,4]}},{name:'严格降序',data:{a:[5,4,3,2,1]}},{name:'全相等',data:{a:[2,2,2]}},{name:'空数组',data:{a:[]}}],validate:d=>checkA(d,12)},
    random(seed){const r=rng(seed);return {a:Array.from({length:r(0,10)},()=>r(-5,5))};},
    run(d){const a=d.a.slice(),frames=[];let inversions=0,comparisons=0;const push=(title,explanation,lines,active=[],marks={})=>frames.push({title,explanation,lines,arrays:[{label:'原数组 a',values:a.slice(),active,marks}],metrics:[{label:'逆序对',value:inversions},{label:'已比较',value:comparisons},{label:'总候选',value:a.length*(a.length-1)/2}]});push('先明确候选空间','只检查 i<j 的下标对。每对只会出现一次。',[loc(bruteCpp,'long long inversions')]);for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){comparisons++;const yes=a[i]>a[j];if(yes)inversions++;push(yes?'发现一个逆序对':'这一对不逆序',`检查 (${i},${j})：${a[i]} ${yes?'>':'≤'} ${a[j]}，${yes?'答案加一':'计数不变'}。`,[loc(bruteCpp,'++comparisons'),loc(bruteCpp,'if (a[i] >')],[i,j],{[i]:'i',[j]:'j'});}push('所有候选已检查',`共 ${comparisons} 次比较，找到 ${inversions} 个逆序对。`,[loc(bruteCpp,'cout <<')]);return {frames,result:{inversions,comparisons}};},
    oracle(d){return {inversions:mergesOracle(d.a).inv,comparisons:d.a.length*(d.a.length-1)/2};},cpp:bruteCpp,cppInput:d=>d.a.length+'\n'+d.a.join(' ')+'\n',cppOutput:s=>{const x=nums(s);return {inversions:x[0],comparisons:x[1]};},
    exercises:[{question:'[3,1,2,1] 有多少个逆序对？',options:['3','4','5','6'],answer:1,explanation:'3 与后面的 1、2、1 构成三对；2 与最后的 1 构成一对，共 4。相等的两个 1 不算。'},{question:'两个嵌套循环一定需要 Θ(n²) 的工作量吗？',options:['一定，循环层数决定指数','不一定，要统计总迭代次数','只要有 break 就是 O(n)','只对排序算法不成立'],answer:1,explanation:'例如内层指针全程只向右移动 n 次，总成本可为 O(n)。从操作次数推导，不从代码外观猜。'},{question:'计数上限为 n(n−1)/2，n=100000，C++ 哪种写法可靠？',options:['int ans = n*(n-1)/2;','long long ans = n*(n-1)/2;','long long ans = 1LL*n*(n-1)/2;','float ans = n*(n-1)/2;'],answer:2,explanation:'乘法开始前提升到 long long，避免先用 int 计算溢出。把已溢出的 int 再存进 long long 无法补救。'}],
    sources:[{title:'USACO Guide · Time Complexity',url:'https://usaco.guide/bronze/time-comp',note:'工作量、数量级与常数因素；本章逆序对示例和证明为原创推导。'}],
    transfer:{contrast:'暴力枚举给出最直接的正确性依据；归并排序利用有序性，一次统计整段贡献。',next:['merge-sort','backtracking','prefix-sum'],challenge:'先保留此章的慢解，再为你自己的优化程序随机生成小数组。'}
  });

  const mergeCpp=`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int main() {
    int n; cin >> n;
    vector<long long> a(n), tmp(n);
    for (auto &x : a) cin >> x;
    long long inversions = 0;
    for (int width = 1; width < n; width *= 2) {
        for (int l = 0; l < n; l += 2 * width) {
            int m = min(l + width, n), r = min(l + 2 * width, n);
            int i = l, j = m, k = l;
            while (i < m || j < r) {
                if (j == r || (i < m && a[i] <= a[j])) {
                    tmp[k++] = a[i++];
                } else {
                    inversions += m - i;
                    tmp[k++] = a[j++];
                }
            }
            for (int p = l; p < r; ++p) a[p] = tmp[p];
        }
    }
    cout << inversions << '\\n';
    for (int i = 0; i < n; ++i) cout << a[i] << (i + 1 == n ? '\\n' : ' ');
}`;
  CF.register({
    id:'merge-sort',section:'foundation',title:'归并排序与分治',subtitle:'先让两半有序，再一次看懂一整段。',level:'基础',tags:['排序','分治','递归','归并','逆序对','稳定性','merge sort'],prerequisites:['complexity'],
    summary:'排序不是黑盒。把两个有序序列合成一个，顺手在 O(n log n) 时间数出逆序对；同一个不变量解释两个结果。',
    lesson:{recognize:['需要可靠的 O(n log n) 排序，或答案可以拆成左半、右半和跨越两半的贡献。','“跨段逆序对”具有批量计数性质：右元素比左侧当前最小值还小，就小于左侧所有剩余值。','本章实现自底向上归并，避免递归栈；递归分治与它共享合并原理，但非2幂长度时区间划分不必相同。它不是原地 O(1) 空间排序。'],derive:[
      {title:'01 · 排序让“剩余部分”有了意义',text:'假设左半 [l,m) 和右半 [m,r) 已有序。下一项只能是两半当前首项中较小者，因为每半的其余元素都不会更小。两个游标 i、j 因而足够描述剩余问题。'},
      {title:'02 · 每次拿走一个最小项',text:'把较小值写入临时数组 tmp，移动相应游标。相等时优先取左侧：这保留原相对顺序，得到稳定排序，也避免把相等误计为逆序。任意一半耗尽后，直接取另一半的剩余元素。'},
      {title:'03 · 一次统计 m−i 个逆序',text:'只有 a[i] > a[j] 且右侧元素被取出时，左侧 a[i…m) 每个元素才都大于 a[j]，贡献恰为 m−i。左右内部的逆序已在此前归并中统计，跨段贡献与内部贡献互不重叠。'},
      {title:'04 · 从长度 1 的有序块起步',text:'每个单元素块天然有序。先合并长度 1 的块，再合并长度 2、4、8…的块。每一层所有区间不重叠，总共处理 O(n) 个元素；层数 O(log n)，合起来 O(n log n)。'},
      {title:'05 · 分治不是“递归”这两个字',text:'关键是问题能拆成什么、合并需要多少成本。递归版写 sort(l,m)、sort(m,r) 再 merge；本章迭代版按块长采用另一种合法依赖顺序：总在两半已排好序之后合并，区间划分不必与常规递归版相同。终止条件、非整幂长度和空间复用都必须保留。'}
    ],invariant:{title:'临时数组是已经取出的最小前缀',text:'每次合并循环开始，tmp[l,k) 已按序存放两段中最小的 k−l 个元素；i、j 指向尚未取出的各半首项。',proof:['空前缀天然有序，两个游标分别指向 l 与 m。','比较两个首项，较小者一定是所有剩余元素中最小的，追加后仍有序；相等选左维护稳定性。','每步耗掉一个元素，恰好 r−l 步后两半全部耗尽。每个跨段逆序在其右侧元素被取出时计一次，因此不漏不重。']},complexity:{time:'排序与逆序计数 O(n log n)；每层总工作量 O(n)。',space:'O(n) 临时数组，迭代实现额外栈 O(1)。输入占 O(n)。',conditions:'n 是元素个数。机器字比较/加法 O(1)；计数使用 long long。教学 n≤12 防止回放过长，复杂度结论不依赖这一上限。'},pitfalls:[
      {title:'相等时也拿右侧并计数',text:'必须使用左侧 <= 右侧时取左，否则相等会被当成严格逆序。',counterexample:'[2,2] 的逆序数应为 0；错误的 < 分支可能得到 1。'},
      {title:'忘记归并尾部',text:'长度不一定是 2 的幂，m、r 都要与 n 取 min，任一半都可能先耗尽。',counterexample:'[3,1,2] 的最后一层右半只有一个元素。'},
      {title:'边读原数组边覆盖',text:'如果直接覆盖 a[k]，可能毁掉尚未读出的元素；先写 tmp，再复制回原区间。',counterexample:'归并 [2,3] 和 [1,4]，先把 1 写到 a[0] 会覆盖尚待处理的 2。'},
      {title:'只加一次而不是整段长度',text:'拿右侧元素时可能同时产生多个逆序。',counterexample:'左 [3,4,5]，右 [1]，取 1 的贡献是 3，不是 1。'}
    ],applications:['逆序对、离线统计跨区间贡献，为更高级分治算法建立直觉。','理解稳定排序及比较器要求；比赛只需排序时通常直接用 std::sort，稳定性另需 std::stable_sort。']},
    input:{description:'a：0–12 个整数，元素在 −1000 到 1000。会同时输出排序结果与原数组逆序数。',default:{a:[4,1,3,2,2,6,0]},presets:[{name:'不等长尾块',data:{a:[4,1,3,2,2,6,0]}},{name:'跨段整块计数',data:{a:[3,4,5,1]}},{name:'全相等',data:{a:[2,2,2,2]}},{name:'空数组',data:{a:[]}},{name:'单元素',data:{a:[-3]}}],validate:d=>checkA(d,12)},
    random(seed){const r=rng(seed);return {a:Array.from({length:r(0,11)},()=>r(-9,9))};},
    run(d){let a=d.a.slice(),tmp=Array(a.length).fill(null),inversions=0;const frames=[];const push=(title,explanation,lines,active=[],marks={},done=[])=>frames.push({title,explanation,lines,arrays:[{label:'工作数组 a',values:a.slice(),active,marks},{label:'本次合并缓冲 tmp',values:tmp.slice(),done}],metrics:[{label:'累计逆序对',value:inversions}]});push('单元素块已经有序','从块长 1 开始，相邻两块逐层归并。',[loc(mergeCpp,'long long inversions')]);for(let width=1;width<a.length;width*=2){for(let l=0;l<a.length;l+=2*width){const m=Math.min(l+width,a.length),r=Math.min(l+2*width,a.length);let i=l,j=m,k=l;tmp=Array(a.length).fill(null);push(`归并 [${l},${m}) 与 [${m},${r})`,`两段已有序。块长 width=${width}；现在比较各段当前首项。`,[loc(mergeCpp,'int m =')],[],{[l]:'l',...(m<a.length?{[m]:'m'}:{})});while(i<m||j<r){const takeLeft=j===r||(i<m&&a[i]<=a[j]);const from=takeLeft?i:j;const value=a[from];let gain=0;if(takeLeft){tmp[k++]=a[i++];}else{gain=m-i;inversions+=gain;tmp[k++]=a[j++];}push(takeLeft?'取左侧首项':'取右侧首项',takeLeft?`把 ${value} 送入缓冲。相等优先取左，不新增逆序。`:`把 ${value} 送入缓冲，左侧剩余 ${gain} 项都更大，增加 ${gain} 个逆序。`,[loc(mergeCpp,takeLeft?'tmp[k++] = a[i++]':'inversions += m - i'),...(takeLeft?[]:[loc(mergeCpp,'tmp[k++] = a[j++]')])],[from],{[from]:takeLeft?'左 i':'右 j'},Array.from({length:k-l},(_,t)=>l+t));}for(let p=l;p<r;p++)a[p]=tmp[p];push('有序块写回',`[${l},${r}) 现在整体有序，可供下一层使用。`,[loc(mergeCpp,'for (int p =')],Array.from({length:r-l},(_,t)=>l+t));}}push('归并完成',`排序结果已形成，原数组共有 ${inversions} 个逆序对。`,[loc(mergeCpp,'cout << inversions')]);return {frames,result:{sorted:a,inversions}};},
    oracle(d){let inversions=0;for(let i=0;i<d.a.length;i++)for(let j=i+1;j<d.a.length;j++)if(d.a[i]>d.a[j])inversions++;return {sorted:d.a.slice().sort((a,b)=>a-b),inversions};},cpp:mergeCpp,cppInput:d=>d.a.length+'\n'+d.a.join(' ')+'\n',cppOutput:s=>{const a=nums(s);return {inversions:a[0],sorted:a.slice(1)};},
    exercises:[{question:'左半 [2,4,7]、右半 [3,5] 已有序。取出右侧的 3 时增加几个逆序对？',options:['1','2','3','0'],answer:1,explanation:'2 已先被取走，剩余 4、7 都大于 3，贡献 m−i=2。'},{question:'归并排序每层 O(n)，为什么不止一层？',options:['每个元素只比较一次','块长每次翻倍，要约 log₂ n 层才能覆盖全数组','因为用了临时数组','层数等于逆序对个数'],answer:1,explanation:'初始块长为 1，随后 2、4、8…；到块长足够大才能成为一个全局有序块。'},{question:'若相等时先取右侧，会有什么问题？',options:['一定排不成有序','排序仍可有序，但失去稳定性，当前逆序计数也会错','空间复杂度变成 O(n²)','不会有任何变化'],answer:1,explanation:'相同值互换不影响数值有序，但改变原相对顺序；本实现右侧分支按严格小于设计，会把相等误计。'}],
    sources:[{title:'USACO Guide · Introduction to Sorting',url:'https://usaco.guide/bronze/intro-sorting',note:'排序概念、归并与稳定性；此处使用迭代归并和跨段计数演示。'}],transfer:{contrast:'枚举逐对验证；归并利用已有的局部顺序，一次确定整块贡献。分治的收益来自“合并比重新求解更容易”。',next:['greedy-interval','fenwick','lis'],challenge:'把数组每项改成 (值,原下标)，检查相同值的原下标是否保持递增，亲手验证稳定性。'}
  });

  const backtrackCpp=`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int n, target;
vector<int> a, answers;
void dfs(int i, int sum, int mask) {
    if (i == n) {
        if (sum == target) answers.push_back(mask);
        return;
    }
    dfs(i + 1, sum, mask);
    dfs(i + 1, sum + a[i], mask | (1 << i));
}
int main() {
    cin >> n >> target;
    a.resize(n);
    for (int &x : a) cin >> x;
    dfs(0, 0, 0);
    sort(answers.begin(), answers.end());
    cout << answers.size() << '\\n';
    for (int mask : answers) cout << mask << ' ';
    cout << '\\n';
}`;
  CF.register({
    id:'backtracking',section:'foundation',title:'回溯与位掩码',subtitle:'把每一次选择，变成一条可检查的路径。',level:'基础',tags:['递归','回溯','DFS','子集','位运算','mask','穷举','剪枝'],prerequisites:['complexity'],
    summary:'枚举所有“元素和等于 target”的下标子集。用递归理解决策树，用 bitmask 理解同一棵树的编号，再辨认什么时候剪枝有依据、什么时候会漏答案。',
    lesson:{recognize:['每一步有有限选择，可以用“处理到哪里 + 已作出的选择”描述当前状态。子集是每个元素选或不选。','n 很小时可以承担 2ⁿ 级别搜索；若不同路径反复到达相同的未来问题，再考虑记忆化或动态规划。','本章允许负数，因此不使用 sum>target 就返回的剪枝。是否能剪掉一个分支必须由约束证明，而不是凭感觉。'],derive:[
      {title:'01 · 把一个集合拆成一串二选一',text:'第 i 个元素有“不选”和“选”两条边。沿根到叶走 n 步后，每个下标都做过一次决定，得到一个唯一子集。相同数值仍是不同下标，不能按值去重。'},
      {title:'02 · 状态只带后续需要的信息',text:'dfs(i,sum,mask) 表示已经决定了 [0,i) 的选取，当前和为 sum，mask 记录哪些下标被选。i<n 时分成两个子问题；i=n 时才检查 sum==target。传值的 sum 和 mask 天然完成恢复。'},
      {title:'03 · 从递归树看到二进制',text:'mask 的第 i 位为 1，当且仅当选了 a[i]。设置该位用 mask | (1<<i)，查询用 (mask>>i)&1。所有子集恰好对应 0 到 2ⁿ−1，所以逐个枚举 mask 可以独立验证递归答案。'},
      {title:'04 · 剪枝是在证明“这里不可能”',text:'如果所有剩余元素都非负，sum>target 时继续选不会降回 target，这才是合法剪枝。允许负数时，例如已选 5，后面还有 −4，target=1，这个分支必须保留。另一种通用界是用剩余负数和、正数和判断目标能否落在可达范围。'},
      {title:'05 · 从搜索走向动态规划',text:'若只问方案数或是否可达，许多不同 mask 到达相同的 (i,sum) 后，未来是一样的，可以合并状态。若要求列出每个具体子集，这些历史不能直接丢掉，输出本身就可能指数大。'}
    ],invariant:{title:'深度 i 的路径，只决定前 i 个下标',text:'进入 dfs(i,sum,mask) 时，mask 在 [0,i) 的置位精确表示当前选择；sum 等于这些元素的和；i 之后没有被提前选择。',proof:['根节点 i=0、sum=0、mask=0，空前缀满足不变量。','不选分支保留 sum 和 mask；选分支加入 a[i] 并设置第 i 位。两条分支都把已决定的前缀长度增加一。','任意下标子集有唯一的选择序列，因此每个子集恰好到达一个叶子；只保留和等于目标的叶子，答案无重无漏。']},complexity:{time:'完整遍历 O(2ⁿ) 个递归节点；本实现还将 K 个答案掩码排序，成本 O(K log K)。',space:'递归深度 O(n)，答案列表 O(K)，输入 O(n)。若输出每个子集的全部元素，还需 O(nK) 输出量。',conditions:'n 是数组长度，K 是符合条件的下标子集数。教学 n≤7；本章 C++ int 掩码只用于小 n，n 达到位宽时不能继续这样位移。'},pitfalls:[
      {title:'负数让常见剪枝失效',text:'sum 大于目标不代表后面不可能降下来。',counterexample:'a=[5,−4], target=1，子集 {0,1} 合法。'},
      {title:'空集也可能是答案',text:'空数组或 target=0 时，必须考虑什么都不选。',counterexample:'a=[], target=0 的答案是掩码 [0]，有 1 种，而不是 0 种。'},
      {title:'按值去重会丢下标子集',text:'题目若要求下标不同就算不同方案，重复值不能合并。',counterexample:'a=[1,1], target=1 有 mask=1 和 mask=2 两种。'},
      {title:'全局可变路径要恢复',text:'本模板 sum、mask 传值；若改成 vector path 共享，递归返回后要 pop_back。',counterexample:'先选 a[0] 后若没撤销，后续“不选 a[0]”分支仍会错误保留它。'}
    ],applications:['n≤20 左右的子集/排列搜索、构造小规模反例、验证压缩状态是否保留了必要信息。','从选与不选迁移到 01 背包，从 bitmask 表示集合迁移到子集 DP。']},
    input:{description:'a：0–7 个整数，每个 −20 到 20；target：−140 到 140。结果用下标子集的二进制掩码表示，低位对应小下标。',default:{a:[3,-2,4,1],target:2},presets:[{name:'负数不能随意剪枝',data:{a:[3,-2,4,1],target:2}},{name:'剪枝反例',data:{a:[5,-4],target:1}},{name:'重复值按下标区分',data:{a:[1,1],target:1}},{name:'零值制造多条路径',data:{a:[0,0,1],target:0}},{name:'空集',data:{a:[],target:0}},{name:'无解',data:{a:[2,4],target:3}}],validate(d){obj(d);array(d.a,'a',7,-20,20);integer(d.target,'target',-140,140);}},
    random(seed){const r=rng(seed);return {a:Array.from({length:r(0,6)},()=>r(-4,5)),target:r(-8,12)};},
    run(d){const frames=[],answers=[],stack=[];const n=d.a.length;function push(title,explanation,lines,i,sum,mask){frames.push({title,explanation,lines,arrays:[{label:'元素 a（小下标在左）',values:d.a.slice(),active:i<n?[i]:[],done:d.a.map((_,j)=>j).filter(j=>(mask>>j)&1),marks:i<n?{[i]:'待决定'}:{}},{label:'选取位（与下标一一对应）',values:d.a.map((_,j)=>j<i?((mask>>j)&1):'?' ),active:i<n?[i]:[]}],tables:[{label:'当前调用栈',columns:['i','sum','mask（二进制）'],rows:stack.map(x=>[x.i,x.sum,x.mask.toString(2).padStart(n||1,'0')]),activeRows:stack.length?[stack.length-1]:[]},{label:'最近找到的答案掩码',columns:['mask','对应下标'],rows:answers.slice(-8).map(m=>[m,d.a.map((_,j)=>j).filter(j=>(m>>j)&1).join(', ')||'空集'])}],metrics:[{label:'当前和',value:sum},{label:'目标',value:d.target},{label:'已找到',value:answers.length}]});}function dfs(i,sum,mask){stack.push({i,sum,mask});push(`进入深度 ${i}`,`前 ${i} 个下标已决定，当前和 ${sum}。`,[loc(backtrackCpp,'void dfs')],i,sum,mask);if(i===n){if(sum===d.target)answers.push(mask);push(sum===d.target?'找到一个合法子集':'叶子不满足目标',sum===d.target?`mask=${mask}，元素和为 ${sum}，收录这个下标子集。`:`所有下标都已决定，但 ${sum} ≠ ${d.target}，不收录。`,[loc(backtrackCpp,'if (sum == target)')],i,sum,mask);stack.pop();return;}push('先走“不选”分支',`不加入 a[${i}]=${d.a[i]}，和与掩码保持不变。`,[loc(backtrackCpp,'dfs(i + 1, sum, mask)')],i,sum,mask);dfs(i+1,sum,mask);push('返回后走“选”分支',`恢复到当前层，加入 a[${i}]=${d.a[i]}；第 ${i} 位设置为 1。`,[loc(backtrackCpp,'dfs(i + 1, sum + a[i]')],i,sum,mask);dfs(i+1,sum+d.a[i],mask|(1<<i));stack.pop();}dfs(0,0,0);answers.sort((a,b)=>a-b);push('全部分支搜索完成',`找到 ${answers.length} 个下标子集；掩码已排序，便于与独立枚举比较。`,[loc(backtrackCpp,'sort(answers')],0,0,0);return {frames,result:{count:answers.length,masks:answers}};},
    oracle(d){const masks=[];for(let mask=0;mask<2**d.a.length;mask++){const sum=d.a.reduce((s,v,i)=>s+((mask>>i)&1?v:0),0);if(sum===d.target)masks.push(mask);}return {count:masks.length,masks};},cpp:backtrackCpp,cppInput:d=>d.a.length+' '+d.target+'\n'+d.a.join(' ')+'\n',cppOutput:s=>{const a=nums(s);return {count:a[0],masks:a.slice(1)};},
    exercises:[{question:'a=[0,0]，target=0，有几个不同下标子集？',options:['1','2','3','4'],answer:3,explanation:'空集、{0}、{1}、{0,1} 都合法，分别对应 mask=0、1、2、3。'},{question:'为什么本章不能在 sum>target 时直接返回？',options:['递归不能 return','负数可能把后续总和降回目标','位运算不支持负数数组','这样一定变成 O(n²)'],answer:1,explanation:'a=[5,−4], target=1 是直接反例。剪枝依据是问题约束，而不是递归模板。'},{question:'要只统计方案数，何时可将不同历史合并为同一个 DP 状态？',options:['只要当前 sum 相同就永远可以','后续合法选择与收益只由保留的状态决定时','只要 mask 不同就可以','任何搜索都可以无条件丢掉历史'],answer:1,explanation:'必须满足“未来只依赖状态”。本问题还需知道处理到哪个 i；只存 sum 会混淆剩余可选元素。'}],
    sources:[{title:'USACO Guide · Complete Search with Recursion',url:'https://usaco.guide/bronze/complete-rec',note:'子集递归、位掩码与回溯；本章加入负数和空集边界说明。'}],transfer:{contrast:'回溯保留每条历史，DP 把未来等价的历史合并；bitmask 只是集合表示，不会自动消除指数复杂度。',next:['knapsack','subset-dp','tree-dp'],challenge:'给正数输入加上 sum>target 的剪枝，再用含负数的预设检查它为什么不能通用。'}
  });

  const numberCpp=`#include <iostream>
#include <string>
#include <cstdlib>
using namespace std;
int main() {
    string mode; cin >> mode;
    if (mode == "gcd") {
        long long a, b; cin >> a >> b;
        a = llabs(a); b = llabs(b);
        while (b != 0) {
            long long r = a % b;
            a = b; b = r;
        }
        cout << a << '\\n';
    } else {
        long long base, exponent, mod; cin >> base >> exponent >> mod;
        base = (base % mod + mod) % mod;
        long long result = 1 % mod;
        while (exponent > 0) {
            if (exponent & 1) result = result * base % mod;
            base = base * base % mod;
            exponent /= 2;
        }
        cout << result << '\\n';
    }
}`;
  CF.register({
    id:'number-theory',section:'math',title:'欧几里得与快速幂',subtitle:'每一步都缩小问题，同时保住不变量。',level:'核心',tags:['gcd','最大公约数','欧几里得','辗转相除','快速幂','二进制','模运算','逆元','数论'],prerequisites:['complexity','backtracking'],
    summary:'两个经典的“把大问题缩小”算法：用余数保持公约数集合，用二进制拆指数保持乘积。先证明变换等价，再用循环把它实现出来。',
    lesson:{recognize:['求最大公约数、约分或整除关系时，欧几里得替代从小到大的约数枚举。','要求 aᵉ mod m，且 e 很大时，用平方倍增代替 e 次连乘。m 不必是质数，e 必须是非负整数。','快速幂只是幂运算加速，不自动提供模逆元。a⁻¹ mod m 存在当且仅当 gcd(a,m)=1；费马公式还需要质数模数。'],derive:[
      {title:'01 · 为什么取余不会改变 gcd',text:'写 a=qb+r。若 d 同时整除 a、b，也整除 a−qb=r；反过来，若 d 整除 b、r，也整除 qb+r=a。因此 (a,b) 与 (b,a mod b) 的公约数集合完全一致，而余数比 b 小。'},
      {title:'02 · 余数变成零时就结束',text:'重复替换直到 b=0。此时 gcd(a,0)=|a|，所以留下的 a 就是答案。本章先取绝对值；约定 gcd(0,0)=0，与常用编程库一致，但它不是“最大的正公约数存在”的通常定义。'},
      {title:'03 · 指数是一些二的幂之和',text:'13 的二进制是 1101，即 8+4+1。a¹³=a⁸·a⁴·a。按位处理时，当前 base 依次是 a、a²、a⁴、a⁸；指数最低位为 1 就把当前 base 乘进 result。随后平方 base，把指数整除 2。'},
      {title:'04 · 取模可以逐步做，除法不行',text:'加法和乘法可先取模再继续运算，所以每次乘法后立即 %m，控制数值大小。但 (a/b)%m 不能直接改成 (a%m)/(b%m)。需要除法时要讨论逆元是否存在。'},
      {title:'05 · 为什么是对数级',text:'快速幂每轮把指数至少减半，因此只有 O(log e) 轮。欧几里得虽然某一步可能缩得不多，但两步后较大的正数至少减半，故取余次数为 O(log max(|a|,|b|))。大整数运算的位复杂度另算，不能把任意长整数取余当 O(1)。'}
    ],invariant:{title:'变换的是状态，保持的是答案',text:'gcd 每轮保持 gcd(a,b) 不变；快速幂在循环入口与整轮结束保持 result × baseᵉ ≡ 初始 Aᴱ (mod m)。奇数位刚被吸收的中间帧，要暂用 e−1 作剩余指数。',proof:['gcd 的等价由 a=qb+r 的双向整除得到；正余数严格变小保证终止。','快速幂初始 result=1、base=A mod m，命题成立。若 e=2k，平方 base、令 e=k 保持乘积；若 e=2k+1，先额外乘一个 base，此刻剩余幂是 e−1（循环变量尚未右移）；随后平方 base 并令 e=k，恢复循环边界形式。','快速幂结束 e=0，base⁰=1，因此 result 本身就是答案。m=1 时所有余数都是 0，初值也必须写 1%m。']},complexity:{time:'gcd 总时间 O(1+log(max(|a|,|b|)+1))；快速幂总时间 O(1+log(e+1))。零输入/零指数也有常数初始化成本。',space:'两种模式的算法辅助空间均 O(1)。',conditions:'机器字算术按 O(1) 计。实验 gcd 输入绝对值≤2000；快速幂 mod≤10⁶，使乘积≤10¹²，在 JS 安全整数与 C++ long long 范围内。生产题若模数更大，必须重新检查乘法溢出。'},pitfalls:[
      {title:'零指数与模一',text:'任何底数的零次幂在本章采用 1，包括编程组合中的 0⁰；最后仍需取模。',counterexample:'base=7, exponent=0, mod=1，应输出 0，而不是 1。'},
      {title:'负数 % 可能为负',text:'先把底数规范到 [0,m)，再平方与累乘。',counterexample:'(−2)³ mod 5 的标准非负余数是 2；C++ 直接 −8%5 是 −3。'},
      {title:'先溢出再取模救不回来',text:'a*b%mod 仍会先计算 a*b。需要足够宽的类型或安全模乘。',counterexample:'模数约 10¹² 时两个余数相乘可达 10²⁴，long long 也容纳不了。'},
      {title:'费马逆元有前提',text:'a^(p−2) mod p 只在 p 为质数且 a 不被 p 整除时给逆元。',counterexample:'a=2,m=4 时 gcd=2，不存在 x 使 2x≡1 (mod4)，快速幂不能创造一个逆元。'}
    ],applications:['约分、周期同步、最小公倍数（先除 gcd 再乘，仍需检查溢出）。','模幂、组合数的质数模逆元、矩阵快速幂；共同依赖运算结合律，而不只限整数乘法。']},
    input:{description:'mode 为 "gcd" 时提供 a,b（−2000…2000）；为 "pow" 时提供 base（−1000…1000）、exponent（0…1000）、mod（1…1000000）。',default:{mode:'gcd',a:252,b:105},presets:[{name:'辗转相除',data:{mode:'gcd',a:252,b:105}},{name:'gcd 负数与零',data:{mode:'gcd',a:-42,b:0}},{name:'gcd(0,0) 约定',data:{mode:'gcd',a:0,b:0}},{name:'13 = 8+4+1',data:{mode:'pow',base:3,exponent:13,mod:97}},{name:'负底数',data:{mode:'pow',base:-2,exponent:3,mod:5}},{name:'指数零，模一',data:{mode:'pow',base:0,exponent:0,mod:1}}],validate(d){obj(d);if(d.mode==='gcd'){integer(d.a,'a',-2000,2000);integer(d.b,'b',-2000,2000);}else if(d.mode==='pow'){integer(d.base,'base',-1000,1000);integer(d.exponent,'exponent',0,1000);integer(d.mod,'mod',1,1000000);}else throw new Error('mode 只能是 "gcd" 或 "pow"。');}},
    random(seed){const r=rng(seed);return r(0,1)?{mode:'gcd',a:r(-1000,1000),b:r(-1000,1000)}:{mode:'pow',base:r(-100,100),exponent:r(0,100),mod:r(1,1000)};},
    run(d){const frames=[];if(d.mode==='gcd'){let a=Math.abs(d.a),b=Math.abs(d.b),rows=[];const push=(title,explanation,lines)=>frames.push({title,explanation,lines,arrays:[{label:'当前 (a,b)',values:[a,b],active:[1],marks:{0:'a',1:'b'}}],tables:[{label:'等价变换历史',columns:['a','b','a mod b'],rows:clone(rows),activeRows:rows.length?[rows.length-1]:[]}],metrics:[{label:'保持不变',value:`gcd(${Math.abs(d.a)}, ${Math.abs(d.b)})`}]});push('先取绝对值','负号不影响正公约数；接下来只对非负整数取余。',[loc(numberCpp,'a = llabs')]);while(b!==0){const r=a%b;rows.push([a,b,r]);push('写出余数等式',`${a} = ${Math.floor(a/b)} × ${b} + ${r}。两组数的公约数集合相同。`,[loc(numberCpp,'long long r =')]);a=b;b=r;push('把问题缩小',`替换为 (${a},${b})，gcd 不变而第二个数变小。`,[loc(numberCpp,'a = b; b = r')]);}push('余数为零',`gcd(${d.a},${d.b}) = ${a}${a===0?'（本章约定）':''}。`,[loc(numberCpp,"cout << a <<")]);return {frames,result:{value:a}};}let base=((d.base%d.mod)+d.mod)%d.mod,e=d.exponent,result=1%d.mod,rows=[];const push=(title,explanation,lines,absorbed=false)=>frames.push({title,explanation,lines,arrays:[{label:'循环变量 e 的二进制（高位在左）',values:e.toString(2).split(''),active:[e.toString(2).length-1]}],tables:[{label:'逐轮状态',columns:['进入时 e','进入时 base','最低位','累乘结果'],rows:clone(rows),activeRows:rows.length?[rows.length-1]:[]}],metrics:[{label:'result',value:result},{label:'base',value:base},{label:'循环变量 e',value:e},{label:'此帧未处理幂',value:'base^'+(absorbed?e-e%2:e)},{label:'模数',value:d.mod}]});push('建立乘积不变量',`result=1 mod ${d.mod}，base=${base}；循环边界保持 result × baseᵉ ≡ ${d.base}^${d.exponent}。`,[loc(numberCpp,'long long result =')]);while(e>0){const odd=e%2;if(odd)result=(result*base)%d.mod;rows.push([e,base,odd,result]);push(odd?'最低位为 1，纳入贡献':'最低位为 0，跳过贡献',odd?`将当前幂 ${base} 乘入 result，取模后为 ${result}。此帧尚未更新 e=${e}，真正未处理幂是 base^${e-1}；平方与右移后才恢复循环边界不变量。`:'这一位不需要当前幂，result 保持不变，未处理幂仍为 base^e。',[loc(numberCpp,'if (exponent & 1)')],true);base=(base*base)%d.mod;e=Math.floor(e/2);push('平方底数，指数减半',`下一轮 base=${base}、e=${e}。这是同一个剩余幂问题。`,[loc(numberCpp,'base = base * base'),loc(numberCpp,'exponent /= 2')]);}push('剩余指数为零',`答案为 ${result}，不变量中的剩余因子现在是 1。`,[loc(numberCpp,'cout << result')]);return {frames,result:{value:result}};},
    oracle(d){if(d.mode==='gcd'){const a=Math.abs(d.a),b=Math.abs(d.b);if(!a&&!b)return {value:0};let ans=1;for(let v=1;v<=Math.max(a,b);v++)if(a%v===0&&b%v===0)ans=v;return {value:ans};}let v=1%d.mod,b=((d.base%d.mod)+d.mod)%d.mod;for(let i=0;i<d.exponent;i++)v=(v*b)%d.mod;return {value:v};},cpp:numberCpp,cppInput:d=>d.mode+'\n'+(d.mode==='gcd'?d.a+' '+d.b:d.base+' '+d.exponent+' '+d.mod)+'\n',cppOutput:s=>({value:Number(s.trim())}),
    exercises:[{question:'gcd(84,30) 第一步变成哪一组？',options:['(30,24)','(54,30)','(84,24)','(30,6)'],answer:0,explanation:'84=2×30+24，因此先变成 gcd(30,24)。最终答案是 6，但不是第一步直接到 (30,6)。'},{question:'3¹³ 的快速幂会把哪些当前幂乘进答案？',options:['3¹、3³、3⁹','3¹、3⁴、3⁸','3²、3⁴、3⁷','3¹、3²、3⁴、3⁸'],answer:1,explanation:'13=1+4+8，二进制 1101 的第 0、2、3 位为 1。'},{question:'关于模逆元，哪项正确？',options:['模数为任意正数都可用 a^(m−2)','只要 a≠0 就有逆元','gcd(a,m)=1 才存在逆元','取模后可直接用普通除法'],answer:2,explanation:'逆元存在条件是互质。费马快速幂公式还需质数模数；合数模数通常用扩展欧几里得或其他有前提的方法。'}],sources:[{title:'cp-algorithms · Euclidean Algorithm',url:'https://cp-algorithms.com/algebra/euclid-algorithm.html',note:'取余等价和复杂度。'},{title:'cp-algorithms · Binary Exponentiation',url:'https://cp-algorithms.com/algebra/binary-exp.html',note:'二进制幂运算与结合律推广。'}],transfer:{contrast:'欧几里得通过保持公约数集合缩小数值；快速幂通过保持乘积缩小指数。不变量比具体代码外形更通用。',next:['sieve','combinations','rolling-hash'],challenge:'试着把“乘法”替换为矩阵乘法：哪些证明仍成立，哪些复杂度项必须改变？'}
  });

  const sieveCpp=`#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n; cin >> n;
    vector<bool> prime(n + 1, true);
    prime[0] = false;
    if (n >= 1) prime[1] = false;
    for (int p = 2; 1LL * p * p <= n; ++p) {
        if (!prime[p]) continue;
        for (long long multiple = 1LL * p * p; multiple <= n; multiple += p) {
            prime[multiple] = false;
        }
    }
    vector<int> result;
    for (int i = 2; i <= n; ++i) if (prime[i]) result.push_back(i);
    cout << result.size() << '\\n';
    for (int x : result) cout << x << ' ';
    cout << '\\n';
}`;
  CF.register({
    id:'sieve',section:'math',title:'埃氏筛与质因数视角',subtitle:'不逐个问“你是不是质数”，而是批量排除合数。',level:'核心',tags:['质数','筛法','埃氏筛','Eratosthenes','素数','质因数','预处理'],prerequisites:['complexity','number-theory'],summary:'把每个数单独试除，改成让每个质数划掉自己的倍数。理解从 p² 开始和到 √n 结束的理由，再区分埃氏筛、线性筛与单次素性测试。',
    lesson:{recognize:['需要 0…n 范围内所有质数，或许多次查询某个小整数是否为质数。一次预处理能共享工作。','筛法的内存和时间取决于数值上界 n，而不是输入数字的个数或位数；上界过大时不适用普通整段筛。','只判断一个很大的整数是否为质数，或区间右端很大但区间很短时，需考虑试除、素性测试或分段筛，这里不冒充已实现这些算法。'],derive:[
      {title:'01 · 逐个试除的重复工作',text:'朴素地对每个 x 检查 2…√x 是否整除，所有数合计约 O(n√n)。每次都在重新发现“2 的倍数不是质数”“3 的倍数不是质数”。把问题反过来，就能批量标记。'},
      {title:'02 · 质数负责划掉自己的倍数',text:'先把 2…n 都当作候选。遇到尚未被划掉的 p，就知道它是质数，标记 p 的真倍数为合数。被标记的数不再发起新一轮，因为它的倍数会由更小的质因子负责。'},
      {title:'03 · 为什么从 p² 开始',text:'p×2、p×3、…、p×(p−1) 都含有小于 p 的质因子，早已被前面的质数划掉。第一个可能还没处理的倍数是 p×p。直接从 p 开始则会错误地划掉质数自己。'},
      {title:'04 · 为什么只筛到平方根',text:'每个合数 x 都至少有一个质因子不超过 √x。否则它两个非平凡因子都大于 √x，乘积就超过 x，矛盾。因此当 p²>n 时，所有合数都已经被某个小质因子处理；剩下的候选全部是质数。'},
      {title:'05 · 看清复杂度来自哪些项',text:'对每个质数 p，大约标记 n/p 个倍数，合起来 n(1/2+1/3+1/5+…) 为 O(n log log n)。如果对所有整数都标记，得到的是较弱的 O(n log n) 上界。线性筛通过记录最小质因子进一步确保每个合数只生成一次，但它是另一种算法。'}
    ],invariant:{title:'到达 p 前，小质因子负责的合数都已排除',text:'处理候选 p 时，所有最小质因子小于 p 的合数都已经被划掉；那些较小质数本身仍保留。尚未被划掉的 p 不含更小质因子，所以它是质数。',proof:['从 p=2 开始，没有更小质因子需要处理，且 0、1 已单独排除。','若 p 已被划掉，跳过它不丢信息；否则 p 为质数，标记它从 p² 起的倍数，使不变量对下个候选继续成立。','结束时所有 x≤n 的合数都有 ≤√n 的质因子，必已被标记。未标记且 ≥2 的数恰好是所有质数。']},complexity:{time:'O(n log log n)，另有 O(n) 初始化与结果收集。',space:'O(n) 个标记。示例 C++ vector<bool> 通常按位压缩，但渐近空间不变。',conditions:'n 是数值上界，而非质数个数；按机器字整数运算计。教学 n≤80 用于展示。平方比较用 1LL*p*p，避免 int 先溢出。'},pitfalls:[
      {title:'把 1 当质数',text:'质数定义是恰有两个正因子的正整数，1 只有一个。',counterexample:'n=1 应输出空列表；n=2 才有 [2]。'},
      {title:'从 p 自身开始划掉',text:'要标记真倍数，本实现从 p² 开始。',counterexample:'p=2 若从 2 开始标记，就会错误删掉唯一的偶质数。'},
      {title:'遇到 p²>n 就停止收集',text:'停止的是筛除循环，不是输出扫描；大于 √n 的质数仍要收集。',counterexample:'n=10 时只需 p=2、3 发起筛除，但结果还包括 5、7。'},
      {title:'大上界不能只看渐近式',text:'n=10¹² 即使只有 O(n) 位空间也过大，应换问题表示或算法。',counterexample:'只需 [10¹²,10¹²+1000] 的质数，不能直接分配长度 10¹² 的普通筛数组。'}
    ],applications:['多次素数查询、枚举质数因子、为组合数模质数方法检查前提。','从“每数试除”迁移到“每质因子贡献一次”的计数思维，并继续学习最小质因子筛。']},
    input:{description:'n：0–80 的整数，列出闭区间 [2,n] 的所有质数。浅灰表示已排除，青绿表示已确认质数，橙色是当前处理位置。',default:{n:40},presets:[{name:'看见 2、3、5 的倍数',data:{n:40}},{name:'平方边界 49',data:{n:49}},{name:'n=0',data:{n:0}},{name:'n=1',data:{n:1}},{name:'第一个质数',data:{n:2}},{name:'较密集的候选表',data:{n:80}}],validate(d){obj(d);integer(d.n,'n',0,80);}},
    random(seed){return {n:rng(seed)(0,80)};},run(d){const n=d.n,prime=Array(n+1).fill(true),frames=[],confirmed=[];prime[0]=false;if(n>=1)prime[1]=false;function push(title,explanation,lines,active=[]){const arrays=[];for(let start=0;start<=n;start+=20){const values=Array.from({length:Math.min(20,n-start+1)},(_,i)=>i+start);arrays.push({label:`候选 ${start}–${start+values.length-1}`,values,active:active.filter(x=>x>=start&&x<start+values.length).map(x=>x-start),done:confirmed.filter(x=>x>=start&&x<start+values.length).map(x=>x-start),muted:values.filter(x=>!prime[x]).map(x=>x-start)});}frames.push({title,explanation,lines,arrays,metrics:[{label:'仍是候选',value:prime.filter(Boolean).length},{label:'已确认质数',value:confirmed.length}]});}push('初始化候选','0 和 1 不是质数。其余数暂时保留，尚未全部证明。',[loc(sieveCpp,'prime[0] = false')]);for(let p=2;p*p<=n;p++){if(!prime[p]){push(`跳过合数 ${p}`,'它的倍数已经或将由更小的质因子覆盖，无需再发起一轮。',[loc(sieveCpp,'if (!prime[p])')],[p]);continue;}confirmed.push(p);push(`确认质数 ${p}`,`${p} 没有更小质因子；从 ${p}²=${p*p} 开始标记倍数。`,[loc(sieveCpp,'for (long long multiple')],[p]);for(let multiple=p*p;multiple<=n;multiple+=p){const already=!prime[multiple];prime[multiple]=false;push(`划掉 ${multiple}`,`${multiple}=${p}×${multiple/p}，是合数。${already?'它此前已被其他质因子标记，重复标记不影响正确性。':''}`,[loc(sieveCpp,'prime[multiple] = false')],[p,multiple]);}}const result=[];for(let i=2;i<=n;i++)if(prime[i])result.push(i);confirmed.splice(0,confirmed.length,...result);push('剩余候选全部为质数',`每个合数都有不超过平方根的质因子，因而都已被排除。共 ${result.length} 个质数。`,[loc(sieveCpp,'for (int i = 2;')]);return {frames,result:{primes:result}};},oracle(d){const primes=[];for(let x=2;x<=d.n;x++){let ok=true;for(let k=2;k*k<=x;k++)if(x%k===0){ok=false;break;}if(ok)primes.push(x);}return {primes};},cpp:sieveCpp,cppInput:d=>d.n+'\n',cppOutput:s=>({primes:nums(s).slice(1)}),
    exercises:[{question:'筛到 p=5 时，为什么可以从 25 而不是 10 开始？',options:['10、15、20 已被更小的质因子处理','小于25的数都是质数','因为5是奇数','只是为了让代码简短'],answer:0,explanation:'5×2、5×3、5×4 都含小于5的质因子。首次可能尚未覆盖的是5×5。'},{question:'n=49，需要处理 p=7 吗？',options:['不需要，因为7不是小于√49','需要，否则49可能留下','只需要处理2','取决于输入顺序'],answer:1,explanation:'条件是 p²≤n，包含等号。49 的最小质因子是7，遗漏这一轮会把49误判为质数。'},{question:'只有一个数 x≈10¹²，要判断素性，为什么普通整段筛通常不是首选？',options:['筛法只能处理偶数','普通筛按数值上界分配与处理，成本太大','所有大数都是合数','筛法没有正确性保证'],answer:1,explanation:'普通筛预处理0…x；如果只需单点判定，试除或适合范围的素性测试更匹配。'}],sources:[{title:'cp-algorithms · Sieve of Eratosthenes',url:'https://cp-algorithms.com/algebra/sieve-of-eratosthenes.html',note:'p² 起点、平方根终点、O(n log log n) 与空间讨论。'}],transfer:{contrast:'枚举从每个候选出发问“是否合法”；筛法从每条公共约束出发批量淘汰候选，避免重复发现同一原因。',next:['combinations','number-theory'],challenge:'记录每个合数第一次被划掉时的 p，它为什么恰好是最小质因子？'}
  });

  const combCpp=`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int main() {
    int n, k; long long mod;
    cin >> n >> k >> mod;
    vector<vector<long long>> c(n + 1, vector<long long>(k + 1, 0));
    c[0][0] = 1 % mod;
    for (int i = 1; i <= n; ++i) {
        c[i][0] = 1 % mod;
        for (int j = 1; j <= min(i, k); ++j) {
            c[i][j] = (c[i - 1][j - 1] + c[i - 1][j]) % mod;
        }
    }
    cout << c[n][k] << '\\n';
}`;
  CF.register({id:'combinations',section:'math',title:'组合数与计数 DP',subtitle:'最后一个元素选不选，就能推导整座杨辉三角。',level:'核心',tags:['组合数','二项式系数','Pascal','杨辉三角','计数','模数','逆元','排列组合'],prerequisites:['backtracking','number-theory'],summary:'计算 C(n,k) mod m。先用互斥且完备的分类推出递推，再说明为什么它适用于合数模数，以及阶乘逆元方法额外需要哪些条件。',lesson:{recognize:['从 n 个互异下标中无序选择 k 个，且不允许重复选。排列数、有重组合是不同模型。','n 不大、模数可能是合数时，杨辉三角只做加法，可靠且容易证明。','n 很大且有大量查询时需要更强的预处理或数论；本章实际运行的是 O(nk) Pascal 递推，不把阶乘逆元或 Lucas 定理冒充为已实现实验。'],derive:[
      {title:'01 · 从“最后一个元素”分两类',text:'所有 k 元子集按是否包含第 n 个元素分成两类：不包含时从前 n−1 个选 k 个；包含时还需从前 n−1 个选 k−1 个。两类互不重叠且覆盖所有答案，因此 C(n,k)=C(n−1,k)+C(n−1,k−1)。'},
      {title:'02 · 边界承载了问题语义',text:'C(n,0)=1，因为空集恰有一种；C(0,0)=1；k>n 时为0。不是所有 DP 都能把整张表初始化为0后直接转移，初值必须对应真实的空问题。'},
      {title:'03 · 依赖从上一行流向下一行',text:'c[i][j] 只读上一行的 j−1 和 j。按 i 从小到大填表，每次使用的状态已经计算完成。可视化把两个来源格与新格同时标出；结果是 c[n][k]，不是整行求和。'},
      {title:'04 · 取模不会破坏加法递推',text:'只关心答案模 m 时，每次相加后立即取模即可。因为没有除法，这个算法对任意正模数都成立，包括合数和 m=1。二维表可压成一行，但 j 必须从大到小更新，以保留上一行的 j−1。'},
      {title:'05 · 阶乘公式不是无条件的取模公式',text:'普通整数中 C(n,k)=n!/(k!(n−k)!)。若改用阶乘与模逆元，在质数 p 且 n<p 时可预处理阶乘/逆阶乘后 O(1) 查询；n≥p 会出现0阶乘，合数模数也可能无逆元，需要另行处理。不要把普通除法照搬到模运算里。'}
    ],invariant:{title:'每个表格单元都有明确计数对象',text:'完成第 i 行后，对每个 j，c[i][j] 等于从前 i 个互异下标中选 j 个的方案数 mod m；j>i 的状态保持0。',proof:['第0行只有 c[0][0]=1%m，其余是0，符合空集语义。','对非空选取按是否选择第 i 个元素分为互斥、完备的两类；分别对应上一行的 j 与 j−1。相加取模保持同余。','按 i 递增保证依赖先计算；结束后 c[n][k] 就是所问对象的计数。']},complexity:{time:'包括初始化为 O((n+1)(k+1))；当 n,k≥1 时通常记 O(nk)。实际转移数为 ∑ᵢ min(i,k)。',space:'当前二维实现 O((n+1)(k+1))；可压缩到 O(k+1)，但必须倒序更新。正参数下通常分别记 O(nk)、O(k)。',conditions:'n 为互异元素数，k 为选取数量，m 为正模数。实验 n≤12、k≤15、m≤10⁹；每次只加两个小于 m 的值，long long 与 JS 都精确。'},pitfalls:[
      {title:'把组合当成排列',text:'组合不区分选中元素的先后顺序，排列才区分。',counterexample:'从 {A,B,C} 选2个有 AB、AC、BC 共3种，不是6种。'},
      {title:'忘记空集这一种',text:'c[i][0] 应为1%m，而不是0。',counterexample:'C(0,0)=1，若全部初始化为0，后续每一格也都会是0。'},
      {title:'模数下直接做除法',text:'先取余再用整数除法一般错误，逆元存在还要互质。',counterexample:'C(4,2)=6≡2 (mod4)，但 4! mod4=0，2! mod4=2，无法用 0/2/2 得到正确答案。'},
      {title:'一维压缩时正序更新',text:'正序会读取本行刚写入的数据，破坏“来自上一行”的依赖。',counterexample:'从 [1,1,0] 正序更新下一行，先把 c[1] 改成2，再令 c[2]+=c[1] 得到2；正确的 C(2,2) 是1。'}
    ],applications:['无序选择、格点路径（选择向右步骤的位置）、按贡献乘组合数的计数问题。','从简单的两类划分理解 DP 计数，进而辨认方案是否重复、边界是否为空集。']},input:{description:'n：0–12；k：0–15（允许 k>n，结果为0）；mod：1–1000000000。表格中 i 是元素数，j 是选取数。',default:{n:7,k:3,mod:1000},presets:[{name:'看依赖汇合',data:{n:7,k:3,mod:1000}},{name:'合数模数也有效',data:{n:4,k:2,mod:4}},{name:'空集边界',data:{n:0,k:0,mod:97}},{name:'选得太多',data:{n:3,k:5,mod:97}},{name:'模一',data:{n:6,k:2,mod:1}}],validate(d){obj(d);integer(d.n,'n',0,12);integer(d.k,'k',0,15);integer(d.mod,'mod',1,1000000000);}},random(seed){const r=rng(seed);return {n:r(0,12),k:r(0,15),mod:r(1,10000)};},run(d){const c=Array.from({length:d.n+1},()=>Array(d.k+1).fill(0)),frames=[];function push(title,explanation,lines,activeCells=[]){frames.push({title,explanation,lines,tables:[{label:'c[i][j]：从 i 个下标中选 j 个（行首为 i）',columns:['i \\ j',...Array.from({length:d.k+1},(_,i)=>String(i))],rows:c.map((row,i)=>[i,...row]),activeCells:activeCells.map(([i,j])=>[i,j+1])}],metrics:[{label:'n',value:d.n},{label:'k',value:d.k},{label:'mod',value:d.mod}]});}c[0][0]=1%d.mod;push('空集恰有一种','c[0][0]=1 mod m，其余还未填充的格子暂为0。',[loc(combCpp,'c[0][0] =')],[[0,0]]);for(let i=1;i<=d.n;i++){c[i][0]=1%d.mod;push(`第 ${i} 行的空集边界`,`从 ${i} 个元素里一个也不选，仍只有一种。`,[loc(combCpp,'c[i][0] =')],[[i,0]]);for(let j=1;j<=Math.min(i,d.k);j++){c[i][j]=(c[i-1][j-1]+c[i-1][j])%d.mod;push(`计算 C(${i},${j})`,`${c[i-1][j]}（不选最后一项）+ ${c[i-1][j-1]}（选最后一项）≡ ${c[i][j]} (mod ${d.mod})。`,[loc(combCpp,'c[i][j] =')],[[i-1,j],[i-1,j-1],[i,j]]);}}push('读出目标状态',`C(${d.n},${d.k}) mod ${d.mod} = ${c[d.n][d.k]}${d.k>d.n?'，因为不可能选出超过总数的元素':''}。`,[loc(combCpp,'cout << c[n][k]')],[[d.n,d.k]]);return {frames,result:{value:c[d.n][d.k]}};},oracle(d){if(d.k>d.n)return {value:0};let count=0;for(let mask=0;mask<2**d.n;mask++){let bits=0,x=mask;while(x){bits+=x&1;x>>=1;}if(bits===d.k)count++;}return {value:count%d.mod};},cpp:combCpp,cppInput:d=>`${d.n} ${d.k} ${d.mod}\n`,cppOutput:s=>({value:Number(s.trim())}),exercises:[{question:'C(5,2) 按是否选最后一个元素拆成什么？',options:['C(4,2)+C(4,1)','C(4,2)×C(4,1)','C(5,1)+C(4,2)','C(4,1)+C(3,1)'],answer:0,explanation:'不选最后一个：从前4个选2个；选最后一个：从前4个再选1个。两类互斥且完备。'},{question:'为什么本章可以用合数模数，而阶乘逆元方法不能直接照搬？',options:['因为小数据没有除法问题','本章只有加法，取模与加法兼容；阶乘方法涉及可能不存在的逆元','因为合数也一定有逆元','因为所有答案都小于模数'],answer:1,explanation:'Pascal 递推不需要任何除法。阶乘分母若不与模数互质就没有逆元。'},{question:'一维压缩 Pascal 表时，j 应怎样遍历？',options:['从小到大','从大到小','随机顺序','只更新奇数位置'],answer:1,explanation:'倒序让 c[j−1] 尚未被本行覆盖，仍代表上一行。这个依赖顺序与01背包倒序是同一思想。'}],sources:[{title:'cp-algorithms · Binomial Coefficients',url:'https://cp-algorithms.com/combinatorics/binomial-coefficients.html',note:'Pascal 递推、模数条件、阶乘与逆元方法的适用边界。'}],transfer:{contrast:'组合公式是计数结果，DP 递推揭示了结果如何由互斥子问题构成。两者要共用同一个“计数对象”的定义。',next:['knapsack','digit-dp','subset-dp'],challenge:'把二维表压成一行，并保留本章作为 oracle；特意试试正序更新会在哪个最小输入上出错。'}});
})();
