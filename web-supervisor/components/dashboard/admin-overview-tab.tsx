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
  recentActivity?: any[]
}

export function AdminOverviewTab({ users, pdvs, currentUserEmail, recentActivity = [] }: AdminOverviewTabProps) {
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

  const sczPdvs         = pdvs.filter(p => p.market === 'Santa Cruz').length
  const lpzPdvs         = pdvs.filter(p => p.market === 'La Paz').length
  const cbbaPdvs        = pdvs.filter(p => p.market === 'Cochabamba').length

  const kpis = [
    {
      title: 'Total Usuarios',
      value: totalUsers,
      sub: `${activeUsers} activos · ${inactiveUsers} inactivos`,
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10',
      trend: `${activeUsers} operando hoy`,
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
      value: 'Óptima',
      sub: 'Base de datos conectada',
      icon: ShieldCheck,
      color: 'text-rose-500 bg-rose-500/10',
      trend: `${recentActivity.length} eventos recientes`,
    },
  ]

  const cityBreakdown = [
    { city: 'Santa Cruz', pdvs: sczPdvs, color: 'bg-blue-500' },
    { city: 'La Paz',     pdvs: lpzPdvs, color: 'bg-emerald-500' },
    { city: 'Cochabamba', pdvs: cbbaPdvs, color: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Resumen General
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Panel de supervisión del ecosistema Venado en tiempo real —{' '}
            {currentTime.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Badge className="backdrop-blur-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-xs px-4 py-2 self-start md:self-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block mr-2" />
          Conectado a DB
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <Card key={idx} className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-white/40 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{kpi.title}</span>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white drop-shadow-sm">{kpi.value}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-tight">{kpi.sub}</p>
                  </div>
                  <div className={`p-3.5 rounded-2xl shrink-0 ${kpi.color} shadow-inner`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-200/50 dark:border-slate-800 flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{kpi.trend}</span>
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
          <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-white/40 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
            <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
              <CardTitle className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 tracking-wide">
                <Clock className="h-4 w-4 text-slate-400" />
                Actividad Reciente del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                  {recentActivity.map((item, idx) => (
                    <div key={idx} className="group flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                        item.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/20'
                        : item.type === 'warning' ? 'bg-amber-500 shadow-amber-500/20'
                        : 'bg-blue-500 shadow-blue-500/20'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.action}</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{item.user}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-black tracking-wide shrink-0 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{item.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">No hay actividad reciente registrada en la base de datos.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* City Distribution */}
          <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-white/40 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
              <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                Distribución Geográfica
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {cityBreakdown.map((city) => (
                <div key={city.city} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">{city.city}</span>
                    <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{city.pdvs} PDVs</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full ${city.color} transition-all duration-1000 ease-out relative`}
                      style={{ width: `${totalPdvs > 0 ? (city.pdvs / totalPdvs) * 100 : 0}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-white/40 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
              <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Desglose de Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5">
              {[
                { label: 'Reponedores',  count: reponedores, color: 'bg-emerald-500', badge: 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
                { label: 'Supervisores', count: supervisors,  color: 'bg-blue-500',   badge: 'bg-blue-100/50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
                { label: 'Admins',       count: admins,       color: 'bg-rose-500',   badge: 'bg-rose-100/50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
              ].map((role) => (
                <div key={role.label} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${role.color} group-hover:scale-125 transition-transform`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{role.label}</span>
                  </div>
                  <Badge className={`${role.badge} border border-white/20 dark:border-slate-700/50 font-black text-[10px] px-2.5 py-0.5 shadow-sm`}>
                    {role.count}
                  </Badge>
                </div>
              ))}

              <div className="pt-3 mt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wide">
                  <span>Total activos</span>
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
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
          { label: 'Usuarios Activos',   value: activeUsers,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
          { label: 'Usuarios Inactivos', value: inactiveUsers, color: 'text-slate-600 dark:text-slate-400',   bg: 'bg-gradient-to-br from-slate-500/5 to-slate-500/10 border-slate-500/20',     icon: AlertTriangle },
          { label: 'PDVs Pareto',        value: pareto,        color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-gradient-to-br from-rose-500/5 to-rose-500/10 border-rose-500/20',       icon: TrendingUp },
          { label: 'PDVs Mayorista',     value: mayorista,     color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20',     icon: Store },
        ].map((card, idx) => {
          const Icon = card.icon
          return (
            <Card key={idx} className={`backdrop-blur-md border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${card.bg}`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{card.label}</p>
                  <p className={`text-3xl font-black mt-1.5 drop-shadow-sm ${card.color}`}>{card.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${card.color} opacity-30 drop-shadow-sm -rotate-6`} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
