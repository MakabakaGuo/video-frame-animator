/**
 * 去水印算法（浏览器端，无外部依赖）
 * 方法：inpaint（邻域向内修补）| blur（区域模糊）| edge（边缘色填充）
 */
(function (global) {
  "use strict";

  /**
   * @param {ImageData} imageData
   * @param {{x:number,y:number,w:number,h:number}[]} rects 像素坐标
   * @param {{ method?: string, feather?: number, blurRadius?: number }} options
   * @returns {ImageData}
   */
  function removeWatermark(imageData, rects, options) {
    const opts = options || {};
    const method = opts.method || "inpaint";
    const feather = Math.max(0, Math.floor(opts.feather ?? 2));
    const blurRadius = Math.max(1, Math.floor(opts.blurRadius ?? 8));

    const w = imageData.width;
    const h = imageData.height;
    const src = new Uint8ClampedArray(imageData.data);
    const out = new Uint8ClampedArray(imageData.data);
    const mask = new Uint8Array(w * h);

    for (const r of rects) {
      const x0 = clamp(Math.floor(r.x), 0, w - 1);
      const y0 = clamp(Math.floor(r.y), 0, h - 1);
      const x1 = clamp(Math.ceil(r.x + r.w), 0, w);
      const y1 = clamp(Math.ceil(r.y + r.h), 0, h);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          mask[y * w + x] = 1;
        }
      }
    }

    if (method === "blur") {
      applyRegionBlur(src, out, mask, w, h, blurRadius);
    } else if (method === "edge") {
      applyEdgeFill(src, out, mask, w, h, rects);
    } else {
      applyInpaint(src, out, mask, w, h);
    }

    // 智能修补已从边界生长，羽化仅用于模糊/填充，避免把水印混回来
    if (feather > 0 && method !== "inpaint") {
      softBlend(src, out, mask, w, h, feather);
    }

    return new ImageData(out, w, h);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  /** 从边界向内多轮邻域平均，适合 logo / 半透明角标 */
  function applyInpaint(src, out, mask, w, h) {
    const known = new Uint8Array(w * h);
    for (let i = 0; i < known.length; i++) known[i] = mask[i] ? 0 : 1;

    // 复制已知像素
    out.set(src);

    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1],
    ];

    let remaining = 0;
    for (let i = 0; i < mask.length; i++) if (mask[i]) remaining++;

    const maxPass = remaining + 8;
    for (let pass = 0; pass < maxPass && remaining > 0; pass++) {
      /** @type {number[]} */
      const frontier = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (known[i]) continue;
          let border = false;
          for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (known[ny * w + nx]) {
              border = true;
              break;
            }
          }
          if (border) frontier.push(i);
        }
      }
      if (!frontier.length) break;

      for (const i of frontier) {
        const x = i % w;
        const y = (i - x) / w;
        let r = 0, g = 0, b = 0, a = 0, wt = 0;
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!known[ni]) continue;
          const weight = dx === 0 || dy === 0 ? 1.2 : 0.7;
          const o = ni * 4;
          r += out[o] * weight;
          g += out[o + 1] * weight;
          b += out[o + 2] * weight;
          a += out[o + 3] * weight;
          wt += weight;
        }
        if (wt > 0) {
          const o = i * 4;
          out[o] = Math.round(r / wt);
          out[o + 1] = Math.round(g / wt);
          out[o + 2] = Math.round(b / wt);
          out[o + 3] = Math.round(a / wt);
          known[i] = 1;
          remaining--;
        }
      }
    }
  }

  function applyRegionBlur(src, out, mask, w, h, radius) {
    out.set(src);
    const r = radius;
    const tmp = new Float32Array(w * h * 4);

    // 水平
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) {
          const o = i * 4;
          tmp[o] = src[o];
          tmp[o + 1] = src[o + 1];
          tmp[o + 2] = src[o + 2];
          tmp[o + 3] = src[o + 3];
          continue;
        }
        let cr = 0, cg = 0, cb = 0, ca = 0, n = 0;
        for (let dx = -r; dx <= r; dx++) {
          const nx = clamp(x + dx, 0, w - 1);
          const o = (y * w + nx) * 4;
          cr += src[o];
          cg += src[o + 1];
          cb += src[o + 2];
          ca += src[o + 3];
          n++;
        }
        const o = i * 4;
        tmp[o] = cr / n;
        tmp[o + 1] = cg / n;
        tmp[o + 2] = cb / n;
        tmp[o + 3] = ca / n;
      }
    }

    // 垂直
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        let cr = 0, cg = 0, cb = 0, ca = 0, n = 0;
        for (let dy = -r; dy <= r; dy++) {
          const ny = clamp(y + dy, 0, h - 1);
          const o = (ny * w + x) * 4;
          cr += tmp[o];
          cg += tmp[o + 1];
          cb += tmp[o + 2];
          ca += tmp[o + 3];
          n++;
        }
        const o = i * 4;
        out[o] = Math.round(cr / n);
        out[o + 1] = Math.round(cg / n);
        out[o + 2] = Math.round(cb / n);
        out[o + 3] = Math.round(ca / n);
      }
    }
  }

  function applyEdgeFill(src, out, mask, w, h, rects) {
    out.set(src);
    for (const rect of rects) {
      const x0 = clamp(Math.floor(rect.x), 0, w - 1);
      const y0 = clamp(Math.floor(rect.y), 0, h - 1);
      const x1 = clamp(Math.ceil(rect.x + rect.w), 0, w);
      const y1 = clamp(Math.ceil(rect.y + rect.h), 0, h);
      let r = 0, g = 0, b = 0, a = 0, n = 0;

      const sample = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        if (mask[y * w + x]) return;
        const o = (y * w + x) * 4;
        r += src[o];
        g += src[o + 1];
        b += src[o + 2];
        a += src[o + 3];
        n++;
      };

      for (let x = x0; x < x1; x++) {
        sample(x, y0 - 1);
        sample(x, y1);
      }
      for (let y = y0; y < y1; y++) {
        sample(x0 - 1, y);
        sample(x1, y);
      }

      if (n === 0) continue;
      r = Math.round(r / n);
      g = Math.round(g / n);
      b = Math.round(b / n);
      a = Math.round(a / n);

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const o = (y * w + x) * 4;
          out[o] = r;
          out[o + 1] = g;
          out[o + 2] = b;
          out[o + 3] = a;
        }
      }
    }
  }

  /** 在 mask 边缘做羽化混合，减轻硬边 */
  function softBlend(src, out, mask, w, h, feather) {
    const dist = new Float32Array(w * h);
    dist.fill(1e9);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) {
          dist[i] = 0;
          continue;
        }
        let minD = feather + 1;
        for (let dy = -feather; dy <= feather; dy++) {
          for (let dx = -feather; dx <= feather; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (!mask[ny * w + nx]) {
              const d = Math.hypot(dx, dy);
              if (d < minD) minD = d;
            }
          }
        }
        dist[i] = minD;
      }
    }

    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      const d = dist[i];
      if (d > feather) continue;
      const t = d / (feather + 0.0001); // 0 边外 -> 1 内
      const o = i * 4;
      out[o] = Math.round(src[o] * (1 - t) + out[o] * t);
      out[o + 1] = Math.round(src[o + 1] * (1 - t) + out[o + 1] * t);
      out[o + 2] = Math.round(src[o + 2] * (1 - t) + out[o + 2] * t);
      out[o + 3] = Math.round(src[o + 3] * (1 - t) + out[o + 3] * t);
    }
  }

  /**
   * 将归一化矩形 (0~1) 转为像素矩形
   * @param {{x:number,y:number,w:number,h:number}[]} normRects
   */
  function toPixelRects(normRects, width, height) {
    return normRects.map((r) => ({
      x: r.x * width,
      y: r.y * height,
      w: r.w * width,
      h: r.h * height,
    }));
  }

  global.WatermarkRemover = {
    removeWatermark,
    toPixelRects,
  };
})(window);
