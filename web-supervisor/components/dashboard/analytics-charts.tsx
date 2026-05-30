'use client'

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyticsData } from '@/lib/mock-data'

interface AnalyticsChartsProps {
  data: AnalyticsData
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Effective Minutes Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Minutos Efectivos por Tarea</CardTitle>
          <CardDescription>Tiempo dedicado a cada microtarea por tipo de cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.effectiveMinutes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="microTask" stroke="var(--foreground)" />
              <YAxis stroke="var(--foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '4px'
                }}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Legend />
              <Bar dataKey="Pareto" stackId="a" fill="hsl(var(--chart-1))" />
              <Bar dataKey="Mayorista" stackId="a" fill="hsl(var(--chart-2))" />
              <Bar dataKey="Detallista" stackId="a" fill="hsl(var(--chart-3))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Route Compliance Timeline */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Cumplimiento de Rutas en el Tiempo</CardTitle>
          <CardDescription>Visitas a tiempo vs retrasadas a lo largo del día</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.routeCompliance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" stroke="var(--foreground)" />
              <YAxis stroke="var(--foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '4px'
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
