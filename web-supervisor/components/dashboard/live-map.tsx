'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause, X, ChevronRight, Phone, Clock, Navigation, MapPin } from 'lucide-react'
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
  const [showRoute, setShowRoute] = useState(true)
  
  const [viewState, setViewState] = useState({
    longitude: -63.1812,
    latitude: -17.7862,
    zoom: 12,
    pitch: 45,
    bearing: 0
  })

  const [routeGeometry, setRouteGeometry] = useState<any>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)

  const mainCities = ['Todas', 'Santa Cruz', 'La Paz', 'Cochabamba']
  const [selectedCity, setSelectedCity] = useState<string>('Todas')

  useEffect(() => {
    if (selectedWorkerId) {
      const worker = reponedores.find(w => (w.dbUuid || w.id) === selectedWorkerId)
      if (worker) {
        if (worker.city) {
          setSelectedCity(worker.city)
        }
        if (worker.lat && worker.lng) {
          setViewState(prev => ({
            ...prev,
            longitude: worker.lng,
            latitude: worker.lat,
            zoom: 14
          }))
        }
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

  const pdvsToRender = useMemo(() => {
    let filtered = selectedWorker
      ? pdvs.filter(p => activePdvIds.has(p.id))
      : pdvs

    filtered = filtered.filter(p => {
      if (selectedCity !== 'Todas') {
        const pCity = p.city || ''
        const pMarket = (p as any).market || ''
        if (pCity !== selectedCity && pMarket !== selectedCity) return false
      }
      if (p.type === 'Pareto' && !showPareto) return false
      if (p.type === 'Mayorista' && !showMayorista) return false
      if (p.type === 'Detallista' && !showDetallista) return false
      return true
    })

    // Limit markers ONLY when 'Todas' is selected and there are too many, to prevent massive lag
    if (!selectedWorker && selectedCity === 'Todas' && filtered.length > 150) {
      const pareto = filtered.filter(p => p.type === 'Pareto')
      const mayorista = filtered.filter(p => p.type === 'Mayorista')
      const detallista = filtered.filter(p => p.type === 'Detallista')
      filtered = [...pareto, ...mayorista.slice(0, 80), ...detallista.slice(0, 70)]
    }

    return filtered
  }, [pdvs, selectedWorker, activePdvIds, selectedCity, showPareto, showMayorista, showDetallista])

  // Fetch Real Mapbox Directions Route
  useEffect(() => {
    if (!selectedWorker || !MAPBOX_TOKEN || MAPBOX_TOKEN === 'PEGA_TU_TOKEN_AQUI') {
      setRouteGeometry(null)
      setRouteInfo(null)
      return
    }

    const sequence: string[] = selectedWorker.sequence || []
    const coords = sequence.map(id => {
      const p = pdvs.find(x => x.id === id)
      return p ? `${p.lng},${p.lat}` : null
    }).filter(Boolean)

    if (coords.length > 1 && coords.length <= 25) {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords.join(';')}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            setRouteGeometry(data.routes[0].geometry)
            setRouteInfo({
              distance: data.routes[0].distance,
              duration: data.routes[0].duration
            })
          }
        })
        .catch(err => console.error("Error fetching route:", err))
    } else {
       setRouteGeometry(null)
       setRouteInfo(null)
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

  const totalDistance = routeInfo ? routeInfo.distance / 1000 : (selectedWorker?.sequence?.length || 0) * 1.2
  const totalTime = routeInfo ? routeInfo.duration / 60 : (selectedWorker?.sequence?.length || 0) * 15
  const progressPct = selectedWorker?.routeProgress || 0
  const traveledDistance = totalDistance * (progressPct / 100)
  const traveledTime = totalTime * (progressPct / 100)

  return (
    <div className="flex h-full w-full bg-background gap-4 rounded-xl overflow-hidden font-sans">
      
      {/* LEFT COLUMN: Timeline & Driver Info */}
      <div className="w-[380px] bg-card rounded-[32px] p-6 flex flex-col shadow-2xl border border-border relative overflow-hidden shrink-0">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 z-10">
          <div>
            <h2 className="text-foreground font-bold text-xl tracking-tight">
              {selectedWorker ? 'Ruta Activa' : 'Operaciones de Campo en Vivo'}
            </h2>
            <p className="text-muted-foreground text-xs mt-1 font-medium">
              {selectedWorker ? selectedWorker.name : 'Selecciona un reponedor'}
            </p>
          </div>
          {selectedWorker && (
            <button onClick={() => setSelectedWorkerId(null)} className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Global List / Sequence Timeline */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar z-10">
          {!selectedWorker ? (
             <div className="space-y-3">
               {activeReponedores.map((worker: any) => {
                 const workerId = worker.dbUuid || worker.id
                 const seq = worker.sequence || []
                 const visitedCount = seq.filter((id: string) => pdvs.find((p: any) => p.id === id)?.visited).length
                 const pct = seq.length > 0 ? Math.round((visitedCount / seq.length) * 100) : 0
                 
                 return (
                   <div 
                     key={workerId} 
                     onClick={() => setSelectedWorkerId(workerId)}
                     className="group bg-white/[0.02] hover:bg-white/[0.06] border border-border rounded-2xl p-4 cursor-pointer transition-all duration-300 relative overflow-hidden"
                   >
                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
                     <div className="flex justify-between items-start mb-3">
                       <div>
                         <h3 className="text-foreground font-semibold text-sm group-hover:text-primary transition-colors">{worker.name}</h3>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block ${
                            worker.status === 'Retrasado' ? 'bg-red-500/20 text-red-400' 
                            : worker.status === 'Completado' ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-blue-500/20 text-blue-400'
                         }`}>
                           {worker.status} {worker.delay > 0 ? `(+${worker.delay.toFixed(0)}m)` : ''}
                         </span>
                       </div>
                       <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                       </div>
                       <span className="text-[10px] text-foreground font-medium">{visitedCount}/{seq.length}</span>
                     </div>
                   </div>
                 )
               })}
             </div>
          ) : (
            <div className="relative pl-3 pb-8">
              {/* Vertical line connecting timeline */}
              <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-zinc-800 rounded-full" />
              
              {workerSequencePdvs.map((pdv: any, idx: number) => {
                const isNext = !pdv.visited && workerSequencePdvs.slice(0, idx).every((p: any) => p.visited)
                
                let dotClass = "bg-muted border-border"
                let textClass = "text-muted-foreground"
                let titleClass = "text-foreground"
                
                if (pdv.visited) {
                  dotClass = "bg-[#7b61ff] border-[#7b61ff] shadow-[0_0_15px_rgba(123,97,255,0.5)]"
                  textClass = "text-[#7b61ff]"
                  titleClass = "text-foreground"
                } else if (isNext) {
                  dotClass = "bg-primary border-primary shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                  textClass = "text-primary font-bold"
                  titleClass = "text-foreground font-semibold"
                }

                return (
                  <div key={pdv.id} className="relative flex items-start gap-6 mb-8 group">
                    <div className={`relative z-10 w-4 h-4 rounded-full border-[3px] mt-1 transition-all duration-300 ${dotClass}`} />
                    <div className="flex-1 cursor-pointer group-hover:translate-x-1 transition-transform">
                      <p className={`text-sm tracking-wide ${titleClass}`}>{pdv.nombre}</p>
                      <p className={`text-[11px] mt-1 ${textClass}`}>
                        {pdv.visited ? 'Completado' : isNext ? 'En ruta' : pdv.type}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom Driver Card */}
        {selectedWorker && (
          <div className="mt-4 pt-4 border-t border-border z-10">
            <div className="bg-muted rounded-2xl p-4 flex flex-col border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">{selectedWorker.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-foreground font-semibold text-sm">{selectedWorker.name}</h4>
                    <p className="text-[#7b61ff] text-[10px] font-bold tracking-wider uppercase">En camino</p>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors cursor-pointer">
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                 <div className="flex-1 bg-background rounded-xl p-3 flex flex-col items-center justify-center">
                   <Navigation className="w-4 h-4 text-zinc-400 mb-1" />
                   <span className="text-foreground font-bold text-sm">{traveledDistance.toFixed(1)} / {totalDistance.toFixed(1)} km</span>
                   <span className="text-[9px] text-zinc-500 uppercase font-semibold">Distancia</span>
                 </div>
                 <div className="flex-1 bg-background rounded-xl p-3 flex flex-col items-center justify-center">
                   <Clock className="w-4 h-4 text-zinc-400 mb-1" />
                   <span className="text-foreground font-bold text-sm">{traveledTime.toFixed(0)} / {totalTime.toFixed(0)} min</span>
                   <span className="text-[9px] text-zinc-500 uppercase font-semibold">Tiempo</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Map & Bottom Tabs */}
      <div className="flex-1 flex flex-col gap-4 relative min-w-0">
        
        {/* MAP CONTAINER */}
        <div className="flex-1 bg-card rounded-[32px] overflow-hidden relative border border-border shadow-2xl">
          {/* Glassmorphism Controls Overlay */}
          <div className="absolute top-6 left-6 z-[400] flex gap-3">
            <div className="bg-background/60 backdrop-blur-md border border-border rounded-full px-1.5 py-1.5 flex items-center gap-1 shadow-xl">
              {mainCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityChange(city)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    selectedCity === city
                      ? 'bg-[#7b61ff] text-white shadow-[0_0_12px_rgba(123,97,255,0.5)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {city === 'Todas' ? 'Todas' : city}
                </button>
              ))}
            </div>
            
            <div className="bg-background/60 backdrop-blur-md border border-border rounded-full px-2 py-1.5 flex items-center gap-2 shadow-xl">
               <button
                 onClick={() => setIsPlaying(!isPlaying)}
                 className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors text-primary"
               >
                 {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
               </button>
               <div className="w-[1px] h-4 bg-border mx-1" />
               <div className="flex gap-1 pr-2">
                 {[1, 2, 5].map((mult) => (
                   <button
                     key={mult}
                     onClick={() => setSpeedMultiplier(mult)}
                     className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                       speedMultiplier === mult ? 'bg-[#7b61ff] text-white' : 'text-muted-foreground hover:text-foreground'
                     }`}
                   >
                     {mult}x
                   </button>
                 ))}
               </div>
            </div>
          </div>

          {!isTokenValid ? (
             <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[1000]">
                <h3 className="text-xl font-bold text-rose-500 mb-2">Falta Mapbox Token</h3>
                <p className="text-sm text-slate-300">Añade tu token en .env.local</p>
             </div>
          ) : (
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
              interactive={true}
              style={{ width: '100%', height: '100%' }}
            >
              <NavigationControl position="top-right" />
              
              {/* Real route line */}
              {selectedWorker && showRoute && routeGeometry && (
                <Source id="real-route" type="geojson" data={{ type: 'Feature', geometry: routeGeometry, properties: {} }}>
                  <Layer id="route-line" type="line" paint={{ 'line-color': '#7b61ff', 'line-width': 4, 'line-opacity': 0.8 }} />
                </Source>
              )}

              {/* PDV Markers */}
              {pdvsToRender.map((pdv: any) => {
                const isVisited = visitedPdvIds.has(pdv.id)
                const isInRoute = activePdvIds.has(pdv.id)
                
                let bg = getPDVColor(pdv.type)
                if (pdv.type === 'Pareto') bg = '#ff3366'
                if (pdv.type === 'Mayorista') bg = '#33ccff'
                if (pdv.type === 'Detallista') bg = '#a1a1aa'
                
                let size = 10
                let opacity = 0.8

                if (selectedWorker) {
                   if (isVisited) { bg = '#7b61ff'; size = 14; opacity = 1; } 
                   else if (!isInRoute) { opacity = 0.2; size = 8; }
                }

                return (
                  <Marker key={pdv.id} longitude={pdv.lng} latitude={pdv.lat} anchor="center">
                    <div
                      style={{
                        backgroundColor: bg,
                        width: size,
                        height: size,
                        borderRadius: '4px',
                        transform: 'rotate(45deg)',
                        opacity: opacity,
                        cursor: 'pointer',
                        boxShadow: `0 0 12px ${bg}`
                      }}
                      title={pdv.nombre}
                    />
                  </Marker>
                )
              })}

              {/* Active Workers */}
              {activeWorkers.map((worker: any) => {
                  const sequence: string[] = worker.sequence || []
                  const totalCount = sequence.length
            
                  let lat = worker.lat
                  let lng = worker.lng
            
                  if (totalCount > 1) {
                    const visitedCount = Math.round((worker.routeProgress / 100) * totalCount)
                    const prevPdvId = sequence[Math.max(0, visitedCount - 1)]
                    const nextPdvId = sequence[Math.min(totalCount - 1, visitedCount)]
                    const prevPdv = pdvs.find((p: any) => p.id === prevPdvId)
                    const nextPdv = pdvs.find((p: any) => p.id === nextPdvId)
            
                    if (prevPdv && nextPdv && prevPdv.id !== nextPdv.id) {
                      lat = prevPdv.lat + (nextPdv.lat - prevPdv.lat) * animationTime
                      lng = prevPdv.lng + (nextPdv.lng - prevPdv.lng) * animationTime
                    } else if (prevPdv) {
                      lat = prevPdv.lat
                      lng = prevPdv.lng
                    }
                  }

                  if (isNaN(lat) || isNaN(lng)) return null;

                  return (
                    <Marker key={`worker-${worker.id}`} longitude={lng} latitude={lat} anchor="center">
                      <div className="relative flex items-center justify-center">
                         {/* Glow effect */}
                         <div className="absolute w-12 h-12 bg-emerald-500/30 rounded-full animate-ping" />
                         {/* Modern Vehicle Marker */}
                         <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 border-[3px] border-white" />
                      </div>
                    </Marker>
                  )
              })}
            </Map>
          )}
        </div>

        {/* BOTTOM FILTER PANEL */}
        <div className="bg-card rounded-[32px] p-6 shrink-0 border border-border shadow-2xl relative">
          <div className="flex flex-wrap items-center gap-4">
             <FilterBtn active={showPareto} onClick={() => setShowPareto(!showPareto)} color="#ff3366" label="PDVs Pareto" />
             <FilterBtn active={showMayorista} onClick={() => setShowMayorista(!showMayorista)} color="#33ccff" label="PDVs Mayoristas" />
             <FilterBtn active={showDetallista} onClick={() => setShowDetallista(!showDetallista)} color="#a1a1aa" label="PDVs Detallistas" />
             {selectedWorker ? (
               <FilterBtn active={showRoute} onClick={() => setShowRoute(!showRoute)} color="#7b61ff" label="Mostrar Ruta" />
             ) : (
               <FilterBtn active={showWorkers} onClick={() => setShowWorkers(!showWorkers)} color="#7b61ff" label="Reponedores Activos" />
             )}
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
