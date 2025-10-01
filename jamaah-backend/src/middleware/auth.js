import { createClient } from "@supabase/supabase-js";

export async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    
    console.log('🔐 Auth middleware - Has token:', !!token);
    console.log('🔐 Token length:', token?.length);
    
    if (!token) return res.status(401).json({ error: "Missing Authorization: Bearer <jwt>" });
    
    // Use ANON key for validation
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );
    
    const { data, error } = await supabase.auth.getUser(token);
    
    console.log('🔐 getUser result:', {
      hasUser: !!data?.user,
      userId: data?.user?.id,
      error: error?.message
    });
    
    if (error || !data?.user) {
      console.error('🔐 Auth failed:', error);
      return res.status(401).json({ error: "Invalid token" });
    }
    
    req.user = { id: data.user.id, email: data.user.email };
    req.userToken = token; // Save token for later use
    
    console.log('✅ Auth successful for user:', req.user.id);
    next();
  } catch (err) {
    console.error('🔐 Auth exception:', err);
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function requireHost(req, res, next) {
  try {
    const roomId = req.body?.room_id || req.params?.room_id;
    if (!roomId) return res.status(400).json({ error: "room_id required" });
    
    // Use ANON key with user's token
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${req.userToken}` }
        },
        auth: { persistSession: false }
      }
    );
    
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