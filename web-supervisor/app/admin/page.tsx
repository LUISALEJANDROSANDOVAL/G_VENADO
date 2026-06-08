'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { getAdminDashboardData, getAdminAuditData } from '@/app/actions'

import { Navbar } from '@/components/dashboard/navbar'
import { Sidebar } from '@/components/dashboard/sidebar'
import { AdminOverviewTab } from '@/components/dashboard/admin-overview-tab'
import { AdminUsersTab } from '@/components/dashboard/admin-users-tab'
import { AdminPdvsTab } from '@/components/dashboard/admin-pdvs-tab'
import { AdminAuditTab } from '@/components/dashboard/admin-audit-tab'
import { AdminMediaTab } from '@/components/dashboard/admin-media-tab'
import { AdminPlaygroundTab } from '@/components/dashboard/admin-playground-tab'

type AdminTab = 'overview' | 'users' | 'pdvs' | 'audit' | 'media' | 'playground'

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()

  // Auth state
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [adminUser, setAdminUser] = useState<any>(null)

  // Data state
  const [users, setUsers] = useState<any[]>([])
  const [pdvs, setPdvs] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [auditStats, setAuditStats] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Active Tab — starts on overview/dashboard
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  useEffect(() => {
    // Strict Auth Verification — redirect to login if no session or wrong role
    const sessionStr = localStorage.getItem('supervisor_session')
    if (!sessionStr) {
      router.push('/')
      return
    }

    try {
      const session = JSON.parse(sessionStr)
      if (session.role !== 'ADMIN') {
        toast({
          variant: 'destructive',
          title: 'Acceso denegado',
          description: 'No tiene permisos de Administrador para acceder a esta ruta.',
        })
        router.push('/')
        return
      }
      setIsAdmin(true)
      setAdminUser(session)
    } catch {
      router.push('/')
      return
    } finally {
      setIsCheckingAuth(false)
    }
  }, [router, toast])

  const loadData = async () => {
    setIsLoadingData(true)
    try {
      const [res, auditRes] = await Promise.all([
        getAdminDashboardData(),
        getAdminAuditData()
      ])

      if (res.success) {
        setUsers(res.users ?? [])
        setPdvs(res.pdvs ?? [])
        setRecentActivity(res.recentActivity ?? [])
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al cargar datos generales',
          description: res.error || 'No se pudieron obtener los registros.',
        })
      }

      if (auditRes.success) {
        setAuditLogs(auditRes.auditLogs ?? [])
        setActiveSessions(auditRes.activeSessions ?? [])
        setAuditStats(auditRes.auditStats ?? null)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al cargar bitácora',
          description: auditRes.error || 'No se pudo cargar la auditoría.',
        })
      }
    } catch (e) {
      console.error('loadData error:', e)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  // Loading / auth guard screen
  if (isCheckingAuth || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="animate-pulse font-medium text-sm tracking-wide text-muted-foreground">
          Verificando credenciales de administrador...
        </p>
      </div>
    )
  }

  // Determine whether the active tab needs data (show spinner while loading)
  const isDataTab = activeTab === 'users' || activeTab === 'pdvs' || activeTab === 'overview'

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar — identical to supervisor panel */}
      <Sidebar
        activeModule={activeTab}
        onModuleChange={(tab) => setActiveTab(tab as AdminTab)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar — identical to supervisor panel */}
        <div className="shrink-0">
          <Navbar />
        </div>

        {/* Content — same padding structure as supervisor page.tsx */}
        <main className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="p-4 md:p-5 mx-auto w-full flex-1 flex flex-col min-h-0 max-w-none overflow-y-auto space-y-4">

            {isLoadingData && isDataTab ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground animate-pulse font-medium text-sm">
                  Consultando base de datos...
                </p>
              </div>
            ) : (
              <>
                {/* TAB 0: OVERVIEW — admin home dashboard */}
                {activeTab === 'overview' && (
                  <AdminOverviewTab
                    users={users}
                    pdvs={pdvs}
                    currentUserEmail={adminUser?.email}
                    recentActivity={recentActivity}
                  />
                )}

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
                  <AdminAuditTab 
                    auditLogs={auditLogs}
                    activeSessions={activeSessions}
                    auditStats={auditStats}
                  />
                )}

                {/* TAB 4: MEDIA QA */}
                {activeTab === 'media' && (
                  <AdminMediaTab />
                )}

                {/* TAB 5: ROUTE SANDBOX */}
                {activeTab === 'playground' && (
                  <div className="animate-in fade-in flex-1 min-h-0 flex flex-col">
                    <AdminPlaygroundTab pdvs={pdvs} users={users} />
                  </div>
                )}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
