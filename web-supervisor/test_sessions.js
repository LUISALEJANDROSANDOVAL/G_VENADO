require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const [auditRes, activeUsersRes] = await Promise.all([
    supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('users').select('*').in('role', ['ADMIN', 'SUPERVISOR']).eq('is_active', true)
  ])

  const { data: authUsersRes } = await supabaseAdmin.auth.admin.listUsers()

  let activeSessions = []
  const now = new Date().getTime()
  
  if (authUsersRes && authUsersRes.users && activeUsersRes.data) {
    const recentUsers = authUsersRes.users.filter(u => {
      if (!u.last_sign_in_at) return false
      return (now - new Date(u.last_sign_in_at).getTime()) < 12 * 60 * 60 * 1000
    })
    
    activeSessions = recentUsers.map(u => {
      const publicUser = activeUsersRes.data.find(pu => pu.email === u.email)
      return {
        id: u.id,
        name: publicUser?.name || u.email,
        email: u.email,
        role: publicUser?.role || 'SUPERVISOR',
        ip: `190.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 255)}.x`
      }
    })
  }

  console.log("Active Sessions: ", activeSessions.length)
  console.log(JSON.stringify(activeSessions, null, 2))
  process.exit(0)
}
test()
