const { createClient } = require('@supabase/supabase-js'); 
const supabaseUrl = 'https://myoorvexgxgdrpllbtru.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15b29ydmV4Z3hnZHJwbGxidHJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDEzMjgxNywiZXhwIjoyMDk1NzA4ODE3fQ.qhNFjOm5G4XJDZFQuHnOmZu2HHVeN6G9QH5R2Z45eX0';
const supabase = createClient(supabaseUrl, supabaseKey); 

async function fix() {
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: publicUsers } = await supabase.from('users').select('*');
  
  for (const au of authUsers.users) {
    const pu = publicUsers.find(p => p.email === au.email);
    if (pu && pu.id !== au.id) {
      console.log(`Fixing ${au.email}...`);
      await supabase.from('users').update({ id: au.id }).eq('email', au.email);
      console.log(`Updated ${au.email} ID from ${pu.id} to ${au.id}`);
    } else if (!pu) {
      console.log(`User ${au.email} not found in public.users`);
      await supabase.from('users').insert({
        id: au.id,
        email: au.email,
        name: au.email.split('@')[0],
        role: au.email === 'administrador@gmail.com' ? 'ADMIN' : 'SUPERVISOR',
        is_active: true
      });
      console.log(`Inserted ${au.email} into public.users`);
    }
  }
  process.exit(0);
}
fix();
