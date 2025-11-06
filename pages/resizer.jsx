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
  const [quality, setQuality] = useState(85);
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const addFiles = (newFiles) => {
    const mapped = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      resultBlob: null,
    }));

    setFiles((prev) => [...prev, ...mapped]);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const resetAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setProcessing(false);
    setProgress(0);
    setResetKey((k) => k + 1);
  };

  const processAll = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setProgress(0);

    let doneCount = 0;
    const updated = [];

    for (const file of files) {
      const form = new FormData();
      form.append("file", file.file);
      form.append("width", PRESETS[preset].w);
      form.append("height", PRESETS[preset].h);
      form.append("quality", quality);

      const res = await fetch("/api/process", {
        method: "POST",
        body: form,
      });

      const blob = await res.blob();
      updated.push({ ...file, resultBlob: blob });

      doneCount++;
      setProgress(Math.round((doneCount / files.length) * 100));
    }

    setFiles(updated);
    setProcessing(false);
  };

  const downloadZip = async () => {
    const ready = files.filter((f) => f.resultBlob);

    const zip = new JSZip();
    for (const f of ready) {
      const buf = await f.resultBlob.arrayBuffer();
      const name = f.file.name.replace(/\.[^.]+$/, "");
      zip.file(`${name}-optimized.jpg`, buf);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "optimized.zip";
    a.click();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden p-6">

      {/* Sparkle Background */}
      <SparklesCore
        className="absolute inset-0 z-0 pointer-events-none"
        background="#000"
        particleColor="#4cc9f0"
        particleDensity={60}
        speed={0.9}
      />

      <div className="relative z-10 w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 space-y-6 text-white">

        <h1 className="text-2xl font-bold text-center">
          Image Resizer & Optimizer
        </h1>

        {/* DRAG + DROP */}
        <FileUpload key={resetKey} onChange={addFiles} />

        {/* Preview grid */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {files.map((f) => (
              <div key={f.id} className="flex flex-col items-center">
                <img
                  src={f.previewUrl}
                  className="w-full h-24 object-cover rounded"
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
              <option value={k} key={k} className="text-black">
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

        {/* Progress bar */}
        {processing && (
          <div className="w-full bg-white/20 h-2 rounded overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-blue-400 transition-all duration-300"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={processAll}
            disabled={!files.length || processing}
            className="flex-1 bg-blue-600 py-2 rounded disabled:opacity-50"
          >
            {processing ? "Processing…" : "Process"}
          </button>

          {/* Download appears ONLY when all files processed */}
          {files.length > 0 && files.every((f) => f.resultBlob) && (
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
      </div>
    </div>
  );
}
