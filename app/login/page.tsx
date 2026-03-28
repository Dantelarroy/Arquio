"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArquLogo } from "@/components/ArquLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] flex flex-col">
      {/* Top border accent */}
      <div className="h-0.5 bg-[#C85A3C]" />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="mb-12 flex justify-center">
            <ArquLogo height={36} linked={false} />
          </div>

          {/* Heading */}
          <div className="mb-8 border-t-2 border-[#2A2B2A] pt-4">
            <p className="arqu-label text-[#C85A3C] mb-1">Acceso</p>
            <h1 className="arqu-heading text-4xl">Render AI</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="arqu-label block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="arqu-textarea w-full"
                style={{ fontFamily: "inherit", fontSize: "13px", letterSpacing: "normal", textTransform: "none" }}
              />
            </div>

            <div className="space-y-1">
              <label className="arqu-label block mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••••••••"
                className="arqu-textarea w-full"
                style={{ fontFamily: "inherit", fontSize: "13px", letterSpacing: "normal" }}
              />
            </div>

            {error && (
              <p className="arqu-label text-red-500 border border-red-200 bg-red-50 px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="arqu-btn-primary w-full justify-center mt-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Ingresando...
                </>
              ) : "Ingresar"}
            </button>
          </form>

          <p className="arqu-label text-center mt-10 text-[#C0BCB5]">
            arqu studio · AI for Architecture
          </p>
        </div>
      </div>
    </div>
  );
}
