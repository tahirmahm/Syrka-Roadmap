import { test } from "node:test";
import assert from "node:assert/strict";
import { resizedCamera } from "../src/living/camera";
test("camera preserves the same world centre through inspector and desktop/mobile resize", () => {
  const start = { x: 600, y: 320, zoom: 0.8, width: 1440, height: 950 };
  const mobile = resizedCamera(start, 390, 794);
  assert.equal(
    (start.width / 2 - start.x) / start.zoom,
    (mobile.width / 2 - mobile.x) / mobile.zoom,
  );
  assert.equal(
    (start.height / 2 - start.y) / start.zoom,
    (mobile.height / 2 - mobile.y) / mobile.zoom,
  );
  assert.deepEqual(resizedCamera(mobile, 1440, 950), start);
});
