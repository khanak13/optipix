"use client";
import React, { useState, useRef } from "react";
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
  const [totalSaved, setTotalSaved] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const addFiles = (newFiles) => {
    const mapped = newFiles.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setFiles((p) => [...p, ...mapped]);
  };

  const resetAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setTotalSaved(null);
    setResetKey((k) => k + 1);
  };

  const removeFile = (id) =>
    setFiles((p) => p.filter((x) => x.id !== id));

  const processAll = async () => {
    setProcessing(true);
    let o = 0, n = 0;

    const processed = await Promise.all(
      files.map(async (item) => {
        const fd = new FormData();
        fd.append("file", item.file);
        fd.append("width", PRESETS[preset].w);
        fd.append("height", PRESETS[preset].h);
        fd.append("quality", quality);

        const res = await fetch("/api/process", { method: "POST", body: fd });
        const blob = await res.blob();
        const metrics = JSON.parse(res.headers.get("x-metrics") || "{}");

        o += metrics.originalSize || 0;
        n += metrics.newSize || 0;

        return { ...item, resultBlob: blob };
      })
    );

    setFiles(processed);
    setProcessing(false);
    setTotalSaved({ orig: o, newSize: n });
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    for (const f of files.filter((x) => x.resultBlob)) {
      const buf = await f.resultBlob.arrayBuffer();
      zip.file(f.file.name.replace(/\.[^.]+$/, "") + "-optimized.jpg", buf);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "optimized.zip";
    a.click();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden p-6">
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

        <FileUpload key={resetKey} onChange={addFiles} />

        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {files.map((f) => (
              <div key={f.id} className="flex flex-col items-center">
                <img src={f.previewUrl} className="w-full h-24 object-cover rounded"/>
                <button onClick={() => removeFile(f.id)}
                  className="mt-1 text-xs bg-red-600 px-2 py-1 rounded">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

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

        <div>
          <label>Quality: {quality}%</label>
          <input type="range" min={60} max={100} value={quality}
            onChange={(e) => setQuality(+e.target.value)}
            className="w-full cursor-pointer"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={processAll} disabled={!files.length || processing}
            className="flex-1 bg-blue-600 py-2 rounded">
            {processing ? "Processing..." : "Process"}
          </button>

          <button onClick={downloadZip} disabled={!files.some((f) => f.resultBlob)}
            className="flex-1 bg-green-600 py-2 rounded">
            Download
          </button>

          <button onClick={resetAll} className="flex-1 bg-gray-700 py-2 rounded">
            Reset
          </button>
        </div>

        {totalSaved && (
          <p className="text-center text-green-400 font-medium">
            Saved {(totalSaved.orig/1024/1024).toFixed(2)}MB → {(totalSaved.newSize/1024/1024).toFixed(2)}MB
          </p>
        )}
      </div>
    </div>
  );
}
