/**
 * API kelulusan sijil Fasa 2C — demonstrasi terkawal oleh guru.
 *
 * PENTING: Map hanya dalam RAM. Render restart/deploy akan mengosongkan semua rekod.
 * Nama yang dimasukkan mesti nama samaran/demo; bukan data murid sebenar.
 * Kunci guru disimpan sebagai environment variable CERTIFICATE_TEACHER_KEY (>=16 aksara).
 * Kelulusan hanya berlaku pada pelayan, tidak boleh dibuat melalui localStorage murid.
 * Implementasi sebenar memerlukan login yang sah dan storan berterusan (contoh Neon).
 */
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const records = new Map();
const MAX_RECORDS = 150;
const MAX_BODY = 10_240;
const maxAgeMs = 1000 * 60 * 60 * 24 * 7;

function respond(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}

const clean = (value, max = 300) =>
  typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max) : "";

function teacherConfigured() {
  return typeof process.env.CERTIFICATE_TEACHER_KEY === "string"
    && process.env.CERTIFICATE_TEACHER_KEY.length >= 16;
}
function teacherAuthorized(request) {
  if (!teacherConfigured()) return false;
  const offered = request.headers["x-teacher-key"];
  if (typeof offered !== "string" || offered.length > 256) return false;
  const expected = Buffer.from(process.env.CERTIFICATE_TEACHER_KEY, "utf8");
  const received = Buffer.from(offered, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return url.host === request.headers.host && (url.protocol === "https:" || url.protocol === "http:");
  } catch { return false; }
}
async function parseJson(request) {
  const declared = Number(request.headers["content-length"] || 0);
  if (declared > MAX_BODY) throw new Error("Payload terlalu besar.");
  let bytes = 0;
  const parts = [];
  for await (const part of request) {
    bytes += part.length;
    if (bytes > MAX_BODY) throw new Error("Payload terlalu besar.");
    parts.push(part);
  }
  const txt = Buffer.concat(parts).toString("utf8");
  if (!txt) throw new Error("Badan permintaan tidak lengkap.");
  const value = JSON.parse(txt);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Format permintaan tidak sah.");
  return value;
}
function cleanup() {
  const time = Date.now();
  for (const [id, rec] of records) if (time - rec.createdTime > maxAgeMs) records.delete(id);
  while (records.size > MAX_RECORDS) records.delete(records.keys().next().value);
}
function safeStatus(rec) {
  const approved = rec.status === "approved";
  return {
    status: rec.status,
    comment: rec.comment || "",
    teacherName: approved ? rec.teacherName : "",
    certificate: approved ? {
      id: rec.certificateId,
      name: rec.alias,
      teacherName: rec.teacherName,
      issuedAt: rec.issuedAt,
      title: "Sijil Pengembara Warisan",
      demo: true,
    } : null
  };
}
function validateSubmission(data) {
  const alias = clean(data.alias, 55);
  if (alias.length < 2 || alias.includes("<") || alias.includes(">")) throw new Error("Masukkan nama samaran atau nama contoh (2–55 aksara).");
  if (!Array.isArray(data.completed) || data.completed.length !== 4 || !data.completed.every(x => x === true)) {
    throw new Error("Lengkapkan keempat-empat latihan terlebih dahulu.");
  }
  const perf = data.performance;
  if (!perf || typeof perf !== "object" || perf.practised !== true) throw new Error("Misi 4 belum lengkap.");
  const plan = {
    opening: clean(perf.opening, 900),
    middle: clean(perf.middle, 900),
    ending: clean(perf.ending, 900),
    format: perf.format === "video" ? "video" : "audio"
  };
  if ([plan.opening, plan.middle, plan.ending].some(s => s.length < 20)) {
    throw new Error("Lengkapkan rancangan tiga babak Misi 4 terlebih dahulu.");
  }
  return { alias, plan };
}

