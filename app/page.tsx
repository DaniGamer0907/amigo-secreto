"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getRoomLookupErrorMessage, getSupabaseErrorMessage } from "@/lib/errors";
import { generateSessionToken, saveSessionToken } from "@/lib/session";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function checkConnection() {
      try {
        const { error: connectionError } = await supabase
          .from("rooms")
          .select("id")
          .limit(1);

        if (!isActive) return;
        if (connectionError) {
          setError(getSupabaseErrorMessage(connectionError, "No se pudo conectar con Supabase."));
        }
      } catch (connectionError) {
        if (isActive) {
          setError(getSupabaseErrorMessage(connectionError, "No se pudo conectar con Supabase."));
        }
      } finally {
        if (isActive) setConnecting(false);
      }
    }

    void checkConnection();

    return () => {
      isActive = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Ingresa tu nombre.");
      return;
    }
    setLoading(true);

    try {
      const sessionToken = generateSessionToken();
      const roomCode = generateCode();

      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .insert({
          code: roomCode,
          host_id: sessionToken,
          status: "waiting",
        })
        .select("id")
        .single();

      if (roomErr || !roomData) {
        setError(getSupabaseErrorMessage(roomErr, "No se pudo crear la sala."));
        setLoading(false);
        return;
      }

      const { error: partErr } = await supabase.from("participants").insert({
        room_id: roomData.id,
        name: name.trim(),
        session_token: sessionToken,
      });

      if (partErr) {
        setError(getSupabaseErrorMessage(partErr, "No se pudo registrar como participante."));
        setLoading(false);
        return;
      }

      saveSessionToken(sessionToken);
      router.push(`/sala/${roomCode}`);
    } catch (createError) {
      setError(getSupabaseErrorMessage(createError, "Ocurrio un error inesperado."));
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !code.trim()) {
      setError("Completa todos los campos.");
      return;
    }
    setLoading(true);

    try {
      const normalizedCode = code.trim().toUpperCase();
      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("code", normalizedCode)
        .single();

      if (roomErr || !roomData) {
        setError(getRoomLookupErrorMessage(roomErr));
        setLoading(false);
        return;
      }

      if (roomData.status !== "waiting") {
        setError("La sala ya esta en curso o finalizada.");
        setLoading(false);
        return;
      }

      const { data: existingParticipants, error: duplicateCheckErr } = await supabase
        .from("participants")
        .select("id")
        .eq("room_id", roomData.id)
        .ilike("name", name.trim())
        .limit(1);

      if (duplicateCheckErr) {
        setError(getSupabaseErrorMessage(duplicateCheckErr, "No se pudo validar el nombre."));
        setLoading(false);
        return;
      }

      if (existingParticipants && existingParticipants.length > 0) {
        setError("Ese nombre ya esta usado en esta sala. Elige otro.");
        setLoading(false);
        return;
      }

      const sessionToken = generateSessionToken();

      const { error: partErr } = await supabase.from("participants").insert({
        room_id: roomData.id,
        name: name.trim(),
        session_token: sessionToken,
      });

      if (partErr) {
        setError(getSupabaseErrorMessage(partErr, "No se pudo unirte a la sala."));
        setLoading(false);
        return;
      }

      saveSessionToken(sessionToken);
      router.push(`/sala/${normalizedCode}`);
    } catch (joinError) {
      setError(getSupabaseErrorMessage(joinError, "Ocurrio un error inesperado."));
      setLoading(false);
    }
  };

  if (connecting) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-b from-rose-50 to-amber-50">
        <div className="text-stone-500 text-lg font-medium">Conectando con Supabase...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-b from-rose-50 to-amber-50">
      <section className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border border-rose-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-rose-600 tracking-tight mb-1">
            Amigo Secreto
          </h1>
          <p className="text-sm text-stone-500">Sorteo entre amigos</p>
        </div>

        <div className="flex gap-2 mb-6 bg-stone-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode("create"); setError(""); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
              mode === "create"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Crear sala
          </button>
          <button
            type="button"
            onClick={() => { setMode("join"); setError(""); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
              mode === "join"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Unirse a sala
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="space-y-4" aria-label="Crear sala">
            <label htmlFor="create-name" className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Tu nombre
            </label>
            <input
              id="create-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Carlos"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              autoComplete="off"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear sala"}
            </button>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="space-y-4" aria-label="Unirse a sala">
            <label htmlFor="join-name" className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Tu nombre
            </label>
            <input
              id="join-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Ana"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              autoComplete="off"
              maxLength={30}
            />

            <label htmlFor="join-code" className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Codigo de sala
            </label>
            <input
              id="join-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABC123"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition uppercase tracking-widest"
              autoComplete="off"
              maxLength={6}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading ? "Uniendo..." : "Unirme"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
