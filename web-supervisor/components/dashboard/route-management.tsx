'use client'

import { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle, Zap, Check, Loader2, History, ChevronDown, ChevronRight,
  Camera, Clock, User, Store, MapPin, X, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { RouteOptData } from '@/lib/mock-data'
import { reoptimizeRoutes, reassignPdv, approveLogisticAdjustment } from '@/app/actions'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PhotoEvidence {
  id: string
  reponedorName: string
  pdvName: string
  taskName: string
  beforeUrl: string
  afterUrl: string | null
  lat: number | null
  lng: number | null
  timestamp: string
}

interface RouteHistoryEntry {
  id: string
  reponedorName: string
  date: string
  pdvCount: number
  completedCount: number
  status: 'Completada' | 'En Proceso' | 'Asignada'
  evidences: PhotoEvidence[]
  sequence: string[]
}

interface RouteManagementProps {
  data: RouteOptData & { logisticAdjustments?: any[] }
  reponedores?: any[]
  photoEvidences?: PhotoEvidence[]
  pdvs?: any[]
  onRefresh?: () => void
  onViewOnMap?: (workerId: string) => void
}

// ─── Task color map ──────────────────────────────────────────────────────────
const TASK_COLORS: Record<string, string> = {
  Limpieza: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  Bandeo: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  POP: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

// ─── Before / After photo panel (inline) ─────────────────────────────────────
function PhotoPanel({
  label, url, taskName, onZoom,
}: { label: 'Antes' | 'Después'; url: string | null; taskName: string; onZoom: (u: string) => void }) {
  const isAfter = label === 'Después'
  if (!url) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-muted/40 border border-dashed border-border rounded-lg h-36 px-3">
        <Clock className="h-4 w-4 text-muted-foreground/50" />
        <p className="text-[10px] text-center text-muted-foreground/60 leading-tight">
          Esperando cierre en Flutter...
        </p>
      </div>
    )
  }
  return (
    <div
      className="flex-1 relative overflow-hidden rounded-lg cursor-pointer group h-36 border border-border"
      onClick={() => onZoom(url)}
    >
      <img src={url} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      <span className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full border
        ${isAfter ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40' : 'bg-orange-500/25 text-orange-300 border-orange-500/40'}`}>
        {label}
      </span>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
          <Camera className="h-2.5 w-2.5" /> Ampliar
        </span>
      </div>
    </div>
  )
}

// ─── Route History Map Modal (Client-side Leaflet) ──────────────────────────
function RouteHistoryMapModal({
  isOpen,
  onClose,
  reponedorName,
  sequence,
  pdvs,
}: {
  isOpen: boolean
  onClose: () => void
  reponedorName: string
  sequence: string[]
  pdvs: any[]
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!isOpen) return

    let mapInstance: any = null
    let active = true

    import('leaflet').then((LModule) => {
      if (!active) return
      const L = LModule.default
      
      if (!mapContainerRef.current) return

      // Initialize map
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([-34.61, -58.44], 12)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map)

      mapInstance = map
      mapRef.current = map

      const markerGroup = L.layerGroup().addTo(map)

      // Build coordinates and draw markers
      const points: L.LatLngTuple[] = []
      sequence.forEach((pdvId, idx) => {
        const pdv = pdvs.find(p => p.id === pdvId)
        if (pdv) {
          const lat = parseFloat(pdv.lat)
          const lng = parseFloat(pdv.lng)
          points.push([lat, lng])

          // Add circle marker for each stop
          const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#10b981', // green for completed
            color: '#ffffff',
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.95,
          }).addTo(markerGroup)

          // Bind stop sequence number
          marker.bindTooltip(`${idx + 1}`, {
            permanent: true,
            direction: 'top',
            className: 'pdv-sequence-badge pdv-visited-badge',
            offset: [0, -3]
          })

          marker.bindPopup(`
            <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; color: #1f2937;">
              <h4 style="margin:0 0 3px 0;font-size:13px;font-weight:700;color:#111827;">${pdv.nombre || pdv.name}</h4>
              <div>Parada #${idx + 1} · ${pdv.type}</div>
              <div style="color:#059669;font-weight:bold;margin-top:2px;">✓ Completado</div>
            </div>
          `)
        }
      })

      // Draw route polyline
      if (points.length > 1) {
        L.polyline(points, {
          color: '#10b981',
          weight: 4,
          opacity: 0.85,
        }).addTo(markerGroup)

        // Fit bounds
        try {
          map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 })
        } catch (_) {}
      }
    })

    return () => {
      active = false
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [isOpen, sequence, pdvs])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <Card 
        className="relative w-full max-w-3xl overflow-hidden shadow-2xl border border-border bg-card"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-emerald-500" />
              Ruta Histórica Realizada — {reponedorName}
            </CardTitle>
            <CardDescription className="text-xs">
              Jornada completada de {sequence.length} visitas
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 border-t border-border">
          <div className="bg-slate-100 h-[420px] w-full relative">
            <div ref={mapContainerRef} className="h-full w-full z-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Route History Row ────────────────────────────────────────────────────────
