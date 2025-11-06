"use client";
import React, { useState } from "react";
import JSZip from "jszip";
import { SparklesCore } from "@/components/ui/sparkles";
import { FileUpload } from "@/components/ui/file-upload";

const PRESETS = {
  INSTAGRAM: { w: 1080, h: 1080, label: "Instagram 1080×1080" },
  STORY: { w: 1080, h: 1920, label: "Story 1080×1920" },
  TWITTER: { w: 1200, h: 675, label: "Twitter 1200×675" },
};

export default function ResizerPage() {
  const [preset, setPreset] = useState("INSTAGRAM");
  const [quality, setQuality] = useState(85); // 60–100 (we’ll map to 0–1 for canvas)
  const [files, setFiles] = useState([]);     // [{id, file, previewUrl, resultBlob, origSize, newSize}]
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [done, setDone] = useState(false);
  const [totalSaved, setTotalSaved] = useState(null);

  // ---------- helpers ----------
  const addFiles = (newFiles) => {
    const mapped = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      resultBlob: null,
      origSize: file.size,
      newSize: 0,
    }));
    setFiles((prev) => [...prev, ...mapped]);
    setDone(false);
    setTotalSaved(null);
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    setDone(false);
    setTotalSaved(null);
  };

  const resetAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setProcessing(false);
    setProgress(0);
    setDone(false);
    setTotalSaved(null);
    setResetKey((k) => k + 1);
  };

  // Draw image inside exact preset frame (fit: "contain", white background)
  async function resizeContainToCanvas(file, targetW, targetH, q01) {
    // Prefer createImageBitmap for speed (auto-rotates with EXIF in most browsers)
    let imageBitmap = null;
    try {
      imageBitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fallback to HTMLImageElement
      imageBitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    }

    const srcW = imageBitmap.width;
    const srcH = imageBitmap.height;
    const scale = Math.min(targetW / srcW, targetH / srcH);

    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const offX = Math.floor((targetW - drawW) / 2);
    const offY = Math.floor((targetH - drawH) / 2);

    // Use OffscreenCanvas if available for speed, otherwise <canvas>
    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(targetW, targetH)
      : Object.assign(document.createElement("canvas"), { width: targetW, height: targetH });

    const ctx = canvas.getContext("2d");

    // White background (exact preset size), then draw contained image
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(imageBitmap, offX, offY, drawW, drawH);

    // Export JPEG
    if (canvas.convertToBlob) {
      // OffscreenCanvas
      return await canvas.convertToBlob({ type: "image/jpeg", quality: q01 });
    } else {
      // HTMLCanvasElement
      return await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", q01)
      );
    }
  }

  const processAll = async () => {
    if (!files.length || processing) return;

    setProcessing(true);
    setProgress(0);
    setDone(false);

    const { w, h } = PRESETS[preset];
    const q01 = Math.max(0.6, Math.min(1, quality / 100)); // clamp 0.6–1.0

    let doneCount = 0;
    let totalOrig = 0;
    let totalNew = 0;

    const out = [];
    for (const f of files) {
      try {
        const blob = await resizeContainToCanvas(f.file, w, h, q01);
        const newSize = blob.size;

        totalOrig += f.origSize;
        totalNew += newSize;

        out.push({
          ...f,
          resultBlob: blob,
          newSize,
        });
      } catch {
        // If a single file fails, keep the original entry without resultBlob
        out.push({ ...f, resultBlob: null, newSize: 0 });
      }

      doneCount++;
      setProgress(Math.round((doneCount / files.length) * 100));

      // yield to UI for responsiveness
      await new Promise((r) => setTimeout(r, 0));
    }

    setFiles(out);
    setProcessing(false);
    setDone(true);
    setTotalSaved({ orig: totalOrig, newSize: totalNew });
  };

  const canDownload = files.length > 0 && files.every((f) => !!f.resultBlob);

  const downloadZip = async () => {
    if (!canDownload) return;
    const zip = new JSZip();

    for (const f of files) {
      const buf = await f.resultBlob.arrayBuffer();
      const base = f.file.name.replace(/\.[^.]+$/, "");
      zip.file(`${base}-optimized.jpg`, buf);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "optimized.zip";
    a.click();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden p-6">
      {/* Sparkles Background */}
      <SparklesCore
        className="absolute inset-0 z-0 pointer-events-none"
        background="#000"
        particleColor="#4cc9f0"
        particleDensity={60}
        speed={0.9}
      />

      <div className="relative z-10 w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 space-y-6 text-white">
        <h1 className="text-2xl font-bold text-center">Image Resizer & Optimizer</h1>

        {/* Drag & Drop */}
        <FileUpload key={resetKey} onChange={addFiles} />

        {/* Previews */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {files.map((f) => (
              <div key={f.id} className="flex flex-col items-center">
                <img
                  src={f.previewUrl}
                  className="w-full h-24 object-cover rounded"
                  alt=""
                />
                <button
                  onClick={() => removeFile(f.id)}
                  className="mt-1 text-xs bg-red-600 px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Preset */}
        <div>
          <label>Preset</label>
          <select
            className="w-full bg-black/40 border border-white/20 rounded p-2 mt-1"
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          >
            {Object.keys(PRESETS).map((k) => (
              <option key={k} value={k} className="text-black">
                {PRESETS[k].label}
              </option>
            ))}
          </select>
        </div>

        {/* Quality */}
        <div>
          <label>Quality: {quality}%</label>
          <input
            type="range"
            min={60}
            max={100}
            value={quality}
            onChange={(e) => setQuality(+e.target.value)}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Progress Bar (only while processing) */}
        {processing && (
          <div className="w-full bg-white/20 h-2 rounded overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-blue-400 transition-all duration-300"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={processAll}
            disabled={!files.length || processing}
            className="flex-1 bg-blue-600 py-2 rounded disabled:opacity-50"
          >
            {processing ? "Processing…" : "Process"}
          </button>

          {/* Download appears ONLY when all files have resultBlob */}
          {done && canDownload && (
            <button
              onClick={downloadZip}
              className="flex-1 bg-green-600 py-2 rounded"
            >
              Download
            </button>
          )}

          <button
            onClick={resetAll}
            className="flex-1 bg-gray-700 py-2 rounded"
          >
            Reset
          </button>
        </div>

        {/* Saved summary */}
        {totalSaved && (
          <p className="text-center text-green-400 font-medium">
            Saved {(totalSaved.orig / 1024 / 1024).toFixed(2)}MB →{" "}
            {(totalSaved.newSize / 1024 / 1024).toFixed(2)}MB
          </p>
        )}
      </div>
    </div>
  );
}
