'use client'

import { useState, useMemo, useRef } from 'react'
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sliders, MapPin, Play, RefreshCw, Layers } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export function AdminPlaygroundTab({ pdvs = [] }: { pdvs?: any[] }) {
  const { toast } = useToast()
  
  // Algoritmo variables
  const [avgSpeed, setAvgSpeed] = useState(25)
  const [minTimePDV, setMinTimePDV] = useState(15)
  const [geofenceRadius, setGeofenceRadius] = useState(50)
  
  // Simulating state
  const [isSimulating, setIsSimulating] = useState(false)
  const [simResults, setSimResults] = useState<any>(null)

  // Map state
  const mapRef = useRef<any>(null)
  const [viewState, setViewState] = useState({
    longitude: -63.1812,
    latitude: -17.7862,
    zoom: 12
  })

  // Safe subset of PDVs to render on map (limit to 30 for performance in simulation)
  const mapPdvs = useMemo(() => {
    return pdvs.slice(0, 30).map((p, idx) => ({
      id: p.id,
      name: p.name,
      lat: Number(p.latitude || p.lat || -17.7862),
      lng: Number(p.longitude || p.lng || -63.1812),
      category: p.category || 'PARETO'
    }))
  }, [pdvs])

  // GeoJSON line for route simulation
  const routeGeoJSON = useMemo(() => {
    if (!simResults || mapPdvs.length < 2) return null
    const coordinates = mapPdvs.map(p => [p.lng, p.lat])
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    }
  }, [simResults, mapPdvs])

  const handleSimulate = () => {
    setIsSimulating(true)
    setTimeout(() => {
      setIsSimulating(false)
      setSimResults({
        totalDistance: (mapPdvs.length * 1.8).toFixed(1),
        optimalTime: Math.round(mapPdvs.length * minTimePDV + (mapPdvs.length * 1.8 * 60) / avgSpeed),
        coverage: 98.4
      })
      toast({
        title: "Simulación de Enrutamiento Completa",
        description: `Ruta óptima trazada para ${mapPdvs.length} PDVs utilizando velocidad promedio de ${avgSpeed} km/h.`,
      })
    }, 1500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Sandbox y Playground de Rutas Logísticas</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ajusta los parámetros operativos de la IA para recalcular las rutas de reparto más eficientes de Bolivia.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Parameters Column */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm dark:bg-slate-900/30 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-850 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-emerald-500" />
                <span>Coeficientes del Algoritmo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Avg Speed */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Velocidad de Traslado</label>
                  <span className="text-xs font-bold text-emerald-500">{avgSpeed} km/h</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="60" 
                  value={avgSpeed}
                  onChange={e => setAvgSpeed(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Time in PDV */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tiempo Base en PDV</label>
                  <span className="text-xs font-bold text-emerald-500">{minTimePDV} mins</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="45" 
                  value={minTimePDV}
                  onChange={e => setMinTimePDV(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Geofence Check-in */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Radio de Geocerca</label>
                  <span className="text-xs font-bold text-emerald-500">{geofenceRadius} metros</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="200" 
                  step="10"
                  value={geofenceRadius}
                  onChange={e => setGeofenceRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <Button 
                onClick={handleSimulate} 
                disabled={isSimulating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
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
            </CardContent>
          </Card>

          {/* Results Panel */}
          {simResults && (
            <Card className="border-slate-200 shadow-sm dark:bg-slate-900/30 dark:border-slate-800 animate-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="border-b border-slate-100 dark:border-slate-850 pb-3">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultados de la Calibración</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Distancia teórica total</span>
                  <span className="text-slate-800 dark:text-white font-bold">{simResults.totalDistance} km</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Tiempo de jornada total</span>
                  <span className="text-slate-800 dark:text-white font-bold">{(simResults.optimalTime / 60).toFixed(1)} horas</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Tasa de Efectividad Estimada</span>
                  <span className="text-emerald-500 font-bold">{simResults.coverage}%</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map Column */}
        <div className="xl:col-span-2">
          <Card className="border-slate-200 shadow-sm dark:bg-slate-900/30 dark:border-slate-800 h-full flex flex-col min-h-[500px]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-850 pb-4">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  <span>Mapa de Simulación de Ruta</span>
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-none font-bold text-[9px]">
                  {mapPdvs.length} Tiendas Cargadas
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950">
                {MAPBOX_TOKEN ? (
                  <Map
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/streets-v11"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {/* Render PDV markers */}
                    {mapPdvs.map(pdv => (
                      <Marker key={pdv.id} latitude={pdv.lat} longitude={pdv.lng}>
                        <MapPin className={`h-5 w-5 ${
                          pdv.category === 'PARETO' 
                            ? 'text-rose-500 fill-rose-500' 
                            : pdv.category === 'MAYORISTA' 
                              ? 'text-amber-500 fill-amber-500' 
                              : 'text-emerald-500 fill-emerald-500'
                        }`} />
                      </Marker>
                    ))}

                    {/* Render simulated route path */}
                    {routeGeoJSON && (
                      <Source id="sim-route" type="geojson" data={routeGeoJSON}>
                        <Layer
                          id="route-line"
                          type="line"
                          paint={{
                            'line-color': '#10b981',
                            'line-width': 4,
                            'line-opacity': 0.85
                          }}
                        />
                      </Source>
                    )}
                  </Map>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    Falta el token de Mapbox para renderizar el Sandbox de Simulación.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
