import { NextResponse, type NextRequest } from "next/server";
import { parsePilotCodes, PILOT_COOKIE } from "@/lib/pilot";

const OPEN_PATHS = new Set(["/access", "/api/access"]);
const DEPLOYED = new Set(["preview", "production"]);

export function proxy(request: NextRequest) {
  const codes = parsePilotCodes(process.env.PILOT_CODES);
  // Deployments fail closed; only local runs (including pulled `VERCEL_ENV=development`) are open without codes.
  if (!codes) return DEPLOYED.has(process.env.VERCEL_ENV ?? "") ? new NextResponse("Pilot access is not configured.", { status: 503 }) : NextResponse.next();
  if (OPEN_PATHS.has(request.nextUrl.pathname) || codes.has(request.cookies.get(PILOT_COOKIE)?.value ?? "")) return NextResponse.next();
  return NextResponse.redirect(new URL("/access", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
