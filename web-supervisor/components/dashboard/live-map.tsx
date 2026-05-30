'use client'

import { MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PDV, Reponedor } from '@/lib/mock-data'

interface LiveMapProps {
  pdvs: PDV[]
  reponedores: Reponedor[]
}

export function LiveMap({ pdvs, reponedores }: LiveMapProps) {
  // Normalize coordinates to SVG space
  const getMapCoords = (lat: number, lng: number) => {
    const x = ((lng + 58.6) / 0.6) * 600
    const y = ((lat + 34.4) / 0.6) * 400
    return { x: Math.max(0, Math.min(600, x)), y: Math.max(0, Math.min(400, y)) }
  }

  const getPDVColor = (type: string) => {
    switch (type) {
      case 'Pareto':
        return '#ef4444'
      case 'Mayorista':
        return '#3b82f6'
      default:
        return '#9ca3af'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Map Container */}
      <Card className="lg:col-span-3 border-border">
        <CardHeader>
          <CardTitle>Mapa de Operaciones de Campo en Vivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 rounded-lg overflow-hidden relative">
            <svg width="100%" height={400} viewBox="0 0 600 400" className="bg-gradient-to-br from-sky-50 to-blue-50">
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e7ff" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="600" height="400" fill="url(#grid)" />

              {/* PDV Points */}
              {pdvs.slice(0, 100).map((pdv) => {
                const coords = getMapCoords(pdv.lat, pdv.lng)
                return (
                  <circle
                    key={pdv.id}
                    cx={coords.x}
                    cy={coords.y}
                    r="4"
                    fill={getPDVColor(pdv.type)}
                    opacity="0.7"
                    className="hover:opacity-100 cursor-pointer transition-opacity"
                  />
                )
              })}

              {/* Reponedor Markers */}
              {reponedores.map((worker) => {
                const pdv = pdvs.find((p) => p.id === worker.currentPDV)
                if (!pdv) return null
                const coords = getMapCoords(pdv.lat, pdv.lng)
                return (
                  <g key={worker.id}>
                    <circle cx={coords.x} cy={coords.y} r="8" fill="none" stroke="#10b981" strokeWidth="2" />
                    <circle cx={coords.x} cy={coords.y} r="10" fill="none" stroke="#10b981" opacity="0.3" />
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span className="text-foreground/70">PDVs Pareto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="text-foreground/70">PDVs Mayoristas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400"></div>
              <span className="text-foreground/70">PDVs Detallistas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-emerald-500 bg-transparent"></div>
              <span className="text-foreground/70">Reponedores Activos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reponedor List Sidebar */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Reponedores Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {reponedores.map((worker) => (
              <div key={worker.id} className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="font-medium text-sm text-foreground">{worker.name}</div>
                <div className="text-xs text-foreground/60 mt-1">{worker.id}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant={worker.status === 'Retrasado' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {worker.status}
                  </Badge>
                </div>
                {worker.delay > 0 && (
                  <div className="mt-2 text-xs text-destructive font-medium">
                    {worker.delay.toFixed(0)} min de retraso
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-foreground/60">{worker.routeProgress.toFixed(0)}% completado</span>
                  <span className="text-foreground/60">{worker.activeOrders} órdenes</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
