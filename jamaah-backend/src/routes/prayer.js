import { Router } from "express";

const r = Router();

// Proxy to AlAdhan API for today's timings at a lat/lng.
// Query: lat, lng, method=MWL, school=0|1
r.get("/today", async (req, res) => {
  try {
    const { lat, lng, method = "MWL", school = "0" } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "lat & lng required" });
    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
    const resp = await fetch(url);
    const json = await resp.json();
    res.json(json);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

export default r;
