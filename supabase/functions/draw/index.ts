function sattoloDerangement(arr: string[]): string[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function handler(request: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://amigo-secreto-iota-ashen.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método no permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let roomId: string;
  try {
    const body = await request.json();
    roomId = body.room_id;
    if (!roomId) {
      return new Response(
        JSON.stringify({ error: "room_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "JSON inválido en el body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const connectionString = Deno.env.get("DB_URL");
  if (!connectionString) {
    return new Response(
        JSON.stringify({ error: "DB_URL no configurado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { default: postgres } = await import("npm:postgres");
  const sql = postgres(connectionString, {
    connect_timeout: 10,
    idle_timeout: 5,
    max_lifetime: 30,
  });

  try {
    const [room] = await sql<{ id: string; status: string }>`
      SELECT id, status FROM rooms WHERE id = ${roomId}
    `;

    if (!room) {
      return new Response(
        JSON.stringify({ error: "Sala no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (room.status === "drawn") {
      return new Response(
        JSON.stringify({ error: "La sala ya fue sorteada, no se permite re-sortear" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const participants = await sql<{ id: string; name: string }>`
      SELECT id, name FROM participants WHERE room_id = ${roomId}
    `;

    if (participants.length < 2) {
      return new Response(
        JSON.stringify({ error: "Se necesitan al menos 2 participantes para sortear" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const participantIds = participants.map((p) => p.id);
    const shuffledIds = sattoloDerangement(participantIds);

    for (let i = 0; i < participants.length; i++) {
      await sql`
        INSERT INTO assignments (room_id, giver_id, receiver_id, revealed)
        VALUES (${roomId}, ${participants[i].id}, ${shuffledIds[i]}, false)
      `;
    }

    await sql`UPDATE rooms SET status = 'drawn' WHERE id = ${roomId}`;

    return new Response(
      JSON.stringify({ success: true, room_id: roomId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } finally {
    await sql.end();
  }
}

Deno.serve(handler);
