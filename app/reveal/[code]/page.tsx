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

  useEffect(() => {
    if (!code) return;

    supabase
      .from("rooms")
      .select("id, status")
      .eq("code", code)
      .single()
      .then(({ data: roomData, error: roomErr }) => {
        if (roomErr || !roomData) {
          router.push(`/`);
          return;
        }

        if (roomData.status !== "drawn") {
          router.push(`/sala/${code}`);
          return;
        }

        setRoomId(roomData.id);

        const sessionToken = getSessionToken();
        if (!sessionToken) {
          router.push(`/`);
          return;
        }

        (async () => {
          try {
            const { data, error } = await supabase.rpc("get_reveal_assignment", {
              p_token: sessionToken,
              p_room_id: roomData.id,
            });
            if (error || !data || (Array.isArray(data) && data.length === 0)) {
              setLoading(false);
              return;
            }
            const row = Array.isArray(data) ? data[0] : data;
            if (row) {
              setAssignmentId(row.id);
              setRevealed(row.revealed ?? false);
              setReceiverName(row.receiver_name ?? "");
            }
          } catch {
            // silent
          } finally {
            setLoading(false);
          }
        })();
      });
  }, [code, router]);

  const handleReveal = async () => {
    if (!assignmentId || revealed) return;
    try {
      await supabase
        .from("assignments")
        .update({ revealed: true })
        .eq("id", assignmentId);
      setRevealed(true);
    } catch {
      // silent fail — user can retry
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-rose-50 px-6">
        <div className="text-stone-500 text-lg font-medium">Cargando tu sorpresa...</div>
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

        <RevealCard
          receiverName={receiverName}
          revealed={revealed}
          onReveal={handleReveal}
        />

        <div className="mt-6 text-xs text-stone-400 font-medium">
          {revealed ? "¡Ya revelado!" : "Toca el regalo para ver tu amigo secreto"}
        </div>
      </section>
    </main>
  );
}
