import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

// Helper to create user-scoped Supabase client
function createUserClient(userToken) {
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

/** Get or create user profile */
r.get("/profile", requireAuth, async (req, res) => {
  try {
    const userSupabase = createUserClient(req.userToken);
    
    // Try to get existing profile
    let { data: profile, error } = await userSupabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();
    
    // If no profile exists, create one
    if (error && error.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await userSupabase
        .from("profiles")
        .insert({
          id: req.user.id,
          display_name: req.user.email?.split('@')[0] || 'User',
          preferred_reciter: 'alafasy',
          locale: 'en',
          prayer_calc_method: 'MWL',
          prayer_madhhab: 'Shafi'
        })
        .select()
        .single();
      
      if (createError) {
        return res.status(400).json({ error: createError.message });
      }
      
      profile = newProfile;
    } else if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** Update user profile */
r.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { display_name, preferred_reciter, locale, prayer_calc_method, prayer_madhhab } = req.body;
    const userSupabase = createUserClient(req.userToken);
    
    const updates = {};
    if (display_name) updates.display_name = display_name;
    if (preferred_reciter) updates.preferred_reciter = preferred_reciter;
    if (locale) updates.locale = locale;
    if (prayer_calc_method) updates.prayer_calc_method = prayer_calc_method;
    if (prayer_madhhab) updates.prayer_madhhab = prayer_madhhab;
    
    const { data, error } = await userSupabase
      .from("profiles")
      .update(updates)
      .eq("id", req.user.id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

export default r;