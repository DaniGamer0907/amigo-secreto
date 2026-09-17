"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateSessionToken, saveSessionToken } from "@/lib/session";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Ingresa tu nombre");
    setLoading(true);
    try {
      const sessionToken = generateSessionToken();
      const roomCode = generateCode();
      const { data: roomData, error: roomErr } = await supabase.from("rooms").insert({
        code: roomCode, host_id: sessionToken, status: "waiting",
      }).select("id").single();
      if (roomErr || !roomData) { setError("No se pudo crear la sala"); setLoading(false); return; }
      await supabase.from("participants").insert({ room_id: roomData.id, name: name.trim(), session_token: sessionToken });
      saveSessionToken(sessionToken);
      router.push(`/sala/${roomCode}`);
    } catch { setError("Ocurrió un error inesperado"); setLoading(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !code.trim()) return setError("Completa todos los campos");
    setLoading(true);
    try {
      const { data: roomData, error: roomErr } = await supabase.from("rooms").select("id").eq("code", code.trim().toUpperCase()).single();
      if (roomErr || !roomData) { setError("Sala no encontrada"); setLoading(false); return; }
      const { data: statusData } = await supabase.from("rooms").select("status").eq("id", roomData.id).single();
      if (statusData?.status !== "waiting") { setError("La sala ya no está en espera"); setLoading(false); return; }
      const sessionToken = generateSessionToken();
      const { error: partErr } = await supabase.from("participants").insert({ room_id: roomData.id, name: name.trim(), session_token: sessionToken });
      if (partErr) { setError("No se pudo unirte"); setLoading(false); return; }
      saveSessionToken(sessionToken);
      router.push(`/sala/${code.trim().toUpperCase()}`);
    } catch { setError("Ocurrió un error inesperado"); setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-5 py-12 relative overflow-x-hidden grain">
      {/* Confetti decorativo */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        {[
          { left: "8%", top: "12%", bg: "#E8A33D" },
          { left: "92%", top: "82%", bg: "#C1392B" },
          { left: "15%", top: "70%", bg: "#F7ECD8" },
          { left: "85%", top: "18%", bg: "#7FB6A8" },
          { left: "50%", top: "5%", bg: "#E8A33D" },
          { left: "30%", top: "90%", bg: "#C1392B" },
        ].map((c, i) => (
          <span
            key={i}
            className="absolute w-1.5 h-1.5 rounded-sm opacity-50 rotate-45"
            style={{ left: c.left, top: c.top, backgroundColor: c.bg, transform: `rotate(${45 + i * 30}deg)` }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-[430px]">
        {/* Ticket */}
        <div className="bg-paper rounded-[18px] shadow-2xl overflow-hidden flex min-h-[420px]">
          {/* Stub */}
          <div className="w-16 flex-shrink-0 bg-cranberry relative flex items-center justify-center" style={{ backgroundImage: "repeating-linear-gradient(-55deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 10px)" }}>
            <div className="writing-mode-vertical-rl rotate-180 font-space-mono text-[12.5px] tracking-[0.28em] text-paper whitespace-nowrap flex items-center gap-2.5">
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
            <p className="font-space-mono text-[11.5px] tracking-[0.14em] text-text-soft mb-1">Sorteo entre amigos</p>
            <h1 className="font-fraunces text-[30px] leading-[1.08] font-medium italic text-text-ink mb-5">Elige tu entrada</h1>

            {/* Tabs */}
            <div className="flex gap-5 border-b border-paper-line mb-5">
              <button onClick={() => { setMode("create"); setError(""); }} className={`pb-2.5 text-[14.5px] font-semibold tracking-[0.01em] border-b-2 border-transparent transition ${mode === "create" ? "text-cranberry border-cranberry" : "text-text-soft hover:text-text-ink"}`}>Crear sala</button>
              <button onClick={() => { setMode("join"); setError(""); }} className={`pb-2.5 text-[14.5px] font-semibold tracking-[0.01em] border-b-2 border-transparent transition ${mode === "join" ? "text-cranberry border-cranberry" : "text-text-soft hover:text-text-ink"}`}>Unirse a sala</button>
            </div>

            {error && <div className="mb-4 px-3 py-2 bg-red-50 text-cranberry-dark text-sm rounded-lg border-l-3 border-cranberry">{error}</div>}

            {mode === "create" && (
              <form onSubmit={handleCreate} className="space-y-4" aria-label="Crear sala">
                <label htmlFor="c-name" className="block text-[13px] text-text-soft font-medium mb-1.5">Tu nombre</label>
                <input id="c-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Daniel" maxLength={24} className="w-full px-3.5 py-3 rounded-xl border-1.5 border-paper-line bg-white/35 text-text-ink placeholder:text-text-soft/35 outline-none focus:border-cranberry focus:bg-white/60 transition text-[15.5px]" />
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-cranberry text-paper font-semibold shadow-lg shadow-cranberry/25 hover:bg-cranberry-dark active:scale-[0.98] transition disabled:opacity-60">{loading ? "Creando..." : "Crear sala"}</button>
              </form>
            )}

            {mode === "join" && (
              <form onSubmit={handleJoin} className="space-y-4" aria-label="Unirse a sala">
                <label htmlFor="j-name" className="block text-[13px] text-text-soft font-medium mb-1.5">Tu nombre</label>
                <input id="j-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Ana" maxLength={24} className="w-full px-3.5 py-3 rounded-xl border-1.5 border-paper-line bg-white/35 text-text-ink placeholder:text-text-soft/35 outline-none focus:border-cranberry focus:bg-white/60 transition text-[15.5px]" />
                <label htmlFor="j-code" className="block text-[13px] text-text-soft font-medium mb-1.5">Código de sala</label>
                <input id="j-code" type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="ABC123" maxLength={6} className="w-full px-3.5 py-3 rounded-xl border-1.5 border-paper-line bg-white/35 text-text-ink placeholder:text-text-soft/35 outline-none focus:border-cranberry focus:bg-white/60 transition text-[15.5px] font-space-mono tracking-widest uppercase" />
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-cranberry text-paper font-semibold shadow-lg shadow-cranberry/25 hover:bg-cranberry-dark active:scale-[0.98] transition disabled:opacity-60">{loading ? "Uniendo..." : "Unirme"}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
