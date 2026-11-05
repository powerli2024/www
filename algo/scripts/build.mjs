import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {Marked} from '../assets/vendor/marked.mjs';
import {lessons,documents} from './curriculum.mjs';
const require=createRequire(import.meta.url);
const katex=require('../assets/vendor/katex/dist/katex.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pack=path.dirname(root);
const course=path.dirname(pack);
const allFiles=fs.readdirSync(path.join(pack,'课程'));
const entries=[...lessons.map(x=>({...x,type:'lesson',file:x.id==='01'?'03_第一课_算法思路如何产生.md':path.join('课程',allFiles.find(f=>f.startsWith(x.id+'_')))})),...documents.map(([id,file,title])=>({id,file,title,type:'doc'}))];
const routes=new Map(entries.map(x=>[path.resolve(pack,x.file).toLowerCase(),`#${x.type}/${x.id}`]));
const manifest=[];
for(const entry of entries){
 const file=path.join(pack,entry.file),md=fs.readFileSync(file,'utf8');
 const instance=new Marked({gfm:true,walkTokens(token){
   if(token.type==='link'||token.type==='image'){
    let href=token.href;
    if(!/^(?:https?:|mailto:|#)/i.test(href)){
     const [raw,anchor]=href.split('#');
     const target=path.resolve(path.dirname(file),decodeURIComponent(raw));
     token.href=routes.get(target.toLowerCase())||path.relative(root,target).split(path.sep).map(encodeURIComponent).join('/')+(anchor?'#'+anchor:'');
    }
   }
 }});
 // Only trusted local source prose is converted. Raw HTML is escaped to preserve text.
 instance.use({renderer:{html({text}){return text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}}});
 entry.html=instance.parse(md).replace(/^<h1>.*?<\/h1>\s*/s,'');
 entry.source=path.relative(root,file).split(path.sep).map(encodeURIComponent).join('/');
 entry.searchText=md;
 entry.characters=md.replace(/\s/g,'').length;
 if(entry.formula) entry.formulaHTML=katex.renderToString(entry.formula,{displayMode:true,throwOnError:true,strict:'error',trust:false,output:'htmlAndMathml'});
 manifest.push({id:entry.id,type:entry.type,source:entry.file,sha256:crypto.createHash('sha256').update(md).digest('hex'),characters:entry.characters});
 delete entry.file;
}
fs.writeFileSync(path.join(root,'assets/content.js'),'window.COURSE_DATA='+JSON.stringify({built:'2026-10-23',lessons:entries.filter(x=>x.type==='lesson'),documents:entries.filter(x=>x.type==='doc')}).replace(/</g,'\\u003c')+';\n');
fs.writeFileSync(path.join(root,'tests/content-manifest.json'),JSON.stringify({built:'2026-10-23',source_root:course,entries},(k,v)=>['html','searchText','formulaHTML'].includes(k)?undefined:v,2));
fs.writeFileSync(path.join(root,'tests/source-hashes.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({lessons:lessons.length,documents:documents.length,formulas:lessons.length,source_files:manifest.length,status:'built'}));
