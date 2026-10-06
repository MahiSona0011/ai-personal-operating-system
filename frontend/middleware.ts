import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith("/onboarding");

  const hasSession = request.cookies.has("refresh_token");
  const onboardingState = request.cookies.get("onboarding_state")?.value;

  if (!isPublic && !isOnboarding && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Gate authenticated users with pending onboarding away from dashboard
  if (hasSession && onboardingState === "pending" && !isOnboarding && !isPublic) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Prevent completed users from revisiting onboarding
  if (hasSession && onboardingState === "complete" && isOnboarding) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|apple-touch-icon.png|manifest.webmanifest|opengraph-image.png).*)",
  ],
};
