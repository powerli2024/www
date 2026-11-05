(function () {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  // 固定轮换选项，避免“永远选第一项”；同一输入仍得到相同轨迹。
  const q = (prompt, options, correct, explain) => {
    const shift = Array.from(prompt).reduce((sum, ch) => sum + ch.codePointAt(0), 0) % options.length;
    return { prompt, options: options.slice(shift).concat(options.slice(0, shift)), correct: (correct - shift + options.length) % options.length, explain };
  };
  const put = (frames, state, extra) => frames.push(copy(Object.assign({
    title: '', reason: '', invariant: '', lines: [], metrics: {}
  }, state, extra)));
  const block = (v, title, body) => '<section class="lab-visual-block"><h4>' + v.esc(title) + '</h4>' + body + '</section>';
  const note = (v, text) => '<p class="lab-caption">' + v.esc(text) + '</p>';
  const ints = (a, max) => {
    if (!Array.isArray(a) || a.length > max || !a.every(Number.isSafeInteger)) throw new Error('请输入限定规模内的整数数组。');
  };

  const flow = {
    title: '允许撤回，才有最大流',
    subtitle: '在剩余网络上运行 BFS，亲眼看到一次反向增广。',
    concept: '正向残量是还能增加多少，反向残量是可以撤回多少。EK 的最短指边数；停止时用等值割证明最优。',
    presets: [
      { name: '两人两任务：必须改配', data: {
        nodes: ['s', 'L1', 'L2', 'R1', 'R2', 't'],
        positions: [[50,150],[215,65],[215,235],[385,65],[385,235],[550,150]],
        edges: [[0,1,1],[0,2,1],[1,3,1],[1,4,1],[2,3,1],[3,5,1],[4,5,1]], source: 0, sink: 5
      } },
      { name: '不同容量：瓶颈与割', data: {
        nodes: ['s','a','b','t'], positions: [[60,150],[245,65],[245,235],[530,150]],
        edges: [[0,1,3],[0,2,2],[1,2,1],[1,3,2],[2,3,3]], source: 0, sink: 3
      } }
    ],
    code: [
      '每条原边建立正向残量 c 与专属反向残量 0',
      '每轮从 s 开始 BFS；首次入队就标记并记录父边',
      '只沿 rem > 0 的边探索，直到发现 t 或队列为空',
      '若 t 不可达：返回当前流与源点可达集 A',
      '沿父边恢复路径，δ = 路径上最小残量',
      '对路径每条 e：e.rem -= δ；e.rev.rem += δ',
      '流值 += δ；回到 BFS',
      '终止时：流值 = 原图 A→(V − A) 的割容量'
    ],
    build(data) {
      const d = copy(data), n = d.nodes.length, s = d.source, t = d.sink;
      if (n < 2 || n > 8 || s === t || !Number.isInteger(s) || !Number.isInteger(t) || s < 0 || t < 0 || s >= n || t >= n) throw new Error('流网络端点不合法。');
      if (!Array.isArray(d.edges) || d.edges.length > 24) throw new Error('演示只支持小规模流网络。');
      const adj = Array.from({length:n}, () => []), residual = [], forward = [];
      d.edges.forEach(([u,v,c], index) => {
        if (![u,v,c].every(Number.isSafeInteger) || u < 0 || v < 0 || u >= n || v >= n || u === v || c < 0) throw new Error('容量须为非负整数，且不含自环。');
        const id = residual.length;
        residual.push({u,v,rem:c,rev:id+1,index,reverse:false}, {u:v,v:u,rem:0,rev:id,index,reverse:true});
        adj[u].push(id); adj[v].push(id+1); forward.push(id);
      });
      const frames = []; let value = 0, round = 0;
      const snapshot = () => ({nodes:d.nodes, positions:d.positions, original:d.edges,
        residual:residual.filter(e => e.rem > 0).map(e => ({u:e.u,v:e.v,rem:e.rem,reverse:e.reverse,index:e.index})),
        flows:forward.map((id,i) => d.edges[i][2]-residual[id].rem), value, round, queue:[], distances:[], path:[]});
      put(frames, snapshot(), {title:'先给每次分配留一条撤回通道', reason:'图上显示当前正残量边；表中始终保留原边流量。零流是起点。', invariant:'原边流量在容量内；中间点收支相等。', lines:[1], metrics:{流值:0,原边数:d.edges.length},
        question:q('EK 用 BFS 找的“最短”是什么？',['路径边数最少','路径容量和最小','瓶颈容量最大'],0,'BFS 按边数分层；容量只决定一条路最多增广多少。')});
      while (true) {
        round++; const dist = Array(n).fill(null), parent = Array(n).fill(-1), queue = [s]; dist[s] = 0;
        let head = 0;
        while (head < queue.length && dist[t] === null) {
          const u = queue[head++], discovered = [];
          for (const id of adj[u]) {
            const e = residual[id];
            if (e.rem > 0 && dist[e.v] === null) {
              dist[e.v] = dist[u]+1; parent[e.v] = id; queue.push(e.v); discovered.push(e.v);
              if (e.v === t) break;
            }
          }
          put(frames, snapshot(), {title:'第 '+round+' 轮：展开 '+d.nodes[u], reason:discovered.length ? '首次发现 '+discovered.map(i=>d.nodes[i]).join('、')+'，入队即记录层号。' : '没有新的可达顶点，继续处理队首。', invariant:'队列按非递减层号处理；每个顶点本轮只入队一次。', lines:[2,3], metrics:{流值:value,轮次:round,待处理:queue.length-head}, current:u, queue:queue.slice(head), distances:dist});
        }
        if (dist[t] === null) {
          const cut = dist.map((x,i)=>x!==null ? i : -1).filter(i=>i>=0);
          const cutCapacity = d.edges.reduce((a,[u,v,c])=>a+(cut.includes(u)&&!cut.includes(v)?c:0),0);
          put(frames, snapshot(), {title:'无增广路：流与割给出同一个答案', reason:'A={'+cut.map(i=>d.nodes[i]).join(', ')+'}。原图从 A 到外部的容量为 '+cutCapacity+'，当前可行流恰好达到此上界。', invariant:'可行流 ≤ 任意割容量；上下界相等即最优。', lines:[4,8], metrics:{最大流:value,割容量:cutCapacity,增广轮数:round-1}, cut, cutCapacity, distances:dist, done:true});
          break;
        }
        const ids = []; let at = t;
        while (at !== s) { const id = parent[at]; ids.push(id); at = residual[id].u; }
        ids.reverse(); const delta = Math.min(...ids.map(id=>residual[id].rem));
        const path = ids.map(id=>({u:residual[id].u,v:residual[id].v,reverse:residual[id].reverse,index:residual[id].index}));
        const hasReverse = path.some(e=>e.reverse);
        put(frames, snapshot(), {title:'增广前，先预测这条路能做什么', reason:'路径为 '+[s,...path.map(e=>e.v)].map(i=>d.nodes[i]).join(' → ')+'。检查每一条残量；标有“撤回”的边不属于新增运输。', invariant:'增广量不能超过路径上任意一条边的残量。', lines:[5], metrics:{当前流值:value,路径边数:path.length}, path, distances:dist,
          question:hasReverse ? q('这条路使用反向边，会怎样改变对应原边？',['撤回该原边的一部分已有流','增加一条反向原边','原边流量保持不变'],0,'反向残量表示撤销能力；本轮同时改配，守恒仍然成立。') : q('本轮可以增广多少？',[String(delta),String(delta+1),'直接使用整张图的总容量'],0,'路径瓶颈是最小残量 '+delta+'，超过它就会使某条残量变负。')});
        ids.forEach(id=>{residual[id].rem-=delta;residual[residual[id].rev].rem+=delta;}); value+=delta;
        put(frames, snapshot(), {title:'完成增广 '+delta+'，更新正反两项', reason:hasReverse ? '撤销旧分配，同时建立新分配。表中相应原边流量减少，而源汇净流仍然增加。' : '沿路径增加流量；更新后的反向残量保留未来调整的可能。', invariant:'所有原边满足容量约束；每个中间点的流入等于流出。', lines:[6,7], metrics:{增广量:delta,流值:value}, path, delta, phase:'augmented'});
      }
      return frames;
    },
    render(f,v) {
      const nodes = f.nodes.map((label,i)=>({id:String(i),label,x:f.positions?.[i]?.[0] ?? 65+i*65,y:f.positions?.[i]?.[1] ?? 150,
        state:f.current===i?'active':f.cut?.includes(i)?'selected':'default', tag:f.distances[i]!==null && f.distances[i]!==undefined?'层 '+f.distances[i]:''}));
      const edges = f.residual.map(e=>({u:String(e.u),v:String(e.v),label:(e.reverse?'撤回 ':'')+e.rem,state:f.path.some(p=>p.u===e.u&&p.v===e.v&&p.index===e.index&&p.reverse===e.reverse)?'active':'default'}));
      return block(v,'当前剩余网络',v.graph({nodes,edges,directed:true}))+note(v,'只画正残量边。队列：'+(f.queue.map(i=>f.nodes[i]).join(' → ')||'空'))+
        block(v,'原图账本：流量 / 容量',v.table(['原边','流量','容量'],f.original.map(([u,w,c],i)=>[f.nodes[u]+'→'+f.nodes[w],f.flows[i],c]),{}));
    }
  };

  const kmp = {
    title:'失配后保留已经知道的信息', subtitle:'先构建 π，再观察文本指针不回退；同时显示考试版 next。',
    concept:'π[i] 含当前位置；考试版 next[j] 只看前 j 个字符，next[0]=−1。完整匹配后保留 border，才能找到重叠答案。',
    presets:[{name:'重复前缀：两次失配回退',data:{text:'AAABAAABAAABAAAD',pattern:'AAABAAAD'}},{name:'重叠匹配：AAAAA / AAA',data:{text:'AAAAA',pattern:'AAA'}}],
    code:[
      'π[0]=0；逐个扩展模式前缀',
      'j=π[k−1]；失配时 j=π[j−1]，直到可扩展或 j=0',
      '若 P[k]==P[j]：j++；π[k]=j',
      'next[0]=−1；next[j]=π[j−1]（j≥1）',
      '扫描文本：i 只向右，j 表示已匹配前缀长度',
      '失配：j=π[j−1]；文本 i 保持不动',
      '相等：j++；消耗当前文本字符',
      '若 j==m：记录 i−m；随后 j=π[m−1]，保留重叠'
    ],
    build(data) {
      const text = Array.from(String(data.text)), pattern = Array.from(String(data.pattern));
      if (text.length>24 || pattern.length>12) throw new Error('演示文本至多24个字符，模式至多12个字符。');
      const n=text.length,m=pattern.length,pi=Array(m).fill(null),frames=[],matches=[];
      let i=0,j=0;
      const state=()=>({text,pattern,pi,next:[-1,...pi],i,j,matches,phase:'text',focus:null});
      if (!m) {
        put(frames,state(),{title:'空模式单独处理',reason:'本课约定空串在每个间隙匹配。',invariant:'不访问不存在的模式字符。',lines:[5],metrics:{匹配数:n+1},matches:Array.from({length:n+1},(_,k)=>k),done:true});return frames;
      }
      pi[0]=0;
      put(frames,state(),{title:'先明确每个数组格子的含义',reason:'先研究模式自身的前后缀；下面尚未填写的位置以空格保留。',invariant:'真前缀不包含整串，因此单字符的 π 为 0。',lines:[1,4],metrics:{模式长度:m},phase:'prefix',focus:0,
        question:q('考试版 next[j] 对应哪一项？',['π[j−1]，另设 next[0]=−1','直接等于 π[j]','总是模式长度减一'],0,'两个定义相差一个位置：前 j 个字符的最后下标是 j−1。')});
      for (let k=1;k<m;k++) {
        let b=pi[k-1];const chain=[b];
        while (b>0 && pattern[k]!==pattern[b]) { b=pi[b-1];chain.push(b); }
        if(pattern[k]===pattern[b]) b++;
        pi[k]=b;
        put(frames,state(),{title:'构建前缀 '+pattern.slice(0,k+1).join(''),reason:'候选长度依次为 '+chain.join(' → ')+'；'+(b?'成功扩展后，最长 border 长度为 '+b+'。':'无法扩展，最长 border 为空。'),invariant:'已填 π[k] 是该前缀的最长相等真前后缀长度。',lines:[2,3,4],metrics:{已处理模式字符:k+1,本格值:b},phase:'prefix',focus:k,candidates:chain});
      }
      put(frames,state(),{title:'数组准备好，开始扫描文本',reason:'注意两套数组的定义；文本失配时只缩短候选模式长度。',invariant:'已处理文本的最后 j 个字符等于模式前 j 个字符。',lines:[5],metrics:{已处理文本:0,匹配长度:0},
        question:q('文本失配以后，应该先改变什么？',['沿模式的 border 链缩短 j','把文本 i 退回到起点','清空 π，重新构建'],0,'已有文本信息仍然有效；只需检查可能与它对齐的更短模式前缀。')});
      while(i<n) {
        while(j>0 && text[i]!==pattern[j]) {
          const before=j; j=pi[j-1];
          put(frames,state(),{title:'失配：i='+i+' 保持，j 从 '+before+' 退到 '+j,reason:'保留下来的后缀已知等于模式前缀；新候选起点是 '+(i-j)+'，无需重读先前文本。',invariant:'回退后仍保有 j 个已知相等字符；没有消耗当前文本字符。',lines:[6],metrics:{文本位置:i,匹配长度:j,模式位移:before-j},phase:'fallback',focus:i,oldJ:before});
        }
        const used=i, equal=text[i]===pattern[j]; if(equal) j++;i++;
        const found=j===m;if(found)matches.push(i-m);
        put(frames,state(),{title:found?'找到匹配，起点 '+(i-m):'处理文本位置 '+used+'：'+text[used],reason:found?'完整模式已匹配。下一步必须保留可复用前后缀，才能继续寻找重叠出现。':equal?'字符相等，已匹配长度增加一。':'模式首字符也不相等，本字符不能作为匹配开头。',invariant:'输出时确实有连续 m 个字符相等；文本已处理位置不减少。',lines:found?[7,8]:[7],metrics:{已处理文本:i,匹配长度:j,匹配数:matches.length},focus:used,
          ...(found?{question:q('为了继续寻找匹配，成功后 j 应怎样处理？',['保留最长 border：j='+pi[m-1],'保留 j=m，下一步直接访问 P[m]','让文本指针回退 m 格'],0,'完整串的最长 border 长度为 '+pi[m-1]+'；它可以直接作为下一次匹配的已知前缀。')}:{})});
        if(found)j=pi[m-1];
      }
      put(frames,state(),{title:'扫描完成：'+matches.length+' 次匹配',reason:'起点为 '+(matches.join('、')||'无')+'。构建和匹配的总回退量受 j 的总增加量约束，故总时间 O(n+m)。',invariant:'文本 i 单调向右；回退不是从头再比较。',lines:[5,6,8],metrics:{文本长度:n,模式长度:m,匹配数:matches.length},done:true});
      return frames;
    },
    render(f,v) {
      const labels=f.text.map((_,i)=>String(i));
      return block(v,'文本 T（下标从 0 开始）',v.array(f.text,{active:f.phase==='prefix'?[]:f.focus!==null?[f.focus]:[],selected:f.matches.flatMap(s=>Array.from({length:f.pattern.length},(_,k)=>s+k)),labels}))+
        block(v,'模式 P',v.array(f.pattern,{active:f.phase==='prefix'?[f.focus]:f.j<f.pattern.length?[f.j]:[],selected:Array.from({length:Math.min(f.j,f.pattern.length)},(_,k)=>k),labels:f.pattern.map((_,i)=>String(i))}))+
        note(v,'已处理文本 '+f.i+' 个；当前已匹配长度 j='+f.j+'。'+(f.phase==='prefix'?'正在构建模式信息。':'当前候选起点 i−j='+(f.i-f.j)+'。'))+
        block(v,'两种约定，逐格对照',v.table(['下标','字符','π（含本字符）','考试版 next（前 j 字符）'],Array.from({length:f.pattern.length+1},(_,i)=>[i,f.pattern[i]??'结束',i<f.pattern.length?(f.pi[i]??'…'):'不定义',f.next[i]??'…']),{}));
    }
  };

  const reduction = {
    title:'把独立集实例变成顶点覆盖实例', subtitle:'同一张图，解集取补；数量阈值从“至少 k”变成“至多 n−k”。',
    concept:'规约需要多项式构造与“当且仅当”两个方向。小图枚举检查只能验证实例，不能替代对所有图的证明。',
    presets:[{name:'四点路径：两边都是“是”',data:{n:4,edges:[[0,1],[1,2],[2,3]],k:2,selected:[0,2]}},{name:'三角形：k=2，两边都是“否”',data:{n:3,edges:[[0,1],[1,2],[0,2]],k:2,selected:[0,1]}}],
    code:[
      '输入独立集实例 (G,k)，要求存在至少 k 个互不相邻点',
      '保留图 G，顶点覆盖预算设为 n−k',
      '给一个候选 S，令 C=V − S（补集）',
      '逐边检查：S 内无边 ⇔ 每条边至少一个端点在 C',
      '|S|≥k ⇔ |C|=n−|S|≤n−k',
      '正向：独立集取补得到覆盖；反向：覆盖取补得到独立集',
      '构造只拷贝图和改阈值，规模与时间都是多项式',
      '小图枚举核对结果；一般结论由双向证明保证'
    ],
    build(data) {
      const d=copy(data),n=d.n,k=d.k;
      if(!Number.isInteger(n)||n<1||n>5||!Number.isInteger(k)||k<0||k>n)throw new Error('需满足 1≤n≤5，0≤k≤n。');
      if(!d.edges.every(([u,v])=>Number.isInteger(u)&&Number.isInteger(v)&&u>=0&&v>=0&&u<n&&v<n&&u!==v))throw new Error('需提供合法无向图。');
      const frames=[],all=Array.from({length:n},(_,i)=>i),budget=n-k;
      const inspect=S=>{const C=all.filter(i=>!S.includes(i)); const failed=d.edges.map(([u,v],i)=>S.includes(u)&&S.includes(v)?i:-1).filter(i=>i>=0);return {S,C,failed,independent:failed.length===0,cover:failed.length===0};};
      const chosen=inspect(d.selected||[]);
      const base={n,k,budget,edges:d.edges,S:[],C:[],failed:[],current:null,checkedEdge:null};
      put(frames,base,{title:'先读清两个判定问题',reason:'独立集禁止选中一条边的两个端点；顶点覆盖要求每条边至少一个端点被选中。',invariant:'讨论的是判定问题：输入实例的答案必须保持一致。',lines:[1],metrics:{顶点数:n,独立集至少:k},question:q('保留图不变，覆盖预算应该怎样设？',['至多 n−k='+budget,'至少 n−k='+budget,'至多 n+k='+(n+k)],0,'补集大小为 n−|S|。至少 k 个独立点对应至多 n−k 个覆盖点。')});
      put(frames,base,{title:'构造目标实例 (G, '+budget+')',reason:'边和顶点完全保留，只把数量要求改成覆盖预算。没有构造补图。',invariant:'构造大小为原图大小加一个阈值，不搜索最优解。',lines:[2,7],metrics:{覆盖预算:budget,原边数:d.edges.length}});
      const S=[],C=[];
      all.forEach(i=>{(chosen.S.includes(i)?S:C).push(i);put(frames,base,{title:'点 '+(i+1)+' 放入 '+(chosen.S.includes(i)?'S':'补集 C'),reason:'每个点恰属于 S、C 中一个；两集合没有重复，也不漏点。',invariant:'S 与 C 互补，完成分配后 |S|+|C|=n。',lines:[3],metrics:{已分配点:S.length+C.length,S大小:S.length,C大小:C.length},S,C,current:i});});
      d.edges.forEach(([u,v],ei)=>{put(frames,base,{title:'检查边 '+(u+1)+'—'+(v+1),reason:chosen.failed.includes(ei)?'两个端点都在 S：它破坏独立性，也恰好被 C 漏掉。':'S 没有同时拿走两个端点，所以 C 至少包含其中一个端点。',invariant:'同一条边同时决定两边条件，不是凭样例猜相关性。',lines:[4],metrics:{已检查边:ei+1,总边数:d.edges.length},...chosen,checkedEdge:ei});});
      let isExists=false,coverExists=false,witness=null,candidates=0;
      for(let mask=0;mask<(1<<n);mask++) {
        const candidate=all.filter(i=>mask&(1<<i));
        const z=inspect(candidate);
        if(candidate.length>=k && z.independent){isExists=true;if(!witness)witness=candidate;}
        if(z.C.length<=budget && z.cover)coverExists=true;
        if(candidate.length<k)continue;
        candidates++;
        put(frames,base,{title:'核对候选 S={'+candidate.map(i=>i+1).join(', ')+'}',reason:z.independent?'S 独立，其补集在预算内并覆盖所有边。':'S 内有边；同一条边在补集 C 中没有端点，覆盖也失败。',invariant:'这一步只检查一个实例；大小约束通过补集公式同步转换。',lines:[4,5,8],metrics:{候选编号:candidates,S大小:z.S.length,C大小:z.C.length},...z});
      }
      put(frames,base,{title:'正向证明：从独立集到覆盖',reason:'任意边两端不能都在 S，故至少一个在 C；同时 |C|=n−|S|≤n−k。',invariant:'从任意合法源问题证书出发，而不是只检查本例挑选的 S。',lines:[4,5,6],metrics:{方向:'独立集 → 覆盖'},...chosen,question:q('只证明这一方向，足以建立规约吗？',['还不够，目标的“是”也必须能反推出原题的“是”','够了，一个方向就是等价','只需运行几个样例'],0,'规约要求答案当且仅当；否则目标可能出现原题没有的假“是”。')});
      put(frames,base,{title:'反向证明：从覆盖到独立集',reason:'给任意预算内覆盖 C。若补集 V − C 内仍有一条边，它两端都不在 C，与覆盖定义矛盾；补集大小至少 k。',invariant:'两个方向加多项式构造，才组成完整规约证明。',lines:[5,6,7],metrics:{方向:'覆盖 → 独立集'},...chosen});
      put(frames,base,{title:'同一实例，两边答案均为'+(isExists?'“是”':'“否”'),reason:'本例枚举核对了 '+candidates+' 个满足大小要求的 S。一般等价性来自上面的任意边论证，不来自有限测试。',invariant:'有快速覆盖求解器，就能借此快速解决独立集；方向是 IS≤pVC。',lines:[8],metrics:{独立集存在:isExists?'是':'否',预算内覆盖存在:coverExists?'是':'否'},...inspect(witness||chosen.S),isExists,coverExists,witness,done:true});
      return frames;
    },
    render(f,v) {
      const graph=set=>v.graph({nodes:Array.from({length:f.n},(_,i)=>({id:String(i),label:String(i+1),x:300+190*Math.cos(2*Math.PI*i/f.n-Math.PI/2),y:150+105*Math.sin(2*Math.PI*i/f.n-Math.PI/2),state:f.current===i?'active':set.includes(i)?'selected':'default'})),edges:f.edges.map(([u,w],i)=>({u:String(u),v:String(w),label:'',state:f.failed.includes(i)?'rejected':f.checkedEdge===i?'active':'default'})),directed:false});
      return '<div class="lab-two">'+block(v,'源问题：S 至少 '+f.k+' 个点',graph(f.S))+block(v,'目标问题：C 至多 '+f.budget+' 个点',graph(f.C))+'</div>'+note(v,'S={'+f.S.map(i=>i+1).join(', ')+'}；C={'+f.C.map(i=>i+1).join(', ')+'}。红边同时表示 S 的内部边和 C 漏掉的边。');
    }
  };

  const bit = {
    title:'每一格究竟覆盖哪一段', subtitle:'按定义建树状数组，再沿两条不同方向的 lowbit 链修改和查询。',
    concept:'c[i] 保存 [i−lowbit(i)+1,i]。更新向包含当前点的更大区间走；查询把一个前缀分解成不重叠区间。',
    presets:[{name:'八个数：更新3，再查[2,6]',data:{a:[2,1,3,0,4,2,1,5],index:3,delta:2,l:2,r:6}},{name:'六个数：非2的幂也适用',data:{a:[3,1,4,1,5,9],index:3,delta:2,l:2,r:5}}],
    code:[
      'lowbit(i)=i&(-i)；使用 1-based 下标',
      'c[i]=sum(a[i−lowbit(i)+1..i])  // 按定义逐格展示建表',
      '更新 a[p]+=δ，从 i=p 开始',
      'while i≤n: c[i]+=δ；i+=lowbit(i)',
      'Prefix(x): ans=0；i=x',
      'while i>0: ans+=c[i]；i-=lowbit(i)',
      'Range(l,r)=Prefix(r)−Prefix(l−1)'
    ],
    build(data) {
      const d=copy(data);ints(d.a,12);const n=d.a.length;
      if(!n||![d.index,d.delta,d.l,d.r].every(Number.isSafeInteger)||d.index<1||d.index>n||d.l<1||d.l>d.r||d.r>n)throw new Error('更新和查询下标须位于数组范围。');
      const a=d.a.slice(),c=Array(n+1).fill(null),frames=[],lb=i=>i&-i;
      const state=()=>({a,c,n,index:d.index,delta:d.delta,l:d.l,r:d.r,active:null,covered:[],visited:[],phase:'build',accumulator:0});
      put(frames,state(),{title:'先固定区间含义，再写循环',reason:'静态前缀和查询快，但单点修改要改许多前缀。这里保存一些二进制对齐区间。',invariant:'本演示按定义逐格建表；单次更新和前缀查询均为 O(log n)。',lines:[1,2],metrics:{数组长度:n},question:q('c['+n+'] 覆盖哪段？',['['+(n-lb(n)+1)+','+n+']','['+(n-lb(n))+','+n+']','['+n+','+(n+lb(n))+']'],0,'覆盖长度是 lowbit('+n+')='+lb(n)+'；右端点必须为 '+n+'，向左数恰好 '+lb(n)+' 项。')});
      for(let i=1;i<=n;i++) {
        const left=i-lb(i)+1;c[i]=a.slice(left-1,i).reduce((x,y)=>x+y,0);
        put(frames,state(),{title:'建表 c['+i+']：区间 ['+left+','+i+']',reason:'只累加本格声明负责的区间。',invariant:'已填的每格都满足区间定义；空格尚未构建。',lines:[2],metrics:{当前下标:i,覆盖长度:lb(i),区间和:c[i]},active:i,covered:Array.from({length:lb(i)},(_,k)=>left-1+k)});
      }
      const next=d.index+lb(d.index);
      put(frames,state(),{title:'准备单点增加 '+d.delta,reason:'要改所有包含位置 '+d.index+' 的 c 区间；未包含该点的格子不用动。',invariant:'更新沿 i+=lowbit(i) 向上走；不是逐个下标扫描。',lines:[3,4],metrics:{修改位置:d.index,增量:d.delta},phase:'update',question:q('更新 c['+d.index+'] 后，下一个下标是哪一个？',[String(next),String(d.index-lb(d.index)),'所有下标都必须更新'],0,'父区间位置为 i+lowbit(i)='+next+'；超出 n 时结束。')});
      a[d.index-1]+=d.delta;const visited=[];
      for(let i=d.index;i<=n;i+=lb(i)) {
        c[i]+=d.delta;visited.push(i);const left=i-lb(i)+1;
        put(frames,state(),{title:'更新 c['+i+']，然后走向 '+(i+lb(i)),reason:'区间 ['+left+','+i+'] 包含被改的点，所以整段和增加 '+d.delta+'。',invariant:'更新尚在进行：已访问节点已维护；操作完成前不发起查询。',lines:[4],metrics:{已更新格数:visited.length,本格新值:c[i]},phase:'update',active:i,visited,covered:Array.from({length:lb(i)},(_,k)=>left-1+k)});
      }
      const sums=[];
      [d.r,d.l-1].forEach((x,part)=>{
        let ans=0;const consumed=[];
        put(frames,state(),{title:'开始 Prefix('+x+')',reason:'把 [1,'+x+'] 拆成不重叠的小区间；累加器从0开始。',invariant:'已加区间与待查询前缀不重叠，二者合起来仍是原目标前缀。',lines:[5],metrics:{查询端点:x,累计:0},phase:'query',queryPart:part,queryEnd:x});
        for(let i=x;i>0;i-=lb(i)) {
          const left=i-lb(i)+1;ans+=c[i];for(let k=left-1;k<i;k++)consumed.push(k);
          put(frames,state(),{title:'加上 c['+i+']='+c[i],reason:'取走区间 ['+left+','+i+']，剩余前缀终点变成 '+(i-lb(i))+'。',invariant:'每次清掉一个最低非零位；被取区间不漏不重。',lines:[6],metrics:{本格贡献:c[i],累计:ans,下一下标:i-lb(i)},phase:'query',active:i,queryPart:part,queryEnd:x,covered:consumed,accumulator:ans});
        }
        sums.push(ans);
      });
      put(frames,state(),{title:'区间和 = '+sums[0]+' − '+sums[1]+' = '+(sums[0]-sums[1]),reason:'减掉 [1,'+(d.l-1)+']，恰好留下 ['+d.l+','+d.r+']。',invariant:'前缀分解加法正确，区间差分才有依据。',lines:[7],metrics:{右前缀:sums[0],左侧前缀:sums[1],区间和:sums[0]-sums[1]},phase:'done',result:sums[0]-sums[1],prefixSums:sums,covered:Array.from({length:d.r-d.l+1},(_,k)=>d.l-1+k),done:true});return frames;
    },
    render(f,v) {
      return block(v,'原数组 a',v.array(f.a,{active:f.phase==='update'?[f.index-1]:[],selected:f.covered,labels:f.a.map((_,i)=>String(i+1))}))+
        block(v,'树状数组 c',v.array(f.c.slice(1).map(x=>x===null?'…':x),{active:f.active?[f.active-1]:[],selected:f.visited.map(i=>i-1),labels:f.a.map((_,i)=>String(i+1))}))+
        block(v,'每格的职责',v.table(['i','二进制','lowbit(i)','负责区间','c[i]'],f.a.map((_,k)=>{const i=k+1,b=i&-i;return[i,i.toString(2),b,'['+(i-b+1)+','+i+']',f.c[i]??'…'];}),{highlights:f.active?[[f.active-1,3],[f.active-1,4]]:[]}));
    }
  };

  const ski = {
    title:'不知道还会滑几天，什么时候买', subtitle:'每天先决定，再揭示下一天；把在线花费与事后最优分开。',
    concept:'每天租金1，购买价B；前B−1天租，第B天若到来则开始时买，当天不再付租金。离线最优知道总天数。',
    presets:[{name:'B=5，持续到第8天',data:{B:5,days:8}},{name:'B=4，第3天后停止',data:{B:4,days:3}},{name:'B=4，恰好第4天',data:{B:4,days:4}}],
    code:[
      '已租天数=0；bought=false；cost=0',
      '每个实际使用日开始：只知道今天需要使用',
      '若 bought：使用已有装备，本日花费0',
      '否则若 已租天数==B−1：花B购买，今天不再租',
      '否则：租一天，cost+=1；已租天数++',
      '事后基准 OPT(d)=min(d,B)',
      'd<B 时 cost=d；d≥B 时 cost=2B−1',
      '因此 cost≤(2−1/B)OPT；这是竞争比，非每次相等'
    ],
    build(data) {
      const {B,days}=data;if(!Number.isInteger(B)||B<2||B>12||!Number.isInteger(days)||days<1||days>16)throw new Error('演示需2≤B≤12，1≤天数≤16。');
      const frames=[],history=[];let rented=0,bought=false,cost=0;
      const state=()=>({B,days,history,rented,bought,cost,elapsed:history.length,day:history.length,phase:'intro',opt:Math.min(history.length,B)});
      put(frames,state(),{title:'把付费时点说清楚',reason:'买装备覆盖购买当天，已经付出的租金不退。实验观察者可以选择场景，在线决策本身不能读取未来总天数。',invariant:'决策只使用已经发生的天数、购买状态与固定价格 B。',lines:[1,2],metrics:{购买价:B,每天租金:1},question:q('第1天决策时，算法知道总共会使用几天吗？',['不知道，只知道今天要用','知道预设中的全部天数','可以先看未来再决定'],0,'预设由观察者选择；策略不能把总天数当作决策输入。')});
      put(frames,state(),{title:'对照基准允许知道未来',reason:'如果最终用 d 天，离线最优从第一天就决定只租 d 天或直接花 B 买，取较小者。',invariant:'OPT(d)=min(d,B) 是同一输入上的事后最优，不是在线可用信息。',lines:[6],metrics:{最迟购买日:B},question:q('租了 B−1 天后，第 B 天到来，需要再付多少？',['购买价 B；今天不再付租金','B+1，购买当天还要租','只付1，然后永远租'],0,'第 B 天开始买，新增费用恰为 B；累计为 (B−1)+B。')});
      for(let day=1;day<=days;day++) {
        const action=bought?'已有装备':rented===B-1?'购买':'租用';const pay=bought?0:rented===B-1?B:1;
        put(frames,state(),{title:'第 '+day+' 天开始：先决定',reason:'目前已经租了 '+rented+' 天，'+(bought?'已经买过。':'尚未购买。')+'现在只处理今天，不利用以后是否继续的信息。',invariant:'相同已知历史必作出相同决定，与未来何时停止无关。',lines:[2],metrics:{已发生天数:day-1,累计花费:cost,已租天数:rented},day,phase:'decision',
          ...(day===B?{question:q('今天的动作应是什么？',['购买，本日付 '+B,'再租一天，明天才考虑买','已付租金可以抵扣购买价'],0,'阈值是已经租了 B−1 天；第 B 天开始就买。')}:{})});
        cost+=pay;if(action==='购买')bought=true;if(action==='租用')rented++;
        history.push({day,action,pay,cost,opt:Math.min(day,B)});
        put(frames,state(),{title:'第 '+day+' 天：'+action+'，支付 '+pay,reason:'累计花费 '+cost+'。若到今天就停止，知道未来的最优花费为 '+Math.min(day,B)+'；这是回看基准。',invariant:'购买后不再重复支付租金或购买价。',lines:[action==='已有装备'?3:action==='购买'?4:5,6],metrics:{累计花费:cost,今日支付:pay,若今日停止OPT:Math.min(day,B)},day,phase:'paid',action,pay});
      }
      const opt=Math.min(days,B);
      put(frames,state(),{title:'输入在第 '+days+' 天结束',reason:'实际比值为 '+cost+'/'+opt+'。'+(days<B?'还没到购买日就结束，花费与最优相同。':'购买总花费固定为 2B−1，再多使用也不增加。'),invariant:'该输入的比值不超过统一保证 2−1/B。',lines:[7,8],metrics:{在线花费:cost,OPT:opt,实际比值:Number((cost/opt).toFixed(3)),保证上界:Number((2-1/B).toFixed(3))},phase:'summary',ratio:cost/opt,done:true});
      put(frames,state(),{title:'能证明的是所有停止时刻的界',reason:'d<B 时 ALG=OPT=d；d≥B 时 ALG=2B−1、OPT=B。这两个分支覆盖所有正整数天数。',invariant:'事后画出的曲线帮助观察；保证来自对任意 d 的分类证明。',lines:[7,8],metrics:{竞争比:'2−1/'+B},phase:'proof',ratio:cost/opt,done:true});return frames;
    },
    render(f,v) {
      const maximum=Math.max(2*f.B-1,1),width=x=>Math.max(0,Math.round(450*x/maximum));
      const chart='<svg viewBox="0 0 600 150" role="img" aria-label="在线花费与已发生天数的离线最优比较"><text x="16" y="35">在线花费</text><rect x="110" y="17" width="'+width(f.cost)+'" height="26" rx="6" fill="#217a69"/><text x="'+(120+width(f.cost))+'" y="35">'+f.cost+'</text><text x="16" y="92">回看 OPT</text><rect x="110" y="74" width="'+width(f.opt)+'" height="26" rx="6" fill="#be773e"/><text x="'+(120+width(f.opt))+'" y="92">'+f.opt+'</text><text x="16" y="137">比较截至已完成的 '+f.elapsed+' 天，今天尚未支付时不提前计费</text></svg>';
      return block(v,'每次决定只看已有历史',chart)+block(v,'逐日账本',v.table(['日','动作','本日支付','累计','若当天停止的OPT'],f.history.map(r=>[r.day,r.action,r.pay,r.cost,r.opt]),{highlights:f.history.length?[[f.history.length-1,3]]:[]}))+note(v,'固定规则：前 '+(f.B-1)+' 天租；第 '+f.B+' 天若到来，则在当天开始买。');
    }
  };

  const nonadjacent = {
    title:'没有算法标签，先找状态', subtitle:'从子集枚举出发，按最后一个位置选或不选，得到非相邻最大和。',
    concept:'允许空集。F[i] 表示前 i 项的最优值；选 i 后必须接 F[i−2]，不是把当前最大的数先拿走。',
    presets:[{name:'正负混合：4, −1, 5, 3, 7',data:{a:[4,-1,5,3,7]}},{name:'全是负数：空集是合法答案',data:{a:[-4,-1,-3,-2]}}],
    code:[
      '暴力：枚举位置子集，拒绝含相邻位置的候选',
      '定义 F[i]：前 i 项选择不相邻位置的最大和，允许空集',
      'F[0]=0；边界 i≤0 的子问题值按0处理',
      '不选 i：skip=F[i−1]',
      '选 i：take=A[i]+F[max(0,i−2)]',
      'F[i]=max(skip,take)；相等时本演示优先不选',
      '从 n 回溯：若选 i，记录 i 并跳到 i−2；否则 i−−',
      '时间 O(n)，表与回溯记录 O(n)；只求值可滚动为 O(1)'
    ],
    build(data) {
      ints(data.a,8);const a=data.a.slice(),n=a.length,frames=[],F=Array(n+1).fill(null),choice=Array(n+1).fill(false);
      F[0]=0;const candidates=[];let bruteBest=0,bestSubset=[];
      for(let mask=0;mask<(1<<n);mask++) {
        const subset=Array.from({length:n},(_,i)=>i).filter(i=>mask&(1<<i));
        const legal=subset.every((x,i)=>!i||x!==subset[i-1]+1),sum=subset.reduce((x,i)=>x+a[i],0);
        candidates.push({subset,legal,sum});if(legal&&sum>bruteBest){bruteBest=sum;bestSubset=subset;}
      }
      const base=()=>({a,F,choice,active:null,selected:[],rejected:[],phase:'brute',candidate:null});
      put(frames,base(),{title:'先把“合法答案”说清楚',reason:'可选若干位置，但两位置不能相邻；允许一项都不选。负数也属于合法输入。',invariant:'先保证枚举对象与题意一致，再考虑减少重复工作。',lines:[1],metrics:{位置数:n,全部子集数:1<<n},question:q('如果所有元素都是负数，题目允许返回什么？',['空集，和为0','必须选最大那个负数','忽略题目的空集约定'],0,'允许空集是重要边界；若改为至少选一项，状态与初始化需要重写。')});
      const sample=candidates.slice(0,5);
      if(!sample.some(c=>JSON.stringify(c.subset)===JSON.stringify(bestSubset)))sample.push(candidates.find(c=>JSON.stringify(c.subset)===JSON.stringify(bestSubset)));
      sample.forEach(c=>put(frames,base(),{title:'枚举候选 {'+c.subset.map(i=>i+1).join(', ')+'}',reason:c.legal?'没有相邻位置，候选和为 '+c.sum+'。':'含相邻位置，即使总和大也必须拒绝。',invariant:'先检查约束，再让合法候选参与比较。',lines:[1],metrics:{候选和:c.sum,是否合法:c.legal?'是':'否'},candidate:c,selected:c.legal?c.subset:[],rejected:c.legal?[]:c.subset}));
      put(frames,base(),{title:'把所有合法解按最后一项分类',reason:'不选 i，剩下前 i−1 项；选 i，就不能选 i−1，剩下前 i−2 项。两类完整且不重叠。',invariant:'状态句必须覆盖所有过去对未来有影响的信息。',lines:[2,4,5],metrics:{暴力已枚举:1<<n},phase:'state',question:q('若决定选第 i 项，应该接哪个子问题？',['前 i−2 项的最优值','前 i−1 项的最优值','只看 A[i−1] 是否为负'],0,'第 i−1 项无论正负都不能再选；F[i−2] 才保证组合合法。')});
      put(frames,base(),{title:'空前缀 F[0]=0',reason:'没有元素时，唯一选择是空集，和为0。所有后续格子从更短前缀推出。',invariant:'计算 F[i] 前，所有更短依赖已经算好。',lines:[3],metrics:{已算状态:1},phase:'dp'});
      for(let i=1;i<=n;i++) {
        const skip=F[i-1],take=a[i-1]+F[Math.max(0,i-2)],winner=take>skip?1:skip>take?0:2;
        put(frames,base(),{title:'预测 F['+i+']：选还是不选',reason:'当前值 A['+i+']='+a[i-1]+'。先检查两类选择是否覆盖所有可能，再比较候选值。',invariant:'选当前项必须接不含相邻项的前缀解。',lines:[4,5],metrics:{不选候选:skip,选的候选:take},phase:'dp',active:i-1,skip,take,i,
          question:q('哪个结论正确？',['不选更优：'+skip,'选更优：'+take,'两者相等，可任选一个最优方案'],winner,'不选值='+skip+'，选值='+take+'；取较大者。平局只影响恢复哪一个最优方案。')});
        F[i]=Math.max(skip,take);choice[i]=take>skip;
        put(frames,base(),{title:'F['+i+'] = '+F[i],reason:choice[i]?'选当前项，剩余接 F['+Math.max(0,i-2)+']。':'保留前 i−1 项的最优值；平局时本演示也不选当前项。',invariant:'本格是两类合法最优候选的最大值，不是局部贪心。',lines:[6],metrics:{已算前缀:i,当前最优:F[i]},phase:'dp',active:i-1,i,skip,take});
      }
      const selected=[];let at=n;
      while(at>0) {
        const chosen=choice[at];if(chosen)selected.push(at-1);
        put(frames,base(),{title:'回溯位置 '+at+'：'+(chosen?'选取':'跳过'),reason:chosen?'记录这个位置，下一步跳过邻居，回到 '+Math.max(0,at-2)+'。':'本格继承前一格，继续检查位置 '+(at-1)+'。',invariant:'已恢复位置不相邻；剩余目标是对应更短前缀的最优解。',lines:[7],metrics:{已选个数:selected.length},phase:'restore',active:at-1,selected});
        at-=chosen?2:1;
      }
      selected.sort((x,y)=>x-y);
      put(frames,base(),{title:'独立推导得到最大和 '+F[n],reason:'选中位置 {'+selected.map(i=>i+1).join(', ')+'}。本例完整子集枚举结果为 '+bruteBest+'，与 DP 一致；一般正确性来自两类划分与归纳。',invariant:'有限对照发现错误；不能代替对所有输入的证明。',lines:[8],metrics:{DP答案:F[n],暴力对照:bruteBest,状态数:n+1},phase:'done',selected,result:F[n],bruteBest,done:true});return frames;
    },
    render(f,v) {
      const values=f.F.map(x=>x===null?'…':x);
      return block(v,'位置与数值 A',v.array(f.a,{active:f.active!==null?[f.active]:[],selected:f.selected,rejected:f.rejected,labels:f.a.map((_,i)=>String(i+1))}))+
        block(v,'F[i]：前 i 项的最优值',v.array(values,{active:f.i?[f.i]:[],selected:f.i?[Math.max(0,f.i-2),f.i-1]:[],labels:f.F.map((_,i)=>String(i))}))+
        (f.skip!==undefined?note(v,'不选：F['+(f.i-1)+']='+f.skip+'；选：A['+f.i+']+F['+Math.max(0,f.i-2)+']='+f.take+'。'):note(v,'允许空集；下标标签是位置，不是数值。红色表示被约束拒绝的候选。'));
    }
  };

  window.AlgoLabs = window.AlgoLabs || {};
  Object.assign(window.AlgoLabs, {'10':flow,'11':kmp,'12':reduction,'13':bit,'14':ski,'15':nonadjacent});
}());
