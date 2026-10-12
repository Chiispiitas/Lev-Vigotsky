import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.mp3':'audio/mpeg','.lrc':'text/plain','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.stat(file,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return}
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
  const range=req.headers.range;
  if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m){res.writeHead(416);res.end();return}const start=+m[1],end=m[2]?Math.min(+m[2],stat.size-1):stat.size-1;if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res)}
  else{res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res)}
 });
}).listen(4173,'127.0.0.1',()=>console.log('LEV VOICE ready: http://localhost:4173'));
