import { NextResponse, type NextRequest } from "next/server";
import { parsePilotCodes, PILOT_COOKIE } from "@/lib/pilot";

export async function POST(request: NextRequest) {
  const code = String((await request.formData()).get("code") ?? "").trim();
  const codes = parsePilotCodes(process.env.PILOT_CODES);
  if (codes && !codes.has(code)) return NextResponse.redirect(new URL("/access?invalid=1", request.url), 303);

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(PILOT_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  return response;
}
