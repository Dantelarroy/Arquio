import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageBase64, mimeType } = await req.json();

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

    // Build parts: always include the prompt text.
    // If we have the reference SketchUp image, include it for better composition fidelity.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: prompt }];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generationConfig: { responseModalities: ["image", "text"] } as any,
    });

    const candidate = result.response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return NextResponse.json(
        { error: "La API no devolvió ninguna imagen" },
        { status: 500 }
      );
    }

    // Find the image part in the response
    const imagePart = candidate.content.parts.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData) {
      return NextResponse.json(
        {
          error:
            "No se generó imagen. El modelo puede no soportar generación de imágenes con esta API key.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (err) {
    console.error("[generate-images]", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
