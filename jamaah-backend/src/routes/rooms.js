import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

// Helper to create user-scoped Supabase client
function createUserClient(userToken) {
  console.log('🔧 Creating user client with token length:', userToken?.length);
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${userToken}` }
      },
      auth: { persistSession: false }
    }
  );
}

/** Create room (auth required) */
r.post("/", requireAuth, async (req, res) => {
  try {
    console.log('🏠 POST /rooms - Start');
    console.log('🏠 User from middleware:', req.user);
    console.log('🏠 Has userToken:', !!req.userToken);
    
    const { title, reciter, surah, ayah, media_url } = req.body;

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return res.status(400).json({ error: "title (min 2 chars) required" });
    }

    const owner_id = req.user.id;
    const reciterId = String(reciter ?? "3");
    const surahNum = Number(surah ?? 1);
    const ayahNum = Number(ayah ?? 1);

    console.log('🏠 Creating room with owner_id:', owner_id);

    // Create client with user's JWT
    const userSupabase = createUserClient(req.userToken);

    console.log('🏠 Inserting room...');
    const { data: room, error: e1 } = await userSupabase
      .from("rooms")
      .insert({ owner_id, title: title.trim(), is_live: true })
      .select()
      .single();
    
    if (e1) {
      console.error('❌ Room insert error:', e1);
      return res.status(400).json({ error: e1.message, details: e1 });
    }

    console.log('✅ Room created:', room.id);
    console.log('🏠 Inserting room_member with user_id:', owner_id);

    const { error: e2 } = await userSupabase
      .from("room_members")
      .insert({ room_id: room.id, user_id: owner_id, role: "host" });
    
    if (e2) {
      console.error('❌ Room member insert error:', e2);
      return res.status(400).json({ error: e2.message, details: e2 });
    }

    console.log('✅ Room member created');
    console.log('🏠 Inserting playback_state...');

    const { error: e3 } = await userSupabase
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
    
    if (e3) {
      console.error('❌ Playback state insert error:', e3);
      return res.status(400).json({ error: e3.message, details: e3 });
    }

    console.log('✅ Playback state created');
    console.log('🎉 Room creation complete');
    res.json(room);
  } catch (e) {
    console.error('❌ Room creation exception:', e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** List live rooms */
r.get("/", async (_req, res) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("is_live", true)
    .order("created_at", { ascending: false });
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default r;