(() => {
  "use strict";

  /**
   * Enhanced chroma-key + matte post-process for cleaner cutouts.
   * - YCbCr distance (better green/blue screen)
   * - Spill suppression
   * - Morphological cleanup + alpha feather
   * - Fringe decontamination
   */
  function rgbToYCbCr(r, g, b) {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return [y, cb, cr];
  }

  function cloneAlpha(data, w, h) {
    const a = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) a[p] = data[i + 3];
    return a;
  }

  function writeAlpha(data, alpha) {
    for (let p = 0, i = 3; p < alpha.length; p++, i += 4) {
      data[i] = Math.max(0, Math.min(255, Math.round(alpha[p])));
    }
  }

  /** Box blur on alpha (separable-ish multi-pass approximation). */
  function blurAlpha(alpha, w, h, radius) {
    const r = Math.max(0, Math.round(radius));
    if (r <= 0) return alpha;
    const tmp = new Float32Array(alpha.length);
    const out = new Float32Array(alpha.length);
    const span = r * 2 + 1;
    // horizontal
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const xx = x + k;
          if (xx < 0 || xx >= w) continue;
          sum += alpha[y * w + xx];
          n++;
        }
        tmp[y * w + x] = sum / (n || 1);
      }
    }
    // vertical
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const yy = y + k;
          if (yy < 0 || yy >= h) continue;
          sum += tmp[yy * w + x];
          n++;
        }
        out[y * w + x] = sum / (n || 1);
      }
    }
    void span;
    return out;
  }

  function morphMinMax(alpha, w, h, radius, mode) {
    const r = Math.max(0, Math.round(radius));
    if (r <= 0) return alpha;
    const out = new Float32Array(alpha.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = mode === "erode" ? 255 : 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue;
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) {
              if (mode === "erode") v = 0;
              continue;
            }
            const a = alpha[yy * w + xx];
            if (mode === "erode") v = Math.min(v, a);
            else v = Math.max(v, a);
          }
        }
        out[y * w + x] = v;
      }
    }
    return out;
  }

  function decontaminate(data, alpha, w, h, strength) {
    const s = Math.max(0, Math.min(1, strength));
    if (s <= 0) return;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const a = alpha[p];
        if (a <= 1 || a >= 254) continue;
        // blend toward non-transparent neighbors' average color
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const np = yy * w + xx;
            if (alpha[np] < 200) continue;
            const i = np * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
          }
        }
        if (!n) continue;
        const i = p * 4;
        const t = s * (1 - a / 255);
        data[i] = Math.round(data[i] * (1 - t) + (r / n) * t);
        data[i + 1] = Math.round(data[i + 1] * (1 - t) + (g / n) * t);
        data[i + 2] = Math.round(data[i + 2] * (1 - t) + (b / n) * t);
      }
    }
  }

  function sampleKey(data, w, h, mode, customRgb) {
    if (mode === "custom" && customRgb) return customRgb;
    if (mode === "topleft") return [data[0], data[1], data[2]];
    // denser edge sampling for green screens
    const pts = [];
    const stepX = Math.max(1, Math.floor(w / 8));
    const stepY = Math.max(1, Math.floor(h / 8));
    for (let x = 0; x < w; x += stepX) {
      pts.push([x, 0], [x, h - 1]);
    }
    for (let y = 0; y < h; y += stepY) {
      pts.push([0, y], [w - 1, y]);
    }
    pts.push([0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]);
    let r = 0,
      g = 0,
      b = 0;
    for (const [x, y] of pts) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const n = pts.length;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  /**
   * @param {ImageData} imageData
   * @param {object} opts
   */
  function process(imageData, opts = {}) {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width;
    const h = imageData.height;
    const key = opts.keyRgb || sampleKey(data, w, h, opts.sample || "corners", opts.customRgb);
    const tolerance = Math.max(0, Number(opts.tolerance) || 42);
    const softness = Math.max(0.5, Number(opts.softness) || 28);
    const spill = Math.max(0, Math.min(1, Number(opts.spill) ?? 0.7));
    const [, kCb, kCr] = rgbToYCbCr(key[0], key[1], key[2]);
    const greenScreen = key[1] >= key[0] && key[1] >= key[2];

    const alpha = new Float32Array(w * h);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const [, cb, cr] = rgbToYCbCr(r, g, b);
      // chroma-plane distance (ignore luma — more robust for uneven green screens)
      const dist = Math.sqrt((cb - kCb) ** 2 + (cr - kCr) ** 2);
      // also consider RGB distance lightly for near-key colors
      const rgbDist = Math.sqrt((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2);
      const d = dist * 0.75 + rgbDist * 0.25;

      let a = 255;
      if (d <= tolerance) a = 0;
      else if (d < tolerance + softness) a = ((d - tolerance) / softness) * 255;
      a = Math.min(data[i + 3], a);
      alpha[p] = a;

      if (a < 255 && spill > 0) {
        if (greenScreen && g > r && g > b) {
          const excess = (g - Math.max(r, b)) * spill * (1 - a / 255);
          data[i + 1] = Math.max(0, g - excess);
          const lift = excess * 0.4;
          data[i] = Math.min(255, r + lift);
          data[i + 2] = Math.min(255, b + lift);
        } else if (!greenScreen && b > r && b > g) {
          const excess = (b - Math.max(r, g)) * spill * (1 - a / 255);
          data[i + 2] = Math.max(0, b - excess);
          const lift = excess * 0.4;
          data[i] = Math.min(255, r + lift);
          data[i + 1] = Math.min(255, g + lift);
        }
      }
    }

    const refined = refineAlpha(data, alpha, w, h, opts);
    writeAlpha(data, refined);
    return new ImageData(data, w, h);
  }

  function refineAlpha(data, alphaIn, w, h, opts) {
    let alpha = alphaIn;
    const erode = Math.max(0, Number(opts.erode) || 0);
    const dilate = Math.max(0, Number(opts.dilate) || 0);
    const feather = Math.max(0, Number(opts.feather) || 0);
    const decont = Math.max(0, Math.min(1, Number(opts.decontaminate) ?? 0.45));

    // close small holes then shrink fringe: dilate → erode (or open: erode → dilate)
    if (erode > 0) alpha = morphMinMax(alpha, w, h, erode, "erode");
    if (dilate > 0) alpha = morphMinMax(alpha, w, h, dilate, "dilate");
    if (feather > 0) alpha = blurAlpha(alpha, w, h, feather);
    // threshold soft noise
    const floor = Math.max(0, Number(opts.alphaFloor) || 8);
    for (let i = 0; i < alpha.length; i++) {
      if (alpha[i] < floor) alpha[i] = 0;
      else if (alpha[i] > 255 - floor) alpha[i] = 255;
    }
    decontaminate(data, alpha, w, h, decont);
    return alpha;
  }

  /**
   * Apply post-process to any RGBA image (e.g. AI result) to clean edges.
   */
  function postProcess(imageData, opts = {}) {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width;
    const h = imageData.height;
    let alpha = cloneAlpha(data, w, h);
    alpha = refineAlpha(data, alpha, w, h, {
      erode: opts.erode ?? 1,
      dilate: opts.dilate ?? 1,
      feather: opts.feather ?? 1.5,
      decontaminate: opts.decontaminate ?? 0.5,
      alphaFloor: opts.alphaFloor ?? 10,
    });
    writeAlpha(data, alpha);
    return new ImageData(data, w, h);
  }

  /**
   * Punch remaining chroma fringe from AI cutout using original pixels' key color.
   */
  function punchChromaFringe(aiImageData, originalImageData, opts = {}) {
    const w = aiImageData.width;
    const h = aiImageData.height;
    if (originalImageData.width !== w || originalImageData.height !== h) {
      return postProcess(aiImageData, opts);
    }
    const ai = new Uint8ClampedArray(aiImageData.data);
    const src = originalImageData.data;
    const key = opts.keyRgb || sampleKey(src, w, h, opts.sample || "corners", opts.customRgb);
    const tolerance = Math.max(0, Number(opts.tolerance) || 38);
    const softness = Math.max(0.5, Number(opts.softness) || 22);
    const [, kCb, kCr] = rgbToYCbCr(key[0], key[1], key[2]);
    const spill = Math.max(0, Math.min(1, Number(opts.spill) ?? 0.65));
    const greenScreen = key[1] >= key[0] && key[1] >= key[2];
    const alpha = new Float32Array(w * h);

    for (let i = 0, p = 0; i < ai.length; i += 4, p++) {
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      const [, cb, cr] = rgbToYCbCr(r, g, b);
      const dist = Math.sqrt((cb - kCb) ** 2 + (cr - kCr) ** 2);
      let punch = 255;
      if (dist <= tolerance) punch = 0;
      else if (dist < tolerance + softness) punch = ((dist - tolerance) / softness) * 255;
      alpha[p] = Math.min(ai[i + 3], punch);

      if (alpha[p] < 255 && spill > 0 && greenScreen && ai[i + 1] > ai[i] && ai[i + 1] > ai[i + 2]) {
        const excess = (ai[i + 1] - Math.max(ai[i], ai[i + 2])) * spill * (1 - alpha[p] / 255);
        ai[i + 1] = Math.max(0, ai[i + 1] - excess);
        ai[i] = Math.min(255, ai[i] + excess * 0.35);
        ai[i + 2] = Math.min(255, ai[i + 2] + excess * 0.35);
      }
    }
    const refined = refineAlpha(ai, alpha, w, h, opts);
    writeAlpha(ai, refined);
    return new ImageData(ai, w, h);
  }

  window.ChromaMatting = {
    process,
    postProcess,
    punchChromaFringe,
    sampleKey,
    rgbToYCbCr,
  };
})();
