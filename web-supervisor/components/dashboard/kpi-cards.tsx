'use client'

import { TrendingUp, AlertCircle, Users, Clock, ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { KPIData } from '@/lib/mock-data'

interface KPICardsProps {
  data: KPIData & { visitEffectiveness?: number }
}

export function KPICards({ data }: KPICardsProps) {
  const effectiveness = data.visitEffectiveness ?? 92.4

  const kpis = [
    {
      icon: TrendingUp,
      label: 'Tasa de Cobertura Diaria',
      value: `${data.coverageRate.toFixed(1)}%`,
      progress: data.coverageRate,
      color: 'bg-chart-1',
      lightBg: 'bg-blue-50',
    },
    {
      icon: Clock,
      label: 'Desviación Promedio de Tiempo',
      value: `${data.timeDeviation.toFixed(1)} min`,
      progress: Math.min(data.timeDeviation, 100),
      color: 'bg-chart-4',
      lightBg: 'bg-orange-50',
    },
    {
      icon: AlertCircle,
      label: 'Alertas Críticas',
      value: data.criticalAlerts.toString(),
      progress: data.criticalAlerts * 25,
      color: 'bg-destructive',
      lightBg: 'bg-red-50',
    },
    {
      icon: ClipboardCheck,
      label: 'Efectividad de Visitas',
      value: `${effectiveness.toFixed(1)}%`,
      progress: effectiveness,
      color: 'bg-chart-2',
      lightBg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <Card key={index} className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground/70">{kpi.label}</CardTitle>
                <div className={`${kpi.lightBg} p-2 rounded-lg`}>
                  <Icon className="h-4 w-4 text-foreground/60" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              </div>
              <Progress value={kpi.progress} className="h-2" />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

