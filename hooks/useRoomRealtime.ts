"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useRoomRealtime(roomId: string | null) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setParticipants([]);
      setRoom(null);
      setLoading(false);
      return;
    }

    let isActive = true;
    setLoading(true);

    Promise.all([
      supabase.from("participants").select("*").eq("room_id", roomId),
      supabase.from("rooms").select("*").eq("id", roomId).single(),
    ]).then(([pRes, rRes]) => {
      if (!isActive) return;
      if (pRes.data) setParticipants(pRes.data);
      if (rRes.data) setRoom(rRes.data);
      setLoading(false);
    });

    const participantChannel = supabase
      .channel(`participants:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (!isActive) return;
          if (payload.eventType === "INSERT") {
            setParticipants((prev) => {
              if (prev.find((p) => p.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === "UPDATE") {
            setParticipants((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) =>
              prev.filter((p) => p.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    const roomChannel = supabase
      .channel(`rooms:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (!isActive) return;
          if (payload.eventType === "UPDATE") {
            setRoom((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  return { participants, room, loading };
}
