import { Router } from "express";
import { QuranAudio } from "../services/quranAudio.js";
import { buildTimings } from "../services/quranTimings.js";

const r = Router();

/** List reciters (Quran.com + some CDN editions) */
r.get("/reciters", async (_req, res) => {
  try {
    const reciters = await QuranAudio.listReciters();
    res.json(reciters);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** Chapter media URL for a reciter */
r.get("/media", async (req, res) => {
  try {
    const { reciter, surah } = req.query;
    if (!reciter || !surah) return res.status(400).json({ error: "reciter & surah required" });
    const id = /^[0-9]+$/.test(String(reciter)) ? Number(reciter) : String(reciter);
    const url = await QuranAudio.mediaUrl(id, Number(surah));
    res.json({ url });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

/**
 * True ayah timings via Quran.com per-verse audio
 * GET /quran/timings?recitation_id=3&surah=1&ayahCount=7
 */
r.get("/timings", async (req, res) => {
  try {
    const surah = Number(req.query.surah);
    const recitationId = Number(req.query.recitation_id ?? req.query.reciter);
    const ayahCount = Number(req.query.ayahCount || 0);
    if (!surah || !recitationId) {
      return res.status(400).json({ error: "recitation_id & surah required" });
    }

    const { map, source, ayahCount: count } = await buildTimings(recitationId, surah, ayahCount);
    const mediaUrl = await QuranAudio.mediaUrl(recitationId, surah);

    res.json({ recitation_id: recitationId, surah, map, source, ayahCount: count, mediaUrl });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

export default r;
