import type { NextProxy } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export const proxy: NextProxy = (request) => updateSession(request);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
