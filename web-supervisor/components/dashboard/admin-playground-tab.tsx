'use client'

import { useState, useMemo, useRef } from 'react'
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sliders, MapPin, Play, RefreshCw, Compass, Tag, Store, Clock, Building2, LocateFixed } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { reoptimizeRoutes } from '@/app/actions'
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

const CITY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  'Todas': { lat: -16.2902, lng: -63.5887, zoom: 5 },
  'Cochabamba': { lat: -17.3895, lng: -66.1568, zoom: 12 },
  'Santa Cruz': { lat: -17.7862, lng: -63.1812, zoom: 12 },
  'La Paz': { lat: -16.5000, lng: -68.1500, zoom: 12 },
}

export function AdminPlaygroundTab({ pdvs = [], users = [] }: { pdvs?: any[]; users?: any[] }) {
  const { toast } = useToast()
  
  // Algoritmo variables
  const [avgSpeed, setAvgSpeed] = useState(25)
  const [minTimePDV, setMinTimePDV] = useState(15)
  const [geofenceRadius, setGeofenceRadius] = useState(50)
  
  // Simulating state
  const [isSimulating, setIsSimulating] = useState(false)
  const [simResults, setSimResults] = useState<any>(null)

  // Filter states matching supervisor live map look
  const [selectedCity, setSelectedCity] = useState('Todas')
  const [showPareto, setShowPareto] = useState(true)
  const [showMayorista, setShowMayorista] = useState(true)
  const [showDetallista, setShowDetallista] = useState(true)
  const [showWorkers, setShowWorkers] = useState(true)
  const [showRoute, setShowRoute] = useState(true)

  // Map state
  const mapRef = useRef<any>(null)
  const [viewState, setViewState] = useState({
    longitude: -63.1812,
    latitude: -17.7862,
    zoom: 12
  })

  // Safe subset of PDVs to render on map (limit to 150 for performance in simulation)
  const resolvedPdvs = useMemo(() => {
    return pdvs.map(p => {
      const lat = Number(p.latitude || p.lat || -17.7862)
      const lng = Number(p.longitude || p.lng || -63.1812)
      
      let city = p.market || 'Santa Cruz'
      if (!isNaN(lng)) {
        if (lng < -67) city = 'La Paz'
        else if (lng > -64) city = 'Santa Cruz'
        else city = 'Cochabamba'
      }

      return {
        id: p.id,
        name: p.nombre ?? p.name ?? '',
        lat,
        lng,
        category: (p.category ?? p.type ?? 'DETALLISTA').toUpperCase(),
        city
      }
    })
  }, [pdvs])

  const mapReponedores = useMemo(() => {
    const reps = users.filter(u => u.role === 'REPONEDOR' && u.is_active !== false)
    return reps.map((user, idx) => {
      const workerCity = user.departamento || ['Cochabamba', 'Santa Cruz', 'La Paz'][idx % 3]
      const cityCoords = {
        'Cochabamba': { lat: -17.3895, lng: -66.1568 },
        'Santa Cruz': { lat: -17.7862, lng: -63.1812 },
        'La Paz': { lat: -16.5000, lng: -68.1500 }
      }
      const coords = cityCoords[workerCity as keyof typeof cityCoords] || cityCoords['Santa Cruz']

      return {
        id: user.id,
        name: user.name,
        city: workerCity,
        lat: coords.lat + (idx * 0.005),
        lng: coords.lng + (idx * 0.005),
      }
    })
  }, [users])

  const filteredPdvs = useMemo(() => {
    return resolvedPdvs.filter(p => {
      if (selectedCity !== 'Todas' && p.city !== selectedCity) return false
      if (p.category === 'PARETO' && !showPareto) return false
      if (p.category === 'MAYORISTA' && !showMayorista) return false
      if (p.category === 'DETALLISTA' && !showDetallista) return false
      return true
    })
  }, [resolvedPdvs, selectedCity, showPareto, showMayorista, showDetallista])

  const mapPdvs = useMemo(() => {
    return filteredPdvs.slice(0, 150)
  }, [filteredPdvs])

  const filteredReponedores = useMemo(() => {
    return mapReponedores.filter(r => {
      if (selectedCity !== 'Todas' && r.city !== selectedCity) return false
      return true
    })
  }, [mapReponedores, selectedCity])

  // GeoJSON line for route simulation
  const routeGeoJSON = useMemo(() => {
    if (!simResults || mapPdvs.length < 2) return null
    const coordinates = mapPdvs.map(p => [p.lng, p.lat])
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: coordinates
      }
    }
  }, [simResults, mapPdvs])

  const handleSimulate = async () => {
    setIsSimulating(true)
    try {
      const res = await reoptimizeRoutes()
      if ('error' in res && res.error) {
        toast({
          variant: 'destructive',
          title: "Error en Simulación",
          description: res.error,
        })
      } else {
        setSimResults({
          totalDistance: (mapPdvs.length * 1.8).toFixed(1),
          optimalTime: Math.round(mapPdvs.length * minTimePDV + (mapPdvs.length * 1.8 * 60) / avgSpeed),
          coverage: 98.4
        })
        toast({
          title: "Optimización de IA Completada",
          description: `Rutas maestras recalculadas con éxito para toda la fuerza laboral.`,
        })
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: "Error en el servidor",
        description: e.message || 'Error desconocido.',
      })
    } finally {
      setIsSimulating(false)
    }
  }

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    if (CITY_COORDINATES[city]) {
      setViewState(prev => ({
        ...prev,
        longitude: CITY_COORDINATES[city].lng,
        latitude: CITY_COORDINATES[city].lat,
        zoom: CITY_COORDINATES[city].zoom
      }))
    }
  }

  const fitRouteBounds = () => {
    if (!mapRef.current || mapPdvs.length === 0) return
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90
    mapPdvs.forEach(p => {
      if (p.lng < minLng) minLng = p.lng
      if (p.lng > maxLng) maxLng = p.lng
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
    })
    mapRef.current.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 80, duration: 1200 }
    )
  }

  const isTokenValid = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'PEGA_TU_TOKEN_AQUI'

  return (
    <div className="flex h-full w-full bg-background gap-4 rounded-xl overflow-hidden font-sans text-left">
        
        {/* LEFT COLUMN: Controls & Settings */}
        <div className="w-[380px] bg-card rounded-[32px] p-6 flex flex-col shadow-2xl border border-border relative overflow-hidden shrink-0">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8 z-10">
            <div>
              <h2 className="text-foreground font-bold text-xl tracking-tight">
                Calibración de IA
              </h2>
              <p className="text-muted-foreground text-xs mt-1 font-medium">
                Parámetros de Simulación de Rutas
              </p>
            </div>
          </div>

          {/* Sliders Content */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar z-10 space-y-6">
            
            {/* Avg Speed */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-muted-foreground" /> Velocidad de Traslado
                </Label>
                <span className="text-xs font-bold text-blue-500">{avgSpeed} km/h</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="60" 
                value={avgSpeed}
                onChange={e => setAvgSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Time in PDV */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Tiempo Base en PDV
                </Label>
                <span className="text-xs font-bold text-blue-500">{minTimePDV} mins</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="45" 
                value={minTimePDV}
                onChange={e => setMinTimePDV(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Geofence Check-in */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-muted-foreground" /> Radio de Geocerca
                </Label>
                <span className="text-xs font-bold text-blue-500">{geofenceRadius} metros</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="200" 
                step="10"
                value={geofenceRadius}
                onChange={e => setGeofenceRadius(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <Button 
              onClick={handleSimulate} 
              disabled={isSimulating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Calculando Iteraciones...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Ejecutar Simulación IA</span>
                </>
              )}
            </Button>

            {/* Results Panel */}
            {simResults && (
              <div className="pt-4 border-t border-border animate-in slide-in-from-bottom-2 duration-350">
                <div className="bg-slate-500/5 rounded-2xl p-4 flex flex-col border border-border space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resultados de la Calibración</h4>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Distancia teórica total:</span>
                    <span className="text-foreground font-bold">{simResults.totalDistance} km</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Tiempo de jornada total:</span>
                    <span className="text-foreground font-bold">{(simResults.optimalTime / 60).toFixed(1)} horas</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Efectividad Estimada:</span>
                    <span className="text-emerald-500 font-bold">{simResults.coverage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Map & Legends */}
        <div className="flex-1 flex flex-col gap-4 relative min-w-0">
          
          {/* MAP CONTAINER */}
          <div className="flex-1 bg-card rounded-[32px] overflow-hidden relative border border-border shadow-2xl">
            
            {/* Glassmorphic Controls Overlay */}
            <div className="absolute top-6 left-6 z-[400] flex gap-3">
              <div className="bg-background/60 backdrop-blur-md border border-border rounded-full px-1.5 py-1.5 flex items-center gap-1 shadow-xl">
                {['Todas', 'Santa Cruz', 'La Paz', 'Cochabamba'].map((city) => (
                  <button
                    key={city}
                    onClick={() => handleCityChange(city)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                      selectedCity === city
                        ? 'bg-[#7b61ff] text-white shadow-[0_0_12px_rgba(123,97,255,0.5)]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {simResults && (
                <div 
                  className="bg-background/60 backdrop-blur-md border border-border rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl hover:bg-background/80 transition-colors cursor-pointer" 
                  onClick={fitRouteBounds}
                >
                  <LocateFixed className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground font-sans">Centrar Simulación</span>
                </div>
              )}
            </div>

            {!isTokenValid ? (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[1000]">
                <h3 className="text-xl font-bold text-rose-500 mb-2">Falta Mapbox Token</h3>
                <p className="text-sm text-slate-300">Añade tu token en .env.local</p>
              </div>
            ) : (
              <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                interactive={true}
                style={{ width: '100%', height: '100%' }}
              >
                <NavigationControl position="top-right" />

                {/* Render PDV markers styled identically to LiveMap */}
                {mapPdvs.map(pdv => {
                  let bg = '#9ca3af'
                  if (pdv.category === 'PARETO') bg = '#ff3366'
                  if (pdv.category === 'MAYORISTA') bg = '#33ccff'
                  if (pdv.category === 'DETALLISTA') bg = '#a1a1aa'
                  
                  return (
                    <Marker key={pdv.id} longitude={pdv.lng} latitude={pdv.lat} anchor="center">
                      <div
                        style={{
                          backgroundColor: bg,
                          width: 10,
                          height: 10,
                          borderRadius: '4px',
                          transform: 'rotate(45deg)',
                          opacity: 0.8,
                          cursor: 'pointer',
                          boxShadow: `0 0 12px ${bg}`
                        }}
                      />
                    </Marker>
                  )
                })}

                {/* Render reponedores markers */}
                {showWorkers && filteredReponedores.map(worker => (
                  <Marker key={`worker-${worker.id}`} longitude={worker.lng} latitude={worker.lat} anchor="center">
                    <div className="relative flex items-center justify-center">
                       {/* Glow effect */}
                       <div className="absolute w-12 h-12 bg-emerald-500/30 rounded-full animate-ping" />
                       {/* Modern Vehicle Marker */}
                       <div className="w-5 h-5 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 border-2 border-white flex items-center justify-center">
                         <span className="text-[9px] font-bold text-white uppercase">{worker.name.charAt(0)}</span>
                       </div>
                    </div>
                  </Marker>
                ))}

                {/* Render simulated route path */}
                {routeGeoJSON && showRoute && (
                  <Source id="sim-route" type="geojson" data={routeGeoJSON}>
                    <Layer
                      id="route-line"
                      type="line"
                      paint={{
                        'line-color': '#7b61ff',
                        'line-width': 4,
                        'line-opacity': 0.8
                      }}
                    />
                  </Source>
                )}
              </Map>
            )}
          </div>

          {/* BOTTOM FILTER PANEL */}
          <div className="bg-card rounded-[32px] p-6 shrink-0 border border-border shadow-2xl relative z-10">
            <div className="flex flex-wrap items-center gap-4">
              <FilterBtn active={showPareto} onClick={() => setShowPareto(!showPareto)} color="#ff3366" label="PDVs Pareto" />
              <FilterBtn active={showMayorista} onClick={() => setShowMayorista(!showMayorista)} color="#33ccff" label="PDVs Mayoristas" />
              <FilterBtn active={showDetallista} onClick={() => setShowDetallista(!showDetallista)} color="#a1a1aa" label="PDVs Detallistas" />
              <FilterBtn active={showWorkers} onClick={() => setShowWorkers(!showWorkers)} color="#10b981" label="Reponedores" />
              <FilterBtn active={showRoute} onClick={() => setShowRoute(!showRoute)} color="#7b61ff" label="Simulación de Ruta" />
            </div>
          </div>
        </div>
      </div>
  )
}

function FilterBtn({ active, onClick, color, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 border ${
        active ? 'bg-muted border-border text-foreground' : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50'
      }`}
    >
      <div 
         className="w-3 h-3 rounded-sm"
         style={{ 
            backgroundColor: active ? color : 'transparent',
            border: `2px solid ${active ? color : '#71717a'}`,
            boxShadow: active ? `0 0 10px ${color}` : 'none' 
         }} 
      />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
