"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSessionToken } from "@/lib/session";
import RevealCard from "@/components/RevealCard";

export default function RevealPage() {
  const router = useRouter();
  const params = useParams();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  const [roomId, setRoomId] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!code) return;
    let isActive = true; setLoading(true); setError("");
    (async () => {
      try {
        const { data: roomData, error: roomErr } = await supabase.from("rooms").select("id, status").eq("code", code).single();
        if (!isActive) return;
        if (roomErr || !roomData) { setError("Sala no encontrada."); setLoading(false); return; }
        if (roomData.status !== "drawn") { window.location.href = `/sala/${code}`; return; }
        setRoomId(roomData.id);
        const sessionToken = getSessionToken();
        if (!sessionToken) { setError("No encontramos tu sesión."); setLoading(false); return; }
        const { data, error } = await supabase.rpc("get_reveal_assignment", { p_token: sessionToken, p_room_id: roomData.id });
        if (!isActive) return;
        if (error || !data || (Array.isArray(data) && data.length === 0)) { setError("No encontramos tu asignación."); setLoading(false); return; }
        const row = Array.isArray(data) ? data[0] : data;
        if (row) { setAssignmentId(row.id); setRevealed(row.revealed ?? false); setReceiverName(row.receiver_name ?? ""); }
      } catch (e) { if (isActive) setError("Error al conectar con Supabase."); }
      finally { if (isActive) setLoading(false); }
    })();
    return () => { isActive = false; };
  }, [code]);

  const handleReveal = async () => {
    if (!assignmentId || revealed) return;
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) { setError("Sesión perdida. Vuelve a unirte."); return; }
      const { error: revealError } = await supabase.rpc("mark_assignment_revealed", { p_assignment_id: assignmentId, p_token: sessionToken });
      if (revealError) { setError(String((revealError as any)?.message ?? revealError)); return; }
      setRevealed(true);
    } catch (e) { setError("No se pudo guardar la revelación."); }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center px-6 grain">
        <div className="text-paper/70 text-lg font-work-sans">Conectando con Supabase...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-6 py-12 relative overflow-x-hidden grain">
      <div className="w-full max-w-[430px] relative z-10">
        <div className="bg-paper rounded-[18px] shadow-2xl overflow-hidden flex min-h-[420px]">
          <div className="w-16 flex-shrink-0 bg-cranberry relative flex items-center justify-center" style={{ backgroundImage: "repeating-linear-gradient(-55deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 10px)" }}>
            <div className="font-space-mono text-[12.5px] tracking-[0.28em] text-paper whitespace-nowrap flex items-center gap-2.5 rotate-180">
              <span className="w-1.5 h-1.5 rounded-full bg-marigold flex-shrink-0" />
              AMIGO SECRETO
              <span className="w-1.5 h-1.5 rounded-full bg-marigold flex-shrink-0" />
            </div>
          </div>
          <div className="relative w-0 border-l-2 border-dashed border-[rgba(42,32,20,0.28)]">
            <span className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-ink" />
            <span className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-ink" />
          </div>
          <div className="flex-1 p-7 flex flex-col items-center text-center min-w-0">
            <p className="font-space-mono text-[11.5px] tracking-[0.14em] text-text-soft mb-2">Sala {code}</p>
            <h1 className="font-fraunces text-[30px] font-medium italic text-text-ink leading-[1.08] mb-8">Se hizo el sorteo</h1>

            {error && (
              <div className="mb-5 px-3 py-2 bg-red-50 text-cranberry-dark text-sm rounded-lg border-l-3 border-cranberry">{error}</div>
            )}

            {/* Seal */}
            <div
              className="relative w-[150px] h-[150px] mb-5 cursor-pointer"
              role="button"
              aria-label="Romper el sello"
              tabIndex={0}
              onClick={() => { if (!opened) { setOpened(true); handleReveal(); } }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { if (!opened) { setOpened(true); handleReveal(); } } }}
            >
              <div className={`absolute top-0 left-0 w-[75px] h-[150px] overflow-hidden transition-transform duration-700 ease-[cubic-bezier(.4,0,.2,1)] opacity-100 ${opened ? "translate-x-[-30px] -translate-y-[-14px] -rotate-[-18deg] opacity-0" : ""}`}>
                <svg viewBox="0 0 150 150" className="block w-[150px] h-[150px]"><g><circle cx="75" cy="75" r="52" fill="#C1392B"/><circle cx="75" cy="75" r="52" fill="none" stroke="#E8A33D" strokeWidth="3" strokeDasharray="4 5"/><path d="M75 40 L82 62 L106 62 L86 76 L94 98 L75 84 L56 98 L64 76 L44 62 L68 62 Z" fill="#E8A33D" opacity="0.9"/></g></svg>
              </div>
              <div className={`absolute top-0 right-0 w-[75px] h-[150px] overflow-hidden transition-transform duration-700 ease-[cubic-bezier(.4,0,.2,1)] opacity-100 ${opened ? "translate-x-[30px] -translate-y-[-14px] rotate-[18deg] opacity-0" : ""}`}>
                <svg viewBox="0 0 150 150" className="block w-[150px] h-[150px] relative left-[-75px]"><g><circle cx="75" cy="75" r="52" fill="#C1392B"/><circle cx="75" cy="75" r="52" fill="none" stroke="#E8A33D" strokeWidth="3" strokeDasharray="4 5"/><path d="M75 40 L82 62 L106 62 L86 76 L94 98 L75 84 L56 98 L64 76 L44 62 L68 62 Z" fill="#E8A33D" opacity="0.9"/></g></svg>
              </div>
            </div>

            <p className={`text-[13px] text-text-soft mb-2 transition-opacity duration-300 ${opened ? "opacity-0" : "opacity-100"}`}>Toca el sello para romperlo</p>

            <div className={`transition-all duration-500 delay-300 ${opened ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"}`}>
              <p className="font-space-mono text-[11.5px] tracking-[0.14em] text-cranberry mb-2">Te tocó regalarle a</p>
              <p className="font-fraunces text-[42px] font-bold text-text-ink leading-none tracking-tight">{receiverName || "—"}</p>
              <div className="flex items-center justify-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-text-ink text-paper text-xs font-bold shadow-md">
                <span>✓</span> {revealed ? "Ya revelado" : "Guardado"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
