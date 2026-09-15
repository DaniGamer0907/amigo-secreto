import type { PostgrestError } from "@supabase/supabase-js";

type SupabaseLikeError = Partial<PostgrestError> & {
  status?: number;
  code?: string;
  message?: string;
};

export function isConnectionError(error: unknown): boolean {
  if (!error) return false;
  const message = String((error as SupabaseLikeError).message ?? error).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("load failed")
  );
}

export function getSupabaseErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la accion. Intentalo de nuevo.",
): string {
  if (!error) return fallback;

  const supabaseError = error as SupabaseLikeError;
  const message = String(supabaseError.message ?? "").toLowerCase();

  if (supabaseError.status === 401 || message.includes("invalid api key") || message.includes("jwt")) {
    return "Supabase rechazo la conexion. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  if (supabaseError.code === "23505") {
    return "Ese nombre ya esta usado en esta sala. Elige otro.";
  }

  if (supabaseError.code === "42501" || message.includes("row-level security")) {
    return "Supabase bloqueo la accion por politicas RLS. Revisa el schema.sql y vuelve a aplicar las politicas.";
  }

  if (isConnectionError(error)) {
    return "No se pudo conectar con Supabase. Revisa tu conexion e intentalo otra vez.";
  }

  return fallback;
}

export function getRoomLookupErrorMessage(error: unknown): string {
  if (!error) return "Codigo de sala invalido. Revisa el codigo e intentalo de nuevo.";
  if (isConnectionError(error)) {
    return "No se pudo conectar con Supabase. Revisa tu conexion e intentalo otra vez.";
  }

  const supabaseError = error as SupabaseLikeError;
  if (supabaseError.status === 401) {
    return "Supabase rechazo la conexion. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  return "Codigo de sala invalido. Revisa el codigo e intentalo de nuevo.";
}
