import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import type { RenderMeta } from "../save-render/route";

export const maxDuration = 30;
export const revalidate = 0;

export async function GET() {
  try {
    // List all metadata JSON files
    const { blobs } = await list({ prefix: "metadata/", limit: 500 });

    if (!blobs.length) {
      return NextResponse.json({ renders: [] });
    }

    // Fetch all metadata files in parallel
    const renders = await Promise.all(
      blobs.map(async (blob) => {
        try {
          const res = await fetch(blob.url, { next: { revalidate: 0 } });
          if (!res.ok) return null;
          const meta: RenderMeta = await res.json();
          return meta;
        } catch {
          return null;
        }
      })
    );

    // Filter nulls and sort by date descending (newest first)
    const sorted = renders
      .filter((r): r is RenderMeta => r !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ renders: sorted });
  } catch (err) {
    console.error("[renders]", err);
    const message = err instanceof Error ? err.message : "Error al cargar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
