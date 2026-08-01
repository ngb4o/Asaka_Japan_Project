import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/reports",
  "/leads",
  "/dealers",
  "/orders",
  "/receivables",
  "/product-categories",
  "/products",
  "/warehouses",
  "/inventory",
  "/news",
  "/users",
  "/employees",
  "/trips",
  "/payroll",
  "/settings",
  "/quotes",
];
const AUTH_PAGES = ["/login"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("crm_token")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/register")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/reports/:path*",
    "/leads/:path*",
    "/dealers/:path*",
    "/orders/:path*",
    "/receivables/:path*",
    "/product-categories/:path*",
    "/products/:path*",
    "/warehouses/:path*",
    "/inventory/:path*",
    "/news/:path*",
    "/users/:path*",
    "/employees/:path*",
    "/trips/:path*",
    "/payroll/:path*",
    "/settings/:path*",
    "/quotes/:path*",
    "/login",
    "/register",
  ],
};
