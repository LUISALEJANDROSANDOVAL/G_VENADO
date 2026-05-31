'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/dashboard/navbar'
import { Sidebar } from '@/components/dashboard/sidebar'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { RouteManagement } from '@/components/dashboard/route-management'
import { PDVMaster } from '@/components/dashboard/pdv-master'
import { MainDashboard } from '@/components/dashboard/main-dashboard'
import dynamic from 'next/dynamic'

const LiveMap = dynamic(
  () => import('@/components/dashboard/live-map').then((mod) => mod.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="lg:col-span-3 flex items-center justify-center h-[460px] border border-border rounded-lg bg-slate-50">
        <p className="text-muted-foreground">Cargando mapa de operaciones...</p>
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
import { getDashboardData, seedDatabase } from '@/app/actions'
import { supabase } from '@/lib/supabase'

export default function ControlTowerDashboard() {
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
        // Fallback to mock data
        setMockData({
          pdvs: generatePDVs(150),
          reponedores: generateReponedores(12),
          kpis: generateKPIData(),
          analytics: generateAnalyticsData(),
          routeOpt: generateRouteOptData(),
        })
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
    loadData()

    // Subscribe to task_logs and daily_routes_plan updates in real-time
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

  return (
    <div className="min-h-screen bg-background">
      {!mockData ? (
        <>
          <Navbar />
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Cargando panel de control...</p>
          </div>
        </>
      ) : (
        <>
          <Navbar />
          {isDbEmpty && (
            <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-3 flex items-center justify-between text-yellow-500 text-sm">
              <span className="flex items-center gap-2">
                ⚠️ La base de datos de Supabase está vacía. Se están mostrando datos simulados locales.
              </span>
              <button 
                onClick={handleSeed} 
                disabled={isSeeding}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-1.5 rounded text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSeeding ? 'Inicializando Base de Datos...' : 'Poblar base de datos en Supabase'}
              </button>
            </div>
          )}
          {errorMsg && (
            <div className="bg-destructive/10 border-b border-destructive/30 px-6 py-3 text-destructive text-sm flex justify-between items-center">
              <span>Error de Supabase: {errorMsg}. Mostrando datos locales de respaldo.</span>
              <button 
                onClick={loadData}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-4 py-1.5 rounded text-xs transition-colors"
              >
                Reintentar Conexión
              </button>
            </div>
          )}
          <div className="flex">
            <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
            <main className="flex-1 overflow-auto">
              <div className="p-6 md:p-8 max-w-7xl mx-auto">
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
                  <div className="space-y-8 animate-in fade-in">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">Analíticas del Panel</h1>
                      <p className="text-muted-foreground">Métricas de rendimiento e información en tiempo real</p>
                    </div>

                    <KPICards data={mockData.kpis} />
                    <AnalyticsCharts data={mockData.analytics} />
                  </div>
                )}

                {/* Live Map Module */}
                {activeModule === 'map' && (
                  <div className="space-y-8 animate-in fade-in">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">Operaciones de Campo en Vivo</h1>
                      <p className="text-muted-foreground">Seguimiento en tiempo real y gestión de trabajadores</p>
                    </div>

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
                  <div className="space-y-8 animate-in fade-in">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">Rutas & Historial</h1>
                      <p className="text-muted-foreground">Optimizar rutas, reasignar reponedores y revisar evidencias por jornada</p>
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

                {/* PDV Master Module */}
                {activeModule === 'pdv' && (
                  <div className="space-y-8 animate-in fade-in">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">Datos Maestros de PDV</h1>
                      <p className="text-muted-foreground">Gestionar y buscar ubicaciones de puntos de venta</p>
                    </div>

                    <PDVMaster pdvs={mockData.pdvs} onRefresh={loadData} />
                  </div>
                )}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  )
}
