import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 120;

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 2000
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const msg = (err instanceof Error ? err.message : "").toLowerCase();
      const retryable =
        msg.includes("429") ||
        msg.includes("quota") ||
        msg.includes("503") ||
        msg.includes("overloaded") ||
        msg.includes("resource exhausted");
      if (!retryable) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

function buildFriendlyGeminiError(message: string, model: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("permission") ||
    normalized.includes("not allowed") ||
    normalized.includes("does not have access") ||
    normalized.includes("access denied")
  ) {
    return `La API key no tiene acceso a generar imágenes con el modelo ${model}. Revisá permisos y habilitación del modelo en Gemini.`;
  }

  if (
    normalized.includes("api key not valid") ||
    normalized.includes("invalid api key") ||
    normalized.includes("api_key_invalid")
  ) {
    return "La GEMINI_API_KEY configurada no es válida.";
  }

  if (
    normalized.includes("model not found") ||
    normalized.includes("unsupported model") ||
    normalized.includes("not found for api version")
  ) {
    return `El modelo ${model} no está disponible para esta API key o para la versión actual de la API.`;
  }

  return message;
}

function extractTextParts(parts: unknown[]) {
  return parts
    .flatMap((part) =>
      typeof part === "object" && part !== null && "text" in part
        ? [String((part as { text?: string }).text || "").trim()]
        : []
    )
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageBase64, mimeType, aspectRatio } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Se requiere el prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

    const model = genAI.getGenerativeModel({ model: imageModel });

    // Prepend aspect ratio instruction so Gemini generates at the correct dimensions.
    const ratioInstruction = aspectRatio
      ? `Generate this image in ${aspectRatio} aspect ratio (${aspectRatio === "9:16" || aspectRatio === "3:4" ? "portrait" : aspectRatio === "16:9" || aspectRatio === "4:3" ? "landscape" : "square"} orientation). `
      : "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: ratioInstruction + prompt }];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      });
    }

    const result = await withRetry(() =>
      model.generateContent({
        contents: [{ role: "user", parts }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generationConfig: { responseModalities: ["image", "text"] } as any,
      })
    );

    const candidate = result.response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return NextResponse.json(
        {
          error:
            "Gemini no devolvió contenido para esta imagen. Revisá que la API key tenga acceso a generación de imágenes.",
          code: "NO_CANDIDATE",
        },
        { status: 502 }
      );
    }

    // Find the image part in the response
    const imagePart = candidate.content.parts.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData) {
      const modelText = extractTextParts(candidate.content.parts);
      const finishReason = typeof candidate.finishReason === "string"
        ? candidate.finishReason
        : undefined;

      const message = [
        `Gemini respondió sin imagen usando ${imageModel}.`,
        "La API key puede no tener acceso a generación de imágenes o el modelo puede haber devuelto solo texto.",
        modelText ? `Respuesta del modelo: ${modelText.slice(0, 240)}` : undefined,
        finishReason ? `finishReason: ${finishReason}` : undefined,
      ]
        .filter(Boolean)
        .join(" ");

      return NextResponse.json(
        {
          error: message,
          code: "NO_IMAGE_OUTPUT",
          finishReason,
          textResponse: modelText || undefined,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (err) {
    console.error("[generate-images]", err);
    const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const rawMessage = err instanceof Error ? err.message : "Error desconocido";
    const message = buildFriendlyGeminiError(rawMessage, imageModel);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
