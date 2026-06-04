import { useEffect, useRef, useState, useMemo } from 'react'
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, X, ChevronRight, Phone, Clock, Navigation, MapPin } from 'lucide-react'
import type { PDV } from '@/lib/mock-data'

export function LiveMapUI({
  pdvs, reponedores, selectedWorkerId, setSelectedWorkerId,
  animationTime, isPlaying, setIsPlaying, speedMultiplier, setSpeedMultiplier,
  showPareto, setShowPareto, showMayorista, setShowMayorista, showDetallista, setShowDetallista,
  showWorkers, setShowWorkers, viewState, setViewState, routeGeometry, fallbackRouteSource,
  selectedCity, handleCityChange, sortedCities, activeReponedores, selectedWorker,
  pdvsToRender, activeWorkers, visitedPdvIds, activePdvIds, workerSequencePdvs,
  getPDVColor, MAPBOX_TOKEN, isTokenValid
}: any) {
  // New layout structure
  return (
    <div className="flex h-[800px] w-full bg-[#0a0a0c] p-4 gap-4 rounded-xl overflow-hidden font-sans">
      
      {/* LEFT COLUMN: Timeline & Driver Info */}
      <div className="w-[380px] bg-[#121215] rounded-[32px] p-6 flex flex-col shadow-2xl border border-white/[0.05] relative overflow-hidden shrink-0">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 z-10">
          <div>
            <h2 className="text-white font-bold text-xl tracking-tight">
              {selectedWorker ? 'Ruta Activa' : 'Monitoreo Global'}
            </h2>
            <p className="text-zinc-500 text-xs mt-1 font-medium">
              {selectedWorker ? selectedWorker.name : 'Selecciona un reponedor'}
            </p>
          </div>
          {selectedWorker && (
            <button onClick={() => setSelectedWorkerId(null)} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
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
                     className="group bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] rounded-2xl p-4 cursor-pointer transition-all duration-300 relative overflow-hidden"
                   >
                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
                     <div className="flex justify-between items-start mb-3">
                       <div>
                         <h3 className="text-zinc-200 font-semibold text-sm group-hover:text-white transition-colors">{worker.name}</h3>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block ${
                            worker.status === 'Retrasado' ? 'bg-red-500/20 text-red-400' 
                            : worker.status === 'Completado' ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-blue-500/20 text-blue-400'
                         }`}>
                           {worker.status} {worker.delay > 0 ? `(+${worker.delay.toFixed(0)}m)` : ''}
                         </span>
                       </div>
                       <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                       </div>
                       <span className="text-[10px] text-zinc-400 font-medium">{visitedCount}/{seq.length}</span>
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
                
                let dotClass = "bg-zinc-800 border-zinc-700"
                let textClass = "text-zinc-500"
                let titleClass = "text-zinc-400"
                
                if (pdv.visited) {
                  dotClass = "bg-[#7b61ff] border-[#7b61ff] shadow-[0_0_15px_rgba(123,97,255,0.5)]"
                  textClass = "text-[#7b61ff]"
                  titleClass = "text-white"
                } else if (isNext) {
                  dotClass = "bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  textClass = "text-white font-bold"
                  titleClass = "text-white font-semibold"
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
          <div className="mt-4 pt-4 border-t border-white/[0.05] z-10">
            <div className="bg-[#1a1a1f] rounded-2xl p-4 flex flex-col border border-white/[0.05]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">{selectedWorker.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">{selectedWorker.name}</h4>
                    <p className="text-[#7b61ff] text-[10px] font-bold tracking-wider uppercase">En camino</p>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors cursor-pointer">
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                 <div className="flex-1 bg-black/40 rounded-xl p-3 flex flex-col items-center justify-center">
                   <Navigation className="w-4 h-4 text-zinc-400 mb-1" />
                   <span className="text-white font-bold text-sm">{(selectedWorker.routeProgress * 0.15).toFixed(1)} km</span>
                   <span className="text-[9px] text-zinc-500 uppercase font-semibold">Distancia</span>
                 </div>
                 <div className="flex-1 bg-black/40 rounded-xl p-3 flex flex-col items-center justify-center">
                   <Clock className="w-4 h-4 text-zinc-400 mb-1" />
                   <span className="text-white font-bold text-sm">{(selectedWorker.routeProgress * 2.4).toFixed(0)} min</span>
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
        <div className="flex-1 bg-[#121215] rounded-[32px] overflow-hidden relative border border-white/[0.05] shadow-2xl">
          {/* Glassmorphism Controls Overlay */}
          <div className="absolute top-6 left-6 z-[400] flex gap-3">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 text-white shadow-xl">
              <MapPin className="w-4 h-4 text-[#7b61ff]" />
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-transparent text-sm font-semibold outline-none cursor-pointer text-white [&>option]:bg-[#121215] [&>option]:text-white"
              >
                {sortedCities.map((city: string) => (
                  <option key={city} value={city}>{city === 'Todas' ? 'Todas las Ciudades' : city}</option>
                ))}
              </select>
            </div>
            
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 flex items-center gap-2 shadow-xl">
               <button
                 onClick={() => setIsPlaying(!isPlaying)}
                 className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white"
               >
                 {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
               </button>
               <div className="w-[1px] h-4 bg-white/20 mx-1" />
               <div className="flex gap-1 pr-2">
                 {[1, 2, 5].map((mult) => (
                   <button
                     key={mult}
                     onClick={() => setSpeedMultiplier(mult)}
                     className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                       speedMultiplier === mult ? 'bg-[#7b61ff] text-white' : 'text-zinc-400 hover:text-white'
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
              {selectedWorker && routeGeometry && (
                <Source id="real-route" type="geojson" data={{ type: 'Feature', geometry: routeGeometry, properties: {} }}>
                  <Layer id="route-line" type="line" paint={{ 'line-color': '#7b61ff', 'line-width': 4, 'line-opacity': 0.8 }} />
                </Source>
              )}

              {/* PDV Markers Redesigned */}
              {pdvsToRender.map((pdv: any) => {
                const isVisited = visitedPdvIds.has(pdv.id)
                const isInRoute = activePdvIds.has(pdv.id)
                
                let bg = getPDVColor(pdv.type) // We can override these in redesign
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
                        borderRadius: '4px', // Modern square look
                        transform: 'rotate(45deg)', // Diamond shape
                        opacity: opacity,
                        cursor: 'pointer',
                        boxShadow: `0 0 12px ${bg}`
                      }}
                      title={pdv.nombre}
                    />
                  </Marker>
                )
              })}

              {/* Active Workers Redesigned */}
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
                         <div className="absolute w-10 h-10 bg-white/20 rounded-full animate-ping" />
                         {/* Modern Vehicle Marker (White square) */}
                         <div className="w-5 h-5 bg-white rounded-[4px] shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10 border-2 border-black" />
                      </div>
                    </Marker>
                  )
              })}
            </Map>
          )}
        </div>

        {/* BOTTOM NOTES / TAB PANEL */}
        <div className="bg-[#121215] rounded-[32px] p-6 shrink-0 border border-white/[0.05] shadow-2xl relative">
          
          <div className="flex items-center gap-8 mb-6 border-b border-white/[0.05] pb-4">
             <button className="text-white text-sm font-semibold bg-white/10 px-4 py-1.5 rounded-full">Capas Visuales</button>
             <button className="text-zinc-500 hover:text-white text-sm font-semibold transition-colors">Actividad Reciente</button>
             <button className="text-zinc-500 hover:text-white text-sm font-semibold transition-colors">Transacciones</button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <FilterBtn active={showPareto} onClick={() => setShowPareto(!showPareto)} color="bg-[#ff3366]" label="PDVs Pareto" />
             <FilterBtn active={showMayorista} onClick={() => setShowMayorista(!showMayorista)} color="bg-[#33ccff]" label="PDVs Mayoristas" />
             <FilterBtn active={showDetallista} onClick={() => setShowDetallista(!showDetallista)} color="bg-[#a1a1aa]" label="PDVs Detallistas" />
             <FilterBtn active={showWorkers} onClick={() => setShowWorkers(!showWorkers)} color="bg-white" label="Reponedores Activos" />
          </div>

          {/* Floating blue '+' button on the right */}
          <button className="absolute right-6 bottom-6 w-12 h-12 bg-blue-500 rounded-[16px] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(59,130,246,0.5)] hover:bg-blue-400 transition-colors">
            <span className="text-2xl font-light leading-none">+</span>
          </button>
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
        active ? 'bg-white/[0.05] border-white/[0.1] text-white' : 'bg-transparent border-transparent text-zinc-500 hover:bg-white/[0.02]'
      }`}
    >
      <div className={`w-3 h-3 rounded-sm ${active ? color : 'bg-zinc-700'}`} style={{ boxShadow: active ? `0 0 10px ${color}` : 'none' }} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
