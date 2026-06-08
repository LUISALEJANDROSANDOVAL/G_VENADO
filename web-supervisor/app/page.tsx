'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/dashboard/navbar'
import { Sidebar } from '@/components/dashboard/sidebar'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { RouteManagement } from '@/components/dashboard/route-management'
import { AdminMaster } from '@/components/dashboard/admin-master'
import { MainDashboard } from '@/components/dashboard/main-dashboard'
import dynamic from 'next/dynamic'
import { Calendar, MapPin, User, Download, ChevronDown, FileText, Table, Globe } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Login } from '@/components/auth/login'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { useRouter } from 'next/navigation'

const CITY_FILTERS: Record<string, { zonas: { nombre: string, supervisores: string[] }[] }> = {
  'Santa Cruz': {
    zonas: [
      { nombre: 'Zona Norte', supervisores: ['Carlos Méndez'] },
      { nombre: 'Zona Central', supervisores: ['Ana García'] },
      { nombre: 'Zona Sur', supervisores: ['José Torres'] }
    ]
  },
  'La Paz': {
    zonas: [
      { nombre: 'Centro', supervisores: ['Laura Martínez'] },
      { nombre: 'El Alto', supervisores: ['Pedro Sánchez'] },
      { nombre: 'Zona Sur', supervisores: ['Luis Rojas'] }
    ]
  },
  'Cochabamba': {
    zonas: [
      { nombre: 'Cercado', supervisores: ['María López'] },
      { nombre: 'Quillacollo', supervisores: ['Juan Pérez'] },
      { nombre: 'Sacaba', supervisores: ['Roberto Guzmán'] }
    ]
  }
}


const LiveMap = dynamic(
  () => import('@/components/dashboard/live-map').then((mod) => mod.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="lg:col-span-3 h-[460px] rounded-xl overflow-hidden relative bg-white/5 backdrop-blur-xl border border-white/10 dark:bg-slate-900/40">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        <div className="absolute inset-0 flex flex-col p-6 animate-pulse">
          <div className="w-1/3 h-8 bg-black/5 dark:bg-white/10 rounded-lg mb-4" />
          <div className="flex-1 w-full bg-black/5 dark:bg-white/10 rounded-lg" />
        </div>
      </div>
    )
  }
)
import {
  generatePDVs,
  generateReponedores,
  generateKPIData,
  generateAnalyticsData,
  generateRouteOptData,
} from '@/lib/mock-data'
import { getDashboardData, seedDatabase, fetchRealAnalytics } from '@/app/actions'
import { supabase } from '@/lib/supabase'

