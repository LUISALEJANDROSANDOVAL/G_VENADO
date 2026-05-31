'use client'

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyticsData } from '@/lib/mock-data'

interface AnalyticsChartsProps {
  data: AnalyticsData
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
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '4px'
                }}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                formatter={(value: any, name: string) => {
                  const estimates: Record<string, number> = { Pareto: 200, Mayorista: 150, Detallista: 100 }
                  const est = estimates[name] || Math.round(value * 0.8)
                  return [`${value} min prom. reales (Est. ${est} min)`, name]
                }}
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
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '4px'
                }}
                formatter={(value: any, name: string) => {
                  const labelMap: Record<string, string> = {
                    onTime: 'A tiempo',
                    delayed: 'Con retraso'
                  }
                  return [`${value}%`, labelMap[name] || name]
                }}
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