export async function handleCertificateApi(request, response) {
  const url = new URL(request.url || "/", "http://localhost");
  if (!url.pathname.startsWith("/api/certificate/")) return false;
  cleanup();
  if (request.method === "GET" && url.pathname === "/api/certificate/config") {
    respond(response, 200, { demo: true, teacherConfigured: teacherConfigured(), persistence: "memory-only" });
    return true;
  }
  if (request.method !== "POST") {
    respond(response, 405, { error: "Kaedah tidak dibenarkan." });
    return true;
  }
  if (!sameOrigin(request)) {
    respond(response, 403, { error: "Permintaan dari laman lain ditolak." });
    return true;
  }
  try {
    const body = await parseJson(request);
    if (url.pathname === "/api/certificate/submit") {
      const { alias, plan } = validateSubmission(body);
      const id = randomUUID();
      const token = randomBytes(30).toString("hex");
      const rec = {
        id, token, alias, plan,
        createdTime: Date.now(),
        createdAt: new Date().toISOString(),
        status: "pending", comment: "", teacherName: "", certificateId: "", issuedAt: ""
      };
      records.set(id, rec);
      cleanup();
      respond(response, 201, { id, token, status: "pending", message: "Dihantar untuk semakan guru (mod demo)." });
      return true;
    }
    if (url.pathname === "/api/certificate/status") {
      const id = clean(body.id, 80), token = clean(body.token, 100);
      const rec = records.get(id);
      if (!rec || rec.token !== token) {
        respond(response, 404, { error: "Rekod tidak tersedia. Ia mungkin telah luput selepas server dimulakan semula." });
      } else respond(response, 200, safeStatus(rec));
      return true;
    }
    if (url.pathname === "/api/certificate/reviews") {
      if (!teacherAuthorized(request)) {
        respond(response, teacherConfigured() ? 403 : 503,
          { error: teacherConfigured() ? "Kunci guru tidak sah." : "Kunci akses guru belum disediakan dalam Render." });
        return true;
      }
      const queue = [...records.values()].reverse().map(rec => ({
        id: rec.id, alias: rec.alias, plan: rec.plan,
        status: rec.status, createdAt: rec.createdAt, comment: rec.comment,
        issuedAt: rec.issuedAt, certificateId: rec.certificateId
      }));
      respond(response, 200, { demo: true, queue });
      return true;
    }
    if (url.pathname === "/api/certificate/review") {
      if (!teacherAuthorized(request)) {
        respond(response, teacherConfigured() ? 403 : 503,
          { error: teacherConfigured() ? "Kunci guru tidak sah." : "Kunci akses guru belum disediakan dalam Render." });
        return true;
      }
      const id = clean(body.id, 80), rec = records.get(id);
      if (!rec) { respond(response, 404, { error: "Penghantaran tidak ditemui." }); return true; }
      if (rec.status !== "pending") {
        respond(response, 409, { error: "Rekod ini telah disemak. Penghantaran baharu diperlukan untuk semakan semula." });
        return true;
      }
      const decision = body.decision;
      const comment = clean(body.comment, 500);
      const teacherName = clean(body.teacherName, 65);
      if (!["approve","revision"].includes(decision) || comment.length < 5 || teacherName.length < 2) {
        respond(response, 400, { error: "Pilih keputusan, nama penyemak dan tulis respons sekurang-kurangnya lima aksara." });
        return true;
      }
      rec.comment = comment;
      rec.teacherName = teacherName;
      if (decision === "approve") {
        rec.status = "approved";
        rec.issuedAt = new Date().toISOString();
        rec.certificateId = "HN-DEMO-" + new Date().getUTCFullYear() + "-" + randomBytes(4).toString("hex").toUpperCase();
      } else rec.status = "revision";
      respond(response, 200, { message: decision === "approve" ? "Sijil DEMO diluluskan oleh guru." : "Permintaan penambahbaikan direkodkan.", status: rec.status });
      return true;
    }
    respond(response, 404, { error: "Laluan API tidak dikenali." });
  } catch (error) {
    const message = error instanceof SyntaxError ? "Format JSON tidak sah." : (error.message || "Permintaan gagal.");
    respond(response, 400, { error: message });
  }
  return true;
}
