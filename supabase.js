const { createClient } = window.supabase;

const supabaseUrl = "https://fwcagnhqsovrrbkhuuba.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Y2Fnbmhxc292cnJia2h1dWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjQzOTcsImV4cCI6MjA1ODAwMDM5N30.F60ydgy3-A5tl5aeMLUpY04lc3b5K7CK9km4gUtocxY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
