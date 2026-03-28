import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, masterPrompt } = await req.json();

    if (!imageBase64 || !masterPrompt) {
      return NextResponse.json(
        { error: "Se requieren imageBase64 y masterPrompt" },
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
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash-lite",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: masterPrompt },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });

    const prompt = result.response.text().trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "Gemini no generó ningún prompt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt });
  } catch (err) {
    console.error("[generate-prompts]", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
