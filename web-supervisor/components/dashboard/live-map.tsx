'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
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

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export function LiveMap({ pdvs, reponedores, selectedWorkerId: propSelectedWorkerId, onSelectWorkerId }: LiveMapProps) {
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
  
  const [viewState, setViewState] = useState({
    longitude: -63.1812,
    latitude: -17.7862,
    zoom: 12,
    pitch: 45,
    bearing: 0
  })

  const [routeGeometry, setRouteGeometry] = useState<any>(null)

  const associatedCities = Array.from(new Set(pdvs.map(p => p.city).filter(Boolean))) as string[]
  const sortedCities = ['Todas', ...associatedCities.sort()]
  const [selectedCity, setSelectedCity] = useState<string>('Todas')

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
    
    if (city !== 'Todas' && CITY_COORDINATES[city]) {
      setViewState(prev => ({
        ...prev,
        longitude: CITY_COORDINATES[city].lng,
        latitude: CITY_COORDINATES[city].lat,
        zoom: CITY_COORDINATES[city].zoom
      }))
    }
  }

  const activeReponedores = reponedores.filter(w => {
    if (w.status === 'Completado') return false
    if (selectedCity !== 'Todas' && w.city !== selectedCity) return false
    return true
  })

  const selectedWorker = selectedWorkerId
    ? reponedores.find(w => (w.dbUuid || w.id) === selectedWorkerId) ?? null
    : null

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

  const activeWorkers = selectedWorker ? [selectedWorker] : (showWorkers ? activeReponedores : [])
  const activePdvIds = new Set<string>()
  activeWorkers.forEach(w => (w.sequence || []).forEach((id: string) => activePdvIds.add(id)))
  
  const visitedPdvIds = new Set<string>(pdvs.filter(p => p.visited).map(p => p.id))

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

  // Fetch Real Mapbox Directions Route
  useEffect(() => {
    if (!selectedWorker || !MAPBOX_TOKEN || MAPBOX_TOKEN === 'PEGA_TU_TOKEN_AQUI') {
      setRouteGeometry(null)
      return
    }

    const sequence: string[] = selectedWorker.sequence || []
    const coords = sequence.map(id => {
      const p = pdvs.find(x => x.id === id)
      return p ? `${p.lng},${p.lat}` : null
    }).filter(Boolean)

    if (coords.length > 1 && coords.length <= 25) { // Mapbox Directions API limit is 25 waypoints
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords.join(';')}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            setRouteGeometry(data.routes[0].geometry)
          }
        })
        .catch(err => console.error("Error fetching route:", err))
    } else {
       setRouteGeometry(null)
    }
  }, [selectedWorker, pdvs])

  // Fallback straight lines route layer if no real geometry
  const fallbackRouteSource = useMemo(() => {
     if (routeGeometry || !selectedWorker) return null;
     const sequence: string[] = selectedWorker.sequence || []
     const coords = sequence.map(id => {
        const p = pdvs.find(x => x.id === id)
        return p ? [p.lng, p.lat] : null
     }).filter(Boolean) as number[][]

     return {
        type: 'Feature' as const,
        properties: {},
        geometry: {
           type: 'LineString' as const,
           coordinates: coords
        }
     }
  }, [selectedWorker, pdvs, routeGeometry])

  const workerSequencePdvs: Array<PDV & { seqIndex: number }> = selectedWorker
    ? (selectedWorker.sequence || [])
        .map((id: string, i: number) => {
          const pdv = pdvs.find(p => p.id === id)
          return pdv ? { ...pdv, seqIndex: i + 1 } : null
        })
        .filter(Boolean)
    : []

  const isTokenValid = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'PEGA_TU_TOKEN_AQUI'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <Card className="lg:col-span-3 border-border shadow-sm">
        <CardHeader className="p-3 pb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider shrink-0">Mapa Interactivo (Mapbox GL)</CardTitle>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-card hover:bg-muted/30 border border-border/80 text-foreground text-xs font-bold rounded-lg px-3 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer transition-all duration-200"
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
          <div className="bg-slate-100 rounded-lg overflow-hidden relative h-[450px] w-full border border-border">
            {!isTokenValid && (
              <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white p-6 text-center">
                <h3 className="text-xl font-bold text-rose-500 mb-2">Falta Mapbox Token</h3>
                <p className="text-sm text-slate-300 max-w-md">Para visualizar el mapa 3D y trazar rutas, necesitas proveer un token de Mapbox en el archivo <code className="bg-slate-800 px-2 py-1 rounded">.env.local</code>.</p>
              </div>
            )}

            {isTokenValid && (
              <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                interactive={true}
              >
                <NavigationControl position="top-right" />

                {/* Render Selected Route */}
                {selectedWorker && routeGeometry && (
                  <Source id="real-route" type="geojson" data={{ type: 'Feature', geometry: routeGeometry, properties: {} }}>
                    <Layer
                      id="route-line"
                      type="line"
                      paint={{
                        'line-color': '#10b981',
                        'line-width': 4,
                        'line-opacity': 0.8
                      }}
                    />
                  </Source>
                )}

                {/* Fallback Straight Line Route */}
                {selectedWorker && !routeGeometry && fallbackRouteSource && (
                  <Source id="fallback-route" type="geojson" data={fallbackRouteSource}>
                     <Layer
                        id="fallback-line"
                        type="line"
                        paint={{
                           'line-color': '#64748b',
                           'line-width': 3,
                           'line-dasharray': [2, 2],
                           'line-opacity': 0.8
                        }}
                     />
                  </Source>
                )}

                {/* Render PDVs */}
                {pdvsToRender.map(pdv => {
                  const isVisited = visitedPdvIds.has(pdv.id)
                  const isInRoute = activePdvIds.has(pdv.id)
                  
                  let bg = getPDVColor(pdv.type)
                  let size = 12
                  let opacity = 0.8

                  if (selectedWorker) {
                     if (isVisited) {
                        bg = '#10b981'
                        size = 16
                     } else if (!isInRoute) {
                        opacity = 0.3
                     }
                  }

                  return (
                    <Marker key={pdv.id} longitude={pdv.lng} latitude={pdv.lat} anchor="center">
                      <div
                        style={{
                          backgroundColor: bg,
                          width: size,
                          height: size,
                          borderRadius: '50%',
                          border: '2px solid white',
                          opacity: opacity,
                          cursor: 'pointer',
                          boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                        }}
                        title={`${pdv.nombre} - ${pdv.type}`}
                      />
                    </Marker>
                  )
                })}

                {/* Render Active Workers (Simulation) */}
                {activeWorkers.map(worker => {
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

                  const isDelayed = worker.status === 'Retrasado'
                  const workerColor = isDelayed ? '#ef4444' : '#10b981'

                  if (isNaN(lat) || isNaN(lng)) return null;

                  return (
                    <Marker key={`worker-${worker.id}`} longitude={lng} latitude={lat} anchor="bottom">
                      <div className="flex flex-col items-center">
                         <div className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md mb-1" style={{ color: workerColor }}>
                            {worker.name}
                         </div>
                         <div style={{
                            width: 20, height: 20, backgroundColor: workerColor,
                            borderRadius: '50%', border: '3px solid white',
                            boxShadow: '0 0 15px rgba(0,0,0,0.6)',
                            animation: isPlaying ? 'pulse 2s infinite' : 'none'
                         }} />
                      </div>
                    </Marker>
                  )
                })}
              </Map>
            )}

            {selectedWorker && (
              <div className="absolute top-3 left-3 z-[400] bg-primary/90 backdrop-blur-sm text-primary-foreground text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Mostrando ruta real de {selectedWorker.name}
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
          {!selectedWorker && (
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                Clic para ver ruta real
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

          {selectedWorker && (
            <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
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
              </div>

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

                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getPDVColor(pdv.type), opacity: pdv.visited ? 0.5 : 1 }}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
