// Node 20+: global fetch available
const TTL = Number(process.env.CACHE_TTL_SECONDS || 3600);

const mem = new Map(); // key -> { t, v }
async function cache(key, fn) {
  const now = Date.now();
  const hit = mem.get(key);
  if (hit && now - hit.t < TTL * 1000) return hit.v;
  const v = await fn();
  mem.set(key, { t: now, v });
  return v;
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${r.statusText} for ${url}${text ? " — " + text : ""}`);
  }
  return r.json();
}

/** ---------- Quran.com v4 (primary) ---------- */
// Docs: https://api.quran.com/api/v4/resources/recitations
async function quranComReciters() {
  return cache("qc:recitations", async () => {
    const raw = await fetchJson("https://api.quran.com/api/v4/resources/recitations");
    const list = Array.isArray(raw?.recitations) ? raw.recitations : [];
    return list.map((x) => ({
      id: x.id,
      name: x.reciter_name || x.style || `Reciter ${x.id}`,
      source: "qurancom",
    }));
  });
}

// Docs: https://api.quran.com/api/v4/chapter_recitations/{recitation_id}/{chapter}
async function quranComChapterAudio(recitationId, chapter) {
  const url = `https://api.quran.com/api/v4/chapter_recitations/${recitationId}/${chapter}`;
  const raw = await fetchJson(url);
  const audioUrl = raw?.audio_file?.audio_url;
  if (!audioUrl) throw new Error("Audio URL not found for given recitation/chapter");
  return audioUrl;
}

/** ---------- AlQuran Cloud / Islamic Network CDN (fallback) ----------
 * CDN patterns docs: https://alquran.cloud/cdn
 * Editions examples: ar.alafasy, ar.husary, ar.shaatree, ar.minshawi, ar.sudais, ar.shuraim (availability can vary)
 */
function aqcSurahMp3Url(edition, surah) {
  const s = String(surah).padStart(3, "0");
  return `https://cdn.islamic.network/quran/audio-surah/128/${edition}/${s}.mp3`;
}

/** ---------- Public Facade ---------- */
export const QuranAudio = {
  async listReciters() {
    const base = await quranComReciters();
    // Add a few common CDN editions as convenience entries
    const cdn = [
      { id: "ar.alafasy", name: "Mishary Alafasy (CDN)", source: "alqurancloud" },
      { id: "ar.husary", name: "Mahmoud Al‑Husary (CDN)", source: "alqurancloud" },
      { id: "ar.sudais", name: "Abdul‑Rahman as‑Sudais (CDN)", source: "alqurancloud" },
      { id: "ar.shuraim", name: "Sa’ud ash‑Shuraym (CDN)", source: "alqurancloud" }
    ];
    return (process.env.PRIMARY_QURAN_SOURCE || "qurancom").toLowerCase() === "qurancom"
      ? [...base, ...cdn]
      : [...cdn, ...base];
  },

  /**
   * Get a playable media URL for a reciter + surah (chapter).
   * If reciterId is numeric → Quran.com; if string like "ar.sudais" → CDN.
   */
  async mediaUrl(reciterId, surah) {
    const isNumeric = typeof reciterId === "number" || /^[0-9]+$/.test(String(reciterId));
    if (isNumeric) return quranComChapterAudio(Number(reciterId), Number(surah));
    return aqcSurahMp3Url(String(reciterId), Number(surah));
  },
};
