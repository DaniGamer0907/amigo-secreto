"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getRoomLookupErrorMessage, getSupabaseErrorMessage } from "@/lib/errors";
import { getSessionToken } from "@/lib/session";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";

export default function SalaPage() {
  const router = useRouter();
  const params = useParams();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomLookupLoading, setRoomLookupLoading] = useState(true);
  const [drawLoading, setDrawLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    let isActive = true;
    setRoomLookupLoading(true);
    setError("");

    async function loadRoom() {
      try {
        const { data, error: roomError } = await supabase
          .from("rooms")
          .select("id")
          .eq("code", code)
          .single();

        if (!isActive) return;
        if (roomError || !data?.id) {
          setError(getRoomLookupErrorMessage(roomError));
          setRoomId(null);
          return;
        }
        setRoomId(data.id);
      } catch (roomError) {
        if (!isActive) return;
        setError(getRoomLookupErrorMessage(roomError));
        setRoomId(null);
      } finally {
        if (isActive) setRoomLookupLoading(false);
      }
    }

    void loadRoom();

    return () => {
      isActive = false;
    };
  }, [code]);

  const { participants, room, loading, error: realtimeError } = useRoomRealtime(roomId);

  useEffect(() => {
    if (room?.status === "drawn") {
      router.push(`/reveal/${code}`);
    }
  }, [room?.status, code, router]);

  const isHost = room?.host_id === getSessionToken();
  const canDraw = participants.length >= 2;
  const displayError =
    error || (realtimeError ? getSupabaseErrorMessage(realtimeError, "No se pudo mantener la conexion en tiempo real.") : "");

  const handleDraw = async () => {
    if (!roomId || !canDraw) return;
    setDrawLoading(true);
    try {
      const { error } = await supabase.functions.invoke("draw", {
        body: JSON.stringify({ room_id: roomId }),
      });
      if (error) {
        setError(getSupabaseErrorMessage(error, "No se pudo realizar el sorteo."));
      }
    } catch (drawError) {
      setError(getSupabaseErrorMessage(drawError, "No se pudo realizar el sorteo."));
    } finally {
      setDrawLoading(false);
    }
  };

  if (roomLookupLoading || (roomId && loading)) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-amber-50 to-rose-50">
        <div className="text-stone-500 text-lg font-medium">Conectando con Supabase...</div>
      </main>
    );
  }

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-amber-50 to-rose-50">
        <section className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border border-rose-100 text-center">
          <h1 className="text-2xl font-extrabold text-rose-600 tracking-tight mb-3">
            Sala no disponible
          </h1>
          <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error || "Codigo de sala invalido. Revisa el codigo e intentalo de nuevo."}
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-5 w-full py-3 rounded-xl bg-rose-600 text-white font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition"
          >
            Volver al inicio
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 bg-gradient-to-b from-amber-50 to-rose-50">
      <section className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-rose-100">
        {displayError && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {displayError}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-rose-600 tracking-tight uppercase">
              {code}
            </h1>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mt-0.5">
              {room?.status === "waiting" ? "Esperando participantes" : room?.status}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
            {participants.length} {participants.length === 1 ? "participante" : "participantes"}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          {participants.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-50 border border-stone-100"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-amber-300 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {String(p.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="text-sm font-medium text-stone-700 truncate">{p.name}</div>
            </div>
          ))}
          {participants.length === 0 && (
            <div className="text-sm text-stone-400 text-center py-4">Nadie se ha unido aun</div>
          )}
        </div>

        {isHost && (
          <button
            onClick={handleDraw}
            disabled={!canDraw || drawLoading || room?.status === "drawn"}
            className={`w-full py-3 rounded-xl font-bold shadow-lg transition active:scale-[0.98] ${
              canDraw && !drawLoading
                ? "bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
          >
            {drawLoading ? "Sorteando..." : canDraw ? "Realizar sorteo" : "Necesitas 2 participantes"}
          </button>
        )}
      </section>
    </main>
  );
}
