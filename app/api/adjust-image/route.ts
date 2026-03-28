import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, adjustmentPrompt } = await req.json();

    if (!imageBase64 || !adjustmentPrompt) {
      return NextResponse.json(
        { error: "Se requieren imageBase64 y adjustmentPrompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: adjustmentPrompt },
            { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
      generationConfig: { responseModalities: ["image", "text"] } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    const candidate = result.response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith("image/") // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    if (!imagePart?.inlineData) {
      return NextResponse.json(
        { error: "El modelo no devolvió ninguna imagen. Verificá que el prompt sea válido." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (err) {
    console.error("[adjust-image]", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
