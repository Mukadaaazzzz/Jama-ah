import { Router } from "express";
import { supabase } from "../supabase.js";
import ngeohash from "ngeohash";

const r = Router();

/** User taps “Heading to the masjid” */
r.post("/ping", async (req, res) => {
  try {
    const { user_id, lat, lng, message } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number")
      return res.status(400).json({ error: "lat & lng numeric required" });
    const geohash5 = ngeohash.encode(lat, lng, 5);
    const { data, error } = await supabase
      .from("masjid_alerts")
      .insert({ user_id, geohash5, lat, lng, message })
      .select()
      .single();
    if (error) return res.status(400).json({ error });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** Fetch nearby alerts (last 12h) */
r.get("/nearby", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng))
      return res.status(400).json({ error: "lat & lng required" });
    const geohash5 = ngeohash.encode(lat, lng, 5);
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("masjid_alerts")
      .select("*")
      .eq("geohash5", geohash5)
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

export default r;
