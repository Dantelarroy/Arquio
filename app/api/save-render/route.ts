import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 30;

export interface RenderMeta {
  id: string;
  name: string;
  prompt: string;
  imageUrl: string;
  originalImageUrl: string;
  createdAt: string;
  sessionId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { id, name, prompt, imageBase64, imageMimeType, originalBase64, originalMimeType, sessionId } =
      await req.json();

    if (!imageBase64 || !name) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
    const ext = (imageMimeType || "image/jpeg").split("/")[1] || "jpg";

    // 1. Upload generated render image
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const imageBlob = await put(`renders/${timestamp}_${safeName}.${ext}`, imageBuffer, {
      access: "public",
      contentType: imageMimeType || "image/jpeg",
    });

    // 2. Upload original SketchUp image (for reference in gallery)
    let originalImageUrl = "";
    if (originalBase64) {
      const origExt = (originalMimeType || "image/jpeg").split("/")[1] || "jpg";
      const origBuffer = Buffer.from(originalBase64, "base64");
      const origBlob = await put(
        `originals/${timestamp}_${safeName}_original.${origExt}`,
        origBuffer,
        { access: "public", contentType: originalMimeType || "image/jpeg" }
      );
      originalImageUrl = origBlob.url;
    }

    // 3. Save metadata as JSON (this is what the gallery reads)
    const meta: RenderMeta = {
      id: id || timestamp,
      name,
      prompt,
      imageUrl: imageBlob.url,
      originalImageUrl,
      createdAt: new Date().toISOString(),
      sessionId: sessionId || "default",
    };

    await put(`metadata/${timestamp}_${safeName}.json`, JSON.stringify(meta), {
      access: "public",
      contentType: "application/json",
    });

    return NextResponse.json({ success: true, imageUrl: imageBlob.url, meta });
  } catch (err) {
    console.error("[save-render]", err);
    const message = err instanceof Error ? err.message : "Error al guardar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
