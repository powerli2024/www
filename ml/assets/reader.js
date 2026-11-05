(function(){
  'use strict';
  const data=window.ML_COURSE, main=document.getElementById('main');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=s=>document.querySelector(s);
  const key='ml-learning-lab-v2';
  let record={completed:{},quiz:{},font:'18'}, active=null, cleanupLab=()=>{}, language='python', codeStep=0, toastTimer;
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object')record={...record,...saved};}catch(e){}
  if(!record.completed||typeof record.completed!=='object')record.completed={};
  if(!record.quiz||typeof record.quiz!=='object')record.quiz={};
  if(!['18','20','22'].includes(String(record.font)))record.font='18';
  function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
  function save(){try{localStorage.setItem(key,JSON.stringify(record));}catch(e){toast('浏览器未允许保存，本次仍可继续学习。');}}
  function updateProgress(){const count=data.weeks.filter(w=>record.completed[w.week]).length;$('#progress-label').textContent=count+' / 24';$('#course-progress').value=count;}
  function nav(){
    const query=$('#course-search').value.trim().toLowerCase();
    const found=data.weeks.filter(w=>!query||w.search_text.includes(query));
    const groups=[{name:'01—08 · 建立机器学习的直觉',min:1,max:8},{name:'09—16 · 神经网络与生成建模',min:9,max:16},{name:'17—24 · 适配研究与独立交付',min:17,max:24}];
    $('#course-nav').innerHTML=groups.map(g=>{const weeks=found.filter(w=>w.week>=g.min&&w.week<=g.max);if(!weeks.length)return '';return '<div class="nav-group"><span class="nav-group-title">'+g.name+'</span>'+weeks.map(w=>'<a class="week-link '+(active===w.week?'active':'')+'" '+(active===w.week?'aria-current="page"':'')+' href="#week-'+w.week+'"><span class="week-number">'+String(w.week).padStart(2,'0')+'</span><span>'+esc(w.title)+'</span>'+(record.completed[w.week]?'<span class="done-dot" aria-label="已标记学习">✓</span>':'')+'</a>').join('')+'</div>';}).join('')||'<p class="empty-search">没有找到对应课程。试试“梯度”或“评估”。</p>';
    $('#search-status').textContent=query?'找到 '+found.length+' 周相关课程':'';updateProgress();
  }
  function toc(items,extra=true){return '<nav class="toc" aria-label="本周目录">'+items.map(t=>'<a href="#'+esc(t.id)+'" data-section="'+esc(t.id)+'">'+esc(t.title)+'</a>').join('')+(extra?'<a href="#interactive" data-section="interactive">交互实验</a><a href="#code" data-section="code">双语代码跟读</a><a href="#practice" data-section="practice">练习</a><a href="#quiz" data-section="quiz">自测与讲解</a>':'')+'</nav>';}
  function workbench(w){return '<section class="section-separator" id="code"><div class="eyebrow">从公式到程序</div><h2>Python / C++，逐步看懂同一机制</h2><p class="section-lead">选一门作为主线。高亮只强调当前步骤，完整程序始终保留。先预测检查点，再运行本地文件。</p><div class="code-workbench"><div class="code-tabs" role="tablist" aria-label="示例语言"><button role="tab" data-language="python" aria-selected="true" aria-controls="code-panel">Python</button><button role="tab" data-language="cpp" aria-selected="false" aria-controls="code-panel">C++</button><a id="code-download" class="code-download" download>保存完整代码 ↓</a></div><div class="code-toolbar"><span class="step-count" id="step-count"></span><button class="secondary" id="step-prev">← 上一步</button><button class="primary" id="step-next">下一步 →</button><button class="quiet" id="copy-code">复制代码</button></div><div class="code-explanation" id="code-explanation" aria-live="polite"></div><div id="code-panel" role="tabpanel" tabindex="0" aria-label="当前语言完整代码"><div class="code-viewport"><pre id="code-pre"></pre></div></div><div class="code-output"><details><summary>先预测，再展开参考输出</summary><pre>'+esc(w.code.expected_output)+'</pre><p>这是机制示例的参考输出，不代表完整项目已经训练或通过验收。</p></details></div></div><details class="run-help"><summary>如何在电脑上运行这两个文件？</summary><p>本周文件保存在学习包的 course/examples。打开 PowerShell，进入该目录，选一种语言运行：</p><pre>Set-Location \'D:\\gpt\\machine_learning\\学习包\\course\\examples\'\npython week'+String(w.week).padStart(2,'0')+'.py\n\n# C++ 路线：先编译，成功后再运行\ng++ -std=c++17 -O2 week'+String(w.week).padStart(2,'0')+'.cpp -o week'+String(w.week).padStart(2,'0')+'.exe\n.\\week'+String(w.week).padStart(2,'0')+'.exe</pre><p>如果终端找不到 python，本机已有解释器为 D:\\Download\\python\\python.exe。库函数和容器不熟悉时，打开<a href="#toolbox">编程工具箱</a>，按当前需要补充。保留参考程序，把修改另存为自己的文件。</p></details></section>';}
  function practice(w){return '<section id="practice" class="section-separator"><div class="eyebrow">练习 / 帮助逐步减少</div><h2>先尝试，再用提示推进</h2>'+w.exercises.map((e,i)=>'<article class="exercise"><h3>练习 '+(i+1)+'</h3>'+e.prompt_html+e.hints_html.map((h,j)=>'<details class="hint"><summary>提示 '+(j+1)+'</summary>'+h+'</details>').join('')+'<details class="answer"><summary>我已尝试，查看参考答案</summary><div class="answer-body">'+e.answer_html+'</div></details></article>').join('')+'</section>';}
  function extras(w){let result='';if(w.extras?.length)result+='<aside class="worked"><div class="eyebrow">继续动手</div>'+w.extras.map(x=>'<h3><a href="../course/'+esc(x.file)+'" download>'+esc(x.title)+' ↓</a></h3><p>'+esc(x.description)+'</p>').join('')+'</aside>';if(w.week>=4&&w.week<=12)result+='<p class="section-lead">开始digits与Pipeline实践前，请使用已核验的<a href="项目A环境.html">项目A传统模型阶段环境</a>。PyTorch机制示例的环境要求在对应程序中另有说明。</p>';return result;}
  function quiz(w){return '<section id="quiz" class="section-separator"><div class="eyebrow">自测 / 讲清你的判断依据</div><h2>检查理解，而不只记住结论</h2><p class="section-lead">选择答案后统一核对。正确率只是线索，练习、解释和独立改写仍需分别验收。</p><form class="quiz" id="quiz-form">'+w.quiz.map((q,i)=>'<fieldset><legend>'+(i+1)+'. '+esc(q.question)+'</legend>'+q.options.map((o,j)=>'<label data-option="'+j+'"><input type="radio" name="q'+i+'" value="'+j+'">'+String.fromCharCode(65+j)+'. '+esc(o)+'</label>').join('')+'<div class="quiz-feedback" id="feedback-'+i+'" hidden></div></fieldset>').join('')+'<button class="primary" type="submit">核对答案与解释</button> <button class="quiet" type="reset">清空，重新作答</button><div id="quiz-result" class="quiz-result" aria-live="polite"></div></form><h3>再试着讲给别人听</h3><ul class="review-list">'+w.review_questions.map(q=>'<li><details><summary>'+esc(q.question)+'</summary><div class="answer-body">'+q.answer_html+'</div></details></li>').join('')+'</ul></section>';}
  function finish(w){return '<section class="section-separator"><div class="eyebrow">留下可以回看的证据</div><h2>本周交付与验收</h2><div class="delivery"><div><h3>交什么</h3><ul>'+w.deliverables.map(d=>'<li>'+esc(d)+'</li>').join('')+'</ul></div><div><h3>怎样判断完成</h3><ul>'+w.acceptance.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul></div></div><label class="mark-learned"><input id="mark-learned" type="checkbox" '+(record.completed[w.week]?'checked':'')+'> 标记本周已学习（仍以实际交付验收）</label><p class="muted">下一周先花15分钟闭卷复述；间隔至少48小时重做一道变式。选择题答对，不自动代表能独立完成项目。</p><h3>来源与按需延伸</h3><ul class="references">'+w.references.map(r=>'<li><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.title)+'</a><span>'+esc(r.note)+'</span></li>').join('')+'</ul></section><nav class="week-pager" aria-label="相邻周次">'+(w.week>1?'<a href="#week-'+(w.week-1)+'"><small>← 上一周</small>'+esc(data.weeks.find(x=>x.week===w.week-1)?.title||'')+'</a>':'<span></span>')+(w.week<24&&data.weeks.some(x=>x.week===w.week+1)?'<a href="#week-'+(w.week+1)+'"><small>下一周 →</small>'+esc(data.weeks.find(x=>x.week===w.week+1).title)+'</a>':'<span>保留你的项目与复习记录。</span>')+'</nav>';}
  function codeView(w,scroll=false){
    const code=w.code,step=code.steps[codeStep],[lo,hi]=step[language+'_lines'];
    $('#step-count').textContent='步骤 '+(codeStep+1)+' / '+code.steps.length;
    $('#step-prev').disabled=codeStep===0;$('#step-next').disabled=codeStep===code.steps.length-1;
    document.querySelectorAll('[data-language]').forEach(b=>{const selected=b.dataset.language===language;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    $('#code-explanation').innerHTML='<h3>'+esc(step.title)+'</h3><p>'+esc(step.explanation)+'</p><p class="checkpoint">停下来预测：'+esc(step.checkpoint)+'</p>';
    $('#code-pre').innerHTML=code[language+'_html_lines'].map((line,i)=>'<span class="code-line '+(i+1>=lo&&i+1<=hi?'active-line':'')+'"><span class="line-number" aria-hidden="true">'+(i+1)+'</span>'+line+'</span>').join('');
    $('#code-download').href='../course/'+code[language+'_file'];$('#code-download').setAttribute('download',code[language+'_file'].split('/').pop());
    $('#code-panel').setAttribute('aria-label',(language==='python'?'Python':'C++')+'完整代码，第'+lo+'至'+hi+'行高亮');
    if(scroll){const viewport=$('.code-viewport'),line=$('.active-line');if(line)viewport.scrollTop=Math.max(0,line.offsetTop-$('#code-pre').offsetTop-45);}
  }
  function wireWeek(w){
    document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.language;codeView(w,true);}));
    $('.code-tabs').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();language=language==='python'?'cpp':'python';codeView(w,true);$('[data-language="'+language+'"]').focus();}});
    $('#step-prev').onclick=()=>{codeStep=Math.max(0,codeStep-1);codeView(w,true);};$('#step-next').onclick=()=>{codeStep=Math.min(w.code.steps.length-1,codeStep+1);codeView(w,true);};
    $('#copy-code').onclick=async()=>{try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(w.code[language+'_source']);toast('已复制完整代码。');}catch(e){const t=document.createElement('textarea');t.value=w.code[language+'_source'];t.style.position='fixed';t.style.top='-1000px';document.body.append(t);t.select();try{if(!document.execCommand('copy'))throw new Error();toast('已复制完整代码。');}catch(err){toast('请使用“保存完整代码”，或手动选择代码复制。');}t.remove();}};
    $('#mark-learned').onchange=e=>{record.completed[w.week]=e.target.checked;save();nav();};
    $('#quiz-form').onsubmit=e=>{e.preventDefault();const picked=w.quiz.map((q,i)=>{const radio=$('input[name="q'+i+'"]:checked');return radio?Number(radio.value):null;});
      if(picked.some(x=>x===null)){toast('还有题目未作答，完成后再核对。');const i=picked.indexOf(null);$('input[name="q'+i+'"]').focus();return;}
      let correct=0;w.quiz.forEach((q,i)=>{const ok=picked[i]===q.answer;if(ok)correct++;const feedback=$('#feedback-'+i);feedback.hidden=false;feedback.innerHTML='<strong>'+(ok?'判断正确':'再想一想')+' · 参考选项 '+String.fromCharCode(65+q.answer)+'</strong>'+q.explanation_html;const field=feedback.closest('fieldset');field.querySelectorAll('label').forEach(label=>{const j=Number(label.dataset.option);label.classList.toggle('correct',j===q.answer);label.classList.toggle('incorrect',j===picked[i]&&!ok);});});
      $('#quiz-result').innerHTML='本次 '+correct+' / '+w.quiz.length+' 题判断正确。<small>请复述理由，并完成开放讲解题；得分不能代替实践验收。</small>';record.quiz[w.week]={correct,total:w.quiz.length,at:new Date().toISOString()};save();
    };
    $('#quiz-form').onreset=()=>{document.querySelectorAll('.quiz-feedback').forEach(f=>{f.hidden=true;f.innerHTML='';});document.querySelectorAll('.quiz label').forEach(l=>l.classList.remove('correct','incorrect'));$('#quiz-result').textContent='';};
    $('#quiz-form').onchange=()=>{if(!document.querySelector('.quiz-feedback:not([hidden])'))return;document.querySelectorAll('.quiz-feedback').forEach(f=>{f.hidden=true;f.innerHTML='';});document.querySelectorAll('.quiz label').forEach(l=>l.classList.remove('correct','incorrect'));$('#quiz-result').textContent='答案已调整，请重新核对。';};
    codeView(w);
  }
  function render(){
    const hash=location.hash.slice(1)||document.body.dataset.start||'week-1';
    if(hash!=='toolbox'&&!/^week-\d+$/.test(hash)){const target=document.getElementById(hash);if(target){target.scrollIntoView();return;}else{location.hash='week-1';return;}}
    cleanupLab();cleanupLab=()=>{};
    if(hash==='toolbox'){
      active='toolbox';$('#breadcrumb').textContent='编程工具箱 / 按需补充';
      main.innerHTML='<header class="hero"><div class="eyebrow">Python / C++ 编程工具箱</div><h1>把数学翻译成你能读懂的代码</h1><p>从容器、循环、函数到数组与求导。遇到哪一处困难，就补哪一处；不必先学会所有库。</p><p class="muted">需要逐步高亮的完整示例？回到<a href="#week-1">第一周代码跟读</a>，选择Python或C++。</p></header>'+toc(data.toolbox.toc,false)+data.toolbox.body_html;
    }else{
      const n=Number(hash.slice(5)),w=data.weeks.find(w=>w.week===n)||data.weeks[0];active=w.week;codeStep=0;
      $('#breadcrumb').textContent='W'+String(w.week).padStart(2,'0')+' / '+w.stage;
      document.title='第'+w.week+'周 '+w.title+' · 学习实验室';
      main.innerHTML='<header class="hero"><div class="eyebrow">WEEK '+String(w.week).padStart(2,'0')+' / '+esc(w.stage)+'</div><h1>'+esc(w.title)+'</h1><ul class="goals">'+w.goals.map(g=>'<li>'+esc(g)+'</li>').join('')+'</ul><div class="hero-meta"><span class="pill">概念 → 手算 → 代码 → 迁移</span><span>'+esc(w.estimated_hours)+'</span><a href="逐周讲义/第'+String(w.week).padStart(2,'0')+'周.html">静态讲义 / 打印</a></div><details class="prerequisites"><summary>开始前，确认这些先修</summary><ul>'+w.prerequisites.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul></details></header>'+toc(w.toc)+w.body_html+'<section id="interactive"></section>'+workbench(w)+extras(w)+practice(w)+quiz(w)+finish(w);
      wireWeek(w);cleanupLab=window.MLLabs.mount($('#interactive'),w.week)||(()=>{});
    }
    nav();document.body.classList.remove('nav-open');$('#menu-toggle').setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:'instant'});$('#reading-progress').style.width='0%';
  }
  document.addEventListener('click',e=>{
    const anchor=e.target.closest('[data-section]');if(anchor){e.preventDefault();document.getElementById(anchor.dataset.section)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
    const zoom=e.target.closest('.formula-zoom');if(zoom){const img=zoom.querySelector('img').cloneNode();img.removeAttribute('loading');img.style.width=(Number(img.getAttribute('width'))*1.65)+'px';$('#formula-large').replaceChildren(img);const dialog=$('#formula-dialog');if(typeof dialog.showModal==='function')dialog.showModal();else toast('浏览器不支持弹窗，可用浏览器缩放查看公式。');}
  });
  $('#formula-dialog').addEventListener('click',e=>{if(e.target===$('#formula-dialog'))$('#formula-dialog').close();});
  $('#course-search').addEventListener('input',nav);
  $('#menu-toggle').onclick=()=>{const opened=document.body.classList.toggle('nav-open');$('#menu-toggle').setAttribute('aria-expanded',String(opened));};
  $('#text-size').value=record.font;document.documentElement.style.setProperty('--body-size',record.font+'px');
  $('#text-size').onchange=e=>{record.font=e.target.value;document.documentElement.style.setProperty('--body-size',record.font+'px');save();};
  $('#print-page').onclick=()=>window.print();
  let printClosed=[];
  window.addEventListener('beforeprint',()=>{printClosed=[...document.querySelectorAll('main details:not([open])')];printClosed.forEach(d=>d.open=true);});
  window.addEventListener('afterprint',()=>{printClosed.forEach(d=>d.open=false);printClosed=[];});
  $('#export-progress').onclick=()=>{const blob=new Blob([JSON.stringify({course:'机器学习学习实验室',note:'个人学习记录，不等于课程验收',...record},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='机器学习学习记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  window.addEventListener('hashchange',render);
  window.addEventListener('scroll',()=>{const room=document.documentElement.scrollHeight-window.innerHeight;$('#reading-progress').style.width=(room>0?Math.min(100,window.scrollY/room*100):100)+'%';},{passive:true});
  render();
})();
