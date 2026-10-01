import assert from "node:assert/strict";
import test from "node:test";
import { imageReady } from "../../lib/loading/usePageResources";

test("resource readiness waits for load, resolves cached images immediately, and reports errors", async () => {
  const image = Object.assign(new EventTarget(), {
    complete: false,
    naturalWidth: 0,
  }) as unknown as HTMLImageElement;
  let ready = false;
  const pending = imageReady(image).then(() => {
    ready = true;
  });
  await Promise.resolve();
  assert.equal(ready, false);
  image.dispatchEvent(new Event("load"));
  await pending;
  assert.equal(ready, true);
  await imageReady({ complete: true, naturalWidth: 640 } as HTMLImageElement);
  await assert.rejects(imageReady({ complete: true, naturalWidth: 0 } as HTMLImageElement));
  const failed = Object.assign(new EventTarget(), {
    complete: false,
  }) as unknown as HTMLImageElement;
  const error = imageReady(failed);
  failed.dispatchEvent(new Event("error"));
  await assert.rejects(error);
});
