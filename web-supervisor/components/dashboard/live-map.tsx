'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause, X, ChevronRight } from 'lucide-react'
import type { PDV } from '@/lib/mock-data'

interface LiveMapProps {
  pdvs: PDV[]
  reponedores: any[]
  selectedWorkerId?: string | null
  onSelectWorkerId?: (id: string | null) => void
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  'Cochabamba': { lat: -17.3895, lng: -66.1568, zoom: 12 },
  'Santa Cruz': { lat: -17.7862, lng: -63.1812, zoom: 12 },
  'La Paz': { lat: -16.5000, lng: -68.1500, zoom: 12 },
}

export function LiveMap({ pdvs, reponedores, selectedWorkerId: propSelectedWorkerId, onSelectWorkerId }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [animationTime, setAnimationTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)

  const [internalSelectedWorkerId, setInternalSelectedWorkerId] = useState<string | null>(null)
  const selectedWorkerId = propSelectedWorkerId !== undefined ? propSelectedWorkerId : internalSelectedWorkerId
  const setSelectedWorkerId = onSelectWorkerId || setInternalSelectedWorkerId

  const [showPareto, setShowPareto] = useState(true)
  const [showMayorista, setShowMayorista] = useState(true)
  const [showDetallista, setShowDetallista] = useState(true)
  const [showWorkers, setShowWorkers] = useState(true)

  // Get associated cities dynamically from the PDVs list
  const associatedCities = Array.from(new Set(pdvs.map(p => p.city).filter(Boolean))) as string[]
  const sortedCities = ['Todas', ...associatedCities.sort()]

  const [selectedCity, setSelectedCity] = useState<string>('Todas')

  // Sync selectedCity when a worker is selected
  useEffect(() => {
    if (selectedWorkerId) {
      const worker = reponedores.find(w => (w.dbUuid || w.id) === selectedWorkerId)
      if (worker && worker.city) {
        setSelectedCity(worker.city)
      }
    }
  }, [selectedWorkerId, reponedores])

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    if (selectedWorkerId) {
      const worker = reponedores.find(w => (w.dbUuid || w.id) === selectedWorkerId)
      if (worker && (city === 'Todas' || worker.city !== city)) {
        setSelectedWorkerId(null)
      }
    }
  }

  // Filter active reponedores by city
  const activeReponedores = reponedores.filter(w => {
    if (w.status === 'Completado') return false
    if (selectedCity !== 'Todas' && w.city !== selectedCity) return false
    return true
  })

  const selectedWorker = selectedWorkerId
    ? reponedores.find(w => (w.dbUuid || w.id) === selectedWorkerId) ?? null
    : null

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
      case 'Pareto':   return '#ef4444'
      case 'Mayorista': return '#3b82f6'
      default:          return '#9ca3af'
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

  // Pan and zoom map when selectedCity changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (selectedCity === 'Todas') {
      if (pdvs.length > 0) {
        const points = pdvs.map(p => [p.lat, p.lng] as L.LatLngTuple)
        try {
          map.fitBounds(L.latLngBounds(points), { padding: [30, 30] })
        } catch (_) {}
      } else {
        map.setView([-17.0, -65.0], 6)
      }
    } else {
      const coords = CITY_COORDINATES[selectedCity]
      if (coords) {
        map.setView([coords.lat, coords.lng], coords.zoom)
      }
    }
  }, [selectedCity])

  // Sync markers when pdvs, reponedores, animationTime, or selectedWorkerId changes
  useEffect(() => {
    if (!mapContainerRef.current) return

    // 1. Initialize Map
    if (!mapInstanceRef.current) {
      let centerLat = -17.3895
      let centerLng = -66.1568
      let zoom = 11

      if (selectedCity !== 'Todas') {
        const coords = CITY_COORDINATES[selectedCity]
        if (coords) {
          centerLat = coords.lat
          centerLng = coords.lng
          zoom = coords.zoom
        }
      } else {
        centerLat = -17.0
        centerLng = -65.0
        zoom = 6
      }

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([centerLat, centerLng], zoom)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contribuyentes'
      }).addTo(map)

      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current
    const markerGroup = L.layerGroup().addTo(map)

    // ── Determine which workers & PDVs to render ───────────────────────────────
    const activeWorkers = selectedWorker ? [selectedWorker] : (showWorkers ? activeReponedores : [])
    const routeColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

    // Build a set of PDV IDs that are in the active worker(s) sequences
    const activePdvIds = new Set<string>()
    activeWorkers.forEach(w => (w.sequence || []).forEach((id: string) => activePdvIds.add(id)))

    // Build visited PDV ids set (from all workers, but cross-reference pdv.visited)
    const visitedPdvIds = new Set<string>(
      pdvs.filter(p => p.visited).map(p => p.id)
    )

    // ── Determine progress index for selected worker ───────────────────────────
    // visitedCount = how many PDVs in the sequence are marked as visited
    const getVisitedCount = (worker: any) => {
      const seq: string[] = worker.sequence || []
      return seq.filter((id: string) => visitedPdvIds.has(id)).length
    }

    // ── 3. Render PDVs ─────────────────────────────────────────────────────────
    const pdvsToRender = (selectedWorker
      ? pdvs.filter(p => activePdvIds.has(p.id))
      : pdvs
    ).filter(p => {
      if (selectedCity !== 'Todas' && p.city !== selectedCity) return false
      if (p.type === 'Pareto' && !showPareto) return false
      if (p.type === 'Mayorista' && !showMayorista) return false
      if (p.type === 'Detallista' && !showDetallista) return false
      return true
    })

    pdvsToRender.forEach((pdv) => {
      const isInRoute = activePdvIds.has(pdv.id)
      const isVisited = visitedPdvIds.has(pdv.id)

      // In filtered mode: visited = bright filled, pending = dimmed outline
      // In full mode: normal category color
      let fillColor: string
      let fillOpacity: number
      let radius: number
      let strokeColor: string
      let strokeWeight: number

      if (selectedWorker) {
        if (isVisited) {
          // Bright green with checkmark feel
          fillColor = '#10b981'
          fillOpacity = 0.95
          radius = 8
          strokeColor = '#ffffff'
          strokeWeight = 2.5
        } else {
          // Pending — muted category color
          fillColor = getPDVColor(pdv.type)
          fillOpacity = 0.3
          radius = 6
          strokeColor = '#94a3b8'
          strokeWeight = 1
        }
      } else {
        fillColor = getPDVColor(pdv.type)
        fillOpacity = 0.75
        radius = 5
        strokeColor = '#ffffff'
        strokeWeight = 1.5
      }

      const marker = L.circleMarker([pdv.lat, pdv.lng], {
        radius,
        fillColor,
        color: strokeColor,
        weight: strokeWeight,
        opacity: 0.9,
        fillOpacity,
      })

      // Sequence badge only in filtered route view
      if (selectedWorker) {
        const seq: string[] = selectedWorker.sequence || []
        const seqIdx = seq.indexOf(pdv.id)
        if (seqIdx !== -1) {
          const label = isVisited ? `✓` : `${seqIdx + 1}`
          marker.bindTooltip(label, {
            permanent: true,
            direction: 'top',
            className: isVisited ? 'pdv-sequence-badge pdv-visited-badge' : 'pdv-sequence-badge',
            offset: [0, -3]
          })
        }
      } else {
        // Show sequence number from any worker
        for (const worker of reponedores) {
          const seq = worker.sequence || []
          const idx = seq.indexOf(pdv.id)
          if (idx !== -1) {
            marker.bindTooltip(`${idx + 1}`, {
              permanent: true,
              direction: 'top',
              className: 'pdv-sequence-badge',
              offset: [0, -3]
            })
            break
          }
        }
      }

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; color: #1f2937;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #111827;">${pdv.nombre}</h4>
          <div style="margin-bottom: 2px;"><strong>ID:</strong> ${pdv.id}</div>
          <div style="margin-bottom: 2px;"><strong>Clasificación:</strong> ${pdv.type}</div>
          <div><strong>Estado:</strong> ${isVisited ? '✅ Visitado' : '⏳ Pendiente'}</div>
        </div>
      `)

      marker.addTo(markerGroup)
    })

    // ── 4. Render Route Polylines ──────────────────────────────────────────────
    activeWorkers.forEach((worker, idx) => {
      const sequence: string[] = worker.sequence || []
      if (sequence.length <= 1) return

      const visitedCount = getVisitedCount(worker)

      // Split polyline into visited (solid) and pending (dashed)
      const allCoords: L.LatLngTuple[] = []
      sequence.forEach((pdvId: string) => {
        const pdv = pdvs.find(p => p.id === pdvId)
        if (pdv && typeof pdv.lat === 'number' && typeof pdv.lng === 'number' && !isNaN(pdv.lat) && !isNaN(pdv.lng)) {
          allCoords.push([pdv.lat, pdv.lng])
        }
      })

      if (allCoords.length <= 1) return

      const color = routeColors[idx % routeColors.length]

      if (selectedWorker) {
        // Visited segment — solid bright line
        const visitedCoords = allCoords.slice(0, Math.max(1, visitedCount + 1))
        if (visitedCoords.length > 1) {
          L.polyline(visitedCoords, {
            color: '#10b981',
            weight: 4,
            opacity: 0.9,
            dashArray: undefined,
          }).bindTooltip(`Tramo recorrido — ${worker.name}`, { sticky: true })
            .addTo(markerGroup)
        }

        // Pending segment — dashed dim line
        const pendingCoords = allCoords.slice(Math.max(0, visitedCount))
        if (pendingCoords.length > 1) {
          L.polyline(pendingCoords, {
            color: '#64748b',
            weight: 2,
            opacity: 0.4,
            dashArray: '6 8',
          }).bindTooltip(`Tramo pendiente — ${worker.name}`, { sticky: true })
            .addTo(markerGroup)
        }
      } else {
        // Full view — single uniform dashed line per worker
        L.polyline(allCoords, {
          color,
          weight: 2.5,
          opacity: 0.4,
          dashArray: '5, 8'
        }).bindTooltip(`Ruta de ${worker.name}`, { sticky: true })
          .addTo(markerGroup)
      }
    })

    // ── 5. Render Active Workers with Simulated Movement ──────────────────────
    activeWorkers.forEach((worker) => {
      const sequence: string[] = worker.sequence || []
      const totalCount = sequence.length

      let lat = worker.lat
      let lng = worker.lng

      if (totalCount > 1) {
        const visitedCount = Math.round((worker.routeProgress / 100) * totalCount)
        const prevPdvId = sequence[Math.max(0, visitedCount - 1)]
        const nextPdvId = sequence[Math.min(totalCount - 1, visitedCount)]
        const prevPdv = pdvs.find(p => p.id === prevPdvId)
        const nextPdv = pdvs.find(p => p.id === nextPdvId)

        if (prevPdv && nextPdv && prevPdv.id !== nextPdv.id) {
          lat = prevPdv.lat + (nextPdv.lat - prevPdv.lat) * animationTime
          lng = prevPdv.lng + (nextPdv.lng - prevPdv.lng) * animationTime
        } else if (prevPdv) {
          lat = prevPdv.lat
          lng = prevPdv.lng
        }
      }

      // Safe fallback for coordinates if undefined or invalid (e.g. in mock/empty state)
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        const fallbackPdv = pdvs.find(p => p.id === worker.currentPDV)
        if (fallbackPdv && typeof fallbackPdv.lat === 'number' && typeof fallbackPdv.lng === 'number' && !isNaN(fallbackPdv.lat) && !isNaN(fallbackPdv.lng)) {
          lat = fallbackPdv.lat
          lng = fallbackPdv.lng
        } else {
          const wCity = worker.city || 'Santa Cruz'
          const cityCoords = {
            'Cochabamba': { lat: -17.3895, lng: -66.1568 },
            'Santa Cruz': { lat: -17.7862, lng: -63.1812 },
            'La Paz': { lat: -16.5000, lng: -68.1500 }
          }
          const coords = cityCoords[wCity as keyof typeof cityCoords] || cityCoords['Santa Cruz']
          lat = coords.lat
          lng = coords.lng
        }
      }

      const isDelayed = worker.status === 'Retrasado'
      const workerColor = isDelayed ? '#ef4444' : '#10b981'

      const workerMarker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: workerColor,
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95,
      })

      workerMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; color: #1f2937; min-width: 160px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: ${isDelayed ? '#dc2626' : '#047857'};">${worker.name}</h4>
          <div style="margin-bottom: 2px;"><strong>Estado:</strong> ${worker.status}</div>
          <div style="background:#f3f4f6;border-radius:4px;padding:4px 6px;font-weight:500;margin-top:4px;">
            Progreso: ${worker.routeProgress.toFixed(0)}% completado
          </div>
          ${worker.delay > 0 ? `<div style="margin-top:4px;color:#dc2626;font-weight:bold;">⚠️ Retraso: ${worker.delay.toFixed(0)} min</div>` : ''}
        </div>
      `)
      workerMarker.addTo(markerGroup)
    })

    // ── 6. Auto-zoom to selected worker's route ───────────────────────────────
    if (selectedWorker && activePdvIds.size > 0) {
      const points: L.LatLngTuple[] = []
      pdvs.forEach(p => { if (activePdvIds.has(p.id)) points.push([p.lat, p.lng]) })
      if (points.length > 0) {
        try { map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 }) } catch (_) {}
      }
    }

    return () => { markerGroup.remove() }
  }, [pdvs, reponedores, animationTime, selectedWorkerId, showPareto, showMayorista, showDetallista, showWorkers, selectedCity])

  // Build ordered PDV list for selected worker's sidebar detail
  const workerSequencePdvs: Array<PDV & { seqIndex: number }> = selectedWorker
    ? (selectedWorker.sequence || [])
        .map((id: string, i: number) => {
          const pdv = pdvs.find(p => p.id === id)
          return pdv ? { ...pdv, seqIndex: i + 1 } : null
        })
        .filter(Boolean)
    : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Map Container */}
      <Card className="lg:col-span-3 border-border shadow-sm">
        <CardHeader className="p-3 pb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider shrink-0">Mapa de Operaciones de Campo en Vivo</CardTitle>
            
            {/* City Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-muted border border-border text-foreground text-[10px] sm:text-xs font-semibold rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-muted/80 transition-colors"
              >
                {sortedCities.map((city) => (
                  <option key={city} value={city} className="bg-card text-foreground font-semibold">
                    {city === 'Todas' ? '📍 Todas las Ciudades' : `🏢 ${city}`}
                  </option>
                ))}
              </select>
            </div>

            {selectedWorker && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {selectedWorker.name}
                <button
                  onClick={() => setSelectedWorkerId(null)}
                  className="ml-1 hover:text-destructive transition-colors"
                  title="Volver a vista general"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Simulation Playback Controls */}
          <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-lg border border-border shrink-0">
            <Button
              size="sm"
              variant={isPlaying ? 'ghost' : 'secondary'}
              onClick={() => setIsPlaying(false)}
              className="h-7 px-2 cursor-pointer text-xs flex items-center gap-1"
            >
              <Pause className="h-3 w-3" /> Pausar
            </Button>
            <Button
              size="sm"
              variant={isPlaying ? 'secondary' : 'ghost'}
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
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-0">
          <div className="bg-slate-100 rounded-lg overflow-hidden relative h-[390px] w-full border border-border">
            <div ref={mapContainerRef} className="h-full w-full z-0" />

            {/* Legend (Only route legend when worker is focused) */}
            {selectedWorker && (
              <div className="absolute bottom-4 right-4 z-[400] bg-card/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-lg max-w-[200px] text-xs space-y-2 pointer-events-auto">
                <h5 className="font-semibold text-foreground/90 border-b border-border pb-1 mb-1.5 uppercase tracking-wider text-[9px]">
                  Ruta — {selectedWorker.name}
                </h5>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                    <span className="text-foreground/80 font-medium">PDV Visitado ✓</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-slate-400 border border-slate-300 opacity-50" />
                    <span className="text-foreground/80 font-medium">PDV Pendiente</span>
                  </div>
                  <div className="border-t border-border pt-1.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-6 rounded bg-emerald-500" />
                      <span className="text-foreground/70">Tramo recorrido</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-6 rounded bg-slate-400 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#94a3b8 0,#94a3b8 4px,transparent 4px,transparent 8px)' }} />
                      <span className="text-foreground/70">Tramo pendiente</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selected worker filter banner */}
            {selectedWorker && (
              <div className="absolute top-3 left-3 z-[400] bg-primary/90 backdrop-blur-sm text-primary-foreground text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Mostrando ruta de {selectedWorker.name} · {workerSequencePdvs.filter(p => p.visited).length}/{workerSequencePdvs.length} PDVs visitados
                <button onClick={() => setSelectedWorkerId(null)} className="ml-1 hover:opacity-70 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {!selectedWorker && (
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <button
                onClick={() => setShowPareto(!showPareto)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                  showPareto
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold shadow-sm'
                    : 'bg-muted/40 border-border/40 text-muted-foreground opacity-50 hover:opacity-80'
                }`}
              >
                <div className={`h-2.5 w-2.5 rounded-full ${showPareto ? 'bg-rose-500' : 'bg-muted-foreground/50'}`} />
                PDVs Pareto
              </button>

              <button
                onClick={() => setShowMayorista(!showMayorista)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                  showMayorista
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                    : 'bg-muted/40 border-border/40 text-muted-foreground opacity-50 hover:opacity-80'
                }`}
              >
                <div className={`h-2.5 w-2.5 rounded-full ${showMayorista ? 'bg-blue-500' : 'bg-muted-foreground/50'}`} />
                PDVs Mayoristas
              </button>

              <button
                onClick={() => setShowDetallista(!showDetallista)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                  showDetallista
                    ? 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400 font-bold shadow-sm'
                    : 'bg-muted/40 border-border/40 text-muted-foreground opacity-50 hover:opacity-80'
                }`}
              >
                <div className={`h-2.5 w-2.5 rounded-full ${showDetallista ? 'bg-slate-400' : 'bg-muted-foreground/50'}`} />
                PDVs Detallistas
              </button>

              <button
                onClick={() => setShowWorkers(!showWorkers)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                  showWorkers
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                    : 'bg-muted/40 border-border/40 text-muted-foreground opacity-50 hover:opacity-80'
                }`}
              >
                <div className={`h-2.5 w-2.5 rounded-full ${showWorkers ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                Reponedores Activos
              </button>
            </div>
          )}
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
        .pdv-visited-badge {
          background: #059669 !important;
          border: 1px solid #10b981 !important;
          color: #ffffff !important;
          font-size: 10px !important;
        }
      `}</style>

      {/* Right Sidebar — Worker list OR sequence detail */}
      <Card className="border-border shadow-sm">
        <CardHeader className="p-3 pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">
              {selectedWorker ? 'Secuencia de Ruta' : 'Reponedores Activos'}
            </CardTitle>
            {selectedWorker && (
              <button
                onClick={() => setSelectedWorkerId(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" /> Todos
              </button>
            )}
          </div>
          {selectedWorker && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {selectedWorker.name} · {workerSequencePdvs.filter(p => p.visited).length} de {workerSequencePdvs.length} visitados
            </p>
          )}
        </CardHeader>

        <CardContent className="p-3 pt-0">
          {/* ── Full list view ── */}
          {!selectedWorker && (
            <div className="space-y-2 max-h-[390px] overflow-y-auto pr-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                Clic para ver ruta individual
              </p>
              {activeReponedores.map((worker) => {
                const workerId = worker.dbUuid || worker.id
                const seq: string[] = worker.sequence || []
                const visitedCount = seq.filter((id: string) => pdvs.find(p => p.id === id)?.visited).length
                const pct = seq.length > 0 ? Math.round((visitedCount / seq.length) * 100) : 0

                return (
                  <button
                    key={workerId}
                    onClick={() => setSelectedWorkerId(workerId)}
                    className="w-full text-left p-3 border border-border rounded-xl hover:bg-muted/50 hover:border-primary/40 hover:shadow-sm transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{worker.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{worker.id}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={worker.status === 'Retrasado' ? 'destructive' : 'secondary'}
                        className={`text-[10px] ${worker.status === 'Completado' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : ''}`}
                      >
                        {worker.status}
                      </Badge>
                      {worker.delay > 0 && (
                        <span className="text-[10px] text-destructive font-semibold">+{worker.delay.toFixed(0)} min</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{visitedCount}/{seq.length}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Route detail view (selected worker) ── */}
          {selectedWorker && (
            <div className="space-y-1 max-h-[390px] overflow-y-auto pr-1">
              {/* Progress summary */}
              <div className="mb-3 p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="text-muted-foreground">Progreso general</span>
                  <span className="font-bold text-foreground">
                    {workerSequencePdvs.filter(p => p.visited).length}/{workerSequencePdvs.length} PDVs
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{
                      width: `${workerSequencePdvs.length > 0
                        ? (workerSequencePdvs.filter(p => p.visited).length / workerSequencePdvs.length) * 100
                        : 0}%`
                    }}
                  />
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="text-emerald-400">●</span> {workerSequencePdvs.filter(p => p.visited).length} visitados</span>
                  <span className="flex items-center gap-1"><span className="text-slate-400">●</span> {workerSequencePdvs.filter(p => !p.visited).length} pendientes</span>
                </div>
              </div>

              {/* Ordered stop list */}
              {workerSequencePdvs.map((pdv, idx) => {
                const isNext = !pdv.visited && workerSequencePdvs.slice(0, idx).every(p => p.visited)
                return (
                  <div
                    key={pdv.id}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
                      pdv.visited
                        ? 'bg-emerald-500/8 border-emerald-500/20'
                        : isNext
                        ? 'bg-primary/8 border-primary/30 shadow-sm'
                        : 'bg-muted/20 border-border/50 opacity-60',
                    ].join(' ')}
                  >
                    {/* Step number / check */}
                    <div className={[
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      pdv.visited
                        ? 'bg-emerald-500 text-white'
                        : isNext
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground border border-border',
                    ].join(' ')}>
                      {pdv.visited ? '✓' : pdv.seqIndex}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${pdv.visited ? 'text-foreground line-through decoration-emerald-500/50' : 'text-foreground'}`}>
                        {pdv.nombre}
                      </p>
                      <p className={`text-[10px] ${pdv.visited ? 'text-emerald-400' : isNext ? 'text-primary' : 'text-muted-foreground'}`}>
                        {pdv.visited ? 'Completado ✓' : isNext ? '← Próxima parada' : `Pendiente · ${pdv.type}`}
                      </p>
                    </div>

                    {/* Category dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getPDVColor(pdv.type), opacity: pdv.visited ? 0.5 : 1 }}
                    />
                  </div>
                )
              })}

              {workerSequencePdvs.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin PDVs asignados en la secuencia.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
