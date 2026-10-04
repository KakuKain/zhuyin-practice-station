import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the public zhuyin practice station", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>一年級注音練習站｜注音小練習<\/title>/);
  assert.match(html, /注音小練習/);
  assert.doesNotMatch(html, /<span class="eyebrow">一年級注音練習<\/span>|開心練習|打好基礎/);
  assert.doesNotMatch(html, /課文默寫・聽寫/);
  assert.match(html, /貓咪/);
  assert.match(html, /鵝寶寶/);
  assert.match(html, /河馬和河狸/);
  assert.match(html, /笑嘻嘻/);
  for (const title of ["翹翹板", "謝謝老師", "龜兔賽跑", "拔蘿蔔", "動物狂歡會"])
    assert.match(html, new RegExp(title));
  assert.match(html, /選擇教材/);
  for (const review of ["複習一", "複習二", "複習三"]) assert.match(html, new RegExp(review));
  assert.match(html, /選擇課程/);
  assert.match(html, /class="journey-footer"/);
  assert.doesNotMatch(html, /id="course-lesson-7" hidden/);
  assert.match(html, /主要導覽/);
  assert.doesNotMatch(html, /首頁/);
});
