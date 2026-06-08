const { createClient } = require('@supabase/supabase-js'); 
const supabaseUrl = 'https://myoorvexgxgdrpllbtru.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15b29ydmV4Z3hnZHJwbGxidHJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDEzMjgxNywiZXhwIjoyMDk1NzA4ODE3fQ.qhNFjOm5G4XJDZFQuHnOmZu2HHVeN6G9QH5R2Z45eX0';
const supabase = createClient(supabaseUrl, supabaseKey); 
supabase.auth.admin.listUsers().then(res => { 
  console.log(JSON.stringify(res.data.users, null, 2)); 
  process.exit(0); 
});
