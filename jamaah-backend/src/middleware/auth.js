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