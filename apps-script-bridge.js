// One-way Apps Script -> Render handshake, for diagnostics only.
// Does not expose student data, accept media, or create a public Apps Script endpoint.
import { createHmac, timingSafeEqual } from 'node:crypto';
const used = new Map();
function respond(res,code,value) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(value));
}
export function verifyBridgeRequest(secret, timestamp, nonce, signature, now=Date.now()) {
  if(typeof secret!=='string'||secret.length<32||!/^\d{13}$/.test(String(timestamp))||
     typeof nonce!=='string'||!/^[a-f0-9]{32}$/.test(nonce)||
     typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))return false;
  if(Math.abs(now-Number(timestamp))>120000)return false;
  const expected=createHmac('sha256',secret).update(String(timestamp)+'\n'+nonce+'\nping').digest();
  return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
export async function handleAppsScriptBridge(req,res,path) {
  if(path!=='/api/bridge/ping')return false;
  if(req.method!=='POST'){respond(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});return true;}
  const secret=process.env.RENDER_SHARED_SECRET;
  if(!secret||secret.length<32){respond(res,503,{ok:false,error:'BRIDGE_NOT_CONFIGURED'});return true;}
  let raw='',length=0;
  try {
    for await(const part of req) {
      length+=part.length;
      if(length>2048){respond(res,413,{ok:false,error:'REQUEST_TOO_LARGE'});return true;}
      raw+=part.toString('utf8');
    }
    const data=JSON.parse(raw);
    if(!data||data.action!=='ping'||!verifyBridgeRequest(secret,data.timestamp,data.nonce,data.signature)){
      respond(res,401,{ok:false,error:'UNAUTHORIZED'});return true;
    }
    const key=data.nonce;
    const now=Date.now();
    for(const [nonce,expiry] of used)if(expiry<=now)used.delete(nonce);
    if(used.has(key)){respond(res,409,{ok:false,error:'REPLAYED_REQUEST'});return true;}
    used.set(key,now+120000);
    respond(res,200,{ok:true,system:'hikayat-nusantara',bridge:'apps-script',status:'verified',mediaUpload:false});
  }catch{
    respond(res,400,{ok:false,error:'INVALID_REQUEST'});
  }
  return true;
}
