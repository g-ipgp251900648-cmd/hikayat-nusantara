import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { handleCertificateApi } from "../certificate-api.js";

const key = "DemoTestOnly_NotForRender_987654321";
process.env.CERTIFICATE_TEACHER_KEY = key;
const plan = {
  opening: "Melur berjalan di sebuah desa yang indah pada waktu petang.",
  middle: "Melur bersama sahabatnya menghidupkan pelita yang dijumpai.",
  ending: "Penduduk kampung berganding bahu menjaga warisan kampung.",
  format: "audio", practised: true
};
async function call(path, data, teacherKey) {
  const request = Readable.from(data === undefined ? [] : [JSON.stringify(data)]);
  request.method = data === undefined ? "GET" : "POST";
  request.url = path;
  request.headers = {host:"localhost",origin:"http://localhost"};
  if (teacherKey) request.headers["x-teacher-key"] = teacherKey;
  let status = 0, responseBody = "";
  const response = {
    writeHead(code) { status = code; },
    end(body) { responseBody = String(body || ""); }
  };
  const handled = await handleCertificateApi(request,response);
  assert.equal(handled,true);
  return {status,body:JSON.parse(responseBody)};
}

test("Sijil dikunci sehingga 4 misi dan pelan Misi 4 lengkap", async () => {
  const result = await call("/api/certificate/submit", {
    alias:"Pengembara Melur",completed:[true,true,true,false],performance:plan
  });
  assert.equal(result.status,400);
});

test("Guru tidak dapat menyemak/ meluluskan tanpa kunci akses", async () => {
  const noKey = await call("/api/certificate/reviews",{});
  assert.equal(noKey.status,403);
  const wrongKey = await call("/api/certificate/reviews",{},"wrong_test_key_value");
  assert.equal(wrongKey.status,403);
});

test("Penghantaran, respons guru, kelulusan dan nama sijil automatik", async () => {
  const submitted = await call("/api/certificate/submit",{
    alias:"Pengembara Melur",completed:[true,true,true,true],performance:plan
  });
  assert.equal(submitted.status,201);
  assert.equal(submitted.body.status,"pending");
  const statusBefore = await call("/api/certificate/status",{
    id:submitted.body.id,token:submitted.body.token
  });
  assert.equal(statusBefore.body.status,"pending");
  assert.equal(statusBefore.body.certificate,null);
  const unauthorized = await call("/api/certificate/review",{
    id:submitted.body.id,teacherName:"Cikgu Suria",comment:"Bagus, persembahan jelas.",decision:"approve"
  });
  assert.equal(unauthorized.status,403);
  const approved = await call("/api/certificate/review",{
    id:submitted.body.id,teacherName:"Cikgu Suria",comment:"Bagus, persembahan jelas.",decision:"approve"
  },key);
  assert.equal(approved.status,200);
  assert.equal(approved.body.status,"approved");
  const wrongToken = await call("/api/certificate/status",{
    id:submitted.body.id,token:"wrong"
  });
  assert.equal(wrongToken.status,404);
  const statusAfter = await call("/api/certificate/status",{
    id:submitted.body.id,token:submitted.body.token
  });
  assert.equal(statusAfter.body.status,"approved");
  assert.equal(statusAfter.body.certificate.name,"Pengembara Melur");
  assert.equal(statusAfter.body.certificate.teacherName,"Cikgu Suria");
  assert.match(statusAfter.body.certificate.id,/^HN-DEMO-/);
  const duplicate = await call("/api/certificate/review",{
    id:submitted.body.id,teacherName:"Cikgu Suria",comment:"Lulus sekali lagi.",decision:"approve"
  },key);
  assert.equal(duplicate.status,409);
});

test("Guru boleh meminta penambahbaikan dan sijil kekal dikunci", async () => {
  const submitted = await call("/api/certificate/submit",{
    alias:"Pengembara Kenanga",completed:[true,true,true,true],performance:plan
  });
  const review = await call("/api/certificate/review",{
    id:submitted.body.id,teacherName:"Cikgu Suria",comment:"Perincikan bahagian pengakhiran.",decision:"revision"
  },key);
  assert.equal(review.body.status,"revision");
  const status = await call("/api/certificate/status",{
    id:submitted.body.id,token:submitted.body.token
  });
  assert.equal(status.body.certificate,null);
  assert.equal(status.body.comment,"Perincikan bahagian pengakhiran.");
});
