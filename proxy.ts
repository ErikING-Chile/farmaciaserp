import { NextResponse } from "next/server";
import { auth } from "./auth"; // si tu auth.ts está en la raíz. Si está en /src, ajusta a "@/auth"

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const session = req.auth; // <- en v5, aquí viene la sesión/token
  if (!session) {
    // Para APIs mejor devolver 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const tenantId = session.user?.tenantId;
  const role = session.user?.role;

  if (!tenantId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Missing tenant" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Protect admin routes
  if (pathname.startsWith("/settings") && !["ADMIN", "MANAGER"].includes(role ?? "")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect warehouse routes
  if (pathname.startsWith("/purchases/receive") && !["ADMIN", "MANAGER", "WAREHOUSE"].includes(role ?? "")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect POS routes
  if (pathname.startsWith("/pos") && !["ADMIN", "MANAGER", "SELLER"].includes(role ?? "")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/suppliers/:path*",
    "/purchases/:path*",
    "/inventory/:path*",
    "/pos/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/api/((?!auth).)*",
  ],
};
