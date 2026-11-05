const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),pack=path.dirname(root),course=path.dirname(pack),ctx={window:{},console,structuredClone};
vm.createContext(ctx);
for(const f of ['content.js','labs-foundations.js','labs-graphs-dp.js','labs-advanced.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',f),'utf8'),ctx,{filename:f});
const data=ctx.window.COURSE_DATA,labs=ctx.window.AlgoLabs;
assert.equal(data.lessons.length,15);assert.equal(data.documents.length,7);assert.equal(Object.keys(labs).length,15);
const allowed=new Set([...data.lessons,...data.documents].map(x=>'#'+x.type+'/'+x.id));
let links=0,formulas=0,presets=0,frames=0,predictions=0;
for(const e of [...data.lessons,...data.documents]){
 assert(e.html.length>(e.type==='lesson'?2000:400),'页面内容缺失 '+e.id);
 assert.equal((e.html.match(/<h2>/g)||[]).length,(e.searchText.match(/^## /gm)||[]).length,'二级章节丢失 '+e.id);
 if(e.formula){assert(e.formulaHTML.includes('class="katex"'));assert(!e.formulaHTML.includes('katex-error'));formulas++;}
 for(const [,href] of e.html.matchAll(/href="([^"]+)"/g)){
  const target=href.replaceAll('&amp;','&');links++;
  if(target.startsWith('#')){assert(allowed.has(target),'未知课内路由 '+target);continue;}
  if(/^https?:|mailto:/.test(target))continue;
  assert(fs.existsSync(path.resolve(root,decodeURIComponent(target.split('#')[0]))),'无效本地链接 '+target);
 }
}
for(const [id,lab] of Object.entries(labs)){
 assert(lab.presets.length>=2);assert(lab.code.length>0);
 for(const p of lab.presets){presets++;const f=lab.build(structuredClone(p.data));frames+=f.length;assert(f.length>=5);let qn=0;
  for(const frame of f){assert(typeof frame.title==='string');assert(typeof frame.reason==='string');assert(typeof frame.invariant==='string');for(const line of frame.lines||[])assert(line>=1&&line<=lab.code.length,id+'行号越界');if(frame.question){qn++;const q=frame.question;assert(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.options.length);assert.equal(new Set(q.options).size,q.options.length,id+'重复选项');}}
  assert(qn>=2,id+'预测题不足');predictions+=qn;
 }
}
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
let runtimeAssets=0;
for(const [,url] of index.matchAll(/(?:src|href)="([^"]+)"/g)){if(url.startsWith('#'))continue;assert(!/^https?:/.test(url),'运行时远程资源');assert(fs.existsSync(path.join(root,url)),url);runtimeAssets++;}
const cssPath=path.join(root,'assets/vendor/katex/dist/katex.min.css'),css=fs.readFileSync(cssPath,'utf8');let fonts=0;
for(const [,url] of css.matchAll(/url\(([^)]+)\)/g)){assert(!/^https?:/.test(url));assert(fs.existsSync(path.resolve(path.dirname(cssPath),url.replace(/["']/g,''))));fonts++;}
const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'source-hashes.json'),'utf8'));
for(const item of sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(pack,item.source))).digest('hex'),item.sha256,'源文件与网页未同步');
const originals=JSON.parse(fs.readFileSync(path.join(pack,'备课依据/source_inventory.json'),'utf8'));
for(const item of originals)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(course,item.path))).digest('hex'),item.sha256,'原课程资料被更改');
const out={date:'2026-10-23',status:'passed',lessons:15,documents:7,presets,frames,predictions,formulas,links,runtimeAssets,fontFiles:fonts,sourceFiles:sources.length,unchangedOriginals:originals.length,scope:'静态资源、公式生成、完整内容、内链、预设契约、原件哈希；算法值另见三个独立对照测试；不等于file协议浏览器实测或用户掌握。'};
fs.writeFileSync(path.join(__dirname,'site-checks.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
