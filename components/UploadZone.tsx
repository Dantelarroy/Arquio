"use client";

import { useCallback, useState, useRef } from "react";
import clsx from "clsx";
import { generateId, compressImage } from "@/lib/imageUtils";
import type { ImageItem } from "@/types";

interface UploadZoneProps {
  images: ImageItem[];
  onImagesAdd: (items: ImageItem[]) => void;
  onImageRemove: (id: string) => void;
}

export function UploadZone({ images, onImagesAdd, onImageRemove }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    setIsProcessing(true);
    const newItems: ImageItem[] = await Promise.all(
      arr.map(async (file) => {
        const { base64, mimeType } = await compressImage(file);
        return {
          id: generateId(),
          file,
          previewUrl: `data:${mimeType};base64,${base64}`,
          name: file.name.replace(/\.[^.]+$/, ""),
          prompt: "",
          editedPrompt: "",
          status: "idle" as const,
        };
      })
    );
    setIsProcessing(false);
    onImagesAdd(newItems);
  }, [onImagesAdd]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "relative cursor-pointer transition-all duration-200 group",
          "border-2 border-dashed p-12",
          isDragging
            ? "border-[#C85A3C] bg-[#C85A3C]/4"
            : "border-[#E0DCD3] hover:border-[#C85A3C]/50 hover:bg-white/60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />

        {/* Corner marks — architectural */}
        {(["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((pos, i) => (
          <span
            key={i}
            className={clsx(
              "absolute w-3 h-3 border-[#C85A3C] transition-opacity duration-200",
              pos,
              i === 0 && "border-t-2 border-l-2",
              i === 1 && "border-t-2 border-r-2",
              i === 2 && "border-b-2 border-l-2",
              i === 3 && "border-b-2 border-r-2",
              isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-60"
            )}
          />
        ))}

        <div className="flex flex-col items-center gap-4 text-center">
          {/* Icon */}
          <div className={clsx(
            "w-12 h-12 border flex items-center justify-center transition-all",
            isDragging ? "border-[#C85A3C] bg-[#C85A3C]/10" : "border-[#E0DCD3] group-hover:border-[#C85A3C]/40"
          )}>
            {isProcessing ? (
              <svg className="w-5 h-5 text-[#C85A3C] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[#6B6C6B] group-hover:text-[#C85A3C] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-[#2A2B2A] tracking-wide uppercase">
              {isProcessing ? "Procesando..." : "Arrastrá las imágenes acá"}
            </p>
            <p className="arqu-label mt-1.5">
              click para seleccionar · PNG · JPG · WEBP
            </p>
          </div>
        </div>
      </div>

      {/* Thumbnails grid */}
      {images.length > 0 && (
        <div>
          <p className="arqu-label mb-3">
            {images.length} imagen{images.length !== 1 ? "es" : ""} cargada{images.length !== 1 ? "s" : ""}
          </p>
          {/* 2px gap grid — arqu style */}
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-0.5">
            {images.map((img) => (
              <div key={img.id} className="relative group aspect-square overflow-hidden bg-[#E0DCD3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onImageRemove(img.id); }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 bg-white flex items-center justify-center transition-opacity"
                  >
                    <svg className="w-3 h-3 text-[#2A2B2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
