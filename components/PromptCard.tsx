"use client";

import clsx from "clsx";
import type { ImageItem } from "@/types";

interface PromptCardProps {
  item: ImageItem;
  index: number;
  onPromptChange: (id: string, prompt: string) => void;
}

export function PromptCard({ item, index, onPromptChange }: PromptCardProps) {
  const isLoading  = item.status === "generating-prompt";
  const hasPrompt  = ["prompt-ready", "generating-image", "done"].includes(item.status);
  const hasError   = item.status === "error";

  return (
    <div className={clsx(
      "arqu-card flex flex-col transition-all duration-300",
      isLoading && "border-[#C85A3C]/40",
    )}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E0DCD3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#2A2B2A]/70 flex flex-col items-center justify-center gap-2">
            <svg className="w-5 h-5 text-[#C85A3C] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="arqu-label text-white/70">Analizando...</span>
          </div>
        )}

        {/* Status chips */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="arqu-label bg-[#2A2B2A]/70 text-white px-2 py-0.5">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        {hasPrompt && (
          <span className="absolute top-2.5 right-2.5 arqu-label bg-[#C85A3C] text-white px-2 py-0.5">
            OK
          </span>
        )}
        {hasError && (
          <span className="absolute top-2.5 right-2.5 arqu-label bg-red-500 text-white px-2 py-0.5">
            ERR
          </span>
        )}
      </div>

      {/* Prompt area */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <span className="arqu-label">{item.name}</span>
          {item.editedPrompt && item.editedPrompt !== item.prompt && (
            <span className="arqu-label text-[#C85A3C]">editado</span>
          )}
        </div>

        {hasError && item.error ? (
          <p className="text-[11px] text-red-500 bg-red-50 p-3 border border-red-100">{item.error}</p>
        ) : (
          <textarea
            value={item.editedPrompt || item.prompt}
            onChange={(e) => onPromptChange(item.id, e.target.value)}
            disabled={isLoading || !hasPrompt}
            rows={5}
            className="arqu-textarea flex-1"
            placeholder={isLoading ? "Analizando imagen..." : "El prompt aparecerá aquí..."}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
