/**
 * INFRA AGENT - Supabase Client Initialization & Authentication Module
 */

window.SUPABASE_CONFIG = {
  url: window.ENV_SUPABASE_URL || "https://byexjyvxykptwqobesor.supabase.co",
  anonKey: window.ENV_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZXhqeXZ4eWtwdHdxb2Jlc29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NzE2MTQsImV4cCI6MjEwNDI0NzYxNH0.H9aS3UB43xWpcgY7XLF7Ln38LGJE6EQMtYbitPkmV3Y"
};

window.supabaseClient = null;

// Initialize Supabase Client
async function initSupabaseClient() {
  try {
    // 1. Attempt to fetch credentials from server endpoint /api/config
    const resp = await fetch('/api/config');
    if (resp.ok) {
      const data = await resp.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        window.SUPABASE_CONFIG.url = data.supabaseUrl;
        window.SUPABASE_CONFIG.anonKey = data.supabaseAnonKey;
      }
    }
  } catch (err) {
    console.warn('[Supabase Config] Server config fetch fallback:', err);
  }

  // 2. Initialize @supabase/supabase-js client if credentials available
  if (window.supabase && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL') {
    window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
    console.log('[Supabase Client] Successfully initialized Supabase connection.');
    return window.supabaseClient;
  } else {
    console.warn('[Supabase Client] Credentials missing or invalid. Please configure .env file with SUPABASE_URL and SUPABASE_ANON_KEY.');
    return null;
  }
}

window.initSupabaseClient = initSupabaseClient;

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
  initSupabaseClient();
});

