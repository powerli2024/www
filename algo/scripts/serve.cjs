// Optional loopback preview. The delivered index.html also opens directly.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.pdf':'application/pdf','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 if(rel==='/')rel='/学习包/网页/index.html';
 const file=path.resolve(root,'.'+rel),relative=path.relative(root,file);
 if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end();}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);});
});
server.listen(0,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+server.address().port+'/学习包/网页/index.html'));
