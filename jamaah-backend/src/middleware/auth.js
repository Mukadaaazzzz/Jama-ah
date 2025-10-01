import { supabase } from "../supabase.js";

export async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing Authorization: Bearer <jwt>" });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Invalid token" });
    req.user = { id: data.user.id, email: data.user.email };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function requireHost(req, res, next) {
  try {
    const roomId = req.body?.room_id || req.params?.room_id;
    if (!roomId) return res.status(400).json({ error: "room_id required" });
    const { data, error } = await supabase
      .from("room_members")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", req.user.id)
      .single();
    if (error || !data) return res.status(403).json({ error: "Not a member" });
    if (data.role !== "host") return res.status(403).json({ error: "Host only" });
    next();
  } catch {
    res.status(403).json({ error: "Forbidden" });
  }
}
