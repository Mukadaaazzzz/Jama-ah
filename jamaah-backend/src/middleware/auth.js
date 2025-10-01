import { supabase } from "../supabase.js";

export async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    
    if (!token) return res.status(401).json({ error: "Missing Authorization: Bearer <jwt>" });
    
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    req.user = { id: data.user.id, email: data.user.email };
    req.userToken = token; // ← ADD THIS LINE
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}