/* 算法图谱：纯计算核心。无网络、无依赖，也可在 Node 中验算。 */
(function (root) {
  'use strict';
  const chapters = [];
  const sections = [
    { id: 'foundation', name: '基础与建模', short: '基础', color: '#6a7d5b', glyph: '01', description: '先看规模，再看结构。用最朴素的办法建立可信答案。' },
    { id: 'sequence', name: '单调性与选择', short: '单调性', color: '#a26b3c', glyph: '02', description: '指针为什么不用回头？一次选择凭什么不会后悔？' },
    { id: 'structures', name: '数据结构', short: '结构', color: '#327b78', glyph: '03', description: '不是背模板，而是为查询设计一份刚刚好的摘要。' },
    { id: 'dp', name: '动态规划', short: 'DP', color: '#796ca0', glyph: '04', description: '把重复的未来合并。状态、转移、顺序、答案，逐层说清。' },
    { id: 'graph', name: '图与树', short: '图论', color: '#5478a0', glyph: '05', description: '看见连接关系，也看见搜索、距离与依赖的不同。' },
    { id: 'strings', name: '字符串', short: '字符串', color: '#a3657b', glyph: '06', description: '利用已经匹配的信息，不从头做一遍。' },
    { id: 'math', name: '数论与组合', short: '数学', color: '#86783c', glyph: '07', description: '把公式变成过程，再把过程的前提写在纸上。' }
  ];
  const order = ['complexity','merge-sort','prefix-sum','difference','backtracking','sliding-window','binary-answer','greedy-interval','monotonic-stack','monotonic-deque','fenwick','segment-tree','dsu','knapsack','lis','interval-dp','tree-dp','subset-dp','digit-dp','bfs','topological-sort','dijkstra','mst','scc','lca','kmp','z-function','trie','rolling-hash','number-theory','sieve','combinations'];
  const paths = [
    {id:'first-principles', name:'把基础连成线', eyebrow:'先建立判断力', description:'从工作量、前缀信息到单调性，再走进最小的一维 DP。', ids:['complexity','merge-sort','prefix-sum','difference','sliding-window','binary-answer','greedy-interval','knapsack','lis']},
    {id:'monotonicity', name:'一次走懂单调性', eyebrow:'不回头的理由', description:'窗口、栈、队列、二分看起来不同，背后都是“哪些候选还能有用”。', ids:['sliding-window','monotonic-stack','monotonic-deque','binary-answer','lis']},
    {id:'dp-models', name:'从搜索长出 DP', eyebrow:'状态是压缩后的历史', description:'先写清暴力搜索，再发现哪些过去不影响未来。进入树形 DP 前，用 BFS 补上树的遍历与父子关系。', ids:['backtracking','knapsack','lis','interval-dp','bfs','tree-dp','subset-dp','digit-dp']},
    {id:'graph-thinking', name:'沿着连接关系走', eyebrow:'从遍历到结构', description:'先把图存对、遍历对，再区分路径最短、连接最省与分量收缩。', ids:['bfs','topological-sort','dsu','dijkstra','mst','scc','lca','tree-dp']},
    {id:'query-design', name:'为查询设计摘要', eyebrow:'从静态走向动态', description:'先明确更新是什么，再决定存前缀、树状区间、树节点还是字符串摘要。', ids:['prefix-sum','difference','fenwick','segment-tree','trie','kmp','z-function','rolling-hash']}
  ];
  const glossary = [
    ['n / m','通常是元素或顶点数 / 边或查询数。每章复杂度卡会重新精确定义。'],
    ['a[i] · 零基下标','a[0] 是第一个元素。可视化格子下方的小数字是下标，不是元素值。'],
    ['[l, r)','左端包含，右端不含，长度 r − l。空区间 l = r 合法；个别 DP 用闭区间时会单独声明。'],
    ['O(f(n))','渐近上界，忽略常数与低阶项。它不是秒数，也不自动说明空间复杂度。'],
    ['Θ(f(n))','渐近紧确界，数量级既有上界也有下界。遇到 n = 0 的实现还要单独看分支。'],
    ['log n','复杂度里底数通常不影响数量级。二分/倍增可理解为 log₂ n。'],
    ['mod p / %','取余。C++ 负数取余可能为负；把值规范到 [0,p) 常写 (x % p + p) % p。'],
    ['INF / ∞ / null','不可达或尚未找到答案的哨兵，不是一个可以随意相加的普通整数。输出里的 null 通常表示无解或不可达。'],
    ['mask / (1 << i)','mask 的第 i 位表示元素 i 是否在集合中。位移需检查位宽，C++ 大掩码常用 1LL。'],
    ['不变量','循环或递归的关键边界上始终为真的性质。初始化、保持、终止三步把直觉变成证明。'],
    ['摊还分析','统计整段操作的总成本，而不是只看最贵的一次。栈里每个元素最多进出一次，所以总计 O(n)。'],
    ['oracle / 对拍','用独立、慢而可信的算法算小数据，与优化算法比较。通过有限测试不是数学证明。']
  ];
  function register(chapter) {
    if (!chapter || typeof chapter.id !== 'string' || chapters.some(c=>c.id===chapter.id)) throw new Error('章节 ID 缺失或重复');
    chapters.push(chapter);
  }
  function all() { return chapters.slice().sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id)); }
  function find(id) { return chapters.find(c=>c.id===id); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function stable(v) {
    if (Array.isArray(v)) return '['+v.map(stable).join(',')+']';
    if (v && typeof v === 'object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
    return JSON.stringify(v);
  }
  function same(a,b) { return stable(a)===stable(b); }
  function search(query, opts) {
    opts=opts||{};
    const terms=String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
    return all().filter(c=>{
      if(opts.section && opts.section!=='all' && c.section!==opts.section)return false;
      if(opts.level && opts.level!=='all' && c.level!==opts.level)return false;
      const hay=[c.title,c.subtitle,c.summary,c.id,...(c.tags||[])].join(' ').toLowerCase();
      return terms.every(t=>hay.includes(t));
    });
  }
  function prepare(chapter, raw) {
    if(!chapter) throw new Error('没有找到这一章。');
    const input=typeof raw==='string'?JSON.parse(raw):clone(raw);
    if(!input || Array.isArray(input) || typeof input!=='object')throw new Error('输入必须是 JSON 对象，例如 {"n": 5}。');
    chapter.input.validate(input);
    const output=chapter.run(clone(input));
    if(!output || !Array.isArray(output.frames) || !output.frames.length) throw new Error('这组输入没有生成有效步骤。');
    if(output.frames.length>20000) throw new Error('这组输入的步骤太多，请缩小教学数据。');
    return {input,frames:output.frames,result:output.result};
  }
  function createPlayer(options) {
    options=options||{};
    const schedule=options.schedule||((fn,ms)=>setTimeout(fn,ms));
    const cancel=options.cancel||(id=>clearTimeout(id));
    let frames=[],index=0,playing=false,speed=1,timer=null;
    const listeners=new Set();
    function snapshot(){return {frames,index,frame:frames[index],playing,speed,total:frames.length};}
    function emit(){const s=snapshot();listeners.forEach(fn=>fn(s));}
    function clear(){if(timer!==null){cancel(timer);timer=null;}}
    function tick(){timer=null;if(!playing)return;if(index<frames.length-1)index++;if(index>=frames.length-1)playing=false;emit();if(playing)timer=schedule(tick,1100/speed);}
    function pause(silent){clear();playing=false;if(!silent)emit();}
    return {
      subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
      state:snapshot,
      setFrames(next){pause(true);frames=next||[];index=0;emit();},
      seek(next){pause(true);index=Math.max(0,Math.min(Math.max(0,frames.length-1),Math.trunc(Number(next)||0)));emit();},
      next(){this.seek(index+1);}, previous(){this.seek(index-1);}, reset(){this.seek(0);},
      play(){if(frames.length<2)return;if(playing)return;if(index===frames.length-1)index=0;playing=true;emit();timer=schedule(tick,1100/speed);},
      pause(){pause(false);}, toggle(){playing?this.pause():this.play();},
      setSpeed(value){const v=Number(value);if(![0.5,1,1.5,2,3].includes(v))return;speed=v;if(playing){clear();timer=schedule(tick,1100/speed);}emit();},
      destroy(){pause(true);listeners.clear();}
    };
  }
  function createProgress(storage) {
    const key='cf-atlas-progress-v1';let data={mastered:[],answers:{},last:null};let available=true;
    try{const parsed=JSON.parse(storage.getItem(key)||'null');if(parsed && typeof parsed==='object'){data.mastered=Array.isArray(parsed.mastered)?parsed.mastered.filter(x=>typeof x==='string'):[];data.answers=parsed.answers&&typeof parsed.answers==='object'&&!Array.isArray(parsed.answers)?parsed.answers:{};data.last=typeof parsed.last==='string'?parsed.last:null;}}catch(_){available=false;}
    function save(){try{storage.setItem(key,JSON.stringify(data));available=true;}catch(_){available=false;}}
    return {
      get:()=>clone(data),available:()=>available,
      toggle(id){data.mastered=data.mastered.includes(id)?data.mastered.filter(x=>x!==id):data.mastered.concat(id);save();return data.mastered.includes(id);},
      answer(id,index,value){if(!Object.prototype.hasOwnProperty.call(data.answers,id)||typeof data.answers[id]!=='object'||!data.answers[id])data.answers[id]={};data.answers[id][index]=value;save();},
      visit(id){data.last=id;save();}
    };
  }
  function escape(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function display(v){if(v===null)return '∅';if(v===true)return '是';if(v===false)return '否';if(typeof v==='object')return JSON.stringify(v);return String(v===undefined?'·':v);}
  function getAncestors(id){const seen=new Set();function walk(x){const c=find(x);if(!c)return;(c.prerequisites||[]).forEach(p=>{if(!seen.has(p)){seen.add(p);walk(p);}});}walk(id);seen.delete(id);return all().filter(c=>seen.has(c.id));}
  const CF={register,all,find,sections,order,paths,glossary,clone,stable,same,search,prepare,createPlayer,createProgress,escape,display,getAncestors};
  root.CF=CF;
  if(typeof module!=='undefined'&&module.exports)module.exports=CF;
})(typeof globalThis!=='undefined'?globalThis:this);
