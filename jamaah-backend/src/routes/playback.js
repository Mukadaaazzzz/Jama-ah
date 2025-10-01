import { Router } from "express";
import { supabase } from "../supabase.js";
import { requireAuth, requireHost } from "../middleware/auth.js";

const r = Router();

function broadcast(req, room_id, event, payload) {
  const io = req.app.get("io");
  if (io) io.to(room_id).emit(event, payload);
}

/** Set a new track (host) */
r.post("/set", requireAuth, requireHost, async (req, res) => {
  const { room_id, reciter, surah, ayah, media_url } = req.body;
  const payload = {
    reciter: String(reciter),
    surah: Number(surah),
    ayah: Number(ayah || 1),
    media_url,
    is_playing: false,
    last_seek_seconds: 0,
    host_sent_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("playback_state")
    .update(payload)
    .eq("room_id", room_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error });

  // Broadcast fast-path
  broadcast(req, room_id, "playback:update", payload);
  res.json(data);
});

/** Play (host) */
r.post("/play", requireAuth, requireHost, async (req, res) => {
  const { room_id, at_seconds } = req.body;
  const payload = {
    is_playing: true,
    host_sent_at: new Date().toISOString(),
  };
  if (typeof at_seconds === "number") payload.last_seek_seconds = at_seconds;

  const { data, error } = await supabase
    .from("playback_state")
    .update(payload)
    .eq("room_id", room_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error });

  broadcast(req, room_id, "playback:update", payload);
  res.json(data);
});

/** Pause (host) */
r.post("/pause", requireAuth, requireHost, async (req, res) => {
  const { room_id } = req.body;
  const payload = { is_playing: false, host_sent_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("playback_state")
    .update(payload)
    .eq("room_id", room_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error });

  broadcast(req, room_id, "playback:update", payload);
  res.json(data);
});

/** Seek (host) */
r.post("/seek", requireAuth, requireHost, async (req, res) => {
  const { room_id, to_seconds } = req.body;
  const payload = {
    last_seek_seconds: Number(to_seconds || 0),
    host_sent_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("playback_state")
    .update(payload)
    .eq("room_id", room_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error });

  broadcast(req, room_id, "playback:update", { ...payload, is_playing: true });
  res.json(data);
});

export default r;
