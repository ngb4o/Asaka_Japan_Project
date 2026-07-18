import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/product-categories",
  "/products",
  "/warehouses",
  "/inventory",
  "/news",
];
const AUTH_PAGES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("crm_token")?.value;
  const { pathname } = request.nextUrl;

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
    "/product-categories/:path*",
    "/products/:path*",
    "/warehouses/:path*",
    "/inventory/:path*",
    "/news/:path*",
    "/login",
    "/register",
  ],
};
