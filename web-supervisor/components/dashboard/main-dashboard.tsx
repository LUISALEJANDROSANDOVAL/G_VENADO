'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KPICards } from './kpi-cards'
import { Users, CheckCircle, AlertTriangle, Eye, ArrowRight, ShieldAlert, Clock, CheckSquare, XSquare } from 'lucide-react'

interface MainDashboardProps {
  pdvs: any[]
  reponedores: any[]
  kpis: any
  onViewOnMap: (workerId: string) => void
  onModuleChange: (module: string) => void
}

export function MainDashboard({ pdvs, reponedores, kpis, onViewOnMap, onModuleChange }: MainDashboardProps) {
  // Filter active vs completed workers
  const activeWorkersList = reponedores.filter(r => r.status !== 'Completado')
  const completedWorkersList = reponedores.filter(r => r.status === 'Completado')

  // Calculate dynamic coverage per client tier
  const paretoPdvs = pdvs.filter(p => p.type === 'Pareto')
  const paretoVisited = paretoPdvs.filter(p => p.visited).length
  const paretoPct = paretoPdvs.length > 0 ? (paretoVisited / paretoPdvs.length) * 100 : 0

  const mayoristaPdvs = pdvs.filter(p => p.type === 'Mayorista')
  const mayoristaVisited = mayoristaPdvs.filter(p => p.visited).length
  const mayoristaPct = mayoristaPdvs.length > 0 ? (mayoristaVisited / mayoristaPdvs.length) * 100 : 0

  const detallistaPdvs = pdvs.filter(p => p.type === 'Detallista' || p.type === 'Detallista/Minorista')
  const detallistaVisited = detallistaPdvs.filter(p => p.visited).length
  const detallistaPct = detallistaPdvs.length > 0 ? (detallistaVisited / detallistaPdvs.length) * 100 : 0

  // Identify delayed workers
  const delayedWorkers = reponedores.filter(r => r.status === 'Retrasado')

  // Format today's date nicely in Spanish
  const todayFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Get status color styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completado':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-semibold">Completado</Badge>
      case 'Retrasado':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-none font-semibold animate-pulse">Retrasado</Badge>
      case 'En PDV Pareto':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none font-semibold">En PDV Pareto</Badge>
      case 'En Trayecto':
      default:
        return <Badge className="bg-slate-500 hover:bg-slate-600 text-white border-none font-semibold">En Trayecto</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-600/10 via-teal-500/5 to-transparent p-6 rounded-2xl border border-emerald-500/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Torre de Control Venado</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <span>Bolivia</span> • <span className="capitalize">{todayFormatted}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onModuleChange('map')} variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white flex gap-2">
            <Eye className="h-4 w-4" /> Ver Mapa en Vivo
          </Button>
          <Button onClick={() => onModuleChange('routes')} variant="outline" className="flex gap-2">
            Optimizar Jornada <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards section */}
      <KPICards data={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (Span 2): Active Field Staff & Coverage */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Reponedores List */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold">Estado del Personal en Campo</CardTitle>
                <CardDescription>Seguimiento de reponedores activos el día de hoy</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-muted/50 font-medium">
                {activeWorkersList.length} Activos / {completedWorkersList.length} Completados
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                    <tr>
                      <th className="px-6 py-3">Reponedor</th>
                      <th className="px-6 py-3">Ruta</th>
                      <th className="px-6 py-3">Progreso</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reponedores.map((worker) => (
                      <tr key={worker.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                              {worker.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{worker.name}</p>
                              <p className="text-[10px] text-muted-foreground">ID: {worker.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-muted-foreground">
                            {worker.route}
                          </span>
                        </td>
                        <td className="px-6 py-4 w-40">
                          <div className="flex items-center gap-2">
                            <Progress value={worker.routeProgress} className="h-1.5 flex-1" />
                            <span className="text-xs font-bold text-foreground min-w-[32px] text-right">
                              {Math.round(worker.routeProgress)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(worker.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            onClick={() => onViewOnMap(worker.dbUuid || worker.id)} 
                            size="xs" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Monitorear en mapa"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Client Tier Coverage Progress */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Avance de Auditoría por Canal</CardTitle>
              <CardDescription>Porcentaje de visitas completadas según la segmentación de Industrias Venado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pareto */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="font-bold text-foreground">Canal PARETO (Estratégico)</span>
                  </div>
                  <span className="text-muted-foreground font-semibold">
                    {paretoVisited} de {paretoPdvs.length} locales ({Math.round(paretoPct)}%)
                  </span>
                </div>
                <Progress value={paretoPct} className="h-2.5 bg-blue-100" />
              </div>

              {/* Mayorista */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-foreground">Canal MAYORISTA</span>
                  </div>
                  <span className="text-muted-foreground font-semibold">
                    {mayoristaVisited} de {mayoristaPdvs.length} locales ({Math.round(mayoristaPct)}%)
                  </span>
                </div>
                <Progress value={mayoristaPct} className="h-2.5 bg-emerald-100" />
              </div>

              {/* Detallista / Minorista */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-foreground">Canal DETALLISTA / MINORISTA</span>
                  </div>
                  <span className="text-muted-foreground font-semibold">
                    {detallistaVisited} de {detallistaPdvs.length} locales ({Math.round(detallistaPct)}%)
                  </span>
                </div>
                <Progress value={detallistaPct} className="h-2.5 bg-amber-100" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Span 1): Operational Alerts & Activity */}
        <div className="space-y-6">

          {/* Critical Alerts Widget */}
          <Card className="border-border bg-gradient-to-b from-rose-50/50 via-transparent to-transparent">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-rose-950 dark:text-rose-100 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                Alertas Activas ({delayedWorkers.length})
              </CardTitle>
              <CardDescription>Incidencias que requieren atención del supervisor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {delayedWorkers.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                  No hay alertas críticas registradas en este momento.
                </div>
              ) : (
                delayedWorkers.map((worker) => (
                  <div 
                    key={worker.id} 
                    className="flex flex-col gap-2 p-3.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-all cursor-pointer"
                    onClick={() => onViewOnMap(worker.dbUuid || worker.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-foreground">{worker.name}</p>
                        <p className="text-[10px] text-muted-foreground">Ruta: {worker.route}</p>
                      </div>
                      <Badge variant="destructive" className="text-[10px] font-bold uppercase animate-pulse">
                        Retrasado
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <Clock className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-rose-950 dark:text-rose-300 font-semibold">
                        Retraso de {worker.delay} minutos
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Summary */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Resumen de la Jornada</CardTitle>
              <CardDescription>Datos clave agregados hoy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-muted-foreground">Puntos de Venta Visitados</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {pdvs.filter(p => p.visited).length} / {pdvs.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-muted-foreground">Reponedores en Campo</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {reponedores.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-muted-foreground">Reportes de Cierre/Desvíos</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {kpis.criticalAlerts}
                </span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}
