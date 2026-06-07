'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ShieldAlert, 
  Clock, 
  Terminal, 
  Laptop, 
  KeyRound, 
  RefreshCcw,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { Input } from '@/components/ui/input'

export function AdminAuditTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  const stats = [
    { title: 'Acciones de Seguridad', value: '452', desc: 'Últimos 7 días', icon: ShieldAlert, color: 'text-emerald-500 bg-emerald-500/10' },
    { title: 'Sesiones Activas', value: '3', desc: 'Supervisores online', icon: Laptop, color: 'text-blue-500 bg-blue-500/10' },
    { title: 'Intentos Fallidos', value: '0', desc: 'Sin incidencias críticas', icon: KeyRound, color: 'text-rose-500 bg-rose-500/10' },
    { title: 'Logs de Algoritmo', value: '14', desc: 'Calibraciones hoy', icon: Terminal, color: 'text-amber-500 bg-amber-500/10' }
  ]

  const initialLogs = [
    { id: 1, action: 'Inicio de Sesión', severity: 'low', desc: 'Administrador del Sistema inició sesión en el panel web.', user: 'administrador@gmail.com', ip: '190.186.20.45', device: 'Chrome on Windows 11', time: 'Hace 5 minutos' },
    { id: 2, action: 'Actualización de Usuario', severity: 'medium', desc: 'Se modificó el rol de usuario carlos@venado.com a reponedor.', user: 'administrador@gmail.com', ip: '190.186.20.45', device: 'Chrome on Windows 11', time: 'Hace 1 hora' },
    { id: 3, action: 'Creación de Ruta Logística', severity: 'low', desc: 'Plan logístico diario inicializado para 12 reponedores.', user: 'supervisor@gmail.com', ip: '190.181.10.12', device: 'Firefox on macOS Sonoma', time: 'Hace 3 horas' },
    { id: 4, action: 'Calibración de Parámetros', severity: 'high', desc: 'Se modificó la geocerca mínima de check-in de 50m a 80m.', user: 'administrador@gmail.com', ip: '190.186.20.45', device: 'Chrome on Windows 11', time: 'Hace 4 horas' },
    { id: 5, action: 'Intento de Acceso Denegado', severity: 'high', desc: 'Usuario carlos@venado.com intentó entrar a /admin.', user: 'carlos@venado.com', ip: '172.56.24.11', device: 'Flutter Client on Android 13', time: 'Hace 6 horas' },
    { id: 6, action: 'Check-in Fuera de Geocerca', severity: 'medium', desc: 'Reponedora Ana García completó tarea en Punto de Venta GV002 a 120m de distancia.', user: 'ana@venado.com', ip: '172.56.28.32', device: 'Flutter Client on iOS 17', time: 'Hace 8 horas' }
  ]

  const filteredLogs = initialLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.user.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity
    return matchesSearch && matchesSeverity
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Auditoría General y Logs de Actividad</h2>
        <p className="text-sm text-slate-500 mt-1">
          Seguimiento inmutable de acciones corporativas y sesiones activas en la Torre de Control de Industrias Venado.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                  <p className="text-[10px] text-slate-500 font-semibold">{stat.desc}</p>
                </div>
                <div className={`p-3.5 rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* active sessions */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Table of logs */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Historial de Eventos</h3>
            <div className="flex gap-2 w-full max-w-xs">
              <Input
                placeholder="Buscar logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-8.5 text-xs bg-white dark:bg-[#092140]/30 border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/40">
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3 pl-6 w-[25%]">Acción</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3 w-[45%]">Descripción</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3 w-[20%]">Actor</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3 text-center pr-6 w-[10%]">Severidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-slate-200 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <TableCell className="py-3.5 pl-6">
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{log.action}</span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">{log.time}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <div className="flex flex-col">
                          <span>{log.desc}</span>
                          <span className="text-[9px] text-slate-400/80 mt-1 font-mono">{log.device} • IP: {log.ip}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">{log.user}</TableCell>
                      <TableCell className="py-3.5 text-center pr-6">
                        <Badge className={`font-extrabold text-[8px] px-1.5 py-0.5 border-none uppercase ${
                          log.severity === 'high' 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' 
                            : log.severity === 'medium' 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' 
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Side card: active sessions */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Sesiones Web Activas</h3>
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-850 pb-3">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supervisores Conectados</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">Supervisor General</h4>
                  <p className="text-[10px] text-slate-400 truncate">supervisor@gmail.com • IP: 190.181.10.12</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">Admin del Sistema</h4>
                  <p className="text-[10px] text-slate-400 truncate">administrador@gmail.com • IP: 190.186.20.45</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">Supervisor La Paz</h4>
                  <p className="text-[10px] text-slate-400 truncate">supervisor1@venado.bo • IP: 190.188.42.59</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
