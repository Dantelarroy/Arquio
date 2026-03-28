import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, isEmailAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Credenciales requeridas" }, { status: 400 });
  }

  const correctPassword = process.env.AUTH_PASSWORD?.trim();
  if (!correctPassword) {
    return NextResponse.json({ error: "Auth no configurada" }, { status: 500 });
  }

  if (!isEmailAllowed(email)) {
    return NextResponse.json({ error: "Email no autorizado" }, { status: 403 });
  }

  if (password.trim() !== correctPassword) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const token = await createSessionToken(email.trim().toLowerCase());

  const res = NextResponse.json({ ok: true });
  res.cookies.set("arqu_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return res;
}
