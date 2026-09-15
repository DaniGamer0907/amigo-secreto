"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getRoomLookupErrorMessage, getSupabaseErrorMessage } from "@/lib/errors";
import { getSessionToken } from "@/lib/session";
import RevealCard from "@/components/RevealCard";

export default function RevealPage() {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  const [roomId, setRoomId] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    let isActive = true;
    setLoading(true);
    setError("");

    async function loadReveal() {
      try {
        const { data: roomData, error: roomErr } = await supabase
          .from("rooms")
          .select("id, status")
          .eq("code", code)
          .single();

        if (!isActive) return;
        if (roomErr || !roomData) {
          setError(getRoomLookupErrorMessage(roomErr));
          setLoading(false);
          return;
        }

        if (roomData.status !== "drawn") {
          setError("La sala todavia no tiene sorteo realizado.");
          setLoading(false);
          return;
        }

        setRoomId(roomData.id);

        const sessionToken = getSessionToken();
        if (!sessionToken) {
          setError("No encontramos tu sesion en este navegador. Vuelve a unirte a la sala.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc("get_reveal_assignment", {
          p_token: sessionToken,
          p_room_id: roomData.id,
        });

        if (!isActive) return;
        if (error || !data || (Array.isArray(data) && data.length === 0)) {
          setError(getSupabaseErrorMessage(error, "No encontramos tu asignacion para esta sala."));
          setLoading(false);
          return;
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          setAssignmentId(row.id);
          setRevealed(row.revealed ?? false);
          setReceiverName(row.receiver_name ?? "");
        }
      } catch (roomError) {
        if (isActive) {
          setError(getSupabaseErrorMessage(roomError, "No se pudo conectar con Supabase."));
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void loadReveal();

    return () => {
      isActive = false;
    };
  }, [code]);

  const handleReveal = async () => {
    if (!assignmentId || revealed) return;
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setError("No encontramos tu sesion en este navegador. Vuelve a unirte a la sala.");
        return;
      }

      const { error: revealError } = await supabase.rpc("mark_assignment_revealed", {
        p_assignment_id: assignmentId,
        p_token: sessionToken,
      });

      if (revealError) {
        setError(getSupabaseErrorMessage(revealError, "No se pudo marcar la tarjeta como revelada."));
        return;
      }

      setRevealed(true);
    } catch (revealError) {
      setError(getSupabaseErrorMessage(revealError, "No se pudo marcar la tarjeta como revelada."));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-rose-50 px-6">
        <div className="text-stone-500 text-lg font-medium">Conectando con Supabase...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 bg-gradient-to-b from-amber-50 to-rose-50">
      <section className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border border-rose-100 text-center">
        <div className="mb-2 text-xs font-extrabold text-rose-400 uppercase tracking-[0.2em]">
          Sala {code}
        </div>
        <h1 className="text-2xl font-black text-stone-800 tracking-tight mb-8">
          Revela tu amigo
        </h1>

        {error && (
          <div className="mb-5 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <RevealCard
          receiverName={receiverName}
          revealed={revealed}
          onReveal={handleReveal}
        />

        <div className="mt-6 text-xs text-stone-400 font-medium">
          {revealed ? "Ya revelado!" : "Toca el regalo para ver tu amigo secreto"}
        </div>
      </section>
    </main>
  );
}
