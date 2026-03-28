"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArquLogo } from "@/components/ArquLogo";
import type { RenderMeta } from "../api/save-render/route";

type Filter = "all" | "today" | "week";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupByDate(renders: RenderMeta[]) {
  const groups: Record<string, RenderMeta[]> = {};
  renders.forEach((r) => {
    const day = new Date(r.createdAt).toLocaleDateString("es-AR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(r);
  });
  return groups;
}

export default function GaleriaPage() {
  const [renders, setRenders] = useState<RenderMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<RenderMeta | null>(null);

  useEffect(() => {
    fetch("/api/renders")
      .then((r) => r.json())
      .then((data) => { if (data.error) setError(data.error); else setRenders(data.renders || []); })
      .catch(() => setError("Error al cargar los renders"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = renders.filter((r) => {
    if (filter === "all") return true;
    const t = new Date(r.createdAt).getTime();
    const now = Date.now();
    if (filter === "today") return new Date(r.createdAt).toDateString() === new Date().toDateString();
    if (filter === "week") return now - t < 7 * 24 * 60 * 60 * 1000;
    return true;
  });

  const groups = groupByDate(filtered);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EA]">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F4F1EA]/95 backdrop-blur-sm border-b border-[#E0DCD3]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ArquLogo height={34} />
            <span className="text-[#E0DCD3]">/</span>
            <span className="arqu-label">Galería</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/ajustes" className="arqu-label hover:text-[#2A2B2A] transition-colors">Ajustes</Link>
            <Link href="/" className="arqu-btn-primary !py-2 !px-4 !text-[10px]">
              + Nuevo render
            </Link>
            <button
              onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
              className="arqu-label hover:text-red-400 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 space-y-10">

        {/* Title + filters */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="arqu-label text-[#C85A3C] mb-3">Archivo</p>
            <h1 className="arqu-heading text-5xl sm:text-6xl">
              Renders<br />Guardados
            </h1>
            <p className="arqu-label mt-3">
              {loading ? "Cargando..." : `${renders.length} render${renders.length !== 1 ? "s" : ""} en total`}
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-stretch border border-[#E0DCD3] bg-white shrink-0">
            {(["all", "today", "week"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "arqu-label px-4 py-3 transition-all border-r border-[#E0DCD3] last:border-r-0",
                  filter === f ? "bg-[#2A2B2A] text-white" : "hover:bg-[#F4F1EA]"
                )}
              >
                {f === "all" ? "Todos" : f === "today" ? "Hoy" : "Semana"}
              </button>
            ))}
          </div>
        </div>

        <hr className="arqu-rule-strong" />

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5 bg-[#E0DCD3]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#F4F1EA]">
                <div className="aspect-[4/3] skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-2 skeleton w-1/3" />
                  <div className="h-2 skeleton w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-200 bg-white p-8">
            <p className="arqu-label text-red-500 mb-1">Error</p>
            <p className="text-sm text-[#2A2B2A]">{error}</p>
            <p className="arqu-label mt-2">Verificá que BLOB_READ_WRITE_TOKEN esté configurado</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-24 text-center space-y-4">
            <p className="arqu-heading text-6xl text-[#E0DCD3]">∅</p>
            <p className="text-sm font-bold text-[#2A2B2A] uppercase tracking-wider">
              {filter !== "all" ? "Sin resultados en este período" : "Aún no hay renders guardados"}
            </p>
            <Link href="/" className="arqu-label text-[#C85A3C] hover:text-[#A5452B] transition-colors">
              Ir a generar →
            </Link>
          </div>
        )}

        {/* Gallery */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-12">
            {Object.entries(groups).map(([day, items]) => (
              <div key={day}>
                <div className="flex items-baseline gap-4 mb-4 pb-2 border-b border-[#E0DCD3]">
                  <span className="arqu-label capitalize">{day}</span>
                  <span className="arqu-label text-[#C85A3C]">{items.length} render{items.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5 bg-[#E0DCD3]">
                  {items.map((render) => (
                    <RenderCard key={render.id} render={render} onClick={() => setSelected(render)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-[#E0DCD3] py-5 mt-12">
        <div className="max-w-7xl mx-auto px-6">
          <span className="arqu-label">arqu studio · AI for Architecture</span>
        </div>
      </footer>

      {selected && <Lightbox render={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function RenderCard({ render, onClick }: { render: RenderMeta; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white text-left w-full transition-all hover:brightness-95"
    >
      <div className="grid grid-cols-2 gap-0.5 bg-[#E0DCD3]">
        {render.originalImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={render.originalImageUrl} alt="SketchUp" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="aspect-[4/3] bg-[#F4F1EA]" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={render.imageUrl} alt="Render" className="aspect-[4/3] w-full object-cover" />
      </div>
      <div className="p-4 border-t border-[#E0DCD3]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold text-[#2A2B2A] uppercase tracking-wide truncate">{render.name}</span>
          <span className="arqu-label shrink-0">{formatDate(render.createdAt)}</span>
        </div>
        <p className="text-[10px] text-[#6B6C6B] font-mono line-clamp-2 leading-relaxed">{render.prompt}</p>
      </div>
    </button>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ render, onClose }: { render: RenderMeta; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#2A2B2A]/90 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#F4F1EA] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DCD3] bg-white">
          <div>
            <p className="text-sm font-bold text-[#2A2B2A] uppercase tracking-wide">{render.name}</p>
            <p className="arqu-label mt-0.5">{formatDate(render.createdAt)}</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={render.imageUrl}
              download
              className="arqu-label text-[#C85A3C] hover:text-[#A5452B] transition-colors"
            >
              ↓ Descargar
            </a>
            <button onClick={onClose} className="arqu-label hover:text-[#2A2B2A] transition-colors">
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Images */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 bg-[#E0DCD3]">
            {render.originalImageUrl && (
              <div className="relative bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={render.originalImageUrl} alt="SketchUp" className="w-full object-contain max-h-[55vh]" />
                <span className="absolute top-0 left-0 arqu-label bg-[#2A2B2A] text-white px-3 py-1.5">SketchUp</span>
              </div>
            )}
            <div className="relative bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={render.imageUrl} alt="Render final" className="w-full object-contain max-h-[55vh]" />
              <span className="absolute top-0 left-0 arqu-label bg-[#C85A3C] text-white px-3 py-1.5">Render Final</span>
            </div>
          </div>

          {/* Prompt */}
          <div className="p-6 bg-white border-t border-[#E0DCD3]">
            <p className="arqu-label text-[#C85A3C] mb-3">Prompt usado</p>
            <p className="text-sm text-[#2A2B2A] font-mono leading-relaxed">{render.prompt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
