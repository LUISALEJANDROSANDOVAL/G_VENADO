'use client'

import { TrendingUp, AlertCircle, Users, Clock, ClipboardCheck, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { KPIData } from '@/lib/mock-data'

interface KPICardsProps {
  data: KPIData & { visitEffectiveness?: number }
  fleetCapacity?: number
}

export function KPICards({ data, fleetCapacity = 83 }: KPICardsProps) {
  const effectiveness = data.visitEffectiveness ?? 92.4

  const kpis = [
    {
      icon: TrendingUp,
      label: 'Avance de Visitas de Hoy',
      value: `${data.coverageRate.toFixed(1)}%`,
      progress: data.coverageRate,
      color: 'bg-chart-1',
      lightBg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      icon: Clock,
      label: 'Retraso Promedio de Reponedores',
      value: `${data.timeDeviation.toFixed(1)} min`,
      progress: Math.min(data.timeDeviation, 100),
      color: 'bg-chart-4',
      lightBg: 'bg-orange-50 dark:bg-orange-500/10',
    },
    {
      icon: AlertCircle,
      label: 'Alertas del Día (Graves)',
      value: data.criticalAlerts.toString(),
      progress: data.criticalAlerts * 25,
      color: 'bg-destructive',
      lightBg: 'bg-red-50 dark:bg-red-500/10',
    },
    {
      icon: ClipboardCheck,
      label: 'Porcentaje de Visitas Exitosas',
      value: `${effectiveness.toFixed(1)}%`,
      progress: effectiveness,
      color: 'bg-chart-2',
      lightBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      icon: Truck,
      label: 'Capacidad de Carga Utilizada',
      value: `${fleetCapacity}%`,
      progress: fleetCapacity,
      color: 'bg-amber-500',
      lightBg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <Card key={index} className="border-border shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{kpi.label}</CardTitle>
              <div className={`${kpi.lightBg} p-1.5 rounded-lg shrink-0`}>
                <Icon className="h-3.5 w-3.5 text-foreground/70" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="mb-1.5">
                <div className="text-xl font-extrabold text-foreground">{kpi.value}</div>
              </div>
              <Progress value={kpi.progress} className="h-1" />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

