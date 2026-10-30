'use strict';
// Optional secure metadata proxy. Deploy to Node hosting; GitHub Pages cannot run it.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const key=process.env.DESIZONE_API_KEY;
const port=Number(process.env.PORT)||3000;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.css':'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api/desizone-playing'){
  const radio=Number(u.searchParams.get('radio'));
  if(![1,2,3].includes(radio)){res.writeHead(400);return res.end('Invalid station');}
  if(!key){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'DESIZONE_API_KEY not configured'}));}
  try {const upstream=await fetch(`https://desizoneradio.com/api/v1/playing?radio=${radio}`,{headers:{'x-api-key':key,'x-device-platform':'Web','Accept':'application/json'},signal:AbortSignal.timeout(8000)});const body=await upstream.text();res.writeHead(upstream.ok?200:502,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(upstream.ok?body:JSON.stringify({error:'DesiZone upstream request failed',status:upstream.status}));}
  catch(e){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'DesiZone service unreachable'}));}
  return;
 }
 const requested=u.pathname==='/'?'/index.html':u.pathname;
 const file=path.resolve(__dirname,'.'+requested);
 if(!file.startsWith(__dirname+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);});
}).listen(port,()=>console.log(`Player running on http://localhost:${port}`));
