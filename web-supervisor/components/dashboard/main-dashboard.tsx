'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KPICards } from './kpi-cards'
import { Users, CheckCircle, AlertTriangle, Eye, ArrowRight, ShieldAlert, Clock, CheckSquare, XSquare, Camera, X, Search, SlidersHorizontal, TrendingUp, Sun, Cloud, CloudRain, Car, Bell, AlertCircle, MapPin, PackageX } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'



interface MainDashboardProps {
  pdvs: any[]
  reponedores: any[]
  kpis: any
  photoEvidences?: any[]
  onViewOnMap: (workerId: string) => void
  onModuleChange: (module: string) => void
}

export function MainDashboard({ pdvs, reponedores, kpis, photoEvidences = [], onViewOnMap, onModuleChange }: MainDashboardProps) {
  const [selectedZoomPhoto, setSelectedZoomPhoto] = useState<string | null>(null)
  const [isStaffListExpanded, setIsStaffListExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [routeFilter, setRouteFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')

  // External factors & quick action states
  const [isBlockadeDeclared, setIsBlockadeDeclared] = useState(false)
  const [notificationSentStatus, setNotificationSentStatus] = useState<string | null>(null)
  const [stockoutAlerts, setStockoutAlerts] = useState([
    { id: 'so-1', product: 'Mayonesa Kris 500g', pdv: 'Supermercado Fidalga Centro', time: 'Hace 12 min', managed: false },
    { id: 'so-2', product: 'Salsa de Tomate Kris 400g', pdv: 'Hipermaxi Equipetrol', time: 'Hace 35 min', managed: false },
    { id: 'so-3', product: 'Ketchup Kris 250g', pdv: 'Micromercado IC Norte', time: 'Hace 1 hora', managed: false }
  ])

  // Real-time weather data state connected to Open-Meteo API
  const [weatherData, setWeatherData] = useState<{
    scz: { temp: number; text: string; icon: 'sun' | 'cloud' | 'rain' };
    lpz: { temp: number; text: string; icon: 'sun' | 'cloud' | 'rain' };
    cbb: { temp: number; text: string; icon: 'sun' | 'cloud' | 'rain' };
  }>({
    scz: { temp: 30, text: 'Soleado', icon: 'sun' },
    lpz: { temp: 14, text: 'Nublado', icon: 'cloud' },
    cbb: { temp: 22, text: 'Lluvia Débil', icon: 'rain' }
  })

  useEffect(() => {
    async function fetchWeather() {
      try {
        const cities = [
          { key: 'scz', lat: -17.7833, lon: -63.1833 },
          { key: 'lpz', lat: -16.5000, lon: -68.1500 },
          { key: 'cbb', lat: -17.3895, lon: -66.1568 }
        ]
        
        const results = await Promise.all(
          cities.map(async (city) => {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code`)
            const data = await res.json()
            const temp = Math.round(data.current?.temperature_2m ?? (city.key === 'scz' ? 30 : city.key === 'lpz' ? 14 : 22))
            const code = data.current?.weather_code ?? 0
            
            // Map code to weather
            let text = 'Despejado'
            let icon: 'sun' | 'cloud' | 'rain' = 'sun'
            if (code === 0) {
              text = 'Despejado'
              icon = 'sun'
            } else if (code >= 1 && code <= 3) {
              text = 'Parcialmente Nublado'
              icon = 'cloud'
            } else if (code === 45 || code === 48) {
              text = 'Niebla'
              icon = 'cloud'
            } else if (code >= 51 && code <= 65) {
              text = 'Lluvia'
              icon = 'rain'
            } else if (code >= 80 && code <= 82) {
              text = 'Chubascos'
              icon = 'rain'
            } else if (code >= 95) {
              text = 'Tormenta'
              icon = 'rain'
            }
            
            return { key: city.key, temp, text, icon }
          })
        )
        
        const newWeather: any = {}
        results.forEach(r => {
          newWeather[r.key] = { temp: r.temp, text: r.text, icon: r.icon }
        })
        setWeatherData(newWeather)
      } catch (err) {
        console.error('Failed to fetch weather in real-time:', err)
      }
    }
    
    fetchWeather()
  }, [])

  // Calculate S-Curve (Planned vs Real progress)
  const totalPdvs = pdvs.length || 1
  const visitedPdvs = pdvs.filter(p => p.visited)
  const visitsWithHours = visitedPdvs.map((p, idx) => {
    if (p.lastVisit) {
      const hr = new Date(p.lastVisit).getHours()
      // Clamp or map to work hours 8:00 - 18:00
      if (hr >= 8 && hr <= 18) return hr
      return 8 + (hr % 11) // maps 0-23 to 8-18
    }
    // Fallback: distribute visited PDVs evenly across work hours
    return 8 + (idx % 10)
  })

  const plannedPercentages = [0, 5, 15, 30, 48, 62, 75, 85, 93, 98, 100]
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

  // Determine current hour of the day for real-time progress cutoff
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinutes = now.getMinutes()
  const currentDecimalHour = currentHour + currentMinutes / 60

  const sCurveData = hours.map((hour, index) => {
    const label = `${String(hour).padStart(2, '0')}:00`
    const plannedPct = plannedPercentages[index]
    
    let realPct: number | null = null
    // Show real progress only for hours that have already started,
    // or if the workday is complete (>= 18:00).
    if (hour <= currentDecimalHour || currentHour >= 18) {
      const count = visitsWithHours.filter(h => h <= hour).length
      realPct = Math.round((count / totalPdvs) * 100)
    }

    return {
      hour: label,
      'Planificado': plannedPct,
      'Real': realPct
    }
  })

  // Filter reponedores dynamically based on search term and filters
  const filteredReponedores = reponedores.filter((worker) => {
    const query = searchTerm.toLowerCase().trim()
    const matchesSearch = !query ||
      worker.name.toLowerCase().includes(query) ||
      worker.id.toLowerCase().includes(query) ||
      worker.route.toLowerCase().includes(query) ||
      worker.status.toLowerCase().includes(query)

    const matchesRoute = routeFilter === 'Todos' || worker.route === routeFilter
    const matchesStatus = statusFilter === 'Todos' || worker.status === statusFilter

    return matchesSearch && matchesRoute && matchesStatus
  })

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

      {/* Roadblock Alert Banner (Global) */}
      {isBlockadeDeclared && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 rounded-xl flex items-center justify-between animate-pulse shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Contingencia Activa:</span> Bloqueo de vías declarado. Se ha aplicado un margen extra de traslado de <span className="font-bold">+15 min</span> a los tiempos estimados de viaje en todas las rutas activas de Bolivia.
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsBlockadeDeclared(false)}
            className="text-xs hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:text-amber-700"
          >
            Desactivar
          </Button>
        </div>
      )}

      {/* Moved: Clima y Tráfico is now located at the bottom of the right sidebar */}

      {/* KPI Cards section */}
      <KPICards data={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (Span 2): Active Field Staff & Coverage */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tarjeta de Acceso al Personal en Campo (Resumida) */}
          <Card className="border-border bg-gradient-to-br from-card via-card to-emerald-500/5 hover:border-emerald-500/20 transition-all duration-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Personal en Campo</CardTitle>
                <CardDescription>Monitoreo, buscador y asignación de rutas de reponedores</CardDescription>
              </div>
              <Users className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center bg-background p-3.5 rounded-xl border border-border/60">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reponedores Hoy</span>
                  <p className="text-2xl font-bold text-foreground">{reponedores.length}</p>
                </div>
                <div className="h-8 w-[1px] bg-border" />
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Activos Ahora</span>
                  <p className="text-2xl font-bold text-emerald-600">{activeWorkersList.length}</p>
                </div>
                <div className="h-8 w-[1px] bg-border" />
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Completados</span>
                  <p className="text-2xl font-bold text-muted-foreground">{completedWorkersList.length}</p>
                </div>
              </div>
              
              <Button 
                onClick={() => setIsStaffListExpanded(!isStaffListExpanded)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-xl flex gap-2 shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {isStaffListExpanded ? 'Ocultar Listado y Buscador' : 'Ver Listado y Buscador'}
              </Button>

              {/* Panel Desplizable hacia abajo */}
              <div 
                className={[
                  "overflow-hidden transition-all duration-500 ease-in-out",
                  isStaffListExpanded ? "max-h-[1200px] opacity-100 pt-4" : "max-h-0 opacity-0 pointer-events-none"
                ].join(" ")}
              >
                <div className="border-t border-border pt-4 space-y-4">
                  {/* Buscador y Filtros */}
                  <div className="bg-muted/10 border border-border p-4 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                      {/* Search Input Bar */}
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre, ID, ruta o estado..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                        />
                        {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtros Avanzados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Route Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filtrar por Ruta</label>
                        <select
                          value={routeFilter}
                          onChange={(e) => setRouteFilter(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl text-xs px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm"
                        >
                          <option value="Todos">Todas las Rutas</option>
                          <option value="Urbana">Urbana</option>
                          <option value="Rural">Rural</option>
                          <option value="Carretera">Carretera</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filtrar por Estado</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl text-xs px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm"
                        >
                          <option value="Todos">Todos los Estados</option>
                          <option value="En Trayecto">En Trayecto</option>
                          <option value="En PDV Pareto">En PDV Pareto</option>
                          <option value="Retrasado">Retrasado</option>
                          <option value="Completado">Completado</option>
                        </select>
                      </div>
                    </div>

                    {/* Limpiar Filtros */}
                    {(routeFilter !== 'Todos' || statusFilter !== 'Todos' || searchTerm) && (
                      <div className="text-right">
                        <button
                          onClick={() => {
                            setRouteFilter('Todos')
                            setStatusFilter('Todos')
                            setSearchTerm('')
                          }}
                          className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                        >
                          Limpiar todos los filtros
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tabla de Reponedores */}
                  <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                          <tr>
                            <th className="px-5 py-3">Reponedor</th>
                            <th className="px-5 py-3">Ruta</th>
                            <th className="px-5 py-3">Progreso</th>
                            <th className="px-5 py-3">Estado</th>
                            <th className="px-5 py-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredReponedores.map((worker) => (
                            <tr key={worker.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                                    {worker.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-foreground text-xs">{worker.name}</p>
                                    <p className="text-[10px] text-muted-foreground">ID: {worker.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {worker.route}
                                </span>
                              </td>
                              <td className="px-5 py-4 w-32">
                                <div className="flex items-center gap-2">
                                  <Progress value={worker.routeProgress} className="h-1.5 flex-1" />
                                  <span className="text-xs font-bold text-foreground min-w-[32px] text-right">
                                    {Math.round(worker.routeProgress)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                {getStatusBadge(worker.status)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <Button 
                                  onClick={() => onViewOnMap(worker.dbUuid || worker.id)} 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Monitorear en mapa"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {filteredReponedores.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <SlidersHorizontal className="h-8 w-8 text-muted-foreground/30" />
                                  <p className="font-semibold text-foreground">No se encontraron reponedores</p>
                                  <p className="text-[11px]">Prueba ajustando tus términos de búsqueda o filtros.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
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

          {/* Gráfico de Progreso Acumulado (Curva S) */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg font-bold">Progreso Acumulado de la Jornada (Curva S)</CardTitle>
              </div>
              <CardDescription>
                Comparación en tiempo real del avance planificado frente a las visitas reales por hora del día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis 
                      dataKey="hour" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value: any, name: string) => [`${value}%`, name]}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Planificado" 
                      name="Ruta Planificada"
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#2563eb', strokeWidth: 1, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Real" 
                      name="Ruta Real Completada"
                      stroke="#10b981" 
                      strokeWidth={3}
                      connectNulls={false}
                      dot={{ r: 4, stroke: '#10b981', strokeWidth: 1, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Muro de Evidencias en Vivo (Live Photo Feed) */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-600" />
                Evidencias Recientes en Vivo
              </CardTitle>
              <CardDescription>Últimas fotografías de auditoría reportadas en tiempo real por el personal</CardDescription>
            </CardHeader>
            <CardContent>
              {photoEvidences.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground/30" />
                  <p>No hay evidencias fotográficas registradas hoy.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(photoEvidences || []).slice(0, 3).map((ev) => {
                    const displayUrl = ev.afterUrl || ev.beforeUrl
                    return (
                      <div key={ev.id} className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                        {/* Card Header (PDV and Reponedor) */}
                        <div className="p-3 bg-muted/10 border-b border-border/40">
                          <p className="text-xs font-bold text-foreground truncate" title={ev.pdvName}>
                            {ev.pdvName}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">
                              {ev.reponedorName}
                            </span>
                            <Badge variant="outline" className="text-[8px] font-bold px-1 py-0 border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                              {ev.taskName}
                            </Badge>
                          </div>
                        </div>

                        {/* Image Preview Container */}
                        <div 
                          className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden cursor-zoom-in"
                          onClick={() => setSelectedZoomPhoto(displayUrl)}
                        >
                          {displayUrl ? (
                            <img 
                              src={displayUrl} 
                              alt={`${ev.taskName} - ${ev.pdvName}`} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="text-xs text-muted-foreground">Sin foto</div>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[9px] text-white px-2 py-0.5 rounded font-semibold">
                            {ev.afterUrl ? 'Después (Cierre)' : 'Antes (Inicio)'}
                          </div>
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="h-5 w-5 text-white drop-shadow" />
                          </div>
                        </div>

                        {/* Footer (Timestamp) */}
                        <div className="p-2 border-t border-border/40 bg-muted/5 flex justify-between items-center text-[9px] text-muted-foreground">
                          <span className="italic">
                            {ev.afterUrl ? 'Ciclo completo' : 'Cierre pendiente'}
                          </span>
                          <span className="font-semibold">
                            {new Date(ev.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Span 1): Operational Alerts & Activity */}
        <div className="space-y-6">

          {/* Quick Actions Widget */}
          <Card className="border-border shadow-sm bg-gradient-to-br from-card via-card to-emerald-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                  Acciones Rápidas
                </CardTitle>
                <Badge variant="outline" className="text-[9px] font-bold">Supervisor</Badge>
              </div>
              <CardDescription className="text-[11px]">Acciones de contingencia operativa en campo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Notificar retrasos */}
              <div className="space-y-1">
                <Button 
                  onClick={() => {
                    const delayedCount = delayedWorkers.length
                    if (delayedCount > 0) {
                      const names = delayedWorkers.map(w => w.name).join(', ')
                      setNotificationSentStatus(`Notificación push de alerta enviada a: ${names}`)
                    } else {
                      setNotificationSentStatus("No hay reponedores con retraso crítico en este momento.")
                    }
                    setTimeout(() => setNotificationSentStatus(null), 7000)
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer h-9"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Notificar retrasos ({delayedWorkers.length})
                </Button>
              </div>

              {/* Declarar bloqueo de vías */}
              <div className="space-y-1">
                <Button 
                  onClick={() => {
                    setIsBlockadeDeclared(!isBlockadeDeclared)
                  }}
                  variant={isBlockadeDeclared ? "destructive" : "outline"}
                  className={[
                    "w-full text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer h-9",
                    isBlockadeDeclared 
                      ? "bg-rose-600 hover:bg-rose-700 text-white border-none animate-pulse" 
                      : "border-border text-foreground hover:bg-muted"
                  ].join(" ")}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {isBlockadeDeclared ? "Desactivar Alerta Bloqueo" : "Declarar bloqueo de vías"}
                </Button>
              </div>

              {/* Toast/Notification Feedback */}
              {notificationSentStatus && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-semibold leading-relaxed flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{notificationSentStatus}</span>
                </div>
              )}
            </CardContent>
          </Card>

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
                <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
                  {delayedWorkers.map((worker) => (
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stockout Alerts Widget */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <PackageX className="h-4.5 w-4.5 text-rose-500" />
                  Quiebres de Stock ({stockoutAlerts.filter(a => !a.managed).length})
                </CardTitle>
                {stockoutAlerts.filter(a => !a.managed).length > 0 && (
                  <Badge className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0 border-none animate-pulse">CRÍTICO</Badge>
                )}
              </div>
              <CardDescription className="text-[11px]">Productos Venado sin disponibilidad detectados en góndola</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockoutAlerts.filter(a => !a.managed).length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-xs flex flex-col items-center gap-1.5">
                  <CheckCircle className="h-7 w-7 text-emerald-500" />
                  Todos los quiebres de stock han sido gestionados.
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5">
                  {stockoutAlerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={[
                        "p-3 rounded-xl border transition-all flex flex-col gap-2",
                        alert.managed 
                          ? "bg-muted/40 border-border/40 opacity-60" 
                          : "bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10"
                      ].join(" ")}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground">{alert.product}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{alert.pdv}</span>
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground font-medium whitespace-nowrap">{alert.time}</span>
                      </div>
                      
                      {!alert.managed && (
                        <div className="flex justify-end gap-2 mt-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setStockoutAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, managed: true } : a))
                            }}
                            className="h-6 px-2.5 text-[9px] font-bold rounded-lg border-rose-500/20 text-rose-600 hover:text-rose-700 hover:bg-rose-500/5 cursor-pointer"
                          >
                            Marcar como Gestionado
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-muted-foreground">Reportes de Cierre/Desvíos</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {kpis.criticalAlerts}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Clima y Tráfico (Factores Externos) */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Car className="h-4.5 w-4.5 text-emerald-600" />
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    Factores Externos
                  </CardTitle>
                </div>
                <span className="text-[9px] text-muted-foreground font-semibold">En vivo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {/* Santa Cruz */}
              <div className="flex items-center justify-between p-2 bg-muted/20 border border-border/40 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={weatherData.scz.icon === 'sun' ? "p-1 bg-amber-500/10 rounded-lg text-amber-500" : weatherData.scz.icon === 'rain' ? "p-1 bg-blue-500/10 rounded-lg text-blue-500" : "p-1 bg-slate-500/10 rounded-lg text-slate-500"}>
                    {weatherData.scz.icon === 'sun' ? <Sun className="h-3.5 w-3.5" /> : weatherData.scz.icon === 'rain' ? <CloudRain className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-foreground">Santa Cruz</p>
                    <p className="text-[9px] text-muted-foreground">{weatherData.scz.temp}°C • {weatherData.scz.text}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[7px] font-extrabold border-rose-500/30 text-rose-500 bg-rose-500/5 px-1 py-0">
                    +15m
                  </Badge>
                </div>
              </div>

              {/* La Paz */}
              <div className="flex items-center justify-between p-2 bg-muted/20 border border-border/40 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={weatherData.lpz.icon === 'sun' ? "p-1 bg-amber-500/10 rounded-lg text-amber-500" : weatherData.lpz.icon === 'rain' ? "p-1 bg-blue-500/10 rounded-lg text-blue-500" : "p-1 bg-slate-500/10 rounded-lg text-slate-500"}>
                    {weatherData.lpz.icon === 'sun' ? <Sun className="h-3.5 w-3.5" /> : weatherData.lpz.icon === 'rain' ? <CloudRain className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-foreground">La Paz</p>
                    <p className="text-[9px] text-muted-foreground">{weatherData.lpz.temp}°C • {weatherData.lpz.text}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[7px] font-extrabold border-amber-500/30 text-amber-600 bg-amber-500/5 px-1 py-0">
                    +8m
                  </Badge>
                </div>
              </div>

              {/* Cochabamba */}
              <div className="flex items-center justify-between p-2 bg-muted/20 border border-border/40 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={weatherData.cbb.icon === 'sun' ? "p-1 bg-amber-500/10 rounded-lg text-amber-500" : weatherData.cbb.icon === 'rain' ? "p-1 bg-blue-500/10 rounded-lg text-blue-500" : "p-1 bg-slate-500/10 rounded-lg text-slate-500"}>
                    {weatherData.cbb.icon === 'sun' ? <Sun className="h-3.5 w-3.5" /> : weatherData.cbb.icon === 'rain' ? <CloudRain className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-foreground">Cochabamba</p>
                    <p className="text-[9px] text-muted-foreground">{weatherData.cbb.temp}°C • {weatherData.cbb.text}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[7px] font-extrabold border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-1 py-0">
                    OK
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Photo Zoom Modal */}
      {selectedZoomPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-200 animate-in fade-in"
          onClick={() => setSelectedZoomPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[88vh] rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <img src={selectedZoomPhoto} alt="Evidencia ampliada" className="w-full h-auto max-h-[88vh] object-contain mx-auto" />
            <button
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 transition-colors flex items-center gap-1.5 text-xs cursor-pointer shadow-lg border border-white/10"
              onClick={() => setSelectedZoomPhoto(null)}
            >
              <X className="h-4 w-4" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
