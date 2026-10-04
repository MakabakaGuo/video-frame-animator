"use strict";

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

/** @type {typeof import("@imgly/background-removal-node").removeBackground | null} */
let removeBackground = null;
let loadingPromise = null;

function getPublicPath() {
  // Prefer unpacked path when packaged; fall back to project node_modules in dev.
  const candidates = [
    path.join(
      __dirname,
      "..",
      "node_modules",
      "@imgly",
      "background-removal-node",
      "dist"
    ),
    path.join(
      process.resourcesPath || "",
      "app.asar.unpacked",
      "node_modules",
      "@imgly",
      "background-removal-node",
      "dist"
    ),
    path.join(
      process.resourcesPath || "",
      "app.asar.unpacked",
      "electron",
      "..",
      "node_modules",
      "@imgly",
      "background-removal-node",
      "dist"
    ),
  ];
  for (const distDir of candidates) {
    if (distDir && fs.existsSync(path.join(distDir, "resources.json"))) {
      let url = pathToFileURL(distDir).href;
      if (!url.endsWith("/")) url += "/";
      return url;
    }
  }
  return undefined;
}

async function ensureLib() {
  if (removeBackground) return removeBackground;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const mod = require("@imgly/background-removal-node");
    removeBackground = mod.removeBackground || mod.default;
    if (typeof removeBackground !== "function") {
      throw new Error("无法加载 @imgly/background-removal-node");
    }
    return removeBackground;
  })();
  try {
    return await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    throw err;
  }
}

/**
 * @param {ArrayBuffer|Buffer|Uint8Array} imageBuffer
 * @param {{ model?: "small"|"medium", debug?: boolean }} [options]
 * @returns {Promise<ArrayBuffer>}
 */
async function removeBackgroundFromBuffer(imageBuffer, options = {}) {
  const fn = await ensureLib();
  const model = options.model === "small" ? "small" : "medium";
  const bytes =
    imageBuffer instanceof ArrayBuffer
      ? new Uint8Array(imageBuffer)
      : imageBuffer instanceof Uint8Array
        ? imageBuffer
        : new Uint8Array(imageBuffer);

  // Node Blob is available in modern Electron/Node
  const inputBlob = new Blob([bytes], { type: "image/png" });
  const publicPath = getPublicPath();
  /** @type {Record<string, unknown>} */
  const config = {
    debug: !!options.debug,
    model,
    output: {
      format: "image/png",
      quality: 1,
      type: "foreground",
    },
  };
  if (publicPath) config.publicPath = publicPath;

  const resultBlob = await fn(inputBlob, config);
  const out = await resultBlob.arrayBuffer();
  return out;
}

module.exports = {
  removeBackgroundFromBuffer,
  getPublicPath,
};