function RouteHistoryRow({ 
  entry, 
  pdvs, 
  onZoom, 
  onViewOnMap 
}: { 
  entry: RouteHistoryEntry; 
  pdvs: any[]; 
  onZoom: (u: string) => void;
  onViewOnMap?: (workerId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false)
  const pct = entry.pdvCount > 0 ? Math.round((entry.completedCount / entry.pdvCount) * 100) : 0

  const statusColor = {
    'Completada': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    'En Proceso': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    'Asignada': 'bg-muted/30 text-muted-foreground border-border',
  }[entry.status]

  return (
    <div className="border border-border rounded-xl overflow-hidden transition-all duration-200">
      {/* Clickable header row */}
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-primary"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
      >
        {/* Expand icon */}
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>

        {/* Worker avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{entry.reponedorName}</p>
          <p className="text-[11px] text-muted-foreground">{entry.date}</p>
        </div>

        {/* PDV progress */}
        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-medium text-foreground">{entry.completedCount}/{entry.pdvCount} PDVs</span>
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Status badge */}
        <Badge variant="outline" className={`text-[10px] shrink-0 border ${statusColor}`}>
          {entry.status}
        </Badge>

        {/* Evidence count */}
        {entry.evidences.length > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <Camera className="h-3 w-3" />
            {entry.evidences.length} evidencias
          </span>
        )}

        {/* View on Map Button */}
        {onViewOnMap && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 gap-1 text-[10px] bg-primary/10 border-primary/20 hover:bg-primary hover:text-primary-foreground text-primary shrink-0 transition-all duration-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onViewOnMap(entry.id)
            }}
          >
            <MapPin className="h-3 w-3" /> Ver en Mapa
          </Button>
        )}
      </div>

      {/* Expanded: route sequence + evidence cards */}
      {expanded && (
        <div className="border-t border-border bg-muted/10 px-5 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Route Sequence */}
            <div className="lg:col-span-1 border-r border-border/40 pr-6 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Store className="h-3.5 w-3.5 text-primary" />
                Secuencia de Visitas ({entry.completedCount}/{entry.pdvCount})
              </p>
              
              <div className="relative pl-4 border-l border-border ml-2 space-y-4">
                {entry.sequence.map((pdvId, idx) => {
                  const pdv = pdvs.find(p => p.id === pdvId)
                  const isCompleted = idx < entry.completedCount
                  const isNext = !isCompleted && idx === entry.completedCount
                  
                  if (!pdv) return null
                  
                  return (
                    <div key={pdvId} className="relative flex items-start gap-2.5">
                      {/* Timeline dot */}
                      <div className={[
                        "absolute -left-[22px] w-2.5 h-2.5 rounded-full border-2 bg-card",
                        isCompleted 
                          ? "border-emerald-500 bg-emerald-500" 
                          : isNext 
                          ? "border-primary bg-primary animate-pulse" 
                          : "border-muted-foreground/45 bg-muted"
                      ].join(" ")} />
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-semibold truncate ${isCompleted ? 'text-foreground/80 line-through decoration-emerald-500/50' : 'text-foreground'}`}>
                            {idx + 1}. {pdv.nombre || pdv.name}
                          </span>
                          <span className="text-[9px] font-mono px-1 rounded bg-muted border border-border text-muted-foreground">
                            {pdv.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {isCompleted 
                            ? "✓ Completado" 
                            : isNext 
                            ? "⏳ Próxima parada" 
                            : "💤 Pendiente"}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {entry.sequence.length === 0 && (
                  <p className="text-xs text-muted-foreground italic pl-2">Sin secuencia de visitas registrada.</p>
                )}
              </div>
            </div>

            {/* Right Column: Evidence cards */}
            <div className="lg:col-span-2 space-y-3">
              {entry.evidences.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center h-full gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground/30" />
                  <p>No hay evidencias fotográficas registradas para esta jornada.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <Camera className="h-3.5 w-3.5 text-primary" />
                    Evidencias de auditoría
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entry.evidences.map((ev) => (
                      <div key={ev.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        {/* Card header */}
                        <div className="px-3 pt-3 pb-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Store className="h-3 w-3 text-primary shrink-0" />
                            <p className="text-xs font-semibold text-foreground truncate">{ev.pdvName}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-bold border ${TASK_COLORS[ev.taskName] ?? 'bg-muted/50 text-muted-foreground border-border'}`}
                            >
                              {ev.taskName}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(ev.timestamp).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Antes / Después */}
                        <div className="px-3 pb-3 flex gap-2">
                          <PhotoPanel label="Antes" url={ev.beforeUrl} taskName={ev.taskName} onZoom={onZoom} />
                          <div className="flex items-center shrink-0">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <PhotoPanel label="Después" url={ev.afterUrl} taskName={ev.taskName} onZoom={onZoom} />
                        </div>

                        {/* Completion pill */}
                        <div className={`mx-3 mb-3 flex items-center gap-1 text-[10px] font-medium rounded px-2 py-1
                          ${ev.afterUrl ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {ev.afterUrl ? '✓ Ciclo completo' : '⏳ Cierre pendiente'}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function RouteManagement({ data, reponedores, photoEvidences = [], pdvs = [], onRefresh, onViewOnMap }: RouteManagementProps) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimized, setOptimized] = useState(false)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({})
  const [modalMapRoute, setModalMapRoute] = useState<{ reponedorName: string; sequence: string[] } | null>(null)
  const [optimizeStep, setOptimizeStep] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'operations' | 'history'>('operations')

  const loadingMessages = [
    'Calculando matriz de distancias con PostGIS...',
    'Analizando tiempos históricos de microtareas en campo...',
    'Ejecutando algoritmo Nearest-Neighbor TSP...',
    'Persistiendo secuencias optimizadas en Supabase...'
  ]

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setOptimizeStep(0)
    const stepInterval = setInterval(() => {
      setOptimizeStep((prev) => (prev + 1) % loadingMessages.length)
    }, 1200)
    try {
      const res = await reoptimizeRoutes()
      clearInterval(stepInterval)
      if ('error' in res && res.error) {
        alert('Error al optimizar rutas: ' + res.error)
      } else {
        setOptimized(true)
        if (onRefresh) onRefresh()
        setTimeout(() => setOptimized(false), 3000)
      }
    } catch (e: any) {
      clearInterval(stepInterval)
      alert('Error: ' + e.message)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleSelectTarget = (pdvId: string, workerUuid: string) => {
    setSelectedTargets(prev => ({ ...prev, [pdvId]: workerUuid }))
  }

  const handleConfirmReassign = async (pdvId: string) => {
    const targetUuid = selectedTargets[pdvId]
    if (!targetUuid) return
    setIsReassigning(true)
    try {
      const res = await reassignPdv(pdvId, targetUuid)
      if ('error' in res && res.error) {
        alert('Error al reasignar: ' + res.error)
      } else {
        setSelectedTargets(prev => { const n = { ...prev }; delete n[pdvId]; return n })
        if (onRefresh) onRefresh()
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setIsReassigning(false)
    }
  }

  const handleApproveAdjustment = async (pdvId: string, suggestedBase: number) => {
    setIsApproving(pdvId)
    try {
      const res = await approveLogisticAdjustment(pdvId, suggestedBase)
      if ('error' in res && res.error) {
        alert('Error al ajustar: ' + res.error)
      } else {
        if (onRefresh) onRefresh()
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setIsApproving(null)
    }
  }

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity
    return Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2)
  }

  const getRecommendedWorker = (pdv: any) => {
    if (!reponedores || reponedores.length === 0 || !pdv.lat || !pdv.lng) return null
    let bestWorker: any = null, bestScore = Infinity
    reponedores.forEach(w => {
      if (w.name === pdv.assignedWorker || w.status === 'Completado') return
      const score = getDistance(pdv.lat, pdv.lng, w.lat, w.lng) * 1000 + (w.activeOrders || 0) * 2 + (w.delay ? w.delay * 0.1 : 0)
      if (score < bestScore) { bestScore = score; bestWorker = w }
    })
    return bestWorker
  }

  const getImpactEstimate = (pdv: any, targetUuid: string) => {
    if (!targetUuid || !reponedores) return null
    const worker = reponedores.find(w => w.id === targetUuid || w.dbUuid === targetUuid)
    if (!worker) return null
    const dist = getDistance(pdv.lat, pdv.lng, worker.lat, worker.lng)
    return {
      workerName: worker.name,
      time: Math.max(3, Math.round(Math.sqrt(dist) * 12 + 2)),
      coverage: worker.status === 'Retrasado' ? '85%' : '100%'
    }
  }

  // ─── Build route history from reponedores + evidences ───────────────────────
  // Group evidences by reponedor name
  const evidencesByWorker: Record<string, PhotoEvidence[]> = {}
  photoEvidences.forEach(ev => {
    if (!evidencesByWorker[ev.reponedorName]) evidencesByWorker[ev.reponedorName] = []
    evidencesByWorker[ev.reponedorName].push(ev)
  })

  const routeHistory: RouteHistoryEntry[] = (reponedores || []).map((w, idx) => {
    const statuses = ['Completada', 'En Proceso', 'Asignada'] as const
    const status = statuses[idx % statuses.length]
    const pdvCount = w.sequence ? w.sequence.length : w.activeOrders ? w.activeOrders + Math.floor(Math.random() * 3) + 3 : 8
    const completedCount = status === 'Completada' ? pdvCount : Math.max(0, pdvCount - (w.activeOrders || 2))
    const todayStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })

    return {
      id: w.dbUuid || w.id,
      reponedorName: w.name,
      date: todayStr.charAt(0).toUpperCase() + todayStr.slice(1),
      pdvCount,
      completedCount,
      status,
      evidences: evidencesByWorker[w.name] || [],
      sequence: w.sequence || []
    }
  }).filter(entry => entry.status === 'Completada')

  return (
    <div className="space-y-6">
      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border w-fit">
        {[
          { id: 'operations', label: 'Operaciones del Día', icon: Zap },
          { id: 'history', label: 'Historial de Rutas', icon: History },
        ].map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id as any
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-card shadow-sm text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ══════════════════════ TAB 1: OPERACIONES ══════════════════════ */}
      {activeTab === 'operations' && (
        <div className="space-y-8">

          {/* ── Paso 1: Resumen del estado actual ─────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Diagnóstico del Día</h2>
                <p className="text-xs text-muted-foreground">Resumen operativo calculado en tiempo real desde Supabase</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: 'Reponedores en campo',
                  value: (reponedores || []).filter(w => w.status !== 'Completado').length,
                  sub: 'activos trabajando',
                  color: 'text-foreground',
                  bg: 'bg-muted/30 border-border',
                  icon: '👷'
                },
                {
                  label: 'Con retraso',
                  value: data.overloaded.length,
                  sub: 'requieren intervención',
                  color: data.overloaded.length > 0 ? 'text-destructive' : 'text-emerald-400',
                  bg: data.overloaded.length > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-emerald-500/5 border-emerald-500/20',
                  icon: data.overloaded.length > 0 ? '⚠️' : '✅'
                },
                {
                  label: 'PDVs en riesgo',
                  value: data.pendingRisk.length,
                  sub: 'pueden quedar sin visita',
                  color: data.pendingRisk.length > 0 ? 'text-amber-400' : 'text-emerald-400',
                  bg: data.pendingRisk.length > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20',
                  icon: data.pendingRisk.length > 0 ? '📍' : '✅'
                },
                {
                  label: 'Ajustes sugeridos',
                  value: (data.logisticAdjustments || []).length,
                  sub: 'tiempos base desactualizados',
                  color: (data.logisticAdjustments || []).length > 0 ? 'text-accent' : 'text-emerald-400',
                  bg: (data.logisticAdjustments || []).length > 0 ? 'bg-accent/5 border-accent/20' : 'bg-emerald-500/5 border-emerald-500/20',
                  icon: (data.logisticAdjustments || []).length > 0 ? '🔁' : '✅'
                },
              ].map(s => (
                <div key={s.label} className={`p-4 rounded-xl border ${s.bg}`}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-foreground leading-tight mt-0.5">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Paso 2: Reoptimizar Rutas ───────────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Reoptimizar Rutas del Día</h2>
                <p className="text-xs text-muted-foreground">
                  Recalcula el orden óptimo de visita de cada reponedor usando datos reales de campo
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-4">
              {/* Cómo funciona */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                {[
                  {
                    step: '①',
                    title: 'Lee tiempos reales',
                    desc: 'Analiza el historial de task_logs para saber cuánto tarda cada reponedor en Pareto, Mayorista y Detallista',
                    color: 'border-violet-500/25 bg-violet-500/5 text-violet-300',
                  },
                  {
                    step: '②',
                    title: 'Calcula distancias',
                    desc: 'Usa la fórmula Haversine entre coordenadas de PDVs para estimar tiempos de traslado en metros reales',
                    color: 'border-sky-500/25 bg-sky-500/5 text-sky-300',
                  },
                  {
                    step: '③',
                    title: 'Aplica el algoritmo TSP',
                    desc: 'Ordena la secuencia con Nearest-Neighbor: 60% peso duración + 40% peso distancia + intercalado estratégico',
                    color: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300',
                  },
                ].map(c => (
                  <div key={c.step} className={`rounded-lg border p-3 ${c.color}`}>
                    <div className="text-base font-bold mb-1">{c.step} {c.title}</div>
                    <p className="text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 border-t border-border">
                <Button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  className="gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
                >
                  {isOptimizing
                    ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Optimizando...</span></>
                    : <><Zap className="h-4 w-4" /><span>Reoptimizar Rutas Ahora</span></>
                  }
                </Button>

                {isOptimizing ? (
                  <div className="text-xs font-semibold text-accent animate-pulse flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                    {loadingMessages[optimizeStep]}
                  </div>
                ) : optimized ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                    <Check className="h-4 w-4" /> ¡Secuencias guardadas en Supabase exitosamente!
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Al ejecutar, las nuevas secuencias se escriben en <code className="bg-muted px-1 rounded">daily_routes_plan</code> y se propagan vía Realtime a la app Flutter de los reponedores.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Paso 3: Contingencias en caliente ─────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shrink-0">3</div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Gestión de Contingencias en Tiempo Real</h2>
                <p className="text-xs text-muted-foreground">
                  Actúa sobre situaciones críticas del campo sin interrumpir la jornada — los cambios se aplican instantáneamente en Supabase
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sobrecargados */}
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-destructive/15 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reponedores con Retraso</p>
                    <p className="text-[10px] text-muted-foreground">
                      Detectados automáticamente cuando su jornada supera el tiempo planificado
                    </p>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {data.overloaded.map((worker) => (
                    <div key={worker.id} className="p-3 bg-destructive/8 rounded-lg border border-destructive/15">
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <div className="font-semibold text-sm text-foreground">{worker.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{worker.id}</div>
                        </div>
                        <Badge variant="destructive" className="text-[10px]">+{worker.delay} min</Badge>
                      </div>
                      <p className="text-[11px] text-foreground/60 flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                        {worker.reason}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 bg-muted/30 rounded px-2 py-1">
                        💡 Acción sugerida: reasignar sus PDVs de prioridad alta al reponedor más cercano disponible
                      </p>
                    </div>
                  ))}
                  {data.overloaded.length === 0 && (
                    <div className="py-6 text-center">
                      <p className="text-sm text-emerald-400 font-medium">✓ Todos los reponedores van a tiempo</p>
                      <p className="text-[11px] text-muted-foreground mt-1">No se detectan desviaciones críticas</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PDVs en riesgo */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-amber-500/15 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">PDVs que Pueden Quedar Sin Visita</p>
                    <p className="text-[10px] text-muted-foreground">
                      Selecciona un reponedor disponible y confirma la transferencia con un clic
                    </p>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {data.pendingRisk.map((pdv) => {
                    const recommended = getRecommendedWorker(pdv)
                    const currentSelected = selectedTargets[pdv.id] || ''
                    const impact = getImpactEstimate(pdv, currentSelected)
                    return (
                      <div key={pdv.id} className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/15 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-sm text-foreground">{pdv.name}</div>
                            <div className="text-[10px] text-muted-foreground">{pdv.location}</div>
                          </div>
                          <Badge
                            variant={pdv.priority === 'Alta' ? 'destructive' : 'secondary'}
                            className="text-[10px]"
                          >
                            Prioridad {pdv.priority}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-foreground/60">
                          Actualmente asignado a: <span className="font-medium text-foreground">{pdv.assignedWorker}</span>
                          {' '}(con retraso)
                        </div>

                        {reponedores && reponedores.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-[10px] text-muted-foreground shrink-0">Reasignar a:</label>
                            <select
                              disabled={isReassigning}
                              value={currentSelected}
                              onChange={(e) => handleSelectTarget(pdv.id, e.target.value)}
                              className="flex-1 min-w-0 bg-card border border-border text-foreground text-[10px] rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">— Seleccionar reponedor —</option>
                              {reponedores
                                .filter(w => w.name !== pdv.assignedWorker && w.status !== 'Completado')
                                .map(w => {
                                  const isRec = recommended && (w.id === recommended.id || w.dbUuid === recommended.dbUuid)
                                  return (
                                    <option key={w.dbUuid || w.id} value={w.dbUuid || w.id}>
                                      {isRec ? '⭐ ' : ''}{w.name}{isRec ? ' (Recomendado)' : ''}
                                    </option>
                                  )
                                })
                              }
                            </select>
                            {currentSelected && (
                              <button
                                onClick={() => handleConfirmReassign(pdv.id)}
                                disabled={isReassigning}
                                className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors shrink-0"
                              >
                                <Check className="h-3 w-3" /> Confirmar
                              </button>
                            )}
                          </div>
                        )}

                        {impact && (
                          <div className="text-[10px] font-medium bg-accent/8 border border-accent/20 rounded px-2 py-1.5 text-accent">
                            ⚡ Transferir a <strong>{impact.workerName}</strong>: agrega <strong>+{impact.time} min</strong> de traslado · cobertura estimada <strong>{impact.coverage}</strong>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {data.pendingRisk.length === 0 && (
                    <div className="py-6 text-center">
                      <p className="text-sm text-emerald-400 font-medium">✓ Todos los PDVs tienen cobertura asegurada</p>
                      <p className="text-[11px] text-muted-foreground mt-1">No hay puntos de venta en riesgo hoy</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Paso 4: Feedback Loop ──────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold shrink-0">4</div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Ajustes Logísticos Inteligentes</h2>
                <p className="text-xs text-muted-foreground">
                  El sistema compara el tiempo planificado en la BD contra las duraciones reales registradas por la app Flutter y sugiere actualizaciones
                </p>
              </div>
            </div>

            {data.logisticAdjustments && data.logisticAdjustments.length > 0 ? (
              <div className="rounded-xl border border-accent/20 bg-accent/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-accent/15 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <p className="text-sm font-semibold text-foreground">
                      {data.logisticAdjustments.length} PDVs con tiempos base desactualizados
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Al aprobar, se actualiza <code className="bg-muted px-1 rounded">points_of_sale.base_duration_minutes</code> en Supabase
                  </p>
                </div>
                <div className="divide-y divide-border/50">
                  {data.logisticAdjustments.map((adj: any) => (
                    <div key={adj.pdvId} className="px-4 py-3 flex flex-col md:flex-row items-start md:items-center gap-3">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">{adj.pdvName}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{adj.category}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{adj.reason}</p>
                        <div className="flex items-center gap-3 text-[11px] mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-muted border border-border">
                            Planificado: <strong className="text-foreground">{adj.currentBase} min</strong>
                          </span>
                          <span>→</span>
                          <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30">
                            Real promedio: <strong className="text-accent">{adj.suggestedBase} min</strong>
                          </span>
                          <span className={`font-bold ${adj.difference > 0 ? 'text-destructive' : 'text-emerald-400'}`}>
                            ({adj.difference > 0 ? '+' : ''}{adj.difference} min)
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isApproving === adj.pdvId}
                        onClick={() => handleApproveAdjustment(adj.pdvId, adj.suggestedBase)}
                        className="bg-accent/10 border-accent/30 hover:bg-accent text-accent hover:text-accent-foreground font-semibold text-xs shrink-0 cursor-pointer"
                      >
                        {isApproving === adj.pdvId ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Aplicando...</>
                        ) : (
                          <><Check className="h-3 w-3 mr-1" /> Aprobar Ajuste</>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/10 py-8 text-center">
                <p className="text-sm text-emerald-400 font-medium">✓ Todos los tiempos base están calibrados</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Los tiempos planificados están alineados con la duración real reportada desde campo
                </p>
              </div>
            )}
          </section>

        </div>
      )}

      {/* ══════════════════════ TAB 2: HISTORIAL ══════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {routeHistory.length} jornadas registradas · Haz clic en una fila para ver las evidencias fotográficas
            </p>
            <div className="flex gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded-full border font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Solo Completadas
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {routeHistory.map(entry => (
              <RouteHistoryRow
                key={entry.id}
                entry={entry}
                pdvs={pdvs || []}
                onViewOnMap={() => {
                  setModalMapRoute({
                    reponedorName: entry.reponedorName,
                    sequence: entry.sequence,
                  })
                }}
                onZoom={setSelectedPhoto}
              />
            ))}
            {routeHistory.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm">No hay jornadas registradas aún.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Photo Zoom Modal ── */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[88vh] rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <img src={selectedPhoto} alt="Evidencia ampliada" className="w-full h-auto max-h-[88vh] object-contain" />
            <button
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors flex items-center gap-1.5 text-xs"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-3.5 w-3.5" /> Cerrar
            </button>
          </div>
        </div>
      )}
      {/* ── Route History Map Modal ── */}
      <RouteHistoryMapModal
        isOpen={modalMapRoute !== null}
        onClose={() => setModalMapRoute(null)}
        reponedorName={modalMapRoute?.reponedorName || ''}
        sequence={modalMapRoute?.sequence || []}
        pdvs={pdvs || []}
      />
    </div>
  )
}
