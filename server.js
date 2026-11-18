/**
 * Hikayat Nusantara — pelayan Node.js untuk portal pembelajaran yang belum mempunyai autentikasi.
 * Pelayan hanya menyajikan UI awam; TIADA endpoint data murid atau log masuk.
 * Fail /dist dijana oleh npm run build dan bersifat sementara (deploy sahaja).
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { handleApi } from "./auth/api.js";

const PUBLIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/world3d.js", ["world3d.js", "text/javascript; charset=utf-8"]],
  ["/student-map3d.js", ["student-map3d.js", "text/javascript; charset=utf-8"]],
  ["/student-activities.js", ["student-activities.js", "text/javascript; charset=utf-8"]],
  ["/mission-one-ai-bridge.js", ["mission-one-ai-bridge.js", "text/javascript; charset=utf-8"]],
  ["/mission-two-ai-bridge.js", ["mission-two-ai-bridge.js", "text/javascript; charset=utf-8"]],
  ["/mission-three-ai-bridge.js", ["mission-three-ai-bridge.js", "text/javascript; charset=utf-8"]],
  ["/mission-four-ai-bridge.js", ["mission-four-ai-bridge.js", "text/javascript; charset=utf-8"]],
  ["/student-learning-center.js", ["student-learning-center.js", "text/javascript; charset=utf-8"]],
  ["/teacher-dashboard.js", ["teacher-dashboard.js", "text/javascript; charset=utf-8"]],
  ["/teacher-dashboard.css", ["teacher-dashboard.css", "text/css; charset=utf-8"]],
  ["/admin-dashboard.js", ["admin-dashboard.js", "text/javascript; charset=utf-8"]],
  ["/admin-dashboard.css", ["admin-dashboard.css", "text/css; charset=utf-8"]],
  ["/login-preview.html", ["login-preview.html", "text/html; charset=utf-8"]],
  ["/login.html", ["login.html", "text/html; charset=utf-8"]],
  ["/auth-client.js", ["auth-client.js", "text/javascript; charset=utf-8"]],
]);
const BASE = new URL("./dist/", import.meta.url);
const PORT = Number(process.env.PORT || 10000);

const server = createServer(async (request, response) => {
  const method = request.method || "GET";
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Cache-Control", "no-store");

  if (method !== "GET" && method !== "HEAD" && !(request.url || "").startsWith("/api/")) {
    response.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      Allow: "GET, HEAD",
    });
    response.end(method === "HEAD" ? undefined : "Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = new URL(request.url || "/", "http://localhost").pathname;
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  // Authentication and account APIs are handled before static asset routes.
  if (pathname.startsWith("/api/") && method !== "HEAD") {
    if (await handleApi(request, response, pathname)) return;
  }

  if (pathname === "/health") {
    const body = JSON.stringify({ status: "ok", app: "hikayat-nusantara", phase: 1 });
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(method === "HEAD" ? undefined : body);
    return;
  }


  // Same-origin route for original Google AI Studio Misi 1 and Vite assets.
  if(pathname==='/misi1'||pathname==='/misi1/'||pathname.startsWith('/misi1/')){
    let rel='index.html';
    try{
      if(pathname!=='/misi1'&&pathname!=='/misi1/')rel=decodeURIComponent(pathname.slice('/misi1/'.length));
    }catch(error){
      response.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Invalid path');return;
    }
    if(!rel||!/^[a-zA-Z0-9_./-]+$/.test(rel)||rel.split('/').includes('..')){
      response.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Invalid path');return;
    }
    const ext=rel.split('.').at(-1).toLowerCase();
    const mime=({html:'text/html',js:'text/javascript',css:'text/css',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',json:'application/json'})[ext]||'application/octet-stream';
    try{
      const fileContents=await readFile(new URL('misi1/'+rel,BASE));
      response.setHeader('X-Frame-Options','SAMEORIGIN');
      response.writeHead(200,{'Content-Type':mime+(['html','js','css','svg','json'].includes(ext)?'; charset=utf-8':'')});
      response.end(method==='HEAD'?undefined:fileContents);
    }catch(error){
      response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Misi 1 asset not found');
    }
    return;
  }

  // Same-origin route for original Google AI Studio Misi 2 and Vite assets.
  if(pathname==='/misi2'||pathname==='/misi2/'||pathname.startsWith('/misi2/')){
    let rel='index.html';
    try{
      if(pathname!=='/misi2'&&pathname!=='/misi2/')rel=decodeURIComponent(pathname.slice('/misi2/'.length));
    }catch(error){
      response.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Invalid path');return;
    }
    if(!rel||!/^[a-zA-Z0-9_./-]+$/.test(rel)||rel.split('/').includes('..')){
      response.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Invalid path');return;
    }
    const ext=rel.split('.').at(-1).toLowerCase();
    const mime=({html:'text/html',js:'text/javascript',css:'text/css',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',json:'application/json'})[ext]||'application/octet-stream';
    try{
      const fileContents=await readFile(new URL('misi2/'+rel,BASE));
      response.setHeader('X-Frame-Options','SAMEORIGIN');
      response.writeHead(200,{'Content-Type':mime+(['html','js','css','svg','json'].includes(ext)?'; charset=utf-8':'')});
      response.end(method==='HEAD'?undefined:fileContents);
    }catch(error){
      response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Misi 2 asset not found');
    }
    return;
  }

  // Same-origin route for original Google AI Studio Misi 3 and Vite assets.
  if(pathname==='/misi3'||pathname==='/misi3/'||pathname.startsWith('/misi3/')){
    let rel='index.html';
    try{
      if(pathname!=='/misi3'&&pathname!=='/misi3/')rel=decodeURIComponent(pathname.slice('/misi3/'.length));
    }catch(error){
      response.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Invalid path');return;
    }
    if(!rel||!/^[a-zA-Z0-9_./-]+$/.test(rel)||rel.split('/').includes('..')){
      response.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Invalid path');return;
    }
    const ext=rel.split('.').at(-1).toLowerCase();
    const mime=({html:'text/html',js:'text/javascript',css:'text/css',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',json:'application/json'})[ext]||'application/octet-stream';
    try{
      const fileContents=await readFile(new URL('misi3/'+rel,BASE));
      response.setHeader('X-Frame-Options','SAMEORIGIN');
      response.writeHead(200,{'Content-Type':mime+(['html','js','css','svg','json'].includes(ext)?'; charset=utf-8':'')});
      response.end(method==='HEAD'?undefined:fileContents);
    }catch(error){
      response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
      response.end(method==='HEAD'?undefined:'Misi 3 asset not found');
    }
    return;
  }


  // The existing portal does not authenticate student/teacher accounts yet.
  // Therefore NEVER enable the ZIP's publicly switchable sample teacher accounts
  // or accept children's recordings in ephemeral Render storage.
  if (pathname === '/api/misi4/health') {
    const body = JSON.stringify({
      ok:true,service:'hikayat-nusantara-misi4',
      storage:{configured:false,driver:'object-storage',maxUploadBytes:100*1024*1024,
        note:'Penghantaran guru belum diaktifkan: autentikasi sebenar dan storan persendirian diperlukan. Rakaman boleh disimpan ke peranti.'}
    });
    response.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    response.end(method==='HEAD'?undefined:body);
    return;
  }
  if(pathname.startsWith('/api/misi4/')){
    response.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    response.end(method==='HEAD'?undefined:JSON.stringify({error:'MISI4_BACKEND_NOT_CONFIGURED',
      message:'Penghantaran rasmi kepada guru belum tersedia. Simpan rakaman ke peranti.'}));
    return;
  }

  // Isolated same-origin route for original AI Studio Pentas Warisan game.
  // Same-origin iframe and explicit Permissions-Policy allow browser permission prompts.
  if(pathname==='/misi4'||pathname==='/misi4/'||pathname.startsWith('/misi4/')){
    let rel='index.html';
    try{if(pathname!=='/misi4'&&pathname!=='/misi4/')rel=decodeURIComponent(pathname.slice('/misi4/'.length));}
    catch{response.writeHead(400);response.end('Invalid path');return;}
    if(!rel||!/^[a-zA-Z0-9_./-]+$/.test(rel)||rel.split('/').includes('..')){
      response.writeHead(400);response.end('Invalid path');return;
    }
    const ext=rel.split('.').at(-1).toLowerCase();
    const mime=({html:'text/html',js:'text/javascript',css:'text/css',png:'image/png',jpg:'image/jpeg',
      jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',
      json:'application/json',mp4:'video/mp4',webm:'video/webm'})[ext]||'application/octet-stream';
    try{
      const buf=await readFile(new URL('misi4/'+rel,BASE));
      response.setHeader('X-Frame-Options','SAMEORIGIN');
      response.setHeader('Permissions-Policy','camera=(self), microphone=(self), fullscreen=(self)');
      response.writeHead(200,{'Content-Type':mime+(['html','js','css','svg','json'].includes(ext)?'; charset=utf-8':'')});
      response.end(method==='HEAD'?undefined:buf);
    }catch{response.writeHead(404);response.end(method==='HEAD'?undefined:'Misi 4 asset not found');}
    return;
  }

  const requestedFile = PUBLIC_FILES.get(pathname);
  if (!requestedFile) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(method === "HEAD" ? undefined : "Not found");
    return;
  }

  try {
    const [fileName, mimeType] = requestedFile;
    const fileContents = await readFile(new URL(fileName, BASE));
    response.writeHead(200, { "Content-Type": mimeType });
    response.end(method === "HEAD" ? undefined : fileContents);
  } catch (error) {
    console.error("Gagal membaca fail aplikasi:", error.code || "unknown");
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(method === "HEAD" ? undefined : "Aplikasi belum tersedia");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Hikayat Nusantara berjalan di port ${PORT} (paparan awam tanpa autentikasi)`);
});
