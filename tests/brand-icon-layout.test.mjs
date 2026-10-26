import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import PNG from "png-js";

const root = new URL("../", import.meta.url);
const icons = [
  ["oroactive-logo.png", 1024, 0.98],
  ["icons/apple-touch-icon-180.png", 180, 0.86],
  ["icons/oroactive-relief-apple-touch-180-20261026.png", 180, 0.86],
  ["icons/icon-192.png", 192, 0.78],
  ["icons/oroactive-relief-192-20261026.png", 192, 0.78],
  ["icons/icon-512.png", 512, 0.78],
  ["icons/oroactive-relief-512-20261026.png", 512, 0.78],
  ["ios/OroActiveTrial/Assets.xcassets/AppIcon.appiconset/icon.png", 1024, 0.86],
  ["ios/OroActiveTrial/Assets.xcassets/OroActiveLogo.imageset/logo.png", 1024, 0.98]
];

async function measure(file) {
  const png = new PNG(readFileSync(new URL(file, root)));
  const pixels = await new Promise(resolve => png.decode(resolve));
  let left = png.width, top = png.height, right = -1, bottom = -1;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const i = (y * png.width + x) * 4;
    // Ignore only the dark backdrop; include every visible letter and the rim.
    if (pixels[i + 3] > 128 && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 80) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  return { width: png.width, height: png.height, left, right, top, bottom };
}

for (const [file, size, occupancy] of icons) {
  test(`logo remains circular, centered and properly sized in ${file}`, async () => {
    const box = await measure(file);
    assert.equal(box.width, size); assert.equal(box.height, size);
    const width = box.right - box.left + 1, height = box.bottom - box.top + 1;
    assert.ok(Math.abs(width - height) <= 2, `Logo distorted: ${width} × ${height}`);
    assert.ok(Math.abs((box.left + box.right + 1) / 2 - size / 2) <= 1.5, "Off-center horizontally");
    assert.ok(Math.abs((box.top + box.bottom + 1) / 2 - size / 2) <= 1.5, "Off-center vertically");
    assert.ok(Math.abs(width / size - occupancy) < 0.025, `Unexpected fill: ${width / size}`);
    assert.ok(box.left > 0 && box.top > 0 && box.right < size - 1 && box.bottom < size - 1, "Logo clipped");
  });
}

test("maskable icons preserve the full mark inside the central safe circle", async () => {
  for (const filename of ["manifest.json", "manifest.webmanifest"]) {
    const manifest = JSON.parse(readFileSync(new URL(filename, root), "utf8"));
    for (const icon of manifest.icons.filter(icon => icon.purpose.includes("maskable"))) {
      const box = await measure(icon.src.split("?")[0].slice(1));
      assert.ok((box.right - box.left + 1) / box.width <= 0.8);
      assert.ok((box.bottom - box.top + 1) / box.height <= 0.8);
    }
  }
});
