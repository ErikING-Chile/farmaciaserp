import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const { token } = req.nextauth

    // Check if user has tenant access
    if (!token?.tenantId) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Role-based access control
    const role = token.role as string
    
    // Protect admin routes
    if (pathname.startsWith("/settings") && role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect warehouse routes
    if (pathname.startsWith("/purchases/receive") && !["ADMIN", "MANAGER", "WAREHOUSE"].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect POS routes
    if (pathname.startsWith("/pos") && !["ADMIN", "MANAGER", "SELLER"].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        if (!token) return false
        return true
      },
    },
  }
)

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
    "/api/((?!auth).)*", // Protect all API routes except auth
  ],
}