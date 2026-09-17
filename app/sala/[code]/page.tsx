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
    supabase.from("rooms").select("id").eq("code", code).single().then(({ data }) => {
      if (data?.id) setRoomId(data.id);
    });
  }, [code]);

  const { participants, room, loading } = useRoomRealtime(roomId);

  useEffect(() => {
    if (room?.status === "drawn") router.push(`/reveal/${code}`);
  }, [room?.status, code, router]);

  const isHost = room?.host_id === getSessionToken();
  const canDraw = participants.length >= 2;

  const handleDraw = async () => {
    if (!roomId || !canDraw || drawLoading) return;
    setDrawLoading(true);
    try {
      await supabase.functions.invoke("draw", { body: JSON.stringify({ room_id: roomId }) });
    } catch (e) { console.error(e); }
    setDrawLoading(false);
  };

  const stampColors = ["#C1392B", "#E8A33D", "#7FB6A8", "#93291E"];

  if (loading || !roomId) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center px-6 grain">
        <div className="text-paper/70 text-lg font-work-sans">Conectando con Supabase...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-5 py-12 relative overflow-x-hidden grain">
      <div className="w-full max-w-[430px]">
        <div className="bg-paper rounded-[18px] shadow-2xl overflow-hidden flex min-h-[420px]">
          {/* Stub */}
          <div className="w-16 flex-shrink-0 bg-cranberry relative flex items-center justify-center" style={{ backgroundImage: "repeating-linear-gradient(-55deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 10px)" }}>
            <div className="font-space-mono text-[12.5px] tracking-[0.28em] text-paper whitespace-nowrap flex items-center gap-2.5 rotate-180">
              <span className="w-1.5 h-1.5 rounded-full bg-marigold flex-shrink-0" />
              AMIGO SECRETO
              <span className="w-1.5 h-1.5 rounded-full bg-marigold flex-shrink-0" />
            </div>
          </div>
          {/* Perforation */}
          <div className="relative w-0 border-l-2 border-dashed border-[rgba(42,32,20,0.28)]">
            <span className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-ink" />
            <span className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-ink" />
          </div>
          {/* Body */}
          <div className="flex-1 p-7 flex flex-col min-w-0">
            <div className="flex items-baseline justify-between mb-4">
              <h1 className="font-space-mono text-[28px] font-bold tracking-[0.1em] text-text-ink leading-none">{code}</h1>
              <span className="font-space-mono text-[11px] text-text-soft">Sala activa</span>
            </div>

            <p className="text-[13.5px] text-text-soft mb-5">
              {room?.status === "waiting"
                ? `Esperando a que se unan más amigos — se necesitan <strong>2</strong> como mínimo.`
                : "El sorteo ya se realizó."}
            </p>

            <ul className="flex-1 space-y-2 mb-5 min-h-[140px]">
              {participants.map((p: any, i: number) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/35 border border-paper-line/60">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center font-space-mono text-[11px] font-bold text-paper shrink-0 shadow-sm" style={{ backgroundColor: stampColors[i % stampColors.length] }}>
                    {String(p.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="font-work-sans text-[14px] font-medium text-text-ink truncate">{p.name}</span>
                  {isHost && p.id === getSessionToken() ? <span className="ml-auto font-space-mono text-[10px] text-marigold-dark tracking-widest">ANFITRIÓN</span> : null}
                </li>
              ))}
              {participants.length === 0 && (
                <li className="text-sm text-text-soft/70 py-4 text-center">Nadie se ha unido aún</li>
              )}
            </ul>

            {isHost && (
              <button
                onClick={handleDraw}
                disabled={!canDraw || drawLoading || room?.status === "drawn"}
                className={`w-full py-3.5 rounded-xl font-work-sans font-semibold shadow-lg transition active:scale-[0.98] text-[15px] ${
                  canDraw && !drawLoading
                    ? "bg-cranberry text-paper shadow-cranberry/25 hover:bg-cranberry-dark"
                    : "bg-paper-shade/60 text-text-soft/40 cursor-not-allowed"
                }`}
              >
                {drawLoading ? "Sorteando..." : canDraw ? "Realizar sorteo" : "Necesitas 2 participantes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
