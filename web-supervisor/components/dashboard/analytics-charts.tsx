'use client'

import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, LabelList,
  PieChart, Pie, Cell
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, CheckCircle2, Loader2, Zap, X } from 'lucide-react'
import type { AnalyticsData } from '@/lib/mock-data'
import { useToast } from '@/hooks/use-toast'

interface AnalyticsChartsProps {
  data: AnalyticsData
  reponedores?: any[]
}

// ─── Rejection motives mock data ──────────────────────────────────────────────
const REJECTION_DATA = [
  { name: 'Cliente Ausente',    value: 34, color: '#f97316' },
  { name: 'Local Cerrado',      value: 28, color: '#ef4444' },
  { name: 'Falta de Efectivo',  value: 18, color: '#eab308' },
  { name: 'Pedido Incorrecto',  value: 12, color: '#8b5cf6' },
  { name: 'Acceso Bloqueado',   value: 8,  color: '#64748b' },
]
const TOTAL_REJECTIONS = REJECTION_DATA.reduce((a, b) => a + b.value, 0)

// ─── Custom Tooltips ──────────────────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const estimates: Record<string, number> = { Tránsito: 120, 'Carga/Descarga': 85, 'Gestión en PDV': 65 }
    return (
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl p-4 flex flex-col gap-2.5 min-w-[240px] text-left animate-in fade-in zoom-in-95 duration-200">
        <p className="font-bold text-xs text-foreground border-b border-border/80 pb-1.5 uppercase tracking-wide">
          Fase: {label}
        </p>
        <div className="space-y-2.5">
          {payload.map((entry: any, index: number) => {
            const est = estimates[entry.name] || Math.round(entry.value * 0.8)
            return (
              <div key={index} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="font-bold text-[11px] text-foreground/90">{entry.name}</span>
                </div>
                <div className="pl-4 flex justify-between items-center text-[10px] text-muted-foreground gap-4">
                  <span>Real: <strong className="text-foreground font-semibold">{entry.value} min</strong></span>
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[9px] font-medium border border-border/20">Est: {est} min</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  return null
}

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl p-4 flex flex-col gap-2 min-w-[180px] text-left animate-in fade-in zoom-in-95 duration-200">
        <p className="font-bold text-xs text-foreground border-b border-border/80 pb-1.5 uppercase tracking-wide">
          Hora: {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 rounded shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="font-semibold text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-bold text-foreground">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

const CustomDonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0]
    const pct = ((item.value / TOTAL_REJECTIONS) * 100).toFixed(1)
    return (
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl p-4 text-left animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.payload.color }} />
          <span className="font-bold text-xs text-foreground">{item.name}</span>
        </div>
        <p className="text-muted-foreground text-[11px]">
          <strong className="text-foreground">{item.value}</strong> rechazos · <strong className="text-foreground">{pct}%</strong> del total
        </p>
      </div>
    )
  }
  return null
}

// ─── Custom label above bars ──────────────────────────────────────────────────
const renderCustomizedLabel = (props: any, data: AnalyticsData) => {
  const { x, y, width, index } = props
  const item = data.effectiveMinutes[index]
  if (!item) return null
  const total = (item as any).Tránsito + (item as any)['Carga/Descarga'] + (item as any)['Gestión en PDV']
    || item.Pareto + item.Mayorista + item.Detallista
  return (
    <text x={x + width / 2} y={y - 8} fill="hsl(var(--foreground))" className="text-[10px] sm:text-[11px] font-bold opacity-80" textAnchor="middle">
      {total} min
    </text>
  )
}

