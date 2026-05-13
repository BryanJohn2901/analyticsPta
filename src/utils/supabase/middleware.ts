import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Evita que o proxy fique à espera indefinida se o Auth do Supabase não responder (DNS, rede, incidente). */
const AUTH_MIDDLEWARE_MS = Math.min(
  Math.max(Number(process.env.SUPABASE_AUTH_MIDDLEWARE_TIMEOUT_MS ?? 5000), 1000),
  30_000,
);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("supabase auth middleware timeout")), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}

export const updateSession = async (request: NextRequest) => {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    await withTimeout(supabase.auth.getUser(), AUTH_MIDDLEWARE_MS);
  } catch {
    // Continua sem bloquear a página; o cliente ainda pode restaurar sessão (ex.: localStorage).
  }

  return supabaseResponse;
};
