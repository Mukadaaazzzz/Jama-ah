// Build accurate per-ayah timings using Quran.com v4 per-verse audio.
// Node 20+ (global fetch)

const API = "https://api.quran.com/api/v4";

/** Fetch all verse audio entries for a chapter (handles pagination) */
async function fetchVerseAudioByChapter(recitationId, chapter) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${API}/recitations/${recitationId}/by_chapter/${chapter}?per_page=300&page=${page}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`quran.com by_chapter failed: ${r.status}`);
    const json = await r.json();
    const list = Array.isArray(json?.audio_files) ? json.audio_files : [];
    items.push(...list);
    const next = json?.pagination?.next_page;
    if (!next || next === page) break;
    page = next;
  }
  return items;
}

/** HEAD fetch duration fallback (estimate from Content-Length / bitrate) */
async function headDurationSeconds(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    const clen = Number(r.headers.get("content-length"));
    // ~128 kbps MP3 ≈ 16,000 bytes/sec (approx)
    if (!Number.isFinite(clen)) return null;
    const bytesPerSec = 16000;
    const secs = clen / bytesPerSec;
    return secs > 0.2 ? secs : null;
  } catch { return null; }
}

/** Build timings: cumulative sum of durations; use segments if present later */
export async function buildTimings(recitationId, chapter, ayahCountHint) {
  const data = await fetchVerseAudioByChapter(recitationId, chapter);
  const entries = data
    .map((x) => {
      const ayah = Number(String(x?.verse_key || "").split(":")[1]);
      return ayah ? { ayah, url: x.url, duration: x.duration, segments: x.segments } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.ayah - b.ayah);

  const totalAyahs = entries.length || Number(ayahCountHint || 7);
  if (entries.length === 0) {
    const per = 3.5; // seconds, heuristic
    const map = {};
    for (let i = 1; i <= totalAyahs; i++) map[i] = { start: (i - 1) * per, end: i * per };
    return { map, source: "even-split", ayahCount: totalAyahs };
  }

  for (const e of entries) {
    if (!Number.isFinite(e.duration)) e.duration = await headDurationSeconds(e.url);
    if (!Number.isFinite(e.duration) || e.duration <= 0.2) e.duration = 3.5;
  }

  let cursor = 0;
  const map = {};
  for (const e of entries) {
    const start = cursor;
    const end = cursor + Number(e.duration);
    map[e.ayah] = { start, end };
    cursor = end;
  }

  const lastAyah = entries.at(-1).ayah;
  const maxAyah = Math.max(lastAyah, Number(ayahCountHint || lastAyah));
  for (let i = 1; i <= maxAyah; i++) {
    if (!map[i]) {
      const start = cursor;
      map[i] = { start, end: cursor + 3.5 };
      cursor += 3.5;
    }
  }

  return { map, source: "ayah-durations", ayahCount: Object.keys(map).length };
}