// ─── Active Alerts Panel ──────────────────────────────────────────────────────
function ActiveAlertsPanel({ reponedores }: { reponedores: any[] }) {
  const { toast } = useToast()
  const [recalculating, setRecalculating] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const delayedWorkers = reponedores
    .filter(w => w.status === 'Retrasado' && !dismissed.has(w.id || w.dbUuid))

  const handleRecalculate = async (workerId: string, workerName: string) => {
    setRecalculating(workerId)
    // Simulate recalculation (in production: call reoptimizeRoutes)
    await new Promise(r => setTimeout(r, 1800))
    setRecalculating(null)
    toast({
      title: `✓ Ruta recalculada — ${workerName}`,
      description: 'Se generó una nueva secuencia óptima evitando el tramo conflictivo.',
    })
  }

  if (delayedWorkers.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-400">Sin alertas activas</p>
          <p className="text-xs text-muted-foreground mt-0.5">Todos los vehículos operan dentro de los parámetros normales.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {delayedWorkers.map((worker: any, i: number) => {
        const id = worker.id || worker.dbUuid || String(i)
        const delay = worker.delay ? Math.round(worker.delay) : Math.floor(Math.random() * 25 + 10)
        const severity = delay > 20 ? 'high' : 'medium'
        const isRecalc = recalculating === id

        return (
          <div
            key={id}
            className={[
              'flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300',
              severity === 'high'
                ? 'bg-red-500/5 border-red-500/20 border-l-4 border-l-red-500'
                : 'bg-amber-500/5 border-amber-500/20 border-l-4 border-l-amber-500'
            ].join(' ')}
          >
            {/* Severity icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${severity === 'high' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
              <AlertTriangle className={`h-4 w-4 ${severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{worker.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${severity === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  +{delay} min de retraso
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {worker.reason || (severity === 'high' ? 'Bloqueo vial — requiere recalculación inmediata' : 'Tráfico moderado en la zona asignada')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleRecalculate(id, worker.name)}
                disabled={isRecalc}
                className={[
                  'flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-200',
                  isRecalc
                    ? 'bg-muted border-border text-muted-foreground cursor-wait'
                    : severity === 'high'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500'
                ].join(' ')}
              >
                {isRecalc
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Calculando...</>
                  : <><RefreshCw className="h-3 w-3" /> Recalcular</>
                }
              </button>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, id]))}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Descartar alerta"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AnalyticsCharts({ data, reponedores = [] }: AnalyticsChartsProps) {
  // Transform data for bar chart: map old keys → new logistic keys
  const barData = data.effectiveMinutes.map(item => ({
    microTask: item.microTask,
    'Tránsito':       (item as any)['Tránsito']        ?? item.Pareto,
    'Carga/Descarga': (item as any)['Carga/Descarga']   ?? item.Mayorista,
    'Gestión en PDV': (item as any)['Gestión en PDV']   ?? item.Detallista,
  }))

  const transformedRouteCompliance = data.routeCompliance.map(item => {
    const total = item.onTime + item.delayed
    return {
      time: item.time,
      onTime:  total > 0 ? parseFloat(((item.onTime  / total) * 100).toFixed(1)) : 100,
      delayed: total > 0 ? parseFloat(((item.delayed / total) * 100).toFixed(1)) : 0,
    }
  })

  const alertCount = reponedores.filter(w => w.status === 'Retrasado').length

  return (
    <div className="space-y-6">
      {/* ── Row 1: Bar + Line ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Effective Time by Delivery Phase */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Tiempo por Fase de Entrega</CardTitle>
            <CardDescription>Minutos promedio dedicados por fase logística según parada</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barData} margin={{ top: 20 }}>
                <defs>
                  <linearGradient id="color1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="color2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="color3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="microTask" stroke="hsl(var(--foreground))" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="hsl(var(--foreground))"
                  label={{
                    value: 'Minutos Promedio',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 0,
                    fill: 'hsl(var(--foreground))',
                    style: { textAnchor: 'middle', fontWeight: '500' }
                  }}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Legend />
                <Bar dataKey="Tránsito"       stackId="a" fill="url(#color1)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Carga/Descarga" stackId="a" fill="url(#color2)" />
                <Bar dataKey="Gestión en PDV" stackId="a" fill="url(#color3)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Gestión en PDV" content={(props: any) => renderCustomizedLabel(props, { ...data, effectiveMinutes: barData as any })} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Route Compliance Timeline */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Cumplimiento de Rutas en el Tiempo</CardTitle>
            <CardDescription>Porcentaje de entregas a tiempo vs con retraso a lo largo del día</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={transformedRouteCompliance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" domain={[0, 100]} tickFormatter={val => `${val}%`} />
                <ReferenceLine y={90} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value: 'Meta (90%)', position: 'top', fill: '#10b981', fontSize: 10, fontWeight: '700' }}
                />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="onTime"  stroke="hsl(var(--chart-2))" strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))', r: 4 }} activeDot={{ r: 6 }} name="A tiempo" />
                <Line type="monotone" dataKey="delayed" stroke="hsl(var(--chart-4))" strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-4))', r: 4 }} activeDot={{ r: 6 }} name="Con retraso" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Donut + Alerts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Rejection Motives Donut */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Motivos de Rechazo / Incidencia</CardTitle>
            <CardDescription>
              Desglose del <span className="text-destructive font-semibold">7.6%</span> de entregas no concretadas hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut */}
              <div className="relative shrink-0">
                <ResponsiveContainer width={300} height={300}>
                  <PieChart>
                    <Pie
                      data={REJECTION_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={95}
                      outerRadius={135}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {REJECTION_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-foreground">{TOTAL_REJECTIONS}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">rechazos</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2.5 w-full">
                {REJECTION_DATA.map(item => {
                  const pct = ((item.value / TOTAL_REJECTIONS) * 100).toFixed(1)
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground truncate">{item.name}</span>
                          <span className="text-xs font-bold text-foreground shrink-0">{pct}%</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts Panel */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Alertas Activas — Acción Rápida
                  {alertCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold border border-red-500/20">
                      {alertCount}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Vehículos con retrasos severos que requieren recalculación de ruta</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ActiveAlertsPanel reponedores={reponedores} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
