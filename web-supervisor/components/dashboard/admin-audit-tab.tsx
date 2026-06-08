'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ShieldAlert, 
  Laptop, 
  KeyRound, 
  Terminal,
  Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface AdminAuditTabProps {
  auditLogs?: any[]
  activeSessions?: any[]
  auditStats?: any
}

export function AdminAuditTab({ auditLogs = [], activeSessions = [], auditStats = null }: AdminAuditTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  const stats = [
    { title: 'Acciones de Seguridad', value: auditStats?.securityActions || 0, desc: 'Últimos eventos críticos', icon: ShieldAlert, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20' },
    { title: 'Sesiones Activas', value: auditStats?.activeSessionsCount || 0, desc: 'Admins & Supervisores', icon: Laptop, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20' },
    { title: 'Intentos Fallidos', value: auditStats?.failedAttempts || 0, desc: 'Sin incidencias de acceso', icon: KeyRound, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-gradient-to-br from-rose-500/5 to-rose-500/10 border-rose-500/20' },
    { title: 'Logs de Algoritmo', value: auditStats?.algorithmLogs || 0, desc: 'Rutas calibradas', icon: Terminal, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20' }
  ]

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.user.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity
    return matchesSearch && matchesSeverity
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
          Bitácora y Auditoría
        </h2>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Registro inmutable de acciones corporativas y sesiones activas en el ecosistema Venado.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className={`backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 border ${stat.bg}`}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</span>
                  <h3 className={`text-3xl font-black mt-1.5 drop-shadow-sm ${stat.color}`}>{stat.value}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{stat.desc}</p>
                </div>
                <div className="shrink-0">
                  <Icon className={`h-8 w-8 ${stat.color} opacity-30 drop-shadow-sm -rotate-6`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* active sessions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Table of logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-black tracking-wide text-slate-800 dark:text-slate-200">Historial de Eventos</h3>
            <div className="flex gap-2 w-full sm:max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar logs, usuarios o acciones..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500"
                />
              </div>
              <select
                className="h-9 px-3 text-xs bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value)}
              >
                <option value="all">Todas las severidades</option>
                <option value="high">Crítica (Alta)</option>
                <option value="medium">Advertencia (Media)</option>
                <option value="low">Información (Baja)</option>
              </select>
            </div>
          </div>

          <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-white/40 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-800/40 backdrop-blur-sm sticky top-0 z-10">
                    <TableRow className="border-b-slate-200/50 dark:border-b-slate-800/50">
                      <TableHead className="font-black text-slate-700 dark:text-slate-300 py-4 pl-6 w-[25%] uppercase text-[10px] tracking-wider">Acción</TableHead>
                      <TableHead className="font-black text-slate-700 dark:text-slate-300 py-4 w-[45%] uppercase text-[10px] tracking-wider">Descripción</TableHead>
                      <TableHead className="font-black text-slate-700 dark:text-slate-300 py-4 w-[20%] uppercase text-[10px] tracking-wider">Actor</TableHead>
                      <TableHead className="font-black text-slate-700 dark:text-slate-300 py-4 text-center pr-6 w-[10%] uppercase text-[10px] tracking-wider">Nivel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                      <TableRow key={log.id} className="group border-b-slate-100 dark:border-b-slate-800/50 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                        <TableCell className="py-4 pl-6 align-top">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{log.action}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-1 font-semibold bg-slate-100 dark:bg-slate-800 w-fit px-1.5 py-0.5 rounded-md">{log.time}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-xs text-slate-600 dark:text-slate-300 font-medium align-top">
                          <div className="flex flex-col">
                            <span className="leading-relaxed">{log.desc}</span>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">{log.device}</span>
                              <span className="text-[9px] font-mono text-slate-400/80">IP: {log.ip}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 align-top">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${log.severity === 'high' ? 'bg-rose-500' : log.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                            <span className="truncate max-w-[120px]">{log.user}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center pr-6 align-top">
                          <Badge className={`font-black text-[9px] px-2 py-0.5 border uppercase shadow-sm ${
                            log.severity === 'high' 
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400' 
                              : log.severity === 'medium' 
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400' 
                                : 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400'
                          }`}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-slate-500 font-medium">
                          No se encontraron eventos que coincidan con la búsqueda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side card: active sessions */}
        <div className="space-y-4">
          <h3 className="text-sm font-black tracking-wide text-slate-800 dark:text-slate-200">Plataforma Web</h3>
          <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-white/40 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[calc(100%-2rem)]">
            <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
              <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Laptop className="h-4 w-4" />
                Sesiones Activas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activeSessions.length > 0 ? (
                <div className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                  {activeSessions.map((session, idx) => (
                    <div key={idx} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                      <div className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{session.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{session.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[8px] font-black tracking-widest uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-sm">{session.role}</span>
                          <span className="text-[9px] font-mono text-slate-400">IP: {session.ip}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">No hay sesiones activas en este momento.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