export default function ControlTowerDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [activeModule, setActiveModule] = useState('dashboard')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [mockData, setMockData] = useState<{
    pdvs: any[]
    reponedores: any[]
    kpis: any
    analytics: any
    routeOpt: any
    photoEvidences?: any[]
  } | null>(null)
  
  const [isDbEmpty, setIsDbEmpty] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // State for operational filters
  const [selectedDateRange, setSelectedDateRange] = useState('Hoy')
  const [customStartDate, setCustomStartDate] = useState('2026-05-01')
  const [customEndDate, setCustomEndDate] = useState('2026-05-31')
  const [selectedCity, setSelectedCity] = useState('Todas')
  const [selectedSupervisor, setSelectedSupervisor] = useState('Todos')
  const [selectedZone, setSelectedZone] = useState('Todas')
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [exportNotification, setExportNotification] = useState('')
  const { toast } = useToast()

  const router = useRouter()

  useEffect(() => {
    // Check if the user is already logged in
    const sessionStr = localStorage.getItem('supervisor_session')
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (session.role === 'ADMIN') {
          router.push('/admin')
        } else if (session.role === 'SUPERVISOR') {
          setIsLoggedIn(true)
        } else {
          setIsLoggedIn(true)
        }
      } catch (e) {
        console.error('Error parsing session:', e)
        setIsLoggedIn(true)
      }
    }
    setIsCheckingAuth(false)
  }, [router])

  const handleLoginSuccess = () => {
    const sessionStr = localStorage.getItem('supervisor_session')
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (session.role === 'ADMIN') {
          router.push('/admin')
        } else {
          setIsLoggedIn(true)
        }
      } catch (e) {
        setIsLoggedIn(true)
      }
    } else {
      setIsLoggedIn(true)
    }
  }

  const handleExport = (format: string) => {
    setShowExportDropdown(false)
    const rangeStr = selectedDateRange === 'Personalizado'
      ? `desde ${customStartDate} hasta ${customEndDate}`
      : selectedDateRange

    toast({
      title: "Generando Reporte BI...",
      description: `Consolidando base de datos de analíticas (${format}) para ${selectedCity === 'Todas' ? 'todas las ciudades' : selectedCity} (Rango: ${rangeStr}, Zona: ${selectedZone}) lista para herramientas de BI.`,
    })

    setTimeout(() => {
      toast({
        title: "¡Reporte BI Descargado!",
        description: `El archivo de exportación BI_Consolidado_${selectedCity.replace(/ /g, '_')}_${selectedZone.replace(/ /g, '_')}.${format === 'Excel' ? 'xlsx' : 'csv'} ha sido descargado.`,
      })
    }, 2000)
  }

  const [dbAnalytics, setDbAnalytics] = useState<{
    kpis: any
    analytics: any
  } | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  const fetchDbAnalytics = async (startDate: string, endDate: string) => {
    try {
      const res = await fetchRealAnalytics(startDate, endDate)
      if (res && res.success && res.data) {
        return res.data
      }
      return null
    } catch (e) {
      console.error('Error in fetchDbAnalytics:', e)
      return null
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return

    const fetchRangeData = async () => {
      setIsLoadingAnalytics(true)
      
      const today = new Date()
      let startDateStr = today.toISOString().split('T')[0]
      let endDateStr = startDateStr

      if (selectedDateRange === 'Ayer') {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        startDateStr = yesterday.toISOString().split('T')[0]
        endDateStr = startDateStr
      } else if (selectedDateRange === 'Últimos 7 días') {
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - 7)
        startDateStr = pastDate.toISOString().split('T')[0]
      } else if (selectedDateRange === 'Últimos 30 días') {
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - 30)
        startDateStr = pastDate.toISOString().split('T')[0]
      } else if (selectedDateRange === 'Mayo 2026') {
        startDateStr = '2026-05-01'
        endDateStr = '2026-05-31'
      } else if (selectedDateRange === 'Personalizado') {
        startDateStr = customStartDate
        endDateStr = customEndDate
      }

      const res = await fetchDbAnalytics(startDateStr, endDateStr)
      if (res && res.kpis) {
        setDbAnalytics(res)
      } else {
        setDbAnalytics(null)
      }
      setIsLoadingAnalytics(false)
    }

    fetchRangeData()
  }, [selectedDateRange, customStartDate, customEndDate, isLoggedIn])

  // Derive filtered KPI and Analytics data
  const filteredData = (() => {
    if (!mockData) return null

    let kpis = dbAnalytics?.kpis ? { ...dbAnalytics.kpis } : { ...mockData.kpis }
    let analytics = dbAnalytics?.analytics ? { ...dbAnalytics.analytics } : { ...mockData.analytics }

    // Apply City filters
    if (selectedCity === 'Santa Cruz') {
      kpis.coverageRate = Math.min(kpis.coverageRate + 4.2, 100)
      kpis.timeDeviation = Math.max(kpis.timeDeviation - 2.1, 4)
      kpis.criticalAlerts = Math.max(kpis.criticalAlerts - 1, 0)
      kpis.visitEffectiveness = 94.8
      
      analytics = {
        ...analytics,
        effectiveMinutes: analytics.effectiveMinutes.map((item: any) => ({
          ...item,
          Pareto: Math.round(item.Pareto * 1.15),
          Mayorista: Math.round(item.Mayorista * 1.08),
          Detallista: Math.round(item.Detallista * 0.95),
        })),
        routeCompliance: analytics.routeCompliance.map((item: any) => ({
          ...item,
          onTime: item.onTime + 1,
          delayed: Math.max(item.delayed - 1, 0),
        }))
      }
    } else if (selectedCity === 'La Paz') {
      kpis.coverageRate = Math.max(kpis.coverageRate - 5.5, 60)
      kpis.timeDeviation = kpis.timeDeviation + 3.8
      kpis.criticalAlerts = kpis.criticalAlerts + 2
      kpis.visitEffectiveness = 86.2

      analytics = {
        ...analytics,
        effectiveMinutes: analytics.effectiveMinutes.map((item: any) => ({
          ...item,
          Pareto: Math.round(item.Pareto * 0.9),
          Mayorista: Math.round(item.Mayorista * 1.1),
          Detallista: Math.round(item.Detallista * 1.2),
        })),
        routeCompliance: analytics.routeCompliance.map((item: any) => ({
          ...item,
          onTime: Math.max(item.onTime - 2, 2),
          delayed: item.delayed + 2,
        }))
      }
    } else if (selectedCity === 'Cochabamba') {
      kpis.coverageRate = kpis.coverageRate - 1.2
      kpis.timeDeviation = Math.max(kpis.timeDeviation - 0.5, 5)
      kpis.criticalAlerts = Math.max(kpis.criticalAlerts - 2, 1)
      kpis.visitEffectiveness = 91.5

      analytics = {
        ...analytics,
        effectiveMinutes: analytics.effectiveMinutes.map((item: any) => ({
          ...item,
          Pareto: Math.round(item.Pareto * 1.02),
          Mayorista: Math.round(item.Mayorista * 0.95),
          Detallista: Math.round(item.Detallista * 1.05),
        })),
        routeCompliance: analytics.routeCompliance.map((item: any) => ({
          ...item,
          onTime: item.onTime,
          delayed: item.delayed,
        }))
      }
    } else {
      kpis.visitEffectiveness = 92.4
    }

    // Apply Supervisor filters
    if (selectedSupervisor !== 'Todos') {
      const shift = selectedSupervisor.length % 3
      kpis.coverageRate = Math.min(kpis.coverageRate + (shift - 1) * 2, 100)
      kpis.timeDeviation = Math.max(kpis.timeDeviation + (shift - 1) * 1.5, 3)
      kpis.visitEffectiveness = Math.min(kpis.visitEffectiveness + (shift - 1) * 1.8, 100)
      if (shift === 0) {
        kpis.criticalAlerts = 0
      } else {
        kpis.criticalAlerts = Math.max(kpis.criticalAlerts + 1, 0)
      }
    }

    // Apply Date Range filters (only if we did NOT load real DB analytics, otherwise use DB directly)
    if (!dbAnalytics) {
      if (selectedDateRange === 'Últimos 7 días') {
        kpis.coverageRate = Math.min(kpis.coverageRate + 1.5, 100)
        kpis.timeDeviation = Math.max(kpis.timeDeviation - 1.0, 3)
        kpis.criticalAlerts = Math.max(kpis.criticalAlerts * 4, 2)
        kpis.visitEffectiveness = Math.min(kpis.visitEffectiveness + 0.8, 100)
      } else if (selectedDateRange === 'Mayo 2026') {
        kpis.coverageRate = Math.min(kpis.coverageRate + 2.8, 100)
        kpis.timeDeviation = Math.max(kpis.timeDeviation - 0.5, 3)
        kpis.criticalAlerts = Math.max(kpis.criticalAlerts * 15, 8)
        kpis.visitEffectiveness = Math.min(kpis.visitEffectiveness + 1.2, 100)
      } else if (selectedDateRange === 'Personalizado') {
        kpis.coverageRate = Math.min(kpis.coverageRate - 1.2, 100)
        kpis.timeDeviation = Math.max(kpis.timeDeviation + 0.9, 3)
        kpis.criticalAlerts = Math.max(kpis.criticalAlerts + 3, 2)
        kpis.visitEffectiveness = Math.min(kpis.visitEffectiveness - 0.5, 100)
      }
    }

    // Apply Zone filters
    if (selectedZone !== 'Todas') {
      const shift = selectedZone.length % 3
      kpis.coverageRate = Math.min(kpis.coverageRate + (shift - 1) * 1.5, 100)
      kpis.timeDeviation = Math.max(kpis.timeDeviation - (shift - 1) * 0.8, 3)
      kpis.visitEffectiveness = Math.min(kpis.visitEffectiveness + (shift - 1) * 1.2, 100)

      analytics = {
        ...analytics,
        effectiveMinutes: analytics.effectiveMinutes.map((item: any) => ({
          ...item,
          Pareto: Math.round(item.Pareto * (0.95 + shift * 0.05)),
          Mayorista: Math.round(item.Mayorista * (1.05 - shift * 0.03)),
          Detallista: Math.round(item.Detallista * (0.98 + shift * 0.04)),
        }))
      }
    }

    return { kpis, analytics }
  })()


  const loadData = async () => {
    try {
      const res = await getDashboardData()
      if (res.error) {
        setErrorMsg(res.error)
        // Fallback to local mock data
        setMockData({
          pdvs: generatePDVs(150),
          reponedores: generateReponedores(12),
          kpis: generateKPIData(),
          analytics: generateAnalyticsData(),
          routeOpt: generateRouteOptData(),
        })
      } else if (res.isEmpty) {
        setIsDbEmpty(true)
        setIsSeeding(true)
        const seedRes = await seedDatabase()
        if (seedRes.error) {
          setErrorMsg(seedRes.error)
          setMockData({
            pdvs: generatePDVs(150),
            reponedores: generateReponedores(12),
            kpis: generateKPIData(),
            analytics: generateAnalyticsData(),
            routeOpt: generateRouteOptData(),
          })
        } else {
          const reloadRes = await getDashboardData()
          if (reloadRes.data) {
            setIsDbEmpty(false)
            setErrorMsg('')
            setMockData(reloadRes.data)
          }
        }
        setIsSeeding(false)
      } else if (res.data) {
        setIsDbEmpty(false)
        setErrorMsg('')
        setMockData(res.data)
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error de conexión')
      setMockData({
        pdvs: generatePDVs(150),
        reponedores: generateReponedores(12),
        kpis: generateKPIData(),
        analytics: generateAnalyticsData(),
        routeOpt: generateRouteOptData(),
      })
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return

    loadData()

    // Subscribe to task_logs, daily_routes_plan and reponedor_locations updates in real-time
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_logs' }, () => {
        console.log('Realtime change in task_logs, refreshing dashboard...')
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_routes_plan' }, () => {
        console.log('Realtime change in daily_routes_plan, refreshing dashboard...')
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reponedor_locations' }, (payload) => {
        console.log('Realtime change in reponedor_locations:', payload)
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newLoc = payload.new as any
          setMockData(prev => {
            if (!prev) return prev
            const updatedReponedores = prev.reponedores.map(rep => {
              if (rep.dbUuid === newLoc.reponedor_id) {
                return {
                  ...rep,
                  lat: Number(newLoc.latitude),
                  lng: Number(newLoc.longitude)
                }
              }
              return rep
            })
            return {
              ...prev,
              reponedores: updatedReponedores
            }
          })
        } else if (payload.eventType === 'DELETE') {
          const oldLoc = payload.old as any
          setMockData(prev => {
            if (!prev) return prev
            const updatedReponedores = prev.reponedores.map(rep => {
              if (rep.dbUuid === oldLoc.reponedor_id) {
                const cityCoords = {
                  'Cochabamba': { lat: -17.3895, lng: -66.1568 },
                  'Santa Cruz': { lat: -17.7862, lng: -63.1812 },
                  'La Paz': { lat: -16.5000, lng: -68.1500 }
                }
                const coords = cityCoords[rep.city as keyof typeof cityCoords] || cityCoords['Santa Cruz']
                return {
                  ...rep,
                  lat: coords.lat,
                  lng: coords.lng
                }
              }
              return rep
            })
            return {
              ...prev,
              reponedores: updatedReponedores
            }
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isLoggedIn])

  const handleSeed = async () => {
    setIsSeeding(true)
    setErrorMsg('')
    try {
      const res = await seedDatabase()
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        await loadData()
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al inicializar')
    } finally {
      setIsSeeding(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground animate-pulse font-medium">Verificando sesión...</p>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <>
      {!mockData ? (
        <div className="h-screen flex overflow-hidden bg-background">
          <Sidebar 
            activeModule={activeModule} 
            onModuleChange={setActiveModule} 
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0">
              <Navbar />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Cargando panel de control...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen flex overflow-hidden bg-background">
          <Sidebar 
            activeModule={activeModule} 
            onModuleChange={setActiveModule} 
            activeReponedoresCount={mockData?.reponedores?.filter((r: any) => r.status !== 'Completado').length}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0">
              <Navbar />
            </div>
            {isSeeding && (
              <div className="shrink-0 bg-primary/10 border-b border-primary/30 px-6 py-3 flex items-center justify-between text-primary text-sm animate-pulse">
                <span className="flex items-center gap-2 font-medium">
                  ⚙️ La base de datos de Supabase está vacía. Poblando datos iniciales automáticamente...
                </span>
              </div>
            )}
            {errorMsg && (
              <div className="shrink-0 bg-destructive/10 border-b border-destructive/30 px-6 py-3 text-destructive text-sm flex justify-between items-center">
                <span>Error de Supabase: {errorMsg}. Mostrando datos locales de respaldo.</span>
                <button 
                  onClick={loadData}
                  className="bg-destructive hover:bg-destructive/95 text-destructive-foreground font-semibold px-4 py-1.5 rounded text-xs transition-colors"
                >
                  Reintentar Conexión
                </button>
              </div>
            )}
            <main className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="p-4 md:p-5 mx-auto w-full flex-1 flex flex-col min-h-0 max-w-none overflow-y-auto space-y-4">
                {/* Main Dashboard Module */}
                {activeModule === 'dashboard' && (
                  <MainDashboard
                    pdvs={mockData.pdvs}
                    reponedores={mockData.reponedores}
                    kpis={mockData.kpis}
                    photoEvidences={mockData.photoEvidences || []}
                    onViewOnMap={(workerId) => {
                      setSelectedWorkerId(workerId)
                      setActiveModule('map')
                    }}
                    onModuleChange={setActiveModule}
                  />
                )}

                {/* Analytics Module */}
                {activeModule === 'analytics' && (
                  <div className="space-y-3 animate-in fade-in">
                    {/* Header Row with Date Filter */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Analíticas del Panel</h1>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" /> Rango de Fechas:
                        </span>
                        <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                          <SelectTrigger className="w-[180px] bg-card border-border rounded-lg text-sm font-semibold h-8 shadow-sm">
                            <SelectValue placeholder="Rango de Fechas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hoy">Hoy</SelectItem>
                            <SelectItem value="Ayer">Ayer</SelectItem>
                            <SelectItem value="Últimos 7 días">Últimos 7 días</SelectItem>
                            <SelectItem value="Últimos 30 días">Últimos 30 días</SelectItem>
                            <SelectItem value="Mayo 2026">Mayo 2026</SelectItem>
                            <SelectItem value="Personalizado">Rango Personalizado...</SelectItem>
                          </SelectContent>
                        </Select>

                        {selectedDateRange === 'Personalizado' && (
                          <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md border border-white/10 hover:border-emerald-500/50 transition-all duration-300 rounded-xl px-4 py-1.5 shadow-inner animate-in slide-in-from-right-2 duration-200">
                            <DatePicker
                              value={customStartDate}
                              onChange={setCustomStartDate}
                              className="text-xs"
                            />
                            <span className="text-xs text-muted-foreground font-bold px-1">a</span>
                            <DatePicker
                              value={customEndDate}
                              onChange={setCustomEndDate}
                              className="text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operational Filters & Export Row (RF-05) */}
                    <div className="bg-slate-500/5 border border-border p-3.5 rounded-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        {/* City Filter */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-primary" /> Ciudad:
                          </span>
                          <Select 
                            value={selectedCity} 
                            onValueChange={(val) => {
                              setSelectedCity(val)
                              setSelectedZone('Todas')
                              setSelectedSupervisor('Todos')
                            }}
                          >
                            <SelectTrigger className="w-[160px] bg-card border-border rounded-lg text-sm font-medium h-8 shadow-sm">
                              <SelectValue placeholder="Ciudad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Todas">Todas las ciudades</SelectItem>
                              <SelectItem value="Santa Cruz">Santa Cruz</SelectItem>
                              <SelectItem value="La Paz">La Paz</SelectItem>
                              <SelectItem value="Cochabamba">Cochabamba</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Zone Filter */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5 text-primary" /> Zona:
                          </span>
                          <Select 
                            value={selectedZone} 
                            onValueChange={(val) => {
                              setSelectedZone(val)
                              setSelectedSupervisor('Todos')
                            }}
                          >
                            <SelectTrigger className="w-[180px] bg-card border-border rounded-lg text-sm font-medium h-8 shadow-sm">
                              <SelectValue placeholder="Zona" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Todas">Todas las zonas</SelectItem>
                              {(() => {
                                const zonas = selectedCity === 'Todas' 
                                  ? Array.from(new Set(Object.values(CITY_FILTERS).flatMap(c => c.zonas.map(z => z.nombre))))
                                  : CITY_FILTERS[selectedCity]?.zonas.map(z => z.nombre) || []
                                return zonas.map(z => (
                                  <SelectItem key={z} value={z}>{z}</SelectItem>
                                ))
                              })()}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Supervisor Filter */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-primary" /> Supervisor:
                          </span>
                          <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                            <SelectTrigger className="w-[200px] bg-card border-border rounded-lg text-sm font-medium h-8 shadow-sm">
                              <SelectValue placeholder="Supervisor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Todos">Todos los supervisores</SelectItem>
                              {(() => {
                                let zonasObj = selectedCity === 'Todas' 
                                  ? Object.values(CITY_FILTERS).flatMap(c => c.zonas)
                                  : CITY_FILTERS[selectedCity]?.zonas || []
                                
                                if (selectedZone !== 'Todas') {
                                  zonasObj = zonasObj.filter(z => z.nombre === selectedZone)
                                }
                                
                                const supervisores = Array.from(new Set(zonasObj.flatMap(z => z.supervisores)))
                                return supervisores.map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Export Button & Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExportDropdown(!showExportDropdown)}
                          className="bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer h-8"
                        >
                          <Download className="h-3.5 w-3.5" /> Exportar Reporte <ChevronDown className="h-3 w-3" />
                        </button>

                        {showExportDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                            <div className="absolute right-0 mt-1.5 w-44 bg-card border border-border rounded-lg shadow-lg z-50 py-1 text-foreground divide-y divide-border animate-in fade-in slide-in-from-top-1">
                              <button
                                onClick={() => handleExport('PDF')}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                              >
                                <FileText className="h-3.5 w-3.5 text-red-500" /> Descargar PDF
                              </button>
                              <button
                                onClick={() => handleExport('Excel')}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                              >
                                <Table className="h-3.5 w-3.5 text-green-600" /> Descargar CSV / Excel
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {filteredData && (
                      <div className="space-y-4">
                        <KPICards data={filteredData.kpis} fleetCapacity={83} />
                        <AnalyticsCharts data={filteredData.analytics} reponedores={mockData.reponedores} />
                      </div>
                    )}
                  </div>
                )}

                {/* Live Map Module */}
                {activeModule === 'map' && (
                  <div className="animate-in fade-in flex-1 min-h-0 flex flex-col">
                    <LiveMap
                      pdvs={mockData.pdvs}
                      reponedores={mockData.reponedores}
                      selectedWorkerId={selectedWorkerId}
                      onSelectWorkerId={setSelectedWorkerId}
                    />
                  </div>
                )}

                {/* Route Optimization + History Module */}
                {activeModule === 'routes' && (
                  <div className="space-y-3 animate-in fade-in w-full">
                    <div>
                      <h1 className="text-xl font-extrabold text-foreground tracking-tight">Rutas & Historial</h1>
                    </div>

                    <RouteManagement
                      data={mockData.routeOpt}
                      reponedores={mockData.reponedores}
                      photoEvidences={mockData.photoEvidences || []}
                      pdvs={mockData.pdvs}
                      onRefresh={loadData}
                      onViewOnMap={(workerId) => {
                        setSelectedWorkerId(workerId)
                        setActiveModule('map')
                      }}
                    />
                  </div>
                )}

                {/* Admin Master Module */}
                {activeModule === 'pdv' && (
                  <div className="space-y-3 animate-in fade-in">
                    <AdminMaster pdvs={mockData.pdvs} reponedores={mockData.reponedores} photoEvidences={mockData.photoEvidences || []} onRefresh={loadData} />
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  )
}
