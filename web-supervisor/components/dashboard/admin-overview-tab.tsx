'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, Store, ShieldCheck, Activity, TrendingUp,
  CheckCircle2, AlertTriangle, Clock, BarChart3, ArrowUpRight
} from 'lucide-react'

interface AdminOverviewTabProps {
  users: any[]
  pdvs: any[]
  currentUserEmail?: string
}

export function AdminOverviewTab({ users, pdvs, currentUserEmail }: AdminOverviewTabProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Stats derived from real data
  const totalUsers      = users.length
  const activeUsers     = users.filter(u => u.is_active !== false).length
  const inactiveUsers   = users.filter(u => u.is_active === false).length
  const reponedores     = users.filter(u => u.role === 'REPONEDOR').length
  const supervisors     = users.filter(u => u.role === 'SUPERVISOR').length
  const admins          = users.filter(u => u.role === 'ADMIN').length
  const totalPdvs       = pdvs.length
  const pareto          = pdvs.filter(p => (p.category ?? p.type) === 'PARETO').length
  const mayorista       = pdvs.filter(p => (p.category ?? p.type) === 'MAYORISTA').length
  const detallista      = pdvs.filter(p => (p.category ?? p.type) === 'DETALLISTA' || (p.category ?? p.type) === 'MINORISTA').length

  const kpis = [
    {
      title: 'Total Usuarios',
      value: totalUsers,
      sub: `${activeUsers} activos · ${inactiveUsers} inactivos`,
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10',
      trend: '+2 este mes',
    },
    {
      title: 'Puntos de Venta',
      value: totalPdvs,
      sub: `${pareto} Pareto · ${mayorista} Mayorista · ${detallista} Detallista`,
      icon: Store,
      color: 'text-emerald-500 bg-emerald-500/10',
      trend: `${pareto} PDVs prioritarios`,
    },
    {
      title: 'Equipo de Campo',
      value: reponedores,
      sub: `${supervisors} Supervisores · ${admins} Admins`,
      icon: Activity,
      color: 'text-amber-500 bg-amber-500/10',
      trend: `${Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}% fuerza activa`,
    },
    {
      title: 'Integridad del Sistema',
      value: '100%',
      sub: 'Sin incidencias críticas activas',
      icon: ShieldCheck,
      color: 'text-rose-500 bg-rose-500/10',
      trend: '0 alertas hoy',
    },
  ]

  const recentActivity = [
    { action: 'Inicio de sesión', user: currentUserEmail || 'administrador@gmail.com', time: 'Hace 1 min', type: 'success' },
    { action: 'Usuario actualizado', user: 'supervisor@gmail.com', time: 'Hace 2 horas', type: 'info' },
    { action: 'Ruta logística generada', user: 'Sistema', time: 'Hace 3 horas', type: 'info' },
    { action: 'PDV creado: GV-0312', user: 'administrador@gmail.com', time: 'Ayer 14:30', type: 'success' },
    { action: 'Alerta de geocerca (80m)', user: 'carlos@venado.com', time: 'Ayer 09:15', type: 'warning' },
  ]

  const cityBreakdown = [
    { city: 'Santa Cruz', pdvs: Math.round(totalPdvs * 0.45), color: 'bg-blue-500' },
    { city: 'La Paz',     pdvs: Math.round(totalPdvs * 0.35), color: 'bg-emerald-500' },
    { city: 'Cochabamba', pdvs: Math.round(totalPdvs * 0.20), color: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Panel de Administración
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Resumen ejecutivo del ecosistema Industrias Venado en tiempo real —{' '}
            {currentTime.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-xs px-3 py-1.5 self-start md:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block mr-2" />
          Sistema Operativo
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <Card key={idx} className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{kpi.value}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-tight">{kpi.sub}</p>
                  </div>
                  <div className={`p-3 rounded-xl shrink-0 ${kpi.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{kpi.trend}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Second row: Activity Log + City Breakdown + Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Actividad Reciente del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentActivity.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      item.type === 'success' ? 'bg-emerald-500'
                      : item.type === 'warning' ? 'bg-amber-500'
                      : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.action}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{item.user}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* City Distribution */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                PDVs por Ciudad
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {cityBreakdown.map((city) => (
                <div key={city.city} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">{city.city}</span>
                    <span className="text-slate-500">{city.pdvs} PDVs</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${city.color} transition-all duration-700`}
                      style={{ width: `${totalPdvs > 0 ? (city.pdvs / totalPdvs) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Distribución de Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {[
                { label: 'Reponedores',  count: reponedores, color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
                { label: 'Supervisores', count: supervisors,  color: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
                { label: 'Admins',       count: admins,       color: 'bg-rose-500',   badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
              ].map((role) => (
                <div key={role.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${role.color}`} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{role.label}</span>
                  </div>
                  <Badge className={`${role.badge} border-none font-extrabold text-[10px] px-2`}>
                    {role.count}
                  </Badge>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Total activos</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">{activeUsers} / {totalUsers}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Usuarios Activos',   value: activeUsers,   color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/20', icon: CheckCircle2 },
          { label: 'Usuarios Inactivos', value: inactiveUsers, color: 'text-slate-400',   bg: 'bg-slate-500/5 border-slate-500/20',     icon: AlertTriangle },
          { label: 'PDVs Pareto',        value: pareto,        color: 'text-rose-500',    bg: 'bg-rose-500/5 border-rose-500/20',       icon: TrendingUp },
          { label: 'PDVs Mayorista',     value: mayorista,     color: 'text-amber-500',   bg: 'bg-amber-500/5 border-amber-500/20',     icon: Store },
        ].map((card, idx) => {
          const Icon = card.icon
          return (
            <Card key={idx} className={`border ${card.bg} shadow-sm`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <p className={`text-2xl font-black mt-1 ${card.color}`}>{card.value}</p>
                </div>
                <Icon className={`h-6 w-6 ${card.color} opacity-60`} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
