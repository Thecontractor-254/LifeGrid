    // ========== SUPABASE CONFIGURATION ==========
    // REPLACE THESE WITH YOUR VALUES FROM Supabase -> Project Settings -> API
    const SUPABASE_URL = "https://huxqihhauglaoazwdzul.supabase.co/rest/v1/";  // ← PASTE YOUR URL
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eHFpaGhhdWdsYW9hendkenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTc3NDMsImV4cCI6MjA5NTE3Mzc0M30.SzKcoKUr9WukeyIS-R8P-BjhXrhBLjNKwgVbM4ntP6I";                   // ← PASTE YOUR ANON KEY
    
    // ========== INITIALIZE SUPABASE ==========
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);