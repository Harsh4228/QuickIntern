import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// NOTE: In Next.js 16+ the file should be at src/proxy.ts
// However next-auth still uses middleware.ts pattern.
// This file stays as middleware.ts for next-auth compatibility.

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/manager") && token?.role !== "MANAGER") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/intern") && token?.role !== "INTERN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/intern/:path*"],
};
