// config/watermark.js
// -----------------------------------------------------------------------------
// Centralized watermark configuration for PDF page rendering.
//
// All visual watermark parameters live here. The renderer (pdfRenderer.js)
// reads the config and applies it during the compositeWatermark step.
//
// Scaling:
//   Font size and spacing automatically scale with page dimensions so the
//   watermark remains proportional on A4, letter, small e-book, and large
//   format pages without manual adjustment.
// -----------------------------------------------------------------------------

// ── Base configuration (for a reference page ~800px wide) ─────────────
const BASE_CONFIG = {
  // Opacity multiplier: 0.0 (invisible) – 1.0 (fully opaque).
  // Professional e-book platforms use 0.05–0.12 to deter copying without
  // harming readability.
  opacity: 0.08,

  // Rotation of repeating watermark text (degrees).
  // 30–35° is the standard diagonal used by Google Books, Scribd, etc.
  rotationDeg: 32,

  // Base font size in pixels (scaled relative to page width).
  fontSize: 14,

  // Watermark text color (light gray — never pure black or pure white).
  color: { r: 120, g: 120, b: 120 },

  // Base horizontal spacing between repeated watermark lines (px).
  spacingX: 300,

  // Base vertical spacing between repeated watermark lines (px).
  spacingY: 220,

  // Font family — @napi-rs/canvas will pick up system fonts.
  fontFamily: "sans-serif",
};

// ── Reference page width used for scaling calculations ─────────────────
const REFERENCE_WIDTH = 800;
const REFERENCE_HEIGHT = 1040;

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Get watermark configuration scaled for a specific page size.
 *
 * @param {number} pageWidth   Rendered page width in pixels
 * @param {number} pageHeight  Rendered page height in pixels
 * @returns {object} Scaled configuration with same shape as BASE_CONFIG
 */
export function getWatermarkConfig(pageWidth, pageHeight) {
  // Scale factor based on page diagonal relative to reference page
  const refDiag = Math.sqrt(
    REFERENCE_WIDTH * REFERENCE_WIDTH +
      REFERENCE_HEIGHT * REFERENCE_HEIGHT,
  );
  const pageDiag = Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight);
  const scale = Math.max(0.6, Math.min(2.0, pageDiag / refDiag));

  return {
    opacity: BASE_CONFIG.opacity,
    rotationDeg: BASE_CONFIG.rotationDeg,
    fontFamily: BASE_CONFIG.fontFamily,
    color: { ...BASE_CONFIG.color },

    // Scaled values
    fontSize: Math.round(BASE_CONFIG.fontSize * scale),
    spacingX: Math.round(BASE_CONFIG.spacingX * scale),
    spacingY: Math.round(BASE_CONFIG.spacingY * scale),
  };
}

// Export raw base for direct use when page dimensions aren't available
export const WATERMARK_CONFIG = BASE_CONFIG;
