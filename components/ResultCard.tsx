"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { downloadBase64Image } from "@/lib/imageUtils";
import type { ImageItem } from "@/types";

interface ResultCardProps {
  item: ImageItem;
  index: number;
  onRetry?: (id: string) => void;
  isRetrying?: boolean;
}

type LightboxTarget = "original" | "render";

export function ResultCard({ item, index, onRetry, isRetrying = false }: ResultCardProps) {
  const isGenerating = item.status === "generating-image";
  const isDone       = item.status === "done";
  const hasError     = item.status === "error";
  const canRetry     = hasError && item.errorStage === "image" && typeof onRetry === "function";

  const [lightbox, setLightbox] = useState<LightboxTarget | null>(null);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  // Close on Escape
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, closeLightbox]);

  const handleDownload = () => {
    if (!item.generatedImageUrl || !item.generatedMimeType) return;
    const ext = item.generatedMimeType.split("/")[1] || "jpg";
    downloadBase64Image(item.generatedImageUrl, item.generatedMimeType, `${item.name}-render.${ext}`);
  };

  const lightboxSrc =
    lightbox === "original"
      ? item.previewUrl
      : lightbox === "render" && item.generatedImageUrl
      ? `data:${item.generatedMimeType};base64,${item.generatedImageUrl}`
      : null;

  const lightboxLabel = lightbox === "original" ? "Original" : "Render";

  return (
    <>
      <div className={clsx(
        "arqu-card",
        isGenerating && "border-[#C85A3C]/40",
        hasError && "border-red-200",
      )}>
        {/* Header bar */}
        <div className="px-4 py-3 border-b border-[#E0DCD3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="arqu-label text-[#C85A3C]">{String(index + 1).padStart(2, "0")}</span>
            <span className="text-xs font-bold text-[#2A2B2A] uppercase tracking-wide truncate max-w-[140px]">
              {item.name}
            </span>
          </div>
          {isDone && (
            <button onClick={handleDownload} className="arqu-label text-[#C85A3C] hover:text-[#A5452B] transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              DESCARGAR
            </button>
          )}
          {canRetry && (
            <button
              onClick={() => onRetry?.(item.id)}
              disabled={isRetrying}
              className="arqu-label text-[#C85A3C] hover:text-[#A5452B] transition-colors disabled:opacity-50"
            >
              {isRetrying ? "REGENERANDO" : "REGENERAR"}
            </button>
          )}
        </div>

        {/* Images — 2px gap */}
        <div className="grid grid-cols-2 gap-0.5 bg-[#E0DCD3]">
          {/* Original */}
          <div
            className="relative group cursor-zoom-in"
            onClick={() => setLightbox("original")}
          >
            <div className="h-[220px] overflow-hidden bg-[#E0DCD3] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt="Original" className="max-h-full max-w-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300" />
            </div>
            <span className="absolute bottom-0 left-0 arqu-label bg-[#2A2B2A]/70 text-white px-2 py-1">
              Original
            </span>
            <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-1">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
            </span>
          </div>

          {/* Result */}
          <div
            className={clsx("relative", isDone && "group cursor-zoom-in")}
            onClick={() => isDone && item.generatedImageUrl && setLightbox("render")}
          >
            <div className="h-[220px] overflow-hidden bg-[#F4F1EA] flex items-center justify-center">
              {isGenerating && (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-5 h-5 text-[#C85A3C] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="arqu-label">Generando...</span>
                </div>
              )}
              {isDone && item.generatedImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:${item.generatedMimeType};base64,${item.generatedImageUrl}`}
                  alt="Render"
                  className="max-h-full max-w-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
                />
              )}
              {hasError && (
                <div className="p-4 text-center">
                  <p className="text-[10px] text-red-400 leading-relaxed">
                    {item.errorStage === "prompt"
                      ? item.error || "No se pudo generar el prompt"
                      : item.error || "Error al generar"}
                  </p>
                </div>
              )}
              {item.status === "prompt-ready" && (
                <span className="arqu-label">En cola</span>
              )}
            </div>
            {isDone && (
              <>
                <span className="absolute bottom-0 left-0 arqu-label bg-[#C85A3C] text-white px-2 py-1">
                  Render
                </span>
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-1">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                  </svg>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Prompt */}
        {(item.editedPrompt || item.prompt) && (
          <div className="px-4 py-3 border-t border-[#E0DCD3]">
            <p className="text-[10px] text-[#6B6C6B] font-mono leading-relaxed line-clamp-2">
              {item.editedPrompt || item.prompt}
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div className="w-full max-w-5xl flex items-center justify-between mb-3 px-1" onClick={(e) => e.stopPropagation()}>
            <span className="arqu-label text-white/70">{item.name} — {lightboxLabel}</span>
            <div className="flex items-center gap-4">
              {lightbox === "render" && (
                <button
                  onClick={handleDownload}
                  className="arqu-label text-white/70 hover:text-white transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  DESCARGAR
                </button>
              )}
              {/* Toggle original/render */}
              {isDone && (
                <button
                  onClick={() => setLightbox(lightbox === "original" ? "render" : "original")}
                  className="arqu-label text-white/70 hover:text-white transition-colors"
                >
                  Ver {lightbox === "original" ? "Render" : "Original"}
                </button>
              )}
              <button onClick={closeLightbox} className="arqu-label text-white/70 hover:text-white transition-colors">
                ESC / CERRAR
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt={lightboxLabel}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
