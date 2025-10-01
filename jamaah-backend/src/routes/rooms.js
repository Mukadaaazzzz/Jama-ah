// src/routes/rooms.js
import { Router } from "express";
import { supabase } from "../supabase.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

/** Create room (auth required) */
r.post("/", requireAuth, async (req, res) => {
  try {
    const { title, reciter, surah, ayah, media_url } = req.body;

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return res.status(400).json({ error: "title (min 2 chars) required" });
    }

    const owner_id = req.user.id;                 // ← from JWT
    const reciterId = String(reciter ?? "3");     // default Sudais
    const surahNum  = Number(surah ?? 1);
    const ayahNum   = Number(ayah ?? 1);

    const { data: room, error: e1 } = await supabase
      .from("rooms")
      .insert({ owner_id, title: title.trim(), is_live: true })
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
        reciter: reciterId,
        surah: surahNum,
        ayah: ayahNum,
        media_url: media_url || null,
        is_playing: false,
        last_seek_seconds: 0,
        host_sent_at: new Date().toISOString()
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
