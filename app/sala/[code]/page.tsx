"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSessionToken } from "@/lib/session";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";

export default function SalaPage() {
  const router = useRouter();
  const params = useParams();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  const [roomId, setRoomId] = useState<string | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);

  useEffect(() => {
    if (!code) return;
    supabase
      .from("rooms")
      .select("id")
      .eq("code", code)
      .single()
      .then(({ data }) => {
        if (data?.id) setRoomId(data.id);
      });
  }, [code]);

  const { participants, room, loading } = useRoomRealtime(roomId);

  useEffect(() => {
    if (room?.status === "drawn") {
      router.push(`/reveal/${code}`);
    }
  }, [room?.status, code, router]);

  const isHost = room?.host_id === getSessionToken();
  const canDraw = participants.length >= 2;

  const handleDraw = async () => {
    if (!roomId || !canDraw) return;
    setDrawLoading(true);
    try {
      const { error } = await supabase.functions.invoke("draw", {
        body: JSON.stringify({ room_id: roomId }),
      });
      if (error) {
        console.error(error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDrawLoading(false);
    }
  };

  if (loading || !roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-amber-50 to-rose-50">
        <div className="text-stone-500 text-lg font-medium">Cargando sala...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 bg-gradient-to-b from-amber-50 to-rose-50">
      <section className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-rose-100">
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
            <div className="text-sm text-stone-400 text-center py-4">Nadie se ha unido aún</div>
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
