import test from "node:test";
import assert from "node:assert/strict";
import { buildCollageSvg } from "./collage-template.js";

test("visual study board embeds sources and escapes user-facing text", () => {
  const svg = buildCollageSvg({
    title: "Plants & energy",
    caption: "Review <the source>",
    callouts: [{ text: "Light becomes stored energy.", sourceIds: ["S1"] }],
  }, [{
    name: 'notes "final".png',
    dataUrl: "data:image/png;base64,AAAA",
  }]);

  assert.match(svg, /width="1600" height="1100"/);
  assert.match(svg, /Plants &amp; energy/);
  assert.match(svg, /Review &lt;the source&gt;/);
  assert.match(svg, /notes &quot;final&quot;\.png/);
  assert.match(svg, /data:image\/png;base64,AAAA/);
  assert.match(svg, /Light becomes stored energy\./);
});
