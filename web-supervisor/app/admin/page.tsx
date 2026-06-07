'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  MapPin, 
  Activity, 
  Sliders, 
  LogOut, 
  Camera
} from 'lucide-react'
import { getAdminDashboardData } from '@/app/actions'

// Custom Subcomponents
import { AdminUsersTab } from '@/components/dashboard/admin-users-tab'
import { AdminPdvsTab } from '@/components/dashboard/admin-pdvs-tab'
import { AdminAuditTab } from '@/components/dashboard/admin-audit-tab'
import { AdminMediaTab } from '@/components/dashboard/admin-media-tab'
import { AdminPlaygroundTab } from '@/components/dashboard/admin-playground-tab'

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Auth state
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  
  // Data state
  const [users, setUsers] = useState<any[]>([])
  const [pdvs, setPdvs] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  
  // Active Tab: 'users' | 'pdvs' | 'audit' | 'media' | 'playground'
  const [activeTab, setActiveTab] = useState<'users' | 'pdvs' | 'audit' | 'media' | 'playground'>('users')

  useEffect(() => {
    // 1. Strict Auth Verification
    const sessionStr = localStorage.getItem('supervisor_session')
    if (!sessionStr) {
      router.push('/')
      return
    }
    
    try {
      const session = JSON.parse(sessionStr)
      if (session.role !== 'ADMIN') {
        toast({
          variant: "destructive",
          title: "Acceso denegado",
          description: "No tiene permisos de Administrador para acceder a esta ruta.",
        })
        router.push('/')
        return
      }
      setIsAdmin(true)
      setAdminUser(session)
    } catch (e) {
      router.push('/')
      return
    } finally {
      setIsCheckingAuth(false)
    }
  }, [router])

  const loadData = async () => {
    setIsLoadingData(true)
    try {
      const res = await getAdminDashboardData()
      if (res.success) {
        setUsers(res.users)
        setPdvs(res.pdvs)
      } else {
        toast({
          variant: "destructive",
          title: "Error al cargar datos",
          description: res.error || "No se pudieron obtener los registros de Supabase.",
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  if (isCheckingAuth || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#07162c] text-white">
        <p className="animate-pulse font-medium text-sm tracking-wide">Cargando consola de seguridad...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#07162c] overflow-hidden text-slate-800 dark:text-slate-100">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-[#092140] text-white flex flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <img src="/logo.png" alt="Venado" className="w-10 h-10 object-contain shrink-0" />
            <div className="flex flex-col">
              <span className="font-extrabold text-[15px] tracking-wider uppercase text-white leading-none">Console</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">ADMINISTRADOR</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 mt-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === 'users' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Gestión de Personal</span>
            </button>

            <button
              onClick={() => setActiveTab('pdvs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === 'pdvs' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MapPin className="h-4.5 w-4.5" />
              <span>Directorio PDVs</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === 'audit' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Activity className="h-4.5 w-4.5" />
              <span>Auditoría & Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('media')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === 'media' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Camera className="h-4.5 w-4.5" />
              <span>Media QA Center</span>
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === 'playground' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sliders className="h-4.5 w-4.5" />
              <span>Sandbox de Rutas</span>
            </button>
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="px-3 py-2 bg-slate-900/40 rounded-xl flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
              {adminUser?.name?.substring(0, 2) || 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate text-white">{adminUser?.name || 'Administrador'}</p>
              <p className="text-[10px] text-slate-400 truncate">{adminUser?.email || 'admin@gmail.com'}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 py-2.5 rounded-xl cursor-pointer text-xs font-semibold"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-white dark:bg-[#092140]/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Panel de Control Administrativo</span>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-none font-bold text-[10px] uppercase">
                Enterprise
              </Badge>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Servidor Cloud: <span className="text-emerald-500 font-bold">Conectado (Supabase Realtime)</span>
            </span>
          </div>
        </header>

        {/* Dynamic Content Panel */}
        <main className="flex-1 overflow-y-auto p-8">
          {isLoadingData && activeTab !== 'playground' && activeTab !== 'audit' && activeTab !== 'media' ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-500 animate-pulse font-medium text-sm">Consultando base de datos transaccional...</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* TAB 1: USER MANAGEMENT */}
              {activeTab === 'users' && (
                <AdminUsersTab 
                  users={users} 
                  onRefresh={loadData} 
                  currentUserEmail={adminUser?.email}
                />
              )}

              {/* TAB 2: POINTS OF SALE (PDV) MASTER */}
              {activeTab === 'pdvs' && (
                <AdminPdvsTab 
                  pdvs={pdvs} 
                  onRefresh={loadData} 
                />
              )}

              {/* TAB 3: AUDIT LOGS */}
              {activeTab === 'audit' && (
                <AdminAuditTab />
              )}

              {/* TAB 4: MEDIA QA Visor */}
              {activeTab === 'media' && (
                <AdminMediaTab />
              )}

              {/* TAB 5: PLAYGROUND / SANDBOX */}
              {activeTab === 'playground' && (
                <AdminPlaygroundTab 
                  pdvs={pdvs} 
                />
              )}

            </div>
          )}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#092140] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-full shrink-0">
                <LogOut className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">¿Cerrar Sesión?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">¿Desea cerrar la sesión de administración?</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  localStorage.removeItem('supervisor_session')
                  window.location.href = '/'
                }}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm border-none cursor-pointer"
              >
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
