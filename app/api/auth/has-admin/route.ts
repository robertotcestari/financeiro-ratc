import { auth } from "@/lib/core/auth/auth";
import { ADMIN_PERMISSION } from "@/lib/core/auth/permissions";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const has = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        userId: session.session.userId,
        permissions: ADMIN_PERMISSION,
      },
    });
    if (!has) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

