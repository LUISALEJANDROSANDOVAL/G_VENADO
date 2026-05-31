'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/dashboard/navbar'
import { Sidebar } from '@/components/dashboard/sidebar'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { LiveMap } from '@/components/dashboard/live-map'
import { RouteManagement } from '@/components/dashboard/route-management'
import { PDVMaster } from '@/components/dashboard/pdv-master'
import {
  generatePDVs,
  generateReponedores,
  generateKPIData,
  generateAnalyticsData,
  generateRouteOptData,
} from '@/lib/mock-data'

export default function ControlTowerDashboard() {
  const [activeModule, setActiveModule] = useState('analytics')
  const [mockData, setMockData] = useState<{
    pdvs: any[]
    reponedores: any[]
    kpis: any
    analytics: any
    routeOpt: any
  } | null>(null)

  // Generate mock data only on client side to avoid hydration mismatch
  useEffect(() => {
    setMockData({
      pdvs: generatePDVs(150),
      reponedores: generateReponedores(12),
      kpis: generateKPIData(),
      analytics: generateAnalyticsData(),
      routeOpt: generateRouteOptData(),
    })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {!mockData ? (
        <>
          <Navbar />
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </>
      ) : (
        <>
          <Navbar />
          <div className="flex">
            <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
            <main className="flex-1 overflow-auto">
              <div className="p-6 md:p-8 max-w-7xl mx-auto">
                {/* Analytics Module */}
                {activeModule === 'analytics' && (
                  <div className="space-y-8 animate-in fade-in">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Analytics</h1>
                      <p className="text-muted-foreground">Real-time performance metrics and insights</p>
                    </div>

                    <KPICards data={mockData.kpis} />
                    <AnalyticsCharts data={mockData.analytics} />
                  </div>
                )}

                {/* Live Map Module */}
                {activeModule === 'map' && (
                  <div className="space-y-8 animate-in fade-in">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">Live Field Operations</h1>
                      <p className="text-muted-foreground">Real-time tracking and worker management</p>
                    </div>

                    <LiveMap pdvs={mockData.pdvs} reponedores={mockData.reponedores} />
                  </div>
                )}

                {/* Route Optimization Module */}
                {activeModule === 'routes' && (
                  <div className="space-y-8 animate-in fade-in">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">Route Optimization</h1>
                      <p className="text-muted-foreground">Manage loads, reassign workers, and optimize routes</p>
                    </div>

                    <RouteManagement data={mockData.routeOpt} />
                  </div>
                )}

                {/* PDV Master Module */}
                {activeModule === 'pdv' && (
                  <div className="space-y-8 animate-in fade-in">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">PDV Master Data</h1>
                      <p className="text-muted-foreground">Manage and search point of sale locations</p>
                    </div>

                    <PDVMaster pdvs={mockData.pdvs} />
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
