import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Called after login/register — stores refresh_token as httpOnly cookie
export async function POST(req: NextRequest) {
  const { refresh_token, access_token } = await req.json();

  const cookieStore = await cookies();
  cookieStore.set("refresh_token", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return NextResponse.json({ access_token });
}

// Called on logout — clears httpOnly cookie
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("refresh_token");
  return NextResponse.json({ ok: true });
}
