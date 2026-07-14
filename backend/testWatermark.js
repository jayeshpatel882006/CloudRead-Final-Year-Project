// testWatermark.js — Diagnostic watermark visibility test
// -----------------------------------------------------------------------------
// Calls the ACTUAL renderPageAsPng pipeline with a real PDF, saves the output,
// and analyzes pixels to determine if the watermark is being drawn.
//
// Usage:  node testWatermark.js
// Output: test_watermark_output.png   (visual inspection)
//         Console logs with pixel analysis
// -----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { PNG } from "pngjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.resolve(__dirname, "uploads");
const OUTPUT_DIR = __dirname;

async function main() {
  console.log("=".repeat(70));
  console.log("WATERMARK DIAGNOSTIC TEST");
  console.log("=".repeat(70));

  // ── Step 1: Find a test PDF ───────────────────────────────────────
  const pdfs = fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => f.endsWith(".pdf"));
  if (pdfs.length === 0) {
    console.error("❌ No PDFs found in uploads/");
    process.exit(1);
  }
  const pdfFile = pdfs[0];
  console.log("\n[1] Test PDF:", pdfFile);

  // ── Step 2: Import the real renderer ──────────────────────────────
  console.log("\n[2] Importing renderPageAsPng...");
  let renderPageAsPng, renderPageAsRgba;
  try {
    const mod = await import("./services/pdfRenderer.js");
    renderPageAsPng = mod.renderPageAsPng;
    renderPageAsRgba = mod.renderPageAsRgba;
    console.log("    ✅ Import OK");
  } catch (e) {
    console.error("    ❌ Import FAILED:", e.message);
    process.exit(1);
  }

  // ── Step 3: Render page 1 with watermark ──────────────────────────
  console.log("\n[3] Rendering page 1 via renderPageAsPng()...");
  console.log("    Watermark params: name='Test Student', email='test@test.com', date='2026-07-14'");
  
  let pngBuffer;
  try {
    const start = Date.now();
    pngBuffer = await renderPageAsPng(pdfFile, 1, {
      name: "Test Student",
      email: "test@test.com",
      date: "2026-07-14",
    });
    const elapsed = Date.now() - start;
    console.log(`    ✅ Render OK (${elapsed}ms)`);
    console.log(`    PNG size: ${pngBuffer.length} bytes`);
  } catch (e) {
    console.error("    ❌ Render FAILED:", e.message);
    console.error(e.stack);
    process.exit(1);
  }

  // ── Step 4: Parse the PNG and analyze pixels ──────────────────────
  console.log("\n[4] Analyzing pixels...");
  let png;
  try {
    png = PNG.sync.read(pngBuffer);
  } catch (e) {
    console.error("    ❌ PNG parse FAILED:", e.message);
    process.exit(1);
  }
  console.log(`    Image: ${png.width}x${png.height}`);

  const pixels = png.data;
  const totalPixels = png.width * png.height;

  // Look for pixels that are NOT pure white (255,255,255) and NOT pure black (0,0,0)
  // The watermark at 8% opacity over white should produce rgb(242,242,242) approximately
  let watermarkPixels = 0;
  let grayPixels = 0; // pixels in the 235-250 range (watermark over white)
  
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // Check for gray watermark pixels (close to 242 on white bg)
    const avg = (r + g + b) / 3;
    if (avg >= 235 && avg <= 250 && r !== 255) {
      grayPixels++;
    }
    
    // Check for any non-white, non-black pixel
    if ((r !== 255 || g !== 255 || b !== 255) && 
        (r !== 0 || g !== 0 || b !== 0)) {
      watermarkPixels++;
    }
  }

  console.log(`\n    Total pixels:     ${totalPixels}`);
  console.log(`    Non-white pixels: ${watermarkPixels} (${(watermarkPixels/totalPixels*100).toFixed(2)}%)`);
  console.log(`    Gray (235-250):   ${grayPixels} (${(grayPixels/totalPixels*100).toFixed(2)}%)`);

  // ── Step 5: Save output for visual inspection ─────────────────────
  const outputPath = path.join(OUTPUT_DIR, "test_watermark_output.png");
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`\n[5] Saved visual output to: ${outputPath}`);

  // ── Step 6: Draw a test canvas with ONLY the watermark for comparison ──
  console.log("\n[6] Creating standalone watermark test...");
  const testW = png.width > 1000 ? 800 : png.width;
  const testH = png.height > 1000 ? 1000 : png.height;
  const testCanvas = createCanvas(testW, testH);
  const testCtx = testCanvas.getContext("2d");

  // Fill white
  testCtx.fillStyle = "white";
  testCtx.fillRect(0, 0, testW, testH);

  // Draw the EXACT same watermark pattern
  testCtx.save();
  testCtx.globalAlpha = 0.10;  // Use the user's requested opacity
  testCtx.fillStyle = "#666666";
  testCtx.font = "bold 20px Arial";
  testCtx.textAlign = "center";
  testCtx.textBaseline = "middle";
  testCtx.translate(testW / 2, testH / 2);
  testCtx.rotate(-Math.PI / 6);

  const lines = ["Test Student", "test@test.com", "2026-07-14"];
  let count = 0;
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      for (let li = 0; li < lines.length; li++) {
        testCtx.fillText(lines[li], col * 300, row * 220 + li * 24);
      }
      count++;
    }
  }
  testCtx.restore();
  
  // Also draw a BRIGHT RED test text at the center
  testCtx.save();
  testCtx.fillStyle = "red";
  testCtx.font = "bold 60px Arial";
  testCtx.textAlign = "center";
  testCtx.textBaseline = "middle";
  testCtx.globalAlpha = 1.0;
  testCtx.fillText("TEST WATERMARK", testW / 2, testH / 2);
  testCtx.restore();

  const testBuf = testCanvas.toBuffer("image/png");
  const testOutputPath = path.join(OUTPUT_DIR, "test_watermark_standalone.png");
  fs.writeFileSync(testOutputPath, testBuf);
  console.log(`    Saved standalone test to: ${testOutputPath}`);

  // ── Step 7: Analyze the standalone test ──────────────────────────
  const testPng = PNG.sync.read(testBuf);
  let testWatermarkPixels = 0;
  for (let i = 0; i < testPng.data.length; i += 4) {
    const r = testPng.data[i];
    const g = testPng.data[i + 1];
    const b = testPng.data[i + 2];
    if (r !== 255 || g !== 255 || b !== 255) {
      testWatermarkPixels++;
    }
  }
  console.log(`    Standalone test non-white pixels: ${testWatermarkPixels} (${(testWatermarkPixels/(testPng.width*testPng.height)*100).toFixed(2)}%)`);

  // ── Conclusion ──────────────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log("CONCLUSION");
  console.log("=".repeat(70));
  
  if (watermarkPixels > 100) {
    console.log("✅ WATERMARK IS BEING DRAWN (pipeline works)");
    console.log(`   Found ${watermarkPixels} non-white pixels in the rendered page.`);
    console.log(`   The watermark at 0.08 opacity produces ~${grayPixels} grayish pixels.`);
    console.log("\n   If the watermark appears invisible in the browser:");
    console.log("   - Check if the opacity is too low for your screen/lighting");
    console.log("   - Try increasing opacity to 0.10-0.12");
    console.log("   - Try darker color (rgb(80,80,80) or rgb(70,70,70))");
    console.log("   - Check monitor brightness/contrast settings");
  } else {
    console.log("❌ WATERMARK IS NOT BEING DRAWN (pipeline issue)");
    console.log("   The rendered page has almost no non-white pixels.");
    console.log("   This means the watermark drawing code is NOT executing,");
    console.log("   OR the text is being drawn with 0% opacity / invisible color.");
  }

  // If the standalone test shows watermark but the real render doesn't,
  // the issue is in how the watermark function is called
  if (testWatermarkPixels > 100 && watermarkPixels < 100) {
    console.log("\n⚠️  ISSUE IDENTIFIED:");
    console.log("   The standalone canvas test PRODUCES a visible watermark,");
    console.log("   but the actual renderPageAsPng() does NOT.");
    console.log("   This means drawWatermarkOnCanvas() is either:");
    console.log("   a) Not being called");
    console.log("   b) Throwing an exception (caught silently)");
    console.log("   c) Drawing with different parameters than expected");
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
