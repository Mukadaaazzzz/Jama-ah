import { Server } from "socket.io";
import { supabase } from "../supabase.js";

// Keep minimal presence metadata in memory (per process)
const presence = new Map(); // roomId -> Map<userId, { lastBeat: number, role: 'host'|'listener' }>

export function initRealtime(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // Auth handshake for sockets: query.token=SupabaseJWT&room_id=<id>
  io.use(async (socket, next) => {
    try {
      const { token, room_id } = socket.handshake.auth || socket.handshake.query || {};
      if (!token) return next(new Error("Missing token"));
      const { data, error } = await supabase.auth.getUser(String(token));
      if (error || !data?.user) return next(new Error("Bad token"));
      socket.user = { id: data.user.id, email: data.user.email };
      socket.roomId = String(room_id || "");
      if (!socket.roomId) return next(new Error("Missing room_id"));
      next();
    } catch (e) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const { id: userId } = socket.user;
    const roomId = socket.roomId;

    // Verify membership and role from DB
    const { data: member } = await supabase
      .from("room_members")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .single();

    const role = member?.role || "listener";

    socket.join(roomId);

    // Presence bookkeeping
    const roomMap = presence.get(roomId) || new Map();
    roomMap.set(userId, { lastBeat: Date.now(), role });
    presence.set(roomId, roomMap);

    // Broadcast presence snapshot
    emitPresence(io, roomId);

    // Client→Server heartbeats (every 10s from client recommended)
    socket.on("beat", () => {
      const rm = presence.get(roomId);
      if (rm?.has(userId)) {
        rm.get(userId).lastBeat = Date.now();
      }
    });

    // Host authoritative playback pings (low-latency path)
    // payload: { is_playing, last_seek_seconds, host_sent_at, reciter?, surah?, ayah? }
    socket.on("playback:ping", (payload) => {
      if (role !== "host") return; // guard
      // Re-broadcast only inside the room
      io.to(roomId).emit("playback:update", {
        ...payload,
        host_sent_at: payload.host_sent_at || new Date().toISOString(),
      });
    });

    // Optional: host can handover
    socket.on("host:handover", async ({ to_user_id }) => {
      if (role !== "host") return;
      await supabase.from("room_members").update({ role: "listener" }).eq("room_id", roomId).eq("user_id", userId);
      await supabase.from("room_members").update({ role: "host" }).eq("room_id", roomId).eq("user_id", to_user_id);
      const rm = presence.get(roomId);
      if (rm?.has(userId)) rm.get(userId).role = "listener";
      if (rm?.has(to_user_id)) rm.get(to_user_id).role = "host";
      emitPresence(io, roomId);
      io.to(roomId).emit("host:changed", { host_user_id: to_user_id });
    });

    socket.on("disconnect", () => {
      const rm = presence.get(roomId);
      if (rm) {
        rm.delete(userId);
        if (rm.size === 0) presence.delete(roomId);
      }
      emitPresence(io, roomId);
    });
  });

  // Clean up stale presence
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, rm] of presence.entries()) {
      let changed = false;
      for (const [uid, meta] of rm.entries()) {
        if (now - meta.lastBeat > 30_000) {
          rm.delete(uid);
          changed = true;
        }
      }
      if (changed) emitPresence(io, roomId);
      if (rm.size === 0) presence.delete(roomId);
    }
  }, 10_000);

  return io;
}

function emitPresence(io, roomId) {
  const rm = presence.get(roomId) || new Map();
  const users = Array.from(rm.entries()).map(([user_id, meta]) => ({
    user_id,
    role: meta.role,
    lastBeat: meta.lastBeat,
  }));
  io.to(roomId).emit("presence:update", { room_id: roomId, users, count: users.length });
}
