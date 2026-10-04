(() => {
  "use strict";

  /** @typedef {{ id: string, index: number, time: number, blob: Blob, url: string, width: number, height: number, selected: boolean, originalBlob?: Blob, originalUrl?: string }} FrameItem */

  const els = {
    dropzone: document.getElementById("dropzone"),
    videoInput: document.getElementById("videoInput"),
    video: document.getElementById("video"),
    videoMeta: document.getElementById("videoMeta"),
    extractMode: document.getElementById("extractMode"),
    targetFps: document.getElementById("targetFps"),
    frameInterval: document.getElementById("frameInterval"),
    timeInterval: document.getElementById("timeInterval"),
    paramFpsWrap: document.getElementById("paramFpsWrap"),
    paramIntervalWrap: document.getElementById("paramIntervalWrap"),
    paramTimeWrap: document.getElementById("paramTimeWrap"),
    startTime: document.getElementById("startTime"),
    endTime: document.getElementById("endTime"),
    maxWidth: document.getElementById("maxWidth"),
    maxFrames: document.getElementById("maxFrames"),
    extractBtn: document.getElementById("extractBtn"),
    extractProgress: document.getElementById("extractProgress"),
    extractProgressBar: document.getElementById("extractProgressBar"),
    extractProgressText: document.getElementById("extractProgressText"),
    frameGrid: document.getElementById("frameGrid"),
    emptyState: document.getElementById("emptyState"),
    frameCountLabel: document.getElementById("frameCountLabel"),
    selectAllBtn: document.getElementById("selectAllBtn"),
    selectNoneBtn: document.getElementById("selectNoneBtn"),
    invertBtn: document.getElementById("invertBtn"),
    clearFramesBtn: document.getElementById("clearFramesBtn"),
    playBtn: document.getElementById("playBtn"),
    previewFsBtn: document.getElementById("previewFsBtn"),
    previewFsExitBtn: document.getElementById("previewFsExitBtn"),
    previewFsFab: document.getElementById("previewFsFab"),
    previewCard: document.getElementById("previewCard"),
    previewStage: document.getElementById("previewStage"),
    previewFps: document.getElementById("previewFps"),
    previewLoop: document.getElementById("previewLoop"),
    previewFrameInfo: document.getElementById("previewFrameInfo"),
    previewCanvas: document.getElementById("previewCanvas"),
    animName: document.getElementById("animName"),
    exportFps: document.getElementById("exportFps"),
    exportLoop: document.getElementById("exportLoop"),
    exportMode: document.getElementById("exportMode"),
    resPath: document.getElementById("resPath"),
    filePrefix: document.getElementById("filePrefix"),
    sheetColumns: document.getElementById("sheetColumns"),
    includeScene: document.getElementById("includeScene"),
    exportBtn: document.getElementById("exportBtn"),
    mattingBtn: document.getElementById("mattingBtn"),
    watermarkBtn: document.getElementById("watermarkBtn"),
    undoWatermarkBtn: document.getElementById("undoWatermarkBtn"),
    matModal: document.getElementById("matModal"),
    matBackdrop: document.getElementById("matBackdrop"),
    matCloseBtn: document.getElementById("matCloseBtn"),
    matCanvas: document.getElementById("matCanvas"),
    matEngine: document.getElementById("matEngine"),
    matScope: document.getElementById("matScope"),
    matModelWrap: document.getElementById("matModelWrap"),
    matModel: document.getElementById("matModel"),
    matTolWrap: document.getElementById("matTolWrap"),
    matTolerance: document.getElementById("matTolerance"),
    matSoftWrap: document.getElementById("matSoftWrap"),
    matSoftness: document.getElementById("matSoftness"),
    matSpillWrap: document.getElementById("matSpillWrap"),
    matSpill: document.getElementById("matSpill"),
    matSampleWrap: document.getElementById("matSampleWrap"),
    matSample: document.getElementById("matSample"),
    matErode: document.getElementById("matErode"),
    matDilate: document.getElementById("matDilate"),
    matFeather: document.getElementById("matFeather"),
    matDecontam: document.getElementById("matDecontam"),
    matStatus: document.getElementById("matStatus"),
    matHint: document.getElementById("matHint"),
    matBatchInfo: document.getElementById("matBatchInfo"),
    matRefPrev: document.getElementById("matRefPrev"),
    matRefNext: document.getElementById("matRefNext"),
    matRefLabel: document.getElementById("matRefLabel"),
    matPreviewBtn: document.getElementById("matPreviewBtn"),
    matResetPreviewBtn: document.getElementById("matResetPreviewBtn"),
    matApplyBtn: document.getElementById("matApplyBtn"),
    matProgress: document.getElementById("matProgress"),
    matProgressBar: document.getElementById("matProgressBar"),
    matProgressText: document.getElementById("matProgressText"),
    exportAnchorMode: document.getElementById("exportAnchorMode"),
    exportAnchorPad: document.getElementById("exportAnchorPad"),
    wmModal: document.getElementById("wmModal"),
    wmBackdrop: document.getElementById("wmBackdrop"),
    wmCloseBtn: document.getElementById("wmCloseBtn"),
    wmCanvas: document.getElementById("wmCanvas"),
    wmMethod: document.getElementById("wmMethod"),
    wmScope: document.getElementById("wmScope"),
    wmBatchInfo: document.getElementById("wmBatchInfo"),
    wmFeather: document.getElementById("wmFeather"),
    wmBlur: document.getElementById("wmBlur"),
    wmBlurWrap: document.getElementById("wmBlurWrap"),
    wmRectInfo: document.getElementById("wmRectInfo"),
    wmUndoRectBtn: document.getElementById("wmUndoRectBtn"),
    wmClearRectBtn: document.getElementById("wmClearRectBtn"),
    wmPreviewBtn: document.getElementById("wmPreviewBtn"),
    wmResetPreviewBtn: document.getElementById("wmResetPreviewBtn"),
    wmApplyBtn: document.getElementById("wmApplyBtn"),
    wmProgress: document.getElementById("wmProgress"),
    wmProgressBar: document.getElementById("wmProgressBar"),
    wmProgressText: document.getElementById("wmProgressText"),
    batchBar: document.getElementById("batchBar"),
    batchBarProgress: document.getElementById("batchBarProgress"),
    batchBarText: document.getElementById("batchBarText"),
  };

  /** @type {FrameItem[]} */
  let frames = [];
  let videoObjectUrl = null;
  let extracting = false;
  let previewPlaying = false;
  let previewTimer = null;
  let previewIndex = 0;
  let dragId = null;
  let didDrag = false;
  /** 最近一次「选中」的帧，用于悬停对比（必须仍为勾选状态） */
  let lastSelectedId = null;

  function getCompareRefFrame() {
    if (!lastSelectedId) return null;
    const ref = frames.find((f) => f.id === lastSelectedId);
    if (!ref || !ref.selected) {
      lastSelectedId = null;
      return null;
    }
    return ref;
  }

  function clearCompareRef() {
    lastSelectedId = null;
    document.querySelectorAll(".frame-item.is-compare-ref").forEach((el) => {
      el.classList.remove("is-compare-ref");
    });
  }

  function setCompareRef(frameId, itemEl) {
    lastSelectedId = frameId;
    document.querySelectorAll(".frame-item.is-compare-ref").forEach((el) => {
      el.classList.remove("is-compare-ref");
    });
    if (itemEl) itemEl.classList.add("is-compare-ref");
  }
  /** @type {string | null} */
  let hoverFrameId = null;

  const SETTINGS_KEY = "godot-frame-animator.settings";
  /** @type {{ hoverCompare: boolean, compareMode: 'split' | 'overlap', previewLight: boolean }} */
  let settings = { hoverCompare: true, compareMode: "split", previewLight: false };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.hoverCompare === "boolean") {
        settings.hoverCompare = parsed.hoverCompare;
      }
      if (parsed.compareMode === "split" || parsed.compareMode === "overlap") {
        settings.compareMode = parsed.compareMode;
      }
      if (typeof parsed.previewLight === "boolean") {
        settings.previewLight = parsed.previewLight;
      }
    } catch (_) {
      /* ignore */
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {
      /* ignore */
    }
  }

  loadSettings();

  function getCompareMode() {
    return settings.compareMode === "overlap" ? "overlap" : "split";
  }

  function setCompareMode(mode) {
    settings.compareMode = mode === "overlap" ? "overlap" : "split";
    saveSettings();
  }

  // 去水印状态：归一化矩形 0~1
  /** @type {{x:number,y:number,w:number,h:number}[]} */
  let wmRects = [];
  /** @type {FrameItem | null} */
  let wmRefFrame = null;
  /** @type {HTMLImageElement | null} */
  let wmSourceImage = null;
  let wmDrawing = false;
  let wmStart = null;
  let wmDraft = null;
  let wmPreviewed = false;
  let wmApplying = false;

  // 抠图状态
  /** @type {FrameItem | null} */
  let matRefFrame = null;
  /** @type {HTMLImageElement | null} */
  let matSourceImage = null;
  let matPreviewed = false;
  let matApplying = false;
  /** @type {FrameItem[]} */
  let matRefPool = [];
  let matRefIndex = 0;
  /** @type {[number, number, number] | null} */
  let matPickRgb = null;
  const matCtx = els.matCanvas ? els.matCanvas.getContext("2d") : null;

  const previewCtx = els.previewCanvas.getContext("2d");
  const wmCtx = els.wmCanvas.getContext("2d");

  function uid() {
    return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec)) return "—";
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(2).padStart(5, "0");
    return `${m}:${s}`;
  }

  function selectedFrames() {
    return frames.filter((f) => f.selected);
  }

  /** 批量目标：已选优先；无选中时回退全部 */
  function resolveBatchTargets(scopeValue) {
    const selected = selectedFrames();
    if (scopeValue === "all") return frames.slice();
    if (selected.length) return selected.slice();
    return frames.slice();
  }

  function describeBatchTargets(scopeValue) {
    const selected = selectedFrames().length;
    const total = frames.length;
    if (scopeValue === "all") {
      return { count: total, label: `全部 ${total} 帧` };
    }
    if (selected > 0) {
      return { count: selected, label: `已选 ${selected} 帧` };
    }
    return { count: total, label: `未选中 → 将处理全部 ${total} 帧` };
  }

  function syncBatchScopeDefaults() {
    const preferSelected = selectedFrames().length > 0;
    if (els.matScope) els.matScope.value = preferSelected ? "selected" : "all";
    if (els.wmScope) els.wmScope.value = preferSelected ? "selected" : "all";
  }

  function updateBatchApplyLabels() {
    const matInfo = describeBatchTargets(els.matScope?.value || "selected");
    const wmInfo = describeBatchTargets(els.wmScope?.value || "selected");
    if (els.matApplyBtn) {
      els.matApplyBtn.textContent =
        matInfo.count > 1 ? `批量抠图（${matInfo.count} 帧）` : `应用到帧（${matInfo.count}）`;
    }
    if (els.matBatchInfo) {
      els.matBatchInfo.textContent = `将批量处理：${matInfo.label}`;
    }
    if (els.wmApplyBtn) {
      els.wmApplyBtn.textContent =
        wmInfo.count > 1 ? `批量去水印（${wmInfo.count} 帧）` : `应用到帧（${wmInfo.count}）`;
    }
    if (els.wmBatchInfo) {
      els.wmBatchInfo.textContent = `框选一次即可批量处理：${wmInfo.label}`;
    }
    const sel = selectedFrames().length;
    if (els.mattingBtn) {
      els.mattingBtn.textContent = sel > 0 ? `抠图 · ${sel}` : "抠图";
    }
    if (els.watermarkBtn) {
      els.watermarkBtn.textContent = sel > 0 ? `去水印 · ${sel}` : "去水印";
    }
  }

  function showBatchBar(done, total, label) {
    if (!els.batchBar) return;
    els.batchBar.classList.remove("hidden");
    const p = total > 0 ? done / total : 0;
    if (els.batchBarProgress) els.batchBarProgress.style.transform = `scaleX(${p})`;
    if (els.batchBarText) {
      els.batchBarText.textContent = `${label} ${done}/${total}（${Math.round(p * 100)}%）`;
    }
  }

  function hideBatchBar() {
    els.batchBar?.classList.add("hidden");
  }

  function syncModeParams() {
    const mode = els.extractMode.value;
    els.paramFpsWrap.classList.toggle("hidden", mode !== "fps");
    els.paramIntervalWrap.classList.toggle("hidden", mode !== "interval");
    els.paramTimeWrap.classList.toggle("hidden", mode !== "time");
  }

  function updateToolbarState() {
    const has = frames.length > 0;
    const hasSelected = selectedFrames().length > 0;
    const hasBackup = frames.some((f) => f.originalBlob);
    els.selectAllBtn.disabled = !has;
    els.selectNoneBtn.disabled = !has;
    els.invertBtn.disabled = !has;
    els.clearFramesBtn.disabled = !has;
    els.playBtn.disabled = !hasSelected;
    if (els.previewFsBtn) els.previewFsBtn.disabled = !hasSelected;
    if (!hasSelected && isPreviewFullscreen()) setPreviewFullscreen(false);
    els.exportBtn.disabled = !hasSelected;
    els.watermarkBtn.disabled = !has;
    if (els.mattingBtn) els.mattingBtn.disabled = !has;
    els.undoWatermarkBtn.disabled = !hasBackup;
    const selected = selectedFrames().length;
    els.frameCountLabel.textContent = `(${frames.length} 帧 / 已选 ${selected})`;
    els.emptyState.classList.toggle("hidden", has);
    updateBatchApplyLabels();
  }

  function revokeFrames() {
    for (const f of frames) {
      URL.revokeObjectURL(f.url);
      if (f.originalUrl) URL.revokeObjectURL(f.originalUrl);
    }
    frames = [];
    lastSelectedId = null;
    hoverFrameId = null;
    hideFrameHoverPop();
  }

  function clearFrames() {
    stopPreview();
    revokeFrames();
    renderFrameGrid();
    drawPreviewFrame();
    updateToolbarState();
  }

  function loadVideoFile(file) {
    if (!file || !(file.type || "").startsWith("video/")) {
      // 桌面端拖入时 type 可能为空，仍尝试按扩展名放行
      const name = (file && file.name) || "";
      if (!/\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(name)) {
        alert("请选择有效的视频文件");
        return;
      }
    }
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    videoObjectUrl = URL.createObjectURL(file);
    els.video.src = videoObjectUrl;
    els.video.classList.add("visible");
    els.extractBtn.disabled = true;
    els.videoMeta.textContent = `加载中：${file.name}`;

    els.video.onloadedmetadata = () => {
      const dur = els.video.duration;
      const w = els.video.videoWidth;
      const h = els.video.videoHeight;
      els.videoMeta.textContent = `${file.name} · ${w}×${h} · ${formatTime(dur)} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
      els.startTime.value = "0";
      els.endTime.value = "";
      els.endTime.placeholder = dur.toFixed(2);
      els.extractBtn.disabled = false;
    };

    els.video.onerror = () => {
      els.videoMeta.textContent = "视频无法解码，请换 MP4/WebM 等常见格式";
      els.extractBtn.disabled = true;
    };
  }

  async function openVideoFromDesktop() {
    if (!window.desktop?.openVideoDialog) {
      els.videoInput.click();
      return;
    }
    const filePath = await window.desktop.openVideoDialog();
    if (!filePath) return;
    const buffer = await window.desktop.readFileBuffer(filePath);
    const name = filePath.split(/[/\\]/).pop() || "video.mp4";
    const ext = (name.split(".").pop() || "mp4").toLowerCase();
    const mime =
      {
        mp4: "video/mp4",
        webm: "video/webm",
        mov: "video/quicktime",
        mkv: "video/x-matroska",
        avi: "video/x-msvideo",
        m4v: "video/x-m4v",
        ogv: "video/ogg",
      }[ext] || "video/mp4";
    const file = new File([buffer], name, { type: mime });
    loadVideoFile(file);
  }

  function seekVideo(time) {
    return new Promise((resolve, reject) => {
      const video = els.video;
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
        reject(new Error("seek failed"));
      };
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", onError);
      const target = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.001));
      if (Math.abs(video.currentTime - target) < 0.0005) {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
        resolve();
        return;
      }
      video.currentTime = target;
    });
  }

  function captureFrame(maxWidth) {
    const video = els.video;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (maxWidth > 0 && w > maxWidth) {
      const scale = maxWidth / w;
      w = Math.round(maxWidth);
      h = Math.max(1, Math.round(h * scale));
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve({ blob, width: w, height: h, url: URL.createObjectURL(blob) });
        },
        "image/png"
      );
    });
  }

  function buildTimestamps() {
    const video = els.video;
    const mode = els.extractMode.value;
    const start = Math.max(0, Number(els.startTime.value) || 0);
    const endRaw = els.endTime.value;
    const end = endRaw === "" || endRaw == null
      ? video.duration
      : Math.min(video.duration, Math.max(start, Number(endRaw) || video.duration));
    const maxFrames = Math.max(1, Math.floor(Number(els.maxFrames.value) || 120));
    /** @type {number[]} */
    const times = [];

    if (mode === "fps") {
      const fps = Math.max(0.1, Number(els.targetFps.value) || 8);
      const step = 1 / fps;
      for (let t = start; t <= end + 1e-6 && times.length < maxFrames; t += step) {
        times.push(Math.min(t, end));
      }
    } else if (mode === "interval") {
      const interval = Math.max(1, Math.floor(Number(els.frameInterval.value) || 1));
      const srcFps = estimateSourceFps(video) || 30;
      const step = interval / srcFps;
      for (let t = start; t <= end + 1e-6 && times.length < maxFrames; t += step) {
        times.push(Math.min(t, end));
      }
    } else {
      const ms = Math.max(16, Number(els.timeInterval.value) || 100);
      const step = ms / 1000;
      for (let t = start; t <= end + 1e-6 && times.length < maxFrames; t += step) {
        times.push(Math.min(t, end));
      }
    }

    if (times.length === 0) times.push(start);
    // 去重（浮点）
    const unique = [];
    for (const t of times) {
      if (!unique.length || Math.abs(unique[unique.length - 1] - t) > 1e-4) unique.push(t);
    }
    return unique.slice(0, maxFrames);
  }

  function estimateSourceFps(video) {
    // 浏览器不保证暴露真实 FPS，用常见默认；若有 getVideoPlaybackQuality 可粗略估算
    try {
      if (typeof video.getVideoPlaybackQuality === "function") {
        const q = video.getVideoPlaybackQuality();
        if (q.totalVideoFrames > 0 && video.currentTime > 0.2) {
          return q.totalVideoFrames / video.currentTime;
        }
      }
    } catch (_) {
      /* ignore */
    }
    return 30;
  }

  async function extractFrames() {
    if (extracting || !els.video.src || !els.video.videoWidth) return;
    extracting = true;
    els.extractBtn.disabled = true;
    els.extractProgress.classList.remove("hidden");
    stopPreview();
    revokeFrames();
    renderFrameGrid();

    const times = buildTimestamps();
    const maxWidth = Math.max(0, Math.floor(Number(els.maxWidth.value) || 0));
    const wasMuted = els.video.muted;
    els.video.muted = true;
    els.video.pause();

    try {
      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        await seekVideo(t);
        // 给解码器一点时间（部分浏览器 seeked 后首帧仍旧）
        await wait(16);
        const shot = await captureFrame(maxWidth);
        if (shot) {
          frames.push({
            id: uid(),
            index: i,
            time: t,
            blob: shot.blob,
            url: shot.url,
            width: shot.width,
            height: shot.height,
            selected: false,
          });
        }
        const p = (i + 1) / times.length;
        els.extractProgressBar.style.transform = `scaleX(${p})`;
        els.extractProgressText.textContent = `${Math.round(p * 100)}%`;
      }
    } catch (err) {
      console.error(err);
      alert("抽帧失败：浏览器可能无法完整解码该视频，请尝试转换为 H.264 MP4。");
    } finally {
      els.video.muted = wasMuted;
      extracting = false;
      els.extractBtn.disabled = false;
      setTimeout(() => els.extractProgress.classList.add("hidden"), 600);
      lastSelectedId = null;
      renderFrameGrid();
      updateToolbarState();
      drawPreviewFrame();
      // 同步导出/预览 FPS
      if (els.extractMode.value === "fps") {
        els.previewFps.value = els.targetFps.value;
        els.exportFps.value = els.targetFps.value;
      }
    }
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  let hoverCompareToken = 0;

  function getFrameHoverPop() {
    let pop = document.getElementById("frameHoverPop");
    if (pop && !pop.querySelector("[data-hover-pop='v3']")) {
      pop.remove();
      pop = null;
    }
    if (pop) return pop;
    pop = document.createElement("div");
    pop.id = "frameHoverPop";
    pop.className = "frame-hover-pop hidden";
    pop.dataset.hoverPop = "v3";
    pop.innerHTML = `
      <div class="frame-hover-stack" data-hover-pop="v3">
        <div class="hover-pane hover-pane-ref hidden">
          <img class="hover-ref" alt="" draggable="false" />
          <span class="hover-pane-tag is-ref">参考</span>
        </div>
        <div class="hover-pane hover-pane-cur">
          <img class="hover-base" alt="" draggable="false" />
          <span class="hover-pane-tag is-cur hidden">悬停</span>
        </div>
      </div>
      <div class="frame-hover-meta">
        <div class="frame-hover-caption"></div>
      </div>
    `;
    document.body.appendChild(pop);
    return pop;
  }

  function hideFrameHoverPop() {
    hoverCompareToken += 1;
    const pop = document.getElementById("frameHoverPop");
    if (pop) pop.classList.add("hidden");
    document.querySelectorAll(".frame-item.is-hover-source").forEach((el) => {
      el.classList.remove("is-hover-source");
    });
    hoverFrameId = null;
  }

  function positionFrameHoverPop(anchorEl) {
    const pop = getFrameHoverPop();
    const rect = anchorEl.getBoundingClientRect();
    const popW = pop.offsetWidth || 400;
    const popH = pop.offsetHeight || 280;
    const gap = 12;
    let left = rect.right + gap;
    let top = rect.top + rect.height / 2 - popH / 2;

    if (left + popW > window.innerWidth - 12) {
      left = rect.left - popW - gap;
    }
    if (left < 12) left = 12;
    if (top < 48) top = 48;
    if (top + popH > window.innerHeight - 12) {
      top = Math.max(48, window.innerHeight - popH - 12);
    }

    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
  }

  function showFrameHoverCompare(frame, anchorEl) {
    if (didDrag || dragId) return;
    hoverFrameId = frame.id;
    hoverCompareToken += 1;
    const pop = getFrameHoverPop();
    const stack = pop.querySelector(".frame-hover-stack");
    const paneRef = pop.querySelector(".hover-pane-ref");
    const paneCur = pop.querySelector(".hover-pane-cur");
    const imgRef = pop.querySelector(".hover-ref");
    const imgCur = pop.querySelector(".hover-base");
    const tagRef = paneRef.querySelector(".hover-pane-tag");
    const tagCur = paneCur.querySelector(".hover-pane-tag");
    const caption = pop.querySelector(".frame-hover-caption");

    document.querySelectorAll(".frame-item.is-hover-source").forEach((el) => {
      el.classList.remove("is-hover-source");
    });
    anchorEl.classList.add("is-hover-source");

    const ref = getCompareRefFrame();
    const canCompare = settings.hoverCompare && ref && ref.id !== frame.id;
    const curOrder = frames.findIndex((f) => f.id === frame.id) + 1;

    imgCur.src = frame.url;

    stack.classList.remove("is-split", "is-overlap");
    pop.classList.remove("has-split", "has-overlap");

    if (canCompare) {
      const refOrder = frames.findIndex((f) => f.id === ref.id) + 1;
      const overlap = getCompareMode() === "overlap";
      imgRef.src = ref.url;
      paneRef.classList.remove("hidden");
      tagCur.classList.remove("hidden");
      tagRef.textContent = `参考 #${refOrder}·反色`;
      tagCur.textContent = `悬停 #${curOrder}·原色`;
      if (overlap) {
        stack.classList.add("is-overlap");
        pop.classList.add("has-overlap");
        caption.textContent = `重叠：#${curOrder} 原色 + #${refOrder} 反色`;
      } else {
        tagRef.textContent = `参考 #${refOrder}`;
        tagCur.textContent = `悬停 #${curOrder}`;
        stack.classList.add("is-split");
        pop.classList.add("has-split");
        caption.textContent = `左右对比：参考 #${refOrder} ｜ 悬停 #${curOrder}`;
      }
    } else {
      imgRef.removeAttribute("src");
      paneRef.classList.add("hidden");
      tagCur.classList.add("hidden");
      if (!settings.hoverCompare) {
        caption.textContent = `放大 #${curOrder}`;
      } else if (ref) {
        caption.textContent = `放大 #${curOrder}（与参考帧相同）`;
      } else {
        caption.textContent = `放大 #${curOrder} · 先点选一帧作为对比参考`;
      }
    }

    pop.classList.remove("hidden");
    requestAnimationFrame(() => positionFrameHoverPop(anchorEl));
  }

  function renderFrameGrid() {
    hideFrameHoverPop();
    els.frameGrid.innerHTML = "";
    frames.forEach((frame, order) => {
      const item = document.createElement("div");
      item.className = `frame-item${frame.selected ? " selected" : ""}`;
      if (frame.id === lastSelectedId && frame.selected) item.classList.add("is-compare-ref");
      item.draggable = true;
      item.dataset.id = frame.id;

      const thumb = document.createElement("div");
      thumb.className = "frame-thumb";

      const img = document.createElement("img");
      img.alt = `frame ${order + 1}`;
      img.draggable = false;
      img.decoding = "async";
      img.loading = "eager";
      img.src = frame.url;
      thumb.appendChild(img);

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = String(order + 1);

      const check = document.createElement("span");
      check.className = "check";
      check.setAttribute("aria-hidden", "true");

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${formatTime(frame.time)} · ${frame.width}×${frame.height}`;

      item.appendChild(thumb);
      item.appendChild(badge);
      item.appendChild(check);
      item.appendChild(meta);

      item.addEventListener("mouseenter", () => {
        showFrameHoverCompare(frame, item);
      });
      item.addEventListener("mousemove", () => {
        if (hoverFrameId === frame.id) positionFrameHoverPop(item);
      });
      item.addEventListener("mouseleave", () => {
        hideFrameHoverPop();
      });

      item.addEventListener("click", () => {
        if (didDrag) {
          didDrag = false;
          return;
        }
        frame.selected = !frame.selected;
        item.classList.toggle("selected", frame.selected);
        if (frame.selected) {
          setCompareRef(frame.id, item);
        } else if (lastSelectedId === frame.id) {
          clearCompareRef();
        }
        updateToolbarState();
        if (!previewPlaying) drawPreviewFrame();
      });
      item.addEventListener("dragstart", () => {
        hideFrameHoverPop();
        dragId = frame.id;
        didDrag = true;
        item.classList.add("dragging");
      });
      item.addEventListener("dragend", () => {
        dragId = null;
        item.classList.remove("dragging");
        setTimeout(() => {
          didDrag = false;
        }, 0);
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!dragId || dragId === frame.id) return;
        const from = frames.findIndex((f) => f.id === dragId);
        const to = frames.findIndex((f) => f.id === frame.id);
        if (from < 0 || to < 0) return;
        const [moved] = frames.splice(from, 1);
        frames.splice(to, 0, moved);
        renderFrameGrid();
        updateToolbarState();
        if (!previewPlaying) drawPreviewFrame();
      });
      els.frameGrid.appendChild(item);
    });
  }

  function isPreviewFullscreen() {
    return !!els.previewCard?.classList.contains("is-fullscreen");
  }

  function setPreviewFullscreen(on) {
    if (!els.previewCard) return;
    const next = !!on;
    els.previewCard.classList.toggle("is-fullscreen", next);
    document.body.classList.toggle("preview-fs-open", next);
    if (els.previewFsBtn) {
      els.previewFsBtn.textContent = next ? "退出全屏" : "全屏预览";
      els.previewFsBtn.title = next ? "退出全屏预览" : "全屏预览";
    }
    if (els.previewFsExitBtn) els.previewFsExitBtn.hidden = !next;
    if (els.previewFsFab) els.previewFsFab.hidden = !next;
    if (!previewPlaying) drawPreviewFrame();
  }

  function togglePreviewFullscreen() {
    if (!selectedFrames().length) return;
    setPreviewFullscreen(!isPreviewFullscreen());
  }

  function drawPreviewFrame() {
    const list = selectedFrames();
    const canvas = els.previewCanvas;
    const ctx = previewCtx;
    if (!list.length) {
      canvas.width = 320;
      canvas.height = 320;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = settings.previewLight ? "#3d4754" : "#9aa6b8";
      ctx.font = "15px 'Microsoft YaHei UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("请选择至少一帧", canvas.width / 2, canvas.height / 2);
      els.previewFrameInfo.textContent = "—";
      return;
    }
    if (previewIndex >= list.length) previewIndex = 0;
    const frame = list[previewIndex];
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = frame.url;
    els.previewFrameInfo.textContent = `${previewIndex + 1} / ${list.length}`;
  }

  function stopPreview() {
    previewPlaying = false;
    if (previewTimer) {
      clearInterval(previewTimer);
      previewTimer = null;
    }
    els.playBtn.textContent = "播放";
  }

  function togglePreview() {
    const list = selectedFrames();
    if (!list.length) return;
    if (previewPlaying) {
      stopPreview();
      return;
    }
    previewPlaying = true;
    els.playBtn.textContent = "暂停";
    const tick = () => {
      const current = selectedFrames();
      if (!current.length) {
        stopPreview();
        return;
      }
      drawPreviewFrame();
      previewIndex += 1;
      if (previewIndex >= current.length) {
        if (els.previewLoop.checked) previewIndex = 0;
        else {
          previewIndex = current.length - 1;
          stopPreview();
          drawPreviewFrame();
        }
      }
    };
    tick();
    const fps = Math.max(0.5, Number(els.previewFps.value) || 8);
    previewTimer = setInterval(tick, 1000 / fps);
  }

  function sanitizeName(name) {
    return String(name || "default").replace(/[^\w\u4e00-\u9fff\-]+/g, "_") || "default";
  }

  function normalizeResPath(path) {
    let p = String(path || "res://animations/frames/").trim();
    if (!p.startsWith("res://")) p = `res://${p.replace(/^\/+/, "")}`;
    if (!p.endsWith("/")) p += "/";
    return p;
  }

  function padIndex(i, total) {
    const digits = Math.max(3, String(total).length);
    return String(i).padStart(digits, "0");
  }

  function buildSpriteFramesTres({
    animName,
    fps,
    loop,
    mode,
    resPath,
    filePrefix,
    count,
    frameW,
    frameH,
    columns,
    durations,
  }) {
    return buildMultiSpriteFramesTres({
      mode,
      resPath,
      filePrefix,
      uniqueCount: count,
      frameW,
      frameH,
      columns,
      animations: [
        {
          name: animName,
          fps,
          loop,
          // textureIndex 0..count-1
          frames: Array.from({ length: count }, (_, i) => ({
            texIndex: i,
            duration: durations?.[i] ?? 1,
          })),
        },
      ],
    });
  }

  /**
   * 多动画 SpriteFrames
   * animations: [{ name, fps, loop, frames: [{ texIndex, duration }] }]
   */
  function buildMultiSpriteFramesTres({
    mode,
    resPath,
    filePrefix,
    uniqueCount,
    frameW,
    frameH,
    columns,
    animations,
  }) {
    const atlasCount = mode === "sheet" ? uniqueCount : 0;
    const extCount = mode === "sheet" ? 1 : uniqueCount;
    const loadSteps = 1 + extCount + atlasCount;
    const lines = [];
    lines.push(`[gd_resource type="SpriteFrames" load_steps=${loadSteps} format=3]`);
    lines.push("");

    if (mode === "sheet") {
      lines.push(`[ext_resource type="Texture2D" path="${resPath}${filePrefix}_sheet.png" id="1_sheet"]`);
      lines.push("");
      for (let i = 0; i < uniqueCount; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = col * frameW;
        const y = row * frameH;
        lines.push(`[sub_resource type="AtlasTexture" id="AtlasTexture_${i}"]`);
        lines.push(`atlas = ExtResource("1_sheet")`);
        lines.push(`region = Rect2(${x}, ${y}, ${frameW}, ${frameH})`);
        lines.push("");
      }
    } else {
      for (let i = 0; i < uniqueCount; i++) {
        const name = `${filePrefix}_${padIndex(i + 1, uniqueCount)}.png`;
        lines.push(`[ext_resource type="Texture2D" path="${resPath}${name}" id="${i + 1}_tex"]`);
      }
      lines.push("");
    }

    const animBlocks = animations.map((anim) => {
      const frameEntries = anim.frames.map((f) => {
        const texRef =
          mode === "sheet"
            ? `SubResource("AtlasTexture_${f.texIndex}")`
            : `ExtResource("${f.texIndex + 1}_tex")`;
        const dur = Number(f.duration);
        const duration = Number.isFinite(dur) ? dur : 1;
        return `{\n"duration": ${duration},\n"texture": ${texRef}\n}`;
      });
      return [
        "{",
        `"frames": [${frameEntries.join(", ")}],`,
        `"loop": ${anim.loop ? "true" : "false"},`,
        `"name": &"${anim.name}",`,
        `"speed": ${Number(anim.fps).toFixed(1)}`,
        "}",
      ].join("\n");
    });

    lines.push("[resource]");
    lines.push(`animations = [${animBlocks.join(", ")}]`);
    lines.push("");
    return lines.join("\n");
  }

  function buildExampleScene(resPath, resourceFileName, defaultAnimName, anchorOffset) {
    const framesPath = `${resPath}${sanitizeName(resourceFileName)}.tres`;
    const anim = sanitizeName(defaultAnimName || resourceFileName);
    const ox = anchorOffset?.x ?? 0;
    const oy = anchorOffset?.y ?? 0;
    return `[gd_scene load_steps=2 format=3]

[ext_resource type="SpriteFrames" path="${framesPath}" id="1_frames"]

[node name="AnimatedSprite2D" type="AnimatedSprite2D"]
sprite_frames = ExtResource("1_frames")
animation = &"${anim}"
autoplay = "${anim}"
centered = false
offset = Vector2(${ox}, ${oy})
`;
  }

  /** Opaque bounding box; tries solid alpha first so flame fringe won't yank the pivot. */
  function findContentBounds(data, w, h) {
    const thresholds = [200, 128, 64, 16];
    for (const thr of thresholds) {
      let minX = w,
        minY = h,
        maxX = -1,
        maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] < thr) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX >= 0) return { minX, minY, maxX, maxY, thr };
    }
    return { minX: 0, minY: 0, maxX: w - 1, maxY: h - 1, thr: 0 };
  }

  function pivotFromBounds(mode, bounds, nx, ny) {
    const { minX, minY, maxX, maxY } = bounds;
    if (mode === "center") {
      return { px: (minX + maxX) / 2, py: (minY + maxY) / 2 };
    }
    if (mode === "right") {
      // Projectile tip / muzzle: right-center of solid core
      return { px: maxX, py: (minY + maxY) / 2 };
    }
    if (mode === "custom" && Number.isFinite(nx) && Number.isFinite(ny)) {
      return {
        px: minX + (maxX - minX) * nx,
        py: minY + (maxY - minY) * ny,
      };
    }
    // bottom-center (character feet)
    return { px: (minX + maxX) / 2, py: maxY };
  }

  /**
   * Bake frames so a shared pivot lands on the same canvas pixel.
   * @param {{ blob: Blob, width: number, height: number, id?: string }[]} items
   * @param {{ mode: string, nx?: number, ny?: number, pad?: number }} anchor
   */
  async function bakeUniqueToAnchor(items, anchor) {
    if (!anchor || anchor.mode === "none") {
      return { items, offset: { x: 0, y: 0 }, canvasW: 0, canvasH: 0 };
    }
    const pad = Math.max(0, Number(anchor.pad) || 8);
    const metas = [];

    for (const item of items) {
      const url = URL.createObjectURL(item.blob);
      try {
        const img = await loadImage(url);
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;

        // origin: keep source pixel grid — only unify canvas size (no content re-centering)
        if (anchor.mode === "origin") {
          metas.push({
            item,
            img,
            w,
            h,
            px: w / 2,
            py: h / 2,
            minX: 0,
            minY: 0,
            maxX: w - 1,
            maxY: h - 1,
            origin: true,
          });
          continue;
        }

        const bounds = findContentBounds(data, w, h);
        const { px, py } = pivotFromBounds(anchor.mode, bounds, anchor.nx, anchor.ny);
        metas.push({
          item,
          img,
          w,
          h,
          px,
          py,
          minX: bounds.minX,
          minY: bounds.minY,
          maxX: bounds.maxX,
          maxY: bounds.maxY,
          origin: false,
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    let canvasW;
    let canvasH;
    let anchorX;
    let anchorY;

    if (anchor.mode === "origin") {
      const maxW = Math.max(...metas.map((m) => m.w));
      const maxH = Math.max(...metas.map((m) => m.h));
      canvasW = maxW + pad * 2;
      canvasH = maxH + pad * 2;
      // Shared pivot = center of the unified canvas (same for every frame)
      anchorX = Math.round(pad + maxW / 2);
      anchorY = Math.round(pad + maxH / 2);
    } else {
      const left = Math.max(...metas.map((m) => m.px - m.minX));
      const right = Math.max(...metas.map((m) => m.maxX - m.px));
      const top = Math.max(...metas.map((m) => m.py - m.minY));
      const bottom = Math.max(...metas.map((m) => m.maxY - m.py));
      canvasW = Math.ceil(left + right + pad * 2);
      canvasH = Math.ceil(top + bottom + pad * 2);
      anchorX = Math.round(pad + left);
      anchorY = Math.round(pad + top);
    }

    const baked = [];
    for (const m of metas) {
      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvasW, canvasH);
      let dx;
      let dy;
      if (m.origin) {
        // Top-left of source → same pad for all frames (preserves video registration)
        dx = pad;
        dy = pad;
      } else {
        dx = Math.round(anchorX - m.px);
        dy = Math.round(anchorY - m.py);
      }
      ctx.drawImage(m.img, dx, dy);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      baked.push({
        id: m.item.id,
        blob,
        width: canvasW,
        height: canvasH,
      });
    }

    // Godot: with centered=false, offset moves texture so local (0,0) is node origin.
    // We place pivot at (anchorX, anchorY) in texture → offset = -pivot
    return {
      items: baked,
      offset: { x: -anchorX, y: -anchorY },
      canvasW,
      canvasH,
      anchorX,
      anchorY,
    };
  }

  function resolveExportAnchor() {
    const exportMode = els.exportAnchorMode?.value || "origin";
    const pad = Math.max(0, Number(els.exportAnchorPad?.value) || 8);
    if (exportMode === "none") return { mode: "none", pad };
    if (
      exportMode === "bottom" ||
      exportMode === "center" ||
      exportMode === "right" ||
      exportMode === "origin"
    ) {
      return { mode: exportMode, pad };
    }
    return { mode: "origin", pad };
  }

  async function createSpriteSheet(list, columns) {
    const cols = Math.max(1, columns);
    const rows = Math.ceil(list.length / cols);
    // Prefer metadata; fall back after load so cell size always matches real pixels
    let fw = Math.max(...list.map((f) => f.width || 0));
    let fh = Math.max(...list.map((f) => f.height || 0));
    const images = [];
    for (let i = 0; i < list.length; i++) {
      const img = await loadImage(list[i].url);
      images.push(img);
      fw = Math.max(fw, img.naturalWidth || img.width);
      fh = Math.max(fh, img.naturalHeight || img.height);
    }
    const canvas = document.createElement("canvas");
    canvas.width = cols * fw;
    canvas.height = rows * fh;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      // Same-size (after anchor bake): top-left of cell keeps shared pivot.
      // Mixed size without bake: bottom-center pack as fallback.
      const sameSize = iw === fw && ih === fh;
      const dx = col * fw + (sameSize ? 0 : Math.floor((fw - iw) / 2));
      const dy = row * fh + (sameSize ? 0 : fh - ih);
      ctx.drawImage(img, dx, dy);
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return { blob, frameW: fw, frameH: fh, columns: cols };
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async function exportZip() {
    const list = selectedFrames();

    if (!list.length) {
      alert("请至少选择一帧后再导出");
      return;
    }
    if (typeof JSZip === "undefined") {
      alert("缺少 JSZip 库，无法打包 ZIP");
      return;
    }

    const animName = sanitizeName(els.animName.value);
    const fps = Math.max(0.5, Number(els.exportFps.value) || 8);
    const loop = els.exportLoop.value === "true";
    const mode = els.exportMode.value;
    const resPath = normalizeResPath(els.resPath.value);
    const filePrefix = sanitizeName(els.filePrefix.value) || "frame";
    const columns = Math.max(1, Math.floor(Number(els.sheetColumns.value) || 8));

    els.exportBtn.disabled = true;
    els.exportBtn.textContent = "导出中…";

    try {
      const zip = new JSZip();
      const relativeDir = resPath.replace(/^res:\/\//, "").replace(/^\/+/, "");
      const folder = relativeDir ? zip.folder(relativeDir.replace(/\/$/, "")) : zip;

      /** @type {{ id: string, blob: Blob, width: number, height: number }[]} */
      let unique = list.map((f, i) => ({
        id: f.id || String(i),
        blob: f.blob,
        width: f.width,
        height: f.height,
      }));
      /** @type {{ name: string, fps: number, loop: boolean, frames: { texIndex: number, duration: number }[] }[]} */
      const animDefs = [
        {
          name: animName,
          fps,
          loop,
          frames: unique.map((_, i) => ({ texIndex: i, duration: 1 })),
        },
      ];

      if (!unique.length) {
        alert("没有可导出的帧");
        return;
      }

      const resourceName = animName;
      const anchorCfg = resolveExportAnchor();
      let sceneOffset = { x: 0, y: 0 };
      if (anchorCfg.mode && anchorCfg.mode !== "none") {
        const baked = await bakeUniqueToAnchor(unique, anchorCfg);
        unique = baked.items;
        sceneOffset = baked.offset || { x: 0, y: 0 };
      }

      if (mode === "png_only") {
        for (let i = 0; i < unique.length; i++) {
          const name = `${filePrefix}_${padIndex(i + 1, unique.length)}.png`;
          folder.file(name, unique[i].blob);
        }
      } else if (mode === "sheet") {
        const sheetList = unique.map((u) => ({
          url: URL.createObjectURL(u.blob),
          width: u.width,
          height: u.height,
        }));
        try {
          const sheet = await createSpriteSheet(sheetList, columns);
          folder.file(`${filePrefix}_sheet.png`, sheet.blob);
          const tres = buildMultiSpriteFramesTres({
            mode: "sheet",
            resPath,
            filePrefix,
            uniqueCount: unique.length,
            frameW: sheet.frameW,
            frameH: sheet.frameH,
            columns: sheet.columns,
            animations: animDefs,
          });
          folder.file(`${resourceName}.tres`, tres);
        } finally {
          sheetList.forEach((s) => URL.revokeObjectURL(s.url));
        }
      } else {
        for (let i = 0; i < unique.length; i++) {
          const name = `${filePrefix}_${padIndex(i + 1, unique.length)}.png`;
          folder.file(name, unique[i].blob);
        }
        const tres = buildMultiSpriteFramesTres({
          mode: "frames",
          resPath,
          filePrefix,
          uniqueCount: unique.length,
          frameW: unique[0].width,
          frameH: unique[0].height,
          columns,
          animations: animDefs,
        });
        folder.file(`${resourceName}.tres`, tres);
      }

      if (els.includeScene.checked && mode !== "png_only") {
        folder.file(
          `${resourceName}.tscn`,
          buildExampleScene(resPath, resourceName, animDefs[0]?.name || animName, sceneOffset)
        );
      }

      const anchorNote =
        anchorCfg.mode && anchorCfg.mode !== "none"
          ? `锚点烘焙：${anchorCfg.mode}（场景 offset=${sceneOffset.x}, ${sceneOffset.y}，centered=false）`
          : "锚点烘焙：关闭";

      zip.file(
        "README_IMPORT.txt",
        [
          "Godot 导入说明",
          "==============",
          "",
          "1. 将 ZIP 解压到 Godot 项目根目录（与 project.godot 同级）。",
          `2. 资源会落到：${relativeDir || "(项目根)"}`,
          `3. 对应引擎路径：${resPath}`,
          `4. 打开 ${resourceName}.tres 赋给 AnimatedSprite2D.sprite_frames。`,
          `5. ${anchorNote}`,
          `6. 动画名：${animName}`,
          "",
        ].join("\n")
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const defaultName = `${resourceName}_godot_frames.zip`;

      if (window.desktop?.saveZipDialog && window.desktop?.writeFileBuffer) {
        const savePath = await window.desktop.saveZipDialog(defaultName);
        if (!savePath) return;
        const ab = await blob.arrayBuffer();
        await window.desktop.writeFileBuffer(savePath, ab);
        alert(`已导出到：\n${savePath}`);
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = defaultName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } catch (err) {
      console.error(err);
      alert("导出失败，请查看控制台");
    } finally {
      els.exportBtn.disabled = selectedFrames().length === 0;
      els.exportBtn.textContent = "导出 ZIP";
    }
  }

  // —— 去水印 ——
  function syncWmMethodUi() {
    els.wmBlurWrap.classList.toggle("hidden", els.wmMethod.value !== "blur");
  }

  function updateWmRectInfo() {
    if (!wmRects.length) {
      els.wmRectInfo.textContent = "尚未框选区域";
      return;
    }
    els.wmRectInfo.textContent = `已框选 ${wmRects.length} 个区域`;
  }

  function getWmOptions() {
    return {
      method: els.wmMethod.value,
      feather: Math.max(0, Number(els.wmFeather.value) || 0),
      blurRadius: Math.max(1, Number(els.wmBlur.value) || 8),
    };
  }

  function canvasPointFromEvent(e) {
    const rect = els.wmCanvas.getBoundingClientRect();
    const scaleX = els.wmCanvas.width / rect.width;
    const scaleY = els.wmCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function normalizeRect(pxRect, width, height) {
    const x = Math.min(pxRect.x, pxRect.x + pxRect.w);
    const y = Math.min(pxRect.y, pxRect.y + pxRect.h);
    const w = Math.abs(pxRect.w);
    const h = Math.abs(pxRect.h);
    return {
      x: x / width,
      y: y / height,
      w: w / width,
      h: h / height,
    };
  }

  function redrawWmCanvas(processedImageData) {
    if (!wmSourceImage) return;
    const canvas = els.wmCanvas;
    const ctx = wmCtx;
    canvas.width = wmSourceImage.naturalWidth || wmSourceImage.width;
    canvas.height = wmSourceImage.naturalHeight || wmSourceImage.height;

    if (processedImageData) {
      ctx.putImageData(processedImageData, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(wmSourceImage, 0, 0);
    }

    const drawRect = (r, style, dash) => {
      ctx.save();
      ctx.strokeStyle = style;
      ctx.lineWidth = Math.max(2, Math.round(canvas.width / 400));
      if (dash) ctx.setLineDash(dash);
      ctx.fillStyle = "rgba(61, 154, 120, 0.22)";
      const x = r.x * canvas.width;
      const y = r.y * canvas.height;
      const w = r.w * canvas.width;
      const h = r.h * canvas.height;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    };

    for (const r of wmRects) drawRect(r, "#48b48c", null);
    if (wmDraft) {
      drawRect(
        normalizeRect(wmDraft, canvas.width, canvas.height),
        "#e8c56b",
        [6, 4]
      );
    }
  }

  async function openWatermarkModal() {
    if (!frames.length) return;
    stopPreview();
    syncBatchScopeDefaults();
    updateBatchApplyLabels();
    wmRefFrame = selectedFrames()[0] || frames[0];
    wmRects = [];
    wmDraft = null;
    wmPreviewed = false;
    updateWmRectInfo();
    syncWmMethodUi();

    const img = await loadImage(wmRefFrame.url);
    wmSourceImage = img;
    redrawWmCanvas(null);
    els.wmModal.classList.remove("hidden");
    els.wmProgress.classList.add("hidden");
  }

  function closeWatermarkModal() {
    els.wmModal.classList.add("hidden");
    wmSourceImage = null;
    wmDraft = null;
    wmDrawing = false;
  }

  function previewWatermarkOnRef() {
    if (!wmSourceImage || !wmRects.length) {
      alert("请先框选至少一个水印区域");
      return;
    }
    if (typeof WatermarkRemover === "undefined") {
      alert("去水印模块未加载");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = wmSourceImage.naturalWidth || wmSourceImage.width;
    canvas.height = wmSourceImage.naturalHeight || wmSourceImage.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(wmSourceImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelRects = WatermarkRemover.toPixelRects(wmRects, canvas.width, canvas.height);
    const result = WatermarkRemover.removeWatermark(imageData, pixelRects, getWmOptions());
    wmPreviewed = true;
    redrawWmCanvas(result);
  }

  function resetWmPreview() {
    wmPreviewed = false;
    redrawWmCanvas(null);
  }

  function backupFrameIfNeeded(frame) {
    if (frame.originalBlob) return;
    frame.originalBlob = frame.blob;
    frame.originalUrl = frame.url;
  }

  async function processFrameWatermark(frame, normRects, options) {
    const img = await loadImage(frame.url);
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelRects = WatermarkRemover.toPixelRects(normRects, canvas.width, canvas.height);
    const result = WatermarkRemover.removeWatermark(imageData, pixelRects, options);
    ctx.putImageData(result, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("toBlob failed");
    backupFrameIfNeeded(frame);
    // 若尚未备份过，originalUrl 仍指向旧 url，不要 revoke
    const prevUrl = frame.url;
    const wasOriginal = frame.originalUrl === prevUrl;
    frame.blob = blob;
    frame.url = URL.createObjectURL(blob);
    if (!wasOriginal) URL.revokeObjectURL(prevUrl);
  }

  async function applyWatermarkToFrames() {
    if (wmApplying) return;
    if (!wmRects.length) {
      alert("请先框选至少一个水印区域");
      return;
    }
    if (typeof WatermarkRemover === "undefined") {
      alert("去水印模块未加载");
      return;
    }
    const targets = resolveBatchTargets(els.wmScope.value);
    if (!targets.length) {
      alert("没有可处理的帧");
      return;
    }
    if (
      els.wmScope.value === "selected" &&
      selectedFrames().length === 0 &&
      frames.length > 1
    ) {
      const ok = confirm(`当前未选中帧，将批量处理全部 ${frames.length} 帧，是否继续？`);
      if (!ok) return;
    }

    wmApplying = true;
    els.wmApplyBtn.disabled = true;
    els.wmProgress.classList.remove("hidden");
    const options = getWmOptions();
    let okCount = 0;
    const errors = [];

    try {
      for (let i = 0; i < targets.length; i++) {
        try {
          await processFrameWatermark(targets[i], wmRects, options);
          okCount++;
        } catch (err) {
          console.error(err);
          errors.push(`#${targets[i].index + 1}`);
        }
        const p = (i + 1) / targets.length;
        els.wmProgressBar.style.transform = `scaleX(${p})`;
        els.wmProgressText.textContent = `${i + 1}/${targets.length}`;
        showBatchBar(i + 1, targets.length, "批量去水印");
        if (i % 2 === 1 || i === targets.length - 1) renderFrameGrid();
        await wait(0);
      }
      updateToolbarState();
      drawPreviewFrame();
      if (errors.length) {
        alert(`批量去水印完成：成功 ${okCount}，失败 ${errors.length}\n失败帧：${errors.slice(0, 12).join(", ")}${errors.length > 12 ? "…" : ""}`);
      }
      closeWatermarkModal();
    } catch (err) {
      console.error(err);
      alert("批量去水印失败，请缩小区域或换一种方法重试");
    } finally {
      wmApplying = false;
      els.wmApplyBtn.disabled = false;
      hideBatchBar();
      setTimeout(() => els.wmProgress.classList.add("hidden"), 400);
    }
  }

  function undoWatermark() {
    let restored = 0;
    for (const f of frames) {
      if (!f.originalBlob) continue;
      if (f.url !== f.originalUrl) URL.revokeObjectURL(f.url);
      f.blob = f.originalBlob;
      f.url = f.originalUrl || URL.createObjectURL(f.originalBlob);
      delete f.originalBlob;
      delete f.originalUrl;
      restored++;
    }
    if (!restored) {
      alert("没有可撤销的抠图/去水印结果");
      return;
    }
    renderFrameGrid();
    updateToolbarState();
    drawPreviewFrame();
  }

  // —— 抠图 ——
  function syncMatEngineUi() {
    if (!els.matEngine) return;
    const engine = els.matEngine.value;
    const needAi = engine === "ai" || engine === "hybrid";
    const needChroma = engine === "chroma" || engine === "hybrid";
    els.matModelWrap?.classList.toggle("hidden", !needAi);
    els.matTolWrap?.classList.toggle("hidden", !needChroma);
    els.matSoftWrap?.classList.toggle("hidden", !needChroma);
    els.matSpillWrap?.classList.toggle("hidden", !needChroma);
    els.matSampleWrap?.classList.toggle("hidden", !needChroma);
    els.matCanvas?.classList.toggle("picking", needChroma && els.matSample?.value === "pick");
    if (els.matHint) {
      if (engine === "hybrid") {
        els.matHint.textContent = "混合：AI 抠主体 + 色键清绿边，适合绿幕角色片。可点原图取样背景色。";
      } else if (engine === "chroma") {
        els.matHint.textContent = "色键：YCbCr 距离 + 边缘收缩/羽化/去污染。绿幕优先调容差与溢色抑制。";
      } else {
        els.matHint.textContent = "AI 首次运行会下载 ONNX 模型（约 40–80MB），之后本地推理；仍会做边缘精修。";
      }
    }
  }

  function redrawMatCanvas(processedImageData) {
    if (!matSourceImage || !els.matCanvas || !matCtx) return;
    const canvas = els.matCanvas;
    const w = matSourceImage.naturalWidth || matSourceImage.width;
    const h = matSourceImage.naturalHeight || matSourceImage.height;
    canvas.width = w;
    canvas.height = h;
    matCtx.clearRect(0, 0, w, h);
    const size = Math.max(8, Math.round(Math.min(w, h) / 40));
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const odd = ((x / size) | 0) + ((y / size) | 0);
        matCtx.fillStyle = odd % 2 === 0 ? "#2a323c" : "#1a2028";
        matCtx.fillRect(x, y, size, size);
      }
    }
    if (processedImageData) {
      const tmp = document.createElement("canvas");
      tmp.width = processedImageData.width;
      tmp.height = processedImageData.height;
      tmp.getContext("2d").putImageData(processedImageData, 0, 0);
      matCtx.drawImage(tmp, 0, 0, w, h);
    } else {
      matCtx.drawImage(matSourceImage, 0, 0);
    }
  }

  function onMatCanvasClick(e) {
    const engine = els.matEngine?.value || "hybrid";
    if ((engine !== "chroma" && engine !== "hybrid") || els.matSample?.value !== "pick") return;
    if (!matSourceImage || !els.matCanvas) return;
    const rect = els.matCanvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * els.matCanvas.width;
    const sy = ((e.clientY - rect.top) / rect.height) * els.matCanvas.height;
    const x = Math.max(0, Math.min(els.matCanvas.width - 1, Math.floor(sx)));
    const y = Math.max(0, Math.min(els.matCanvas.height - 1, Math.floor(sy)));
    const c = document.createElement("canvas");
    c.width = matSourceImage.naturalWidth || matSourceImage.width;
    c.height = matSourceImage.naturalHeight || matSourceImage.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(matSourceImage, 0, 0);
    const d = ctx.getImageData(x, y, 1, 1).data;
    matPickRgb = [d[0], d[1], d[2]];
    if (els.matStatus) els.matStatus.textContent = `已取样背景色 RGB(${matPickRgb.join(",")})`;
  }

  function getRefineOptions() {
    return {
      erode: Math.max(0, Number(els.matErode?.value) || 0),
      dilate: Math.max(0, Number(els.matDilate?.value) || 0),
      feather: Math.max(0, Number(els.matFeather?.value) || 0),
      decontaminate: Math.max(0, Math.min(1, Number(els.matDecontam?.value) ?? 0.5)),
      alphaFloor: 10,
    };
  }

  function getChromaOptions() {
    const sample = els.matSample?.value || "corners";
    return {
      tolerance: Math.max(0, Number(els.matTolerance?.value) || 48),
      softness: Math.max(1, Number(els.matSoftness?.value) || 32),
      spill: Math.max(0, Math.min(1, Number(els.matSpill?.value) ?? 0.7)),
      sample: sample === "pick" || sample === "topleft" || sample === "corners" ? sample : "corners",
      keyRgb: sample === "pick" && matPickRgb ? matPickRgb : undefined,
      customRgb: sample === "pick" && matPickRgb ? matPickRgb : undefined,
      ...getRefineOptions(),
    };
  }

  function imageDataFromFrame(frame, img) {
    const canvas = document.createElement("canvas");
    canvas.width = frame.width || img.naturalWidth || img.width;
    canvas.height = frame.height || img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return { canvas, ctx, imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) };
  }

  async function blobFromImageData(canvas, ctx, imageData) {
    ctx.putImageData(imageData, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("导出 PNG 失败");
    return blob;
  }

  async function runAiMatting(frame) {
    if (!window.desktop?.removeBackground) {
      throw new Error("AI 抠图仅在桌面端可用，请用 Electron 启动本工具");
    }
    const ab = await frame.blob.arrayBuffer();
    const model = els.matModel?.value === "small" ? "small" : "medium";
    const result = await window.desktop.removeBackground(ab, { model });
    if (!result?.ok) throw new Error(result?.message || "AI 抠图失败");
    return new Blob([result.buffer], { type: "image/png" });
  }

  async function mattingBlobFromFrame(frame) {
    if (typeof ChromaMatting === "undefined") {
      throw new Error("抠图模块未加载");
    }
    const engine = els.matEngine?.value || "hybrid";
    const chromaOpts = getChromaOptions();
    const refineOpts = getRefineOptions();

    if (engine === "chroma") {
      const img = await loadImage(frame.url);
      const { canvas, ctx, imageData } = imageDataFromFrame(frame, img);
      const out = ChromaMatting.process(imageData, chromaOpts);
      return blobFromImageData(canvas, ctx, out);
    }

    const aiBlob = await runAiMatting(frame);
    const aiUrl = URL.createObjectURL(aiBlob);
    try {
      const aiImg = await loadImage(aiUrl);
      const { canvas, ctx, imageData: aiData } = imageDataFromFrame(frame, aiImg);

      if (engine === "hybrid") {
        const srcImg = await loadImage(frame.url);
        const { imageData: srcData } = imageDataFromFrame(frame, srcImg);
        const punched = ChromaMatting.punchChromaFringe(aiData, srcData, chromaOpts);
        return blobFromImageData(canvas, ctx, punched);
      }

      const cleaned = ChromaMatting.postProcess(aiData, refineOpts);
      return blobFromImageData(canvas, ctx, cleaned);
    } finally {
      URL.revokeObjectURL(aiUrl);
    }
  }

  async function openMattingModal() {
    if (!frames.length || !els.matModal) return;
    stopPreview();
    syncBatchScopeDefaults();
    updateBatchApplyLabels();
    matRefPool = resolveBatchTargets(els.matScope?.value || "selected");
    if (!matRefPool.length) matRefPool = frames.slice();
    matRefIndex = 0;
    matRefFrame = matRefPool[0];
    matPreviewed = false;
    syncMatEngineUi();
    await loadMatRefFrame();
    els.matProgress?.classList.add("hidden");
    if (els.matStatus) {
      els.matStatus.textContent = "先预览参考帧，再批量应用到范围内全部帧。绿幕可用色键。";
    }
    els.matModal.classList.remove("hidden");
  }

  async function loadMatRefFrame() {
    if (!matRefFrame) return;
    matSourceImage = await loadImage(matRefFrame.url);
    redrawMatCanvas(null);
    updateMatRefLabel();
  }

  function updateMatRefLabel() {
    if (!els.matRefLabel) return;
    const n = matRefPool.length || 1;
    const i = Math.min(matRefIndex, n - 1) + 1;
    const globalIdx = matRefFrame ? matRefFrame.index + 1 : i;
    els.matRefLabel.textContent = `参考帧 ${i}/${n}（全局 #${globalIdx}）`;
  }

  async function shiftMatRef(delta) {
    if (!matRefPool.length || matApplying) return;
    matRefIndex = (matRefIndex + delta + matRefPool.length) % matRefPool.length;
    matRefFrame = matRefPool[matRefIndex];
    matPreviewed = false;
    await loadMatRefFrame();
  }

  function closeMattingModal() {
    els.matModal?.classList.add("hidden");
    matSourceImage = null;
    matPreviewed = false;
  }

  async function previewMattingOnRef() {
    if (!matRefFrame || matApplying) return;
    try {
      if (els.matStatus) els.matStatus.textContent = "正在预览…";
      els.matPreviewBtn.disabled = true;
      const blob = await mattingBlobFromFrame(matRefFrame);
      const url = URL.createObjectURL(blob);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      matPreviewed = true;
      redrawMatCanvas(imageData);
      if (els.matStatus) els.matStatus.textContent = "预览完成，满意后可应用到帧";
    } catch (err) {
      console.error(err);
      alert("抠图预览失败：" + (err?.message || String(err)));
      if (els.matStatus) els.matStatus.textContent = "预览失败，请检查引擎设置或网络（首次 AI 需下载模型）";
    } finally {
      els.matPreviewBtn.disabled = false;
    }
  }

  function resetMatPreview() {
    matPreviewed = false;
    redrawMatCanvas(null);
    if (els.matStatus) els.matStatus.textContent = "已还原预览";
  }

  async function processFrameMatting(frame) {
    const blob = await mattingBlobFromFrame(frame);
    backupFrameIfNeeded(frame);
    const prevUrl = frame.url;
    const wasOriginal = frame.originalUrl === prevUrl;
    frame.blob = blob;
    frame.url = URL.createObjectURL(blob);
    // 读出尺寸
    try {
      const img = await loadImage(frame.url);
      frame.width = img.naturalWidth || img.width;
      frame.height = img.naturalHeight || img.height;
    } catch (_) {
      /* keep old size */
    }
    if (!wasOriginal) URL.revokeObjectURL(prevUrl);
  }

  async function applyMattingToFrames() {
    if (matApplying) return;
    const targets = resolveBatchTargets(els.matScope?.value || "selected");
    if (!targets.length) {
      alert("没有可处理的帧");
      return;
    }
    if (
      (els.matScope?.value || "selected") === "selected" &&
      selectedFrames().length === 0 &&
      frames.length > 1
    ) {
      const ok = confirm(`当前未选中帧，将批量抠图全部 ${frames.length} 帧，是否继续？`);
      if (!ok) return;
    }

    matApplying = true;
    els.matApplyBtn.disabled = true;
    els.matPreviewBtn.disabled = true;
    els.matRefPrev && (els.matRefPrev.disabled = true);
    els.matRefNext && (els.matRefNext.disabled = true);
    els.matProgress?.classList.remove("hidden");
    const engine = els.matEngine?.value || "ai";
    if (els.matStatus) {
      els.matStatus.textContent =
        engine === "ai"
          ? `AI 批量抠图中（共 ${targets.length} 帧，首次较慢）…`
          : `色键批量处理中（共 ${targets.length} 帧）…`;
    }

    let okCount = 0;
    const errors = [];
    try {
      for (let i = 0; i < targets.length; i++) {
        try {
          await processFrameMatting(targets[i]);
          okCount++;
        } catch (err) {
          console.error(err);
          errors.push(`#${targets[i].index + 1}: ${err?.message || "失败"}`);
        }
        const p = (i + 1) / targets.length;
        if (els.matProgressBar) els.matProgressBar.style.transform = `scaleX(${p})`;
        if (els.matProgressText) els.matProgressText.textContent = `${i + 1}/${targets.length}`;
        showBatchBar(i + 1, targets.length, engine === "ai" ? "批量 AI 抠图" : "批量色键抠图");
        if (els.matStatus) {
          els.matStatus.textContent = `批量进度 ${i + 1}/${targets.length}（成功 ${okCount}）`;
        }
        // 逐帧刷新缩略图，便于观察批量结果
        if (i % 1 === 0) renderFrameGrid();
        await wait(0);
      }
      updateToolbarState();
      drawPreviewFrame();
      if (errors.length) {
        alert(
          `批量抠图完成：成功 ${okCount}，失败 ${errors.length}\n` +
            errors.slice(0, 8).join("\n") +
            (errors.length > 8 ? "\n…" : "")
        );
      } else if (els.matStatus) {
        els.matStatus.textContent = `批量完成：${okCount} 帧`;
      }
      closeMattingModal();
    } catch (err) {
      console.error(err);
      alert("批量抠图失败：" + (err?.message || String(err)));
      if (els.matStatus) els.matStatus.textContent = "处理失败";
    } finally {
      matApplying = false;
      els.matApplyBtn.disabled = false;
      els.matPreviewBtn.disabled = false;
      if (els.matRefPrev) els.matRefPrev.disabled = false;
      if (els.matRefNext) els.matRefNext.disabled = false;
      hideBatchBar();
      setTimeout(() => els.matProgress?.classList.add("hidden"), 400);
    }
  }

  function onWmPointerDown(e) {
    if (!wmSourceImage || wmApplying) return;
    e.preventDefault();
    els.wmCanvas.setPointerCapture?.(e.pointerId);
    const p = canvasPointFromEvent(e);
    wmDrawing = true;
    wmStart = p;
    wmDraft = { x: p.x, y: p.y, w: 0, h: 0 };
    wmPreviewed = false;
    redrawWmCanvas(null);
  }

  function onWmPointerMove(e) {
    if (!wmDrawing || !wmStart) return;
    e.preventDefault();
    const p = canvasPointFromEvent(e);
    wmDraft = {
      x: wmStart.x,
      y: wmStart.y,
      w: p.x - wmStart.x,
      h: p.y - wmStart.y,
    };
    redrawWmCanvas(null);
  }

  function onWmPointerUp(e) {
    if (!wmDrawing) return;
    e.preventDefault();
    wmDrawing = false;
    if (wmDraft && Math.abs(wmDraft.w) > 2 && Math.abs(wmDraft.h) > 2) {
      wmRects.push(
        normalizeRect(wmDraft, els.wmCanvas.width, els.wmCanvas.height)
      );
      updateWmRectInfo();
    }
    wmDraft = null;
    wmStart = null;
    redrawWmCanvas(null);
  }

  // —— 事件绑定 ——
  els.extractMode.addEventListener("change", syncModeParams);

  els.videoInput.addEventListener("change", () => {
    const file = els.videoInput.files && els.videoInput.files[0];
    if (file) loadVideoFile(file);
    els.videoInput.value = "";
  });

  els.dropzone.addEventListener("click", () => {
    if (window.desktop?.isDesktop) openVideoFromDesktop();
    else els.videoInput.click();
  });
  els.dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.dropzone.click();
    }
  });

  ["dragenter", "dragover"].forEach((type) => {
    els.dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      els.dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    els.dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      els.dropzone.classList.remove("dragover");
    });
  });
  els.dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadVideoFile(file);
  });

  els.extractBtn.addEventListener("click", extractFrames);
  els.selectAllBtn.addEventListener("click", () => {
    frames.forEach((f) => (f.selected = true));
    renderFrameGrid();
    updateToolbarState();
    drawPreviewFrame();
  });
  els.selectNoneBtn.addEventListener("click", () => {
    frames.forEach((f) => (f.selected = false));
    clearCompareRef();
    hideFrameHoverPop();
    renderFrameGrid();
    updateToolbarState();
    stopPreview();
    drawPreviewFrame();
  });
  els.invertBtn.addEventListener("click", () => {
    frames.forEach((f) => (f.selected = !f.selected));
    // 参考帧必须仍是勾选帧；若原参考被反选掉则清空
    if (lastSelectedId) {
      const ref = frames.find((f) => f.id === lastSelectedId);
      if (!ref || !ref.selected) clearCompareRef();
    }
    renderFrameGrid();
    updateToolbarState();
    drawPreviewFrame();
  });
  els.clearFramesBtn.addEventListener("click", clearFrames);
  els.frameGrid.addEventListener("scroll", () => {
    hideFrameHoverPop();
  });
  els.playBtn.addEventListener("click", togglePreview);
  els.previewFsBtn?.addEventListener("click", togglePreviewFullscreen);
  els.previewFsExitBtn?.addEventListener("click", () => setPreviewFullscreen(false));
  els.previewFsFab?.addEventListener("click", () => setPreviewFullscreen(false));
  els.previewFps.addEventListener("change", () => {
    if (previewPlaying) {
      stopPreview();
      togglePreview();
    }
  });
  els.exportBtn.addEventListener("click", exportZip);

  if (els.mattingBtn) {
    els.mattingBtn.addEventListener("click", openMattingModal);
    els.matCloseBtn?.addEventListener("click", closeMattingModal);
    els.matBackdrop?.addEventListener("click", closeMattingModal);
    els.matEngine?.addEventListener("change", syncMatEngineUi);
    els.matSample?.addEventListener("change", syncMatEngineUi);
    els.matCanvas?.addEventListener("click", onMatCanvasClick);
    els.matScope?.addEventListener("change", async () => {
      updateBatchApplyLabels();
      matRefPool = resolveBatchTargets(els.matScope.value);
      if (!matRefPool.length) matRefPool = frames.slice();
      matRefIndex = 0;
      matRefFrame = matRefPool[0] || null;
      matPreviewed = false;
      if (matRefFrame && !els.matModal?.classList.contains("hidden")) {
        await loadMatRefFrame();
      }
    });
    els.matRefPrev?.addEventListener("click", () => shiftMatRef(-1));
    els.matRefNext?.addEventListener("click", () => shiftMatRef(1));
    els.matPreviewBtn?.addEventListener("click", previewMattingOnRef);
    els.matResetPreviewBtn?.addEventListener("click", resetMatPreview);
    els.matApplyBtn?.addEventListener("click", applyMattingToFrames);
  }

  els.watermarkBtn.addEventListener("click", openWatermarkModal);
  els.undoWatermarkBtn.addEventListener("click", undoWatermark);
  els.wmCloseBtn.addEventListener("click", closeWatermarkModal);
  els.wmBackdrop.addEventListener("click", closeWatermarkModal);
  els.wmMethod.addEventListener("change", syncWmMethodUi);
  els.wmScope?.addEventListener("change", updateBatchApplyLabels);
  els.wmUndoRectBtn.addEventListener("click", () => {
    wmRects.pop();
    updateWmRectInfo();
    redrawWmCanvas(null);
  });
  els.wmClearRectBtn.addEventListener("click", () => {
    wmRects = [];
    updateWmRectInfo();
    redrawWmCanvas(null);
  });
  els.wmPreviewBtn.addEventListener("click", previewWatermarkOnRef);
  els.wmResetPreviewBtn.addEventListener("click", resetWmPreview);
  els.wmApplyBtn.addEventListener("click", applyWatermarkToFrames);

  els.wmCanvas.addEventListener("pointerdown", onWmPointerDown);
  els.wmCanvas.addEventListener("pointermove", onWmPointerMove);
  els.wmCanvas.addEventListener("pointerup", onWmPointerUp);
  els.wmCanvas.addEventListener("pointerleave", onWmPointerUp);
  els.wmCanvas.addEventListener("pointercancel", onWmPointerUp);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isPreviewFullscreen()) {
      setPreviewFullscreen(false);
      return;
    }
    if (els.matModal && !els.matModal.classList.contains("hidden")) {
      closeMattingModal();
      return;
    }
    if (!els.wmModal.classList.contains("hidden")) {
      closeWatermarkModal();
    }
  });

  if (window.desktop?.onMenuOpenVideo) {
    window.desktop.onMenuOpenVideo(() => openVideoFromDesktop());
  }
  if (window.desktop?.onMenuExport) {
    window.desktop.onMenuExport(() => {
      if (!els.exportBtn.disabled) exportZip();
    });
  }
  if (window.desktop?.getVersion) {
    window.desktop.getVersion().then((v) => {
      const title = `Godot Frame Animator v${v}`;
      document.title = title;
      const titleEl = document.getElementById("titlebarTitle");
      if (titleEl) titleEl.textContent = title;
    });
  }

  // 自定义标题栏
  const btnMin = document.getElementById("btnMin");
  const btnMax = document.getElementById("btnMax");
  const btnClose = document.getElementById("btnClose");
  if (window.desktop?.minimize && btnMin) {
    function setMaximizedUi(maximized) {
      const on = !!maximized;
      document.body.classList.toggle("is-maximized", on);
      if (btnMax) {
        btnMax.title = on ? "还原" : "最大化";
        btnMax.setAttribute("aria-label", on ? "还原" : "最大化");
      }
    }
    btnMin.addEventListener("click", () => window.desktop.minimize());
    btnMax.addEventListener("click", () => window.desktop.maximize());
    btnClose.addEventListener("click", () => window.desktop.close());
    window.desktop.onMaximizedChange?.(setMaximizedUi);
    window.desktop.isMaximized?.().then(setMaximizedUi);
  } else {
    const bar = document.getElementById("titlebar");
    if (bar) bar.style.display = "none";
    document.documentElement.style.setProperty("--titlebar-h", "0px");
  }

  // 设置
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingHoverCompare = document.getElementById("settingHoverCompare");
  const settingCompareModeRow = document.getElementById("settingCompareModeRow");
  const settingCompareModeSeg = document.getElementById("settingCompareModeSeg");

  function applyPreviewBg() {
    const stage = els.previewStage || document.querySelector(".preview-stage");
    if (stage) stage.classList.toggle("is-light", !!settings.previewLight);
  }

  function syncCompareModeUi() {
    if (settingCompareModeRow) {
      settingCompareModeRow.classList.toggle("is-disabled", !settings.hoverCompare);
    }
    if (!settingCompareModeSeg) return;
    settingCompareModeSeg.querySelectorAll(".settings-seg-btn").forEach((btn) => {
      const mode = btn.getAttribute("data-compare-mode");
      btn.classList.toggle("is-active", mode === getCompareMode());
      btn.disabled = !settings.hoverCompare;
    });
  }

  if (settingHoverCompare) {
    settingHoverCompare.checked = settings.hoverCompare;
    settingHoverCompare.addEventListener("change", () => {
      settings.hoverCompare = !!settingHoverCompare.checked;
      saveSettings();
      syncCompareModeUi();
      hideFrameHoverPop();
    });
  }
  const settingPreviewLight = document.getElementById("settingPreviewLight");
  if (settingPreviewLight) {
    settingPreviewLight.checked = !!settings.previewLight;
    settingPreviewLight.addEventListener("change", () => {
      settings.previewLight = !!settingPreviewLight.checked;
      saveSettings();
      applyPreviewBg();
      if (!previewPlaying) drawPreviewFrame();
    });
  }
  applyPreviewBg();

  if (settingCompareModeSeg) {
    settingCompareModeSeg.addEventListener("click", (e) => {
      const btn = e.target.closest(".settings-seg-btn");
      if (!btn || btn.disabled) return;
      const mode = btn.getAttribute("data-compare-mode");
      if (mode !== "split" && mode !== "overlap") return;
      setCompareMode(mode);
      syncCompareModeUi();
      hideFrameHoverPop();
    });
  }
  syncCompareModeUi();

  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = settingsPanel.classList.toggle("hidden") === false;
      settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      const wrap = document.getElementById("settingsWrap");
      if (!wrap || wrap.contains(e.target)) return;
      settingsPanel.classList.add("hidden");
      settingsBtn.setAttribute("aria-expanded", "false");
    });
  }

  syncModeParams();
  syncWmMethodUi();
  updateToolbarState();
  drawPreviewFrame();
})();
