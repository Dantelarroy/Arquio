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

export const DEFAULT_MASTER_PROMPT = `Analizá esta imagen de SketchUp de un espacio arquitectónico y generá un prompt ultra-detallado para crear una fotografía arquitectónica fotorrealista profesional con inteligencia artificial.

El prompt DEBE incluir con máximo detalle:

CÁMARA Y COMPOSICIÓN:
- Altura exacta de la cámara (ojo de pez, nivel ojo, picada, contrapicada)
- Dirección de la vista (desde qué rincón, hacia qué punto focal)
- Qué elementos están en primer plano, plano medio y fondo
- Tipo de lente percibida (gran angular, normal, teleobjetivo)

MATERIALES Y TEXTURAS (específicos, no genéricos):
- Cada superficie visible: tipo de material, color exacto, acabado (mate/satinado/brillante), escala de textura
- Ejemplo: "honed white Carrara marble floor tiles 60x60cm with fine grey veining", no solo "piso de mármol"

ILUMINACIÓN:
- Fuentes de luz naturales: posición del sol, hora del día aproximada, tipo de cielo
- Fuentes artificiales: tipo de luminaria, temperatura de color (Kelvin), sombras proyectadas
- Atmósfera lumínica general

ESPACIO Y ARQUITECTURA:
- Dimensiones percibidas del espacio (amplio/íntimo, techos altos/bajos)
- Elementos arquitectónicos clave (vigas, columnas, aberturas, doble altura)
- Mobiliario presente: estilo, materiales, posición

ESTILO Y ATMÓSFERA:
- Estilo arquitectónico e interiorismo
- Sensación emocional del espacio

Cerrá siempre con: "professional architectural photography, shot on Phase One IQ4, 16mm tilt-shift lens, f/8, natural light, ultra-sharp, 8K resolution, no 3D rendering artifacts, photorealistic"

Respondé ÚNICAMENTE con el prompt en inglés, sin explicaciones. El prompt debe comenzar con "Professional architectural photograph of..."`;
