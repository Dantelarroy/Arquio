"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArquLogo } from "@/components/ArquLogo";
import { compressImage, generateId, downloadBase64Image, downloadAllAsZip } from "@/lib/imageUtils";

interface AdjustItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  prompt: string;
  adjustedImageUrl?: string;
  adjustedMimeType?: string;
  status: "idle" | "processing" | "done" | "error";
  error?: string;
}

export default function AjustesPage() {
  const [items, setItems] = useState<AdjustItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef(`ajuste_${Date.now()}`).current;

  // ── Upload ────────────────────────────────────────────────────────────────

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    const newItems: AdjustItem[] = await Promise.all(
      arr.map(async (file) => {
        const { base64, mimeType } = await compressImage(file);
        return { id: generateId(), file, name: file.name.replace(/\.[^.]+$/, ""), previewUrl: `data:${mimeType};base64,${base64}`, prompt: "", status: "idle" as const };
      })
    );
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files);
  }, [processFiles]);

  // ── Process single ────────────────────────────────────────────────────────

  const processItem = async (item: AdjustItem) => {
    if (!item.prompt.trim()) return;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "processing", error: undefined } : i));

    try {
      const { base64, mimeType } = await compressImage(item.file, 1600, 1600, 0.88);
      const res = await fetch("/api/adjust-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, adjustmentPrompt: item.prompt }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "error", error: data.error } : i));
      } else {
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "done", adjustedImageUrl: data.imageBase64, adjustedMimeType: data.mimeType } : i));
        const { base64: origB64, mimeType: origMt } = await compressImage(item.file, 1200, 1200, 0.82);
        fetch("/api/save-render", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, name: `${item.name}_ajustado`, prompt: item.prompt, imageBase64: data.imageBase64, imageMimeType: data.mimeType, originalBase64: origB64, originalMimeType: origMt, sessionId }),
        }).catch(() => {});
      }
    } catch (err) {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "error", error: err instanceof Error ? err.message : "Error" } : i));
    }
  };

  // ── Apply all ─────────────────────────────────────────────────────────────

  const applyAll = async () => {
    const toProcess = items.filter((i) => (i.status === "idle" || i.status === "error") && i.prompt.trim());
    if (!toProcess.length) return;
    setIsProcessingAll(true);
    for (const item of toProcess) await processItem(item);
    setIsProcessingAll(false);
  };

  const handleDownloadAll = async () => {
    const done = items.filter((i) => i.status === "done" && i.adjustedImageUrl && i.adjustedMimeType);
    if (!done.length) return;
    await downloadAllAsZip(done.map((i) => ({ base64: i.adjustedImageUrl!, mimeType: i.adjustedMimeType!, filename: `${i.name}_ajustado.${i.adjustedMimeType!.split("/")[1] || "jpg"}` })));
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const readyToApply = items.filter((i) => (i.status === "idle" || i.status === "error") && i.prompt.trim()).length;
  const processingCount = items.filter((i) => i.status === "processing").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EA]">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F4F1EA]/95 backdrop-blur-sm border-b border-[#E0DCD3]">
        <div className="max-w-7xl mx-auto px-6 h-[4.5rem] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ArquLogo height={40} />
            <span className="text-[#E0DCD3]">/</span>
            <span className="arqu-label">Ajustes</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/galeria" className="arqu-label hover:text-[#2A2B2A] transition-colors">Galería</Link>
            <Link href="/" className="arqu-label hover:text-[#2A2B2A] transition-colors">Renders</Link>
            {doneCount > 0 && (
              <button onClick={handleDownloadAll} className="arqu-btn-secondary !py-2 !px-4 !text-[10px]">
                ↓ Descargar todo ({doneCount})
              </button>
            )}
            <button
              onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
              className="arqu-label hover:text-red-400 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 space-y-8">

        {/* Title */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="arqu-label text-[#C85A3C] mb-3">Edición</p>
            <h1 className="arqu-heading text-5xl sm:text-6xl">
              Ajustes<br />por Imagen
            </h1>
            <p className="text-sm text-[#6B6C6B] mt-4 max-w-md leading-relaxed">
              Subí renders generados y describí el cambio en cada uno. Gemini aplica el ajuste respetando la imagen base.
            </p>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-4 shrink-0">
              {processingCount > 0 && (
                <span className="arqu-label text-[#C85A3C]">Procesando {processingCount}/{items.length}...</span>
              )}
              <button
                onClick={applyAll}
                disabled={isProcessingAll || readyToApply === 0}
                className="arqu-btn-primary"
              >
                {isProcessingAll ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Aplicando...
                  </>
                ) : `Aplicar todos — ${readyToApply}`}
              </button>
            </div>
          )}
        </div>

        <hr className="arqu-rule-strong" />

        {/* Empty state — drop zone */}
        {items.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              "border-2 border-dashed p-20 text-center cursor-pointer transition-all",
              isDragging ? "border-[#C85A3C] bg-white" : "border-[#E0DCD3] hover:border-[#C85A3C]/40"
            )}
          >
            <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />
            <p className="text-sm font-bold text-[#2A2B2A] uppercase tracking-wider mb-2">Subí los renders a ajustar</p>
            <p className="arqu-label">Arrastrá o hacé click · PNG · JPG · WEBP</p>
          </div>
        )}

        {/* Cards */}
        {items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="arqu-label">{items.length} imagen{items.length !== 1 ? "es" : ""}</span>
              <button onClick={() => inputRef.current?.click()} className="arqu-label text-[#C85A3C] hover:text-[#A5452B] transition-colors">
                + Agregar más
              </button>
            </div>
            <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0.5 bg-[#E0DCD3]">
              {items.map((item, index) => (
                <div key={item.id} className="bg-[#F4F1EA]">
                  <AdjustCard
                    item={item}
                    index={index}
                    onPromptChange={(id, p) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, prompt: p } : i))}
                    onApply={() => processItem(item)}
                    onRemove={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                    onRetry={(id) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "idle", error: undefined } : i))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#E0DCD3] py-5 mt-12">
        <div className="max-w-7xl mx-auto px-6">
          <span className="arqu-label">arqu studio · AI for Architecture</span>
        </div>
      </footer>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function AdjustCard({
  item, index, onPromptChange, onApply, onRemove, onRetry,
}: {
  item: AdjustItem; index: number;
  onPromptChange: (id: string, p: string) => void;
  onApply: () => void; onRemove: (id: string) => void; onRetry: (id: string) => void;
}) {
  const isDone       = item.status === "done";
  const isProcessing = item.status === "processing";
  const isError      = item.status === "error";

  const handleDownload = () => {
    if (!item.adjustedImageUrl || !item.adjustedMimeType) return;
    downloadBase64Image(item.adjustedImageUrl, item.adjustedMimeType, `${item.name}_ajustado.${item.adjustedMimeType.split("/")[1] || "jpg"}`);
  };

  return (
    <div className={clsx("arqu-card", isProcessing && "border-[#C85A3C]/40", isError && "border-red-200")}>

      {/* Images — 2px gap */}
      <div className={clsx("grid gap-0.5 bg-[#E0DCD3]", isDone ? "grid-cols-2" : "grid-cols-1")}>
        {/* Original */}
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden bg-[#E0DCD3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.previewUrl} alt="Original" className="w-full h-full object-cover" />
          </div>
          {isProcessing && (
            <div className="absolute inset-0 bg-[#2A2B2A]/60 flex flex-col items-center justify-center gap-2">
              <svg className="w-5 h-5 text-[#C85A3C] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="arqu-label text-white/70">Ajustando...</span>
            </div>
          )}
          <span className="absolute top-0 left-0 arqu-label bg-[#2A2B2A]/70 text-white px-2 py-1">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="absolute bottom-0 left-0 arqu-label bg-[#2A2B2A]/70 text-white px-2 py-1">Original</span>
        </div>

        {/* Result */}
        {isDone && item.adjustedImageUrl && (
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:${item.adjustedMimeType};base64,${item.adjustedImageUrl}`} alt="Ajustado" className="w-full h-full object-cover" />
            </div>
            <span className="absolute bottom-0 left-0 arqu-label bg-[#C85A3C] text-white px-2 py-1">Ajustado</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Row: name + actions */}
        <div className="flex items-center justify-between gap-2">
          <span className="arqu-label">{item.name}</span>
          <div className="flex items-center gap-3">
            {isDone && (
              <>
                <span className="arqu-label text-[#C85A3C]">✓ Guardado</span>
                <button onClick={handleDownload} className="arqu-label text-[#C85A3C] hover:text-[#A5452B] transition-colors">↓</button>
              </>
            )}
            {isError && <button onClick={() => onRetry(item.id)} className="arqu-label text-red-400 hover:text-red-500 transition-colors">Reintentar</button>}
            {!isDone && !isProcessing && <button onClick={() => onRemove(item.id)} className="arqu-label hover:text-red-400 transition-colors">Quitar</button>}
          </div>
        </div>

        {isError && item.error && (
          <p className="text-[10px] text-red-400 font-mono border border-red-100 bg-red-50 p-2">{item.error}</p>
        )}

        {/* Prompt */}
        <textarea
          value={item.prompt}
          onChange={(e) => onPromptChange(item.id, e.target.value)}
          disabled={isProcessing}
          rows={3}
          placeholder="¿Qué querés cambiar? Ej: Cambiá el piso a madera oscura, mantené todo lo demás igual."
          className="arqu-textarea"
          spellCheck={false}
        />

        {/* Apply single */}
        {(item.status === "idle" || item.status === "error") && item.prompt.trim() && (
          <button onClick={onApply} className="w-full arqu-btn-secondary !text-[10px] !py-2 justify-center">
            Aplicar esta imagen
          </button>
        )}

        {isDone && (
          <p className="text-[10px] text-[#6B6C6B] font-mono leading-relaxed line-clamp-2 italic">
            "{item.prompt}"
          </p>
        )}
      </div>
    </div>
  );
}
