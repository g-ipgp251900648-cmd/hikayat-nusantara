/**
 * Hikayat Nusantara — pelayan Node.js untuk prototaip Fasa 1.
 * Hanya fail UI demonstrasi dipaparkan; TIADA endpoint data murid atau log masuk.
 * Fail /dist dijana oleh npm run build dan bersifat sementara (deploy sahaja).
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const PUBLIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/world3d.js", ["world3d.js", "text/javascript; charset=utf-8"]],
  ["/student-map3d.js", ["student-map3d.js", "text/javascript; charset=utf-8"]],
  ["/student-activities.js", ["student-activities.js", "text/javascript; charset=utf-8"]],
  ["/mission-one-ai-bridge.js", ["mission-one-ai-bridge.js", "text/javascript; charset=utf-8"]],
  ["/student-learning-center.js", ["student-learning-center.js", "text/javascript; charset=utf-8"]],
]);
const BASE = new URL("./dist/", import.meta.url);
const PORT = Number(process.env.PORT || 10000);

const server = createServer(async (request, response) => {
  const method = request.method || "GET";
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Cache-Control", "no-store");

  if (method !== "GET" && method !== "HEAD") {
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
  console.log(`Hikayat Nusantara berjalan di port ${PORT} (Fasa 1, mod demonstrasi)`);
});
