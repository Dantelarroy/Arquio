"use client";

import { useState, useCallback, useRef } from "react";
import clsx from "clsx";
import Link from "next/link";
import { ArquLogo } from "@/components/ArquLogo";
import { StepIndicator } from "@/components/StepIndicator";
import { UploadZone } from "@/components/UploadZone";
import { MasterPromptEditor, DEFAULT_MASTER_PROMPT } from "@/components/MasterPromptEditor";
import { PromptCard } from "@/components/PromptCard";
import { ResultCard } from "@/components/ResultCard";
import { compressImage, downloadAllAsZip } from "@/lib/imageUtils";
import type { ImageItem, AppStep } from "@/types";

export default function HomePage() {
  const [step, setStep] = useState<AppStep>("upload");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_MASTER_PROMPT);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const sessionId = useRef(`session_${Date.now()}`).current;

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleImagesAdd = useCallback((items: ImageItem[]) => {
    setImages((prev) => [...prev, ...items]);
  }, []);

  const handleImageRemove = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const imageRenderErrors = images.filter(
    (img) => img.status === "error" && img.errorStage === "image"
  ).length;
  const promptProgressCount = images.filter(
    (img) =>
      ["prompt-ready", "generating-image", "done"].includes(img.status) ||
      (img.status === "error" && img.errorStage === "image")
  ).length;
  const renderReadyCount = images.filter(
    (img) =>
      img.status === "prompt-ready" ||
      (img.status === "error" && img.errorStage === "image")
  ).length;

  // ── Generate prompts ──────────────────────────────────────────────────────

  const generatePrompts = async () => {
    if (!images.length || !masterPrompt.trim()) return;
    setIsGeneratingPrompts(true);
    setStep("prompts");

    setImages((prev) => prev.map((img) => ({ ...img, status: "generating-prompt" })));

    for (const img of images) {
      try {
        const { base64, mimeType } = await compressImage(img.file, 1600, 1600, 0.88);
        const res = await fetch("/api/generate-prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType, masterPrompt }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: "error", error: data.error, errorStage: "prompt", generatedImageUrl: undefined, generatedMimeType: undefined } : i));
        } else {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: "prompt-ready", prompt: data.prompt, editedPrompt: data.prompt, error: undefined, errorStage: undefined, generatedImageUrl: undefined, generatedMimeType: undefined } : i));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error de red";
        setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: "error", error: message, errorStage: "prompt", generatedImageUrl: undefined, generatedMimeType: undefined } : i));
      }
    }
    setIsGeneratingPrompts(false);
  };

  // ── Generate images ───────────────────────────────────────────────────────

  const generateImages = useCallback(async (targetIds?: string[]) => {
    const ready = images.filter((img) => {
      const isSelected = !targetIds || targetIds.includes(img.id);
      const isReadyForRender =
        img.status === "prompt-ready" ||
        (img.status === "error" && img.errorStage === "image");

      return isSelected && isReadyForRender;
    });

    if (!ready.length) return;
    setIsGeneratingImages(true);
    setStep("results");

    setImages((prev) => prev.map((img) =>
      ready.some((item) => item.id === img.id)
        ? { ...img, status: "generating-image", error: undefined, errorStage: undefined }
        : img
    ));

    for (let idx = 0; idx < ready.length; idx++) {
      const img = ready[idx];
      const prompt = img.editedPrompt || img.prompt;
      if (!prompt) continue;

      // Delay between requests to avoid Gemini rate limiting (skip first)
      if (idx > 0) await new Promise((r) => setTimeout(r, 1200));

      try {
        // Send only the text prompt — passing the SketchUp image causes Gemini
        // to do conservative image editing instead of full photorealistic generation.
        const res = await fetch("/api/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: "error", error: data.error, errorStage: "image" } : i));
        } else {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: "done", generatedImageUrl: data.imageBase64, generatedMimeType: data.mimeType, error: undefined, errorStage: undefined } : i));
          const { base64: origB64, mimeType: origMt } = await compressImage(img.file, 1200, 1200, 0.82);
          fetch("/api/save-render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: img.id, name: img.name, prompt, imageBase64: data.imageBase64, imageMimeType: data.mimeType, originalBase64: origB64, originalMimeType: origMt, sessionId }),
          }).catch(() => {});
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error de red";
        setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: "error", error: message, errorStage: "image" } : i));
      }
    }
    setIsGeneratingImages(false);
  }, [images, sessionId]);

  const handlePromptChange = useCallback((id: string, prompt: string) => {
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, editedPrompt: prompt } : img));
  }, []);

  const handleRetryImage = useCallback((id: string) => {
    void generateImages([id]);
  }, [generateImages]);

  const handleDownloadAll = async () => {
    const done = images.filter((i) => i.status === "done" && i.generatedImageUrl && i.generatedMimeType);
    if (!done.length) return;
    await downloadAllAsZip(done.map((i) => ({
      base64: i.generatedImageUrl!,
      mimeType: i.generatedMimeType!,
      filename: `${i.name}-render.${i.generatedMimeType!.split("/")[1] || "jpg"}`,
    })));
  };

  const handleReset = () => { setImages([]); setStep("upload"); };

  const imagesGenerated = images.filter((i) => i.status === "done").length;
  const hasErrors      = images.some((i) => i.status === "error");

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EA]">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#F4F1EA]/95 backdrop-blur-sm border-b border-[#E0DCD3]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <ArquLogo height={48} />

          {/* Step indicator centered */}
          <div className="hidden md:flex flex-1 justify-center">
            <StepIndicator currentStep={step} />
          </div>

          {/* Nav */}
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/ajustes" className="arqu-label hover:text-[#2A2B2A] transition-colors">Ajustes</Link>
            <Link href="/galeria" className="arqu-label hover:text-[#2A2B2A] transition-colors">Galería</Link>
            {step !== "upload" && (
              <button onClick={handleReset} className="arqu-label hover:text-[#2A2B2A] transition-colors">
                Nueva sesión
              </button>
            )}
            {step === "results" && imagesGenerated > 0 && (
              <button onClick={handleDownloadAll} className="arqu-btn-secondary !py-2 !px-4 !text-[10px]">
                Descargar todo ({imagesGenerated})
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
        {/* Mobile step indicator */}
        <div className="md:hidden px-6 pb-2">
          <StepIndicator currentStep={step} />
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">

        {/* ═══ STEP 1 — Upload ═══════════════════════════════════════════════ */}
        {step === "upload" && (
          <div className="animate-fade-in">
            {/* Page title */}
            <div className="mb-10">
              <p className="arqu-label text-[#C85A3C] mb-3">01 — Render AI</p>
              <h1 className="arqu-heading text-5xl sm:text-6xl lg:text-7xl mb-4">
                Sketchup<br />
                <span className="text-[#C85A3C]">→</span> Fotorrealismo
              </h1>
              <p className="text-sm text-[#6B6C6B] max-w-lg leading-relaxed">
                Exportá tus renders desde SketchUp, subílos y Gemini generará una versión fotorrealista respetando materiales, luz y composición.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-0.5 bg-[#E0DCD3]">
              {/* Upload panel */}
              <div className="bg-[#F4F1EA] p-8">
                <div className="arqu-section-label">
                  <span className="arqu-section-number">01</span>
                  <span className="arqu-section-title">Imágenes SketchUp</span>
                </div>
                <UploadZone images={images} onImagesAdd={handleImagesAdd} onImageRemove={handleImageRemove} />
              </div>

              {/* Prompt panel */}
              <div className="bg-white p-8">
                <MasterPromptEditor value={masterPrompt} onChange={setMasterPrompt} />
              </div>
            </div>

            {/* CTA bar */}
            <div className="mt-0.5 bg-white p-6 flex items-center justify-between border-t border-[#E0DCD3]">
              <div>
                <p className="text-xs font-bold text-[#2A2B2A] uppercase tracking-wider">
                  {images.length === 0
                    ? "Subí al menos una imagen para continuar"
                    : `${images.length} imagen${images.length !== 1 ? "es" : ""} · lista${images.length !== 1 ? "s" : ""} para analizar`}
                </p>
                <p className="arqu-label mt-1">Paso 1 de 3</p>
              </div>
              <button
                onClick={generatePrompts}
                disabled={images.length === 0 || !masterPrompt.trim()}
                className="arqu-btn-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Generar Prompts
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2 — Review Prompts ════════════════════════════════════════ */}
        {step === "prompts" && (
          <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="arqu-label text-[#C85A3C] mb-3">02 — Revisión</p>
                <h1 className="arqu-heading text-4xl sm:text-5xl">
                  Revisar<br />Prompts
                </h1>
              </div>
              {isGeneratingPrompts && (
                <div className="flex items-center gap-3 border border-[#E0DCD3] bg-white px-5 py-3">
                  <svg className="w-4 h-4 text-[#C85A3C] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="arqu-label">{promptProgressCount}/{images.length} listos</span>
                </div>
              )}
            </div>

            {/* Rule */}
            <hr className="arqu-rule" />

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5 bg-[#E0DCD3]">
              {images.map((img, i) => (
                <div key={img.id} className="bg-[#F4F1EA]">
                  <PromptCard item={img} index={i} onPromptChange={handlePromptChange} />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t-2 border-[#2A2B2A]">
              <div className="flex items-center gap-6">
                <button onClick={() => setStep("upload")} className="arqu-label hover:text-[#2A2B2A] transition-colors flex items-center gap-2">
                  ← Volver
                </button>
                {hasErrors && (
                  <span className="arqu-label text-red-500">
                    {images.filter((i) => i.status === "error").length} error{images.filter((i) => i.status === "error").length !== 1 ? "es" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => void generateImages()}
                disabled={isGeneratingPrompts || renderReadyCount === 0}
                className="arqu-btn-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                </svg>
                {isGeneratingPrompts
                  ? `Esperando (${promptProgressCount}/${images.length})`
                  : `Generar Renders — ${renderReadyCount}`}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3 — Results ══════════════════════════════════════════════ */}
        {step === "results" && (
          <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="arqu-label text-[#C85A3C] mb-3">03 — Resultados</p>
                <h1 className="arqu-heading text-4xl sm:text-5xl">
                  Renders<br />Generados
                </h1>
              </div>
              {isGeneratingImages && (
                <div className="flex items-center gap-3 border border-[#E0DCD3] bg-white px-5 py-3">
                  <svg className="w-4 h-4 text-[#C85A3C] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="arqu-label">{imagesGenerated}/{images.length} generados</span>
                </div>
              )}
            </div>

            {/* Stats */}
            {!isGeneratingImages && (
              <div className="grid grid-cols-3 bg-white border border-[#E0DCD3]">
                {[
                  { label: "Total",     value: images.length,                                          color: false },
                  { label: "Generados", value: imagesGenerated,                                        color: true  },
                  { label: "Errores",   value: images.filter((i) => i.status === "error").length,      color: false },
                ].map((s, i) => (
                  <div key={i} className={clsx("px-8 py-5", i !== 2 && "border-r border-[#E0DCD3]")}>
                    <p className={clsx("text-3xl font-black", s.color && "text-[#C85A3C]")}>{s.value}</p>
                    <p className="arqu-label mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <hr className="arqu-rule" />

            {/* Results grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0.5 bg-[#E0DCD3]">
              {images.map((img, i) => (
                <div key={img.id} className="bg-[#F4F1EA]">
                  <ResultCard item={img} index={i} onRetry={handleRetryImage} isRetrying={isGeneratingImages && img.status === "generating-image"} />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t-2 border-[#2A2B2A]">
              <div className="flex items-center gap-6">
                <button onClick={() => setStep("prompts")} className="arqu-label hover:text-[#2A2B2A] transition-colors">
                  ← Editar prompts
                </button>
                {imageRenderErrors > 0 && !isGeneratingImages && (
                  <button onClick={() => void generateImages()} className="arqu-label text-[#C85A3C] hover:text-[#A5452B] transition-colors">
                    Reintentar fallidas ({imageRenderErrors})
                  </button>
                )}
              </div>
              <button onClick={handleReset} className="arqu-btn-secondary">
                Nueva sesión
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E0DCD3] py-5 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <span className="arqu-label">arqu studio · AI for Architecture</span>
          <span className="arqu-label">Las imágenes se procesan de forma segura.</span>
        </div>
      </footer>
    </div>
  );
}
