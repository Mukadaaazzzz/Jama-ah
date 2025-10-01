import { Router } from "express";
import { supabase } from "../supabase.js";

const r = Router();

/** Create a room + host membership + initial playback state */
r.post("/", async (req, res) => {
  try {
    const { owner_id, title, reciter, surah, ayah, media_url } = req.body;

    const { data: room, error: e1 } = await supabase
      .from("rooms")
      .insert({ owner_id, title })
      .select()
      .single();
    if (e1) return res.status(400).json({ error: e1 });

    const { error: e2 } = await supabase
      .from("room_members")
      .insert({ room_id: room.id, user_id: owner_id, role: "host" });
    if (e2) return res.status(400).json({ error: e2 });

    const { error: e3 } = await supabase
      .from("playback_state")
      .insert({
        room_id: room.id,
        reciter: String(reciter),
        surah: Number(surah),
        ayah: Number(ayah || 1),
        media_url,
        is_playing: false,
        last_seek_seconds: 0
      });
    if (e3) return res.status(400).json({ error: e3 });

    res.json(room);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** List live rooms */
r.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("is_live", true)
    .order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error });
  res.json(data);
});

export default r;
