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
  assert.match(html, /開心練習/);
  assert.match(html, /貓咪/);
  assert.match(html, /不用登入也能練/);
});

test("the source keeps the handoff interaction vocabulary", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /ListenPhase = \"ready\" \| \"active\"/);
  assert.match(page, /開始聽/);
  assert.match(page, /需要補強/);
  assert.match(page, /touch-action: none/);
  assert.match(page, /ㄧ/);
  assert.match(page, /dir="rtl"/);
  assert.match(page, /貓咪弟弟跑第一|character: "跑"/);
});
