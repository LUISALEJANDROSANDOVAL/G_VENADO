'use client'

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyticsData } from '@/lib/mock-data'

interface AnalyticsChartsProps {
  data: AnalyticsData
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const estimates: Record<string, number> = { Pareto: 200, Mayorista: 150, Detallista: 100 }
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border shadow-xl rounded-xl p-3.5 flex flex-col gap-2.5 min-w-[240px] text-left animate-in fade-in zoom-in-95 duration-150">
        <p className="font-bold text-xs text-foreground border-b border-border/80 pb-1.5 uppercase tracking-wide">
          Tarea: {label}
        </p>
        <div className="space-y-2.5">
          {payload.map((entry: any, index: number) => {
            const name = entry.name
            const value = entry.value
            const est = estimates[name] || Math.round(value * 0.8)
            const color = entry.color
            
            const categoryLabel = name === 'Pareto' 
              ? 'Cliente Pareto' 
              : name === 'Mayorista' 
              ? 'Mayorista' 
              : 'Detallista'

            return (
              <div key={index} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-bold text-[11px] text-foreground/90">{categoryLabel}</span>
                </div>
                <div className="pl-4 flex justify-between items-center text-[10px] text-muted-foreground gap-4">
                  <span>Real: <strong className="text-foreground font-semibold">{value} min</strong></span>
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
      <div className="bg-card/95 backdrop-blur-sm border border-border shadow-xl rounded-xl p-3.5 flex flex-col gap-2 min-w-[180px] text-left animate-in fade-in zoom-in-95 duration-150">
        <p className="font-bold text-xs text-foreground border-b border-border/80 pb-1.5 uppercase tracking-wide">
          Hora: {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const name = entry.name
            const value = entry.value
            const color = entry.color

            return (
              <div key={index} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 rounded shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-semibold text-muted-foreground">{name}</span>
                </div>
                <span className="font-bold text-foreground">{value}%</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  return null
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Transform absolute numbers to percentages for Route Compliance
  const transformedRouteCompliance = data.routeCompliance.map(item => {
    const total = item.onTime + item.delayed
    return {
      time: item.time,
      onTime: total > 0 ? parseFloat(((item.onTime / total) * 100).toFixed(1)) : 100,
      delayed: total > 0 ? parseFloat(((item.delayed / total) * 100).toFixed(1)) : 0
    }
  })

  // Custom label renderer to show totals above stacked bars
  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, index } = props
    const item = data.effectiveMinutes[index]
    if (!item) return null
    const total = item.Pareto + item.Mayorista + item.Detallista
    return (
      <text 
        x={x + width / 2} 
        y={y - 8} 
        fill="var(--foreground)" 
        className="text-[10px] sm:text-[11px] font-bold opacity-80"
        textAnchor="middle"
      >
        {total} min
      </text>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Effective Minutes Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Minutos Efectivos por Tarea</CardTitle>
          <CardDescription>Tiempo promedio dedicado por PDV según tipo de cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.effectiveMinutes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="microTask" stroke="var(--foreground)" />
              <YAxis 
                stroke="var(--foreground)" 
                label={{ 
                  value: 'Minutos Promedio', 
                  angle: -90, 
                  position: 'insideLeft', 
                  offset: 0, 
                  fill: 'var(--foreground)',
                  style: { textAnchor: 'middle', fontWeight: '500' }
                }} 
              />
              <Tooltip 
                content={<CustomBarTooltip />}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Legend />
              <Bar dataKey="Pareto" stackId="a" fill="hsl(var(--chart-1))" />
              <Bar dataKey="Mayorista" stackId="a" fill="hsl(var(--chart-2))" />
              <Bar dataKey="Detallista" stackId="a" fill="hsl(var(--chart-3))">
                <LabelList dataKey="Detallista" content={renderCustomizedLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Route Compliance Timeline */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Cumplimiento de Rutas en el Tiempo</CardTitle>
          <CardDescription>Porcentaje de visitas a tiempo vs con retraso a lo largo del día</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={transformedRouteCompliance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" stroke="var(--foreground)" />
              <YAxis 
                stroke="var(--foreground)" 
                domain={[0, 100]} 
                tickFormatter={(val) => `${val}%`}
              />
              <ReferenceLine 
                y={90} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: 'Meta (90%)', 
                  position: 'top', 
                  fill: '#10b981', 
                  fontSize: 10, 
                  fontWeight: '700' 
                }} 
              />
              <Tooltip 
                content={<CustomLineTooltip />}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="onTime" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                activeDot={{ r: 6 }}
                name="A tiempo"
              />
              <Line 
                type="monotone" 
                dataKey="delayed" 
                stroke="hsl(var(--chart-4))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-4))', r: 4 }}
                activeDot={{ r: 6 }}
                name="Con retraso"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

