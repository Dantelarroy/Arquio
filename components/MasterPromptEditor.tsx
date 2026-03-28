"use client";

interface MasterPromptEditorProps {
  value: string;
  onChange: (v: string) => void;
}

export function MasterPromptEditor({ value, onChange }: MasterPromptEditorProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Section header — arqu style */}
      <div className="arqu-section-label">
        <span className="arqu-section-number">02</span>
        <span className="arqu-section-title">Prompt Maestro</span>
        <button
          onClick={() => onChange(DEFAULT_MASTER_PROMPT)}
          className="ml-auto arqu-label text-[#C85A3C] hover:text-[#A5452B] transition-colors"
        >
          Restaurar
        </button>
      </div>

      <p className="text-xs text-[#6B6C6B] -mt-2 leading-relaxed">
        Gemini analizará cada imagen con este prompt y generará el prompt final de renderizado.
      </p>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        className="arqu-textarea flex-1"
        placeholder="Escribí el prompt maestro..."
        spellCheck={false}
      />

      <div className="flex items-center justify-between">
        <span className="arqu-label">{value.length} caracteres</span>
      </div>
    </div>
  );
}

export const DEFAULT_MASTER_PROMPT = `Analizá esta imagen de SketchUp de un espacio interior y generá un prompt detallado para crear una versión fotorrealista con inteligencia artificial.

El prompt debe incluir:
- Descripción exacta de materiales y texturas visibles (madera, concreto, vidrio, mármol, cerámica, metal, etc.)
- Paleta de colores exacta y tonalidades
- Tipo y dirección de iluminación (natural/artificial, cálida/fría, hora del día)
- Composición y perspectiva del espacio tal como aparece en la imagen
- Estilo arquitectónico e interiorismo detectado
- Elementos decorativos y mobiliario presentes
- Calidad fotográfica: "architectural photography, 8K, photorealistic, depth of field"

Respondé ÚNICAMENTE con el prompt en inglés, listo para usar directamente en generación de imágenes. Sin explicaciones adicionales. El prompt debe comenzar con "Photorealistic architectural interior render of..."`;
