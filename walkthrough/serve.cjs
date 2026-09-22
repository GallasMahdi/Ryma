// Local review server, with HTTP byte ranges for precise MP4 scrubbing.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
  const p=path.resolve(root,'.'+(pathname==='/'?'/preview.html':pathname));
  if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return}
  let stat;try{stat=fs.statSync(p);if(!stat.isFile())throw Error()}catch{res.writeHead(404).end();return}
  const types={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'};
  const headers={'Content-Type':types[path.extname(p)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
  const range=req.headers.range;
  if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m){res.writeHead(416).end();return}const start=+m[1],end=m[2]?Math.min(+m[2],stat.size-1):stat.size-1;if(start> end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${stat.size}`});if(req.method==='HEAD')res.end();else fs.createReadStream(p,{start,end}).pipe(res)}
  else{res.writeHead(200,{...headers,'Content-Length':stat.size});if(req.method==='HEAD')res.end();else fs.createReadStream(p).pipe(res)}
}).listen(4173,'127.0.0.1',()=>console.log('Walkthrough review: http://127.0.0.1:4173'));
