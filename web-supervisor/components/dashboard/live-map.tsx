'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'
import type { PDV } from '@/lib/mock-data'

interface LiveMapProps {
  pdvs: PDV[]
  reponedores: any[]
}

export function LiveMap({ pdvs, reponedores }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [animationTime, setAnimationTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)

  // Update animation phase for moving worker markers
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setAnimationTime((prev) => (prev + 0.005 * speedMultiplier) % 1)
    }, 120)
    return () => clearInterval(timer)
  }, [isPlaying, speedMultiplier])

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

  // Cleanup map instance on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Sync markers when pdvs, reponedores, or animationTime updates
  useEffect(() => {
    if (!mapContainerRef.current) return

    // 1. Initialize Map
    if (!mapInstanceRef.current) {
      const centerLat = -34.61
      const centerLng = -58.44
      
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([centerLat, centerLng], 11)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contribuyentes'
      }).addTo(map)
      
      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current

    // 2. Create a LayerGroup for markers
    const markerGroup = L.layerGroup().addTo(map)

    // 3. Render PDVs
    pdvs.forEach((pdv) => {
      const color = getPDVColor(pdv.type)
      const marker = L.circleMarker([pdv.lat, pdv.lng], {
        radius: 5,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75,
      })

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; color: #1f2937;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #111827;">${pdv.nombre}</h4>
          <div style="margin-bottom: 2px;"><strong>ID:</strong> ${pdv.id}</div>
          <div style="margin-bottom: 2px;"><strong>Clasificación:</strong> ${pdv.type}</div>
          <div><strong>Estado:</strong> ${pdv.visited ? '🟢 Visitado' : '⚪ Pendiente'}</div>
        </div>
      `)

      // Find if this PDV is in any worker's sequence and get its order index
      let sequenceNum: number | null = null
      for (const worker of reponedores) {
        const seq = worker.sequence || []
        const idx = seq.indexOf(pdv.id)
        if (idx !== -1) {
          sequenceNum = idx + 1
          break
        }
      }

      if (sequenceNum !== null) {
        marker.bindTooltip(`${sequenceNum}`, {
          permanent: true,
          direction: 'top',
          className: 'pdv-sequence-badge',
          offset: [0, -3]
        })
      }

      marker.addTo(markerGroup)
    })

    // 4. Render Route Polylines
    const routeColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    reponedores.forEach((worker, idx) => {
      const sequence = worker.sequence || []
      if (sequence.length <= 1) return
      
      const latlngs: L.LatLngTuple[] = []
      sequence.forEach((pdvId: string) => {
        const pdv = pdvs.find(p => p.id === pdvId)
        if (pdv) {
          latlngs.push([pdv.lat, pdv.lng])
        }
      })
      
      if (latlngs.length > 1) {
        const color = routeColors[idx % routeColors.length]
        const polyline = L.polyline(latlngs, {
          color: color,
          weight: 2.5,
          opacity: 0.45,
          dashArray: '5, 8'
        })
        polyline.bindTooltip(`Ruta de ${worker.name}`, { sticky: true })
        polyline.addTo(markerGroup)
      }
    })

    // 5. Render Active Workers with Simulated Movement
    reponedores.forEach((worker) => {
      const sequence = worker.sequence || []
      const totalCount = sequence.length
      
      let lat = worker.lat
      let lng = worker.lng

      if (totalCount > 1) {
        // Find current segment for animation
        const visitedCount = Math.round((worker.routeProgress / 100) * totalCount)
        const prevPdvId = sequence[Math.max(0, visitedCount - 1)]
        const nextPdvId = sequence[Math.min(totalCount - 1, visitedCount)]
        
        const prevPdv = pdvs.find(p => p.id === prevPdvId)
        const nextPdv = pdvs.find(p => p.id === nextPdvId)
        
        if (prevPdv && nextPdv && prevPdv.id !== nextPdv.id) {
          // Slide smoothly along the line
          lat = prevPdv.lat + (nextPdv.lat - prevPdv.lat) * animationTime
          lng = prevPdv.lng + (nextPdv.lng - prevPdv.lng) * animationTime
        } else if (prevPdv) {
          lat = prevPdv.lat
          lng = prevPdv.lng
        }
      }

      // Custom green marker for active worker
      const workerMarker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95,
      })

      workerMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; color: #1f2937; min-width: 150px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #047857;">${worker.name}</h4>
          <div style="margin-bottom: 2px;"><strong>ID:</strong> ${worker.id}</div>
          <div style="margin-bottom: 2px;"><strong>Ruta:</strong> ${worker.route}</div>
          <div style="margin-bottom: 4px;"><strong>Estado:</strong> ${worker.status}</div>
          <div style="background-color: #f3f4f6; border-radius: 4px; padding: 4px 6px; font-weight: 500;">
            Progreso: ${worker.routeProgress.toFixed(0)}% completado
          </div>
          ${worker.delay > 0 ? `
            <div style="margin-top: 4px; color: #dc2626; font-weight: bold;">
              ⚠️ Retraso: ${worker.delay.toFixed(0)} min
            </div>
          ` : ''}
        </div>
      `)

      workerMarker.addTo(markerGroup)
    })

    // Cleanup layer group when data changes
    return () => {
      markerGroup.remove()
    }
  }, [pdvs, reponedores, animationTime])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Map Container */}
      <Card className="lg:col-span-3 border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
          <div>
            <CardTitle>Mapa de Operaciones de Campo en Vivo</CardTitle>
          </div>
          
          {/* Simulation Playback Controls */}
          <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-lg border border-border">
            <Button
              size="xs"
              variant={isPlaying ? "ghost" : "secondary"}
              onClick={() => setIsPlaying(false)}
              className="h-7 px-2 cursor-pointer text-xs flex items-center gap-1"
            >
              <Pause className="h-3 w-3" /> Pausar
            </Button>
            <Button
              size="xs"
              variant={isPlaying ? "secondary" : "ghost"}
              onClick={() => setIsPlaying(true)}
              className="h-7 px-2 cursor-pointer text-xs flex items-center gap-1"
            >
              <Play className="h-3 w-3" /> Reanudar
            </Button>
            <div className="h-4 w-[1px] bg-border mx-1" />
            <span className="text-[10px] uppercase font-semibold text-muted-foreground px-1">Velocidad:</span>
            {[1, 2, 5].map((mult) => (
              <button
                key={mult}
                onClick={() => setSpeedMultiplier(mult)}
                className={`text-xs font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  speedMultiplier === mult 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 rounded-lg overflow-hidden relative h-[450px] w-full border border-border">
            <div ref={mapContainerRef} className="h-full w-full z-0" />
            
            {/* Floating Geographical Legend Box */}
            <div className="absolute bottom-4 right-4 z-[400] bg-card/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-lg max-w-[190px] text-xs space-y-2 pointer-events-auto">
              <h5 className="font-semibold text-foreground/90 border-b border-border pb-1 mb-1.5 uppercase tracking-wider text-[9px]">Categoría Cliente</h5>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: '#ef4444' }}></div>
                  <span className="text-foreground/80 font-medium">Pareto (Alto Valor)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span className="text-foreground/80 font-medium">Mayorista</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: '#9ca3af' }}></div>
                  <span className="text-foreground/80 font-medium">Detallista / Minorista</span>
                </div>
                <div className="border-t border-border pt-1.5 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border border-white bg-emerald-500"></div>
                    <span className="text-foreground/80 font-semibold">Reponedor Activo</span>
                  </div>
                </div>
              </div>
            </div>
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
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <span className="text-foreground/70">Reponedores Activos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        .pdv-sequence-badge {
          background: #1e293b !important;
          border: 1px solid #475569 !important;
          color: #f8fafc !important;
          font-weight: 700 !important;
          font-size: 9px !important;
          padding: 1px 4px !important;
          border-radius: 4px !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
          opacity: 0.95 !important;
          pointer-events: none;
        }
      `}</style>

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
