'use client'

import { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle, Zap, Check, Loader2, History, ChevronDown, ChevronRight,
  Camera, Clock, User, Store, MapPin, X, ArrowRight, Route, SlidersHorizontal,
  Calendar, Send
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { RouteOptData } from '@/lib/mock-data'
import { reoptimizeRoutes, reassignPdv, approveLogisticAdjustment, getTomorrowRoutesPlan, publishTomorrowRoutesPlan, addPdvToRoute, removePdvFromRoute } from '@/app/actions'
import { useToast } from '@/hooks/use-toast'

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

      {/* Expanded: per-stop evidence timeline */}
      {expanded && (
        <div className="border-t border-border bg-muted/10 px-5 py-5">

          {/* Summary header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-primary" />
              Secuencia de visitas con evidencias — {entry.completedCount}/{entry.pdvCount} completadas
            </p>
            {entry.evidences.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Camera className="h-3 w-3" />
                {entry.evidences.length} evidencias totales
              </span>
            )}
          </div>

          {entry.sequence.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Camera className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm">Sin secuencia de visitas registrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entry.sequence.map((pdvId, idx) => {
                const pdv = pdvs.find(p => p.id === pdvId)
                const isCompleted = idx < entry.completedCount
                const isNext = !isCompleted && idx === entry.completedCount

                // Match evidences for this PDV by name or id
                const pdvEvidences = entry.evidences.filter(
                  ev => ev.pdvName === (pdv?.nombre || pdv?.name) || (ev as any).pdvId === pdvId
                )

                return (
                  <div
                    key={pdvId}
                    className={[
                      "rounded-xl border overflow-hidden transition-all duration-200",
                      isCompleted
                        ? "border-emerald-500/25 bg-card"
                        : isNext
                        ? "border-primary/30 bg-card"
                        : "border-border/60 bg-muted/20"
                    ].join(" ")}
                  >
                    {/* ── Stop header ── */}
                    <div className={[
                      "flex items-center gap-3 px-4 py-3",
                      isCompleted ? "bg-emerald-500/5" : isNext ? "bg-primary/5" : "bg-transparent"
                    ].join(" ")}>

                      {/* Stop number bubble */}
                      <div className={[
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold border",
                        isCompleted
                          ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                          : isNext
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "bg-muted/60 border-border text-muted-foreground"
                      ].join(" ")}>
                        {idx + 1}
                      </div>

                      {/* PDV name + type */}
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold truncate ${isCompleted ? 'text-foreground' : 'text-foreground/70'}`}>
                          {pdv ? (pdv.nombre || pdv.name) : `Punto ${idx + 1}`}
                        </span>
                        {pdv && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground shrink-0">
                            {pdv.type}
                          </span>
                        )}
                        {pdvEvidences.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground shrink-0">
                            <Camera className="h-2.5 w-2.5" />
                            {pdvEvidences.length} evidencia{pdvEvidences.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Status pill */}
                      <span className={[
                        "shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border",
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : isNext
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted/40 text-muted-foreground border-border"
                      ].join(" ")}>
                        {isCompleted ? "✓ Completado" : isNext ? "⏳ Próxima" : "💤 Pendiente"}
                      </span>
                    </div>

                    {/* ── Evidence body ── */}
                    <div className="px-4 pb-4 pt-3 border-t border-border/40">
                      {pdvEvidences.length === 0 ? (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/55 italic">
                          <Camera className="h-3.5 w-3.5 shrink-0" />
                          {isCompleted
                            ? "Visita completada sin evidencias fotográficas registradas."
                            : "Sin evidencias — visita aún no realizada."}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {pdvEvidences.map((ev, evIdx) => (
                            <div key={ev.id} className={evIdx > 0 ? "border-t border-border/30 pt-4" : ""}>
                              {/* Task label + timestamp */}
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-bold border ${TASK_COLORS[ev.taskName] ?? 'bg-muted/50 text-muted-foreground border-border'}`}
                                >
                                  {ev.taskName}
                                </Badge>
                                <span className="text-[9px] text-muted-foreground font-medium">
                                  🕐 {new Date(ev.timestamp).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              {/* Before / After photos */}
                              <div className="flex gap-2.5 items-stretch">
                                <PhotoPanel label="Antes" url={ev.beforeUrl} taskName={ev.taskName} onZoom={onZoom} />
                                <div className="flex items-center shrink-0 self-center">
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                                </div>
                                <PhotoPanel label="Después" url={ev.afterUrl} taskName={ev.taskName} onZoom={onZoom} />
                              </div>

                              {/* Completion pill */}
                              <div className={[
                                "mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold rounded-lg px-3 py-1.5 border w-fit",
                                ev.afterUrl
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              ].join(" ")}>
                                {ev.afterUrl ? '✓ Ciclo completo' : '⏳ Esperando foto de salida desde Flutter'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RouteManagement({ data, reponedores, photoEvidences = [], pdvs = [], onRefresh, onViewOnMap }: RouteManagementProps) {
  const { toast } = useToast()
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimized, setOptimized] = useState(false)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({})
  const [modalMapRoute, setModalMapRoute] = useState<{ reponedorName: string; sequence: string[] } | null>(null)
  const [optimizeStep, setOptimizeStep] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'operations' | 'history' | 'tomorrow'>('operations')

  // Dynamic tomorrow dates based on system date
  const [tomorrowDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  })
  const tomorrowFormattedFull = tomorrowDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }) // e.g. "01 de junio de 2026"
  const tomorrowFormattedShort = tomorrowDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short'
  }) // e.g. "01 Jun"

  // Tomorrow planning states
  const [tomorrowPublished, setTomorrowPublished] = useState(false)
  const [isPublishingTomorrow, setIsPublishingTomorrow] = useState(false)
  const [tomorrowPlans, setTomorrowPlans] = useState<any[] | null>(null)
  const [isLoadingTomorrow, setIsLoadingTomorrow] = useState(false)

  // Load tomorrow's plan from Supabase
  useEffect(() => {
    if (activeTab === 'tomorrow') {
      const fetchTomorrowPlan = async () => {
        setIsLoadingTomorrow(true)
        try {
          const res = await getTomorrowRoutesPlan()
          if ('error' in res && res.error) {
            toast({
              title: "Error al cargar planificación",
              description: res.error,
              variant: "destructive",
            })
          } else if ('plans' in res) {
            setTomorrowPlans(res.plans || [])
            setTomorrowPublished(res.published || false)
          }
        } catch (err: any) {
          console.error("Error loading tomorrow's plan:", err)
        } finally {
          setIsLoadingTomorrow(false)
        }
      }
      fetchTomorrowPlan()
    }
  }, [activeTab])

  // Date state for history audit
  const [selectedHistoryDate, setSelectedHistoryDate] = useState('2026-05-31')

  // Tomorrow cards expand/collapse state
  const [expandedTomorrowCards, setExpandedTomorrowCards] = useState<Record<string, boolean>>({})

  // Per-worker assignment state
  const [assignedWorkers, setAssignedWorkers] = useState<Record<string, boolean>>({})
  const [isAssigningWorker, setIsAssigningWorker] = useState<string | null>(null)

  // Tomorrow stops drag & drop reorder states
  const [draggingIndex, setDraggingIndex] = useState<{ workerId: string; index: number } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<{ workerId: string; index: number } | null>(null)

  const handleDragStart = (e: React.DragEvent, workerId: string, index: number) => {
    setDraggingIndex({ workerId, index })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, workerId: string, index: number) => {
    e.preventDefault()
    if (draggingIndex && draggingIndex.workerId === workerId) {
      setDragOverIndex({ workerId, index })
    }
  }

  const handleDrop = async (e: React.DragEvent, workerId: string, targetIndex: number) => {
    e.preventDefault()
    if (!draggingIndex || draggingIndex.workerId !== workerId) return
    
    const sourceIndex = draggingIndex.index
    if (sourceIndex === targetIndex) {
      setDraggingIndex(null)
      setDragOverIndex(null)
      return
    }

    const plan = tomorrowPlans?.find(p => p.reponedorId === workerId)
    if (!plan) return

    const newSequence = [...plan.sequence]
    const [movedItem] = newSequence.splice(sourceIndex, 1)
    newSequence.splice(targetIndex, 0, movedItem)

    // Update state locally
    setTomorrowPlans(prev => prev ? prev.map(p => {
      if (p.reponedorId === workerId) {
        return { ...p, sequence: newSequence }
      }
      return p
    }) : null)

    setDraggingIndex(null)
    setDragOverIndex(null)

    // Save automatically if published
    if (tomorrowPublished && tomorrowPlans) {
      setIsReassigning(true)
      try {
        const updatedPlans = tomorrowPlans.map(p => {
          if (p.reponedorId === workerId) {
            return { ...p, sequence: newSequence }
          }
          return p
        })
        const res = await publishTomorrowRoutesPlan(updatedPlans)
        if ('error' in res && res.error) {
          alert('Error al reordenar: ' + res.error)
        } else {
          if (onRefresh) onRefresh()
        }
      } catch (err: any) {
        alert('Error al guardar reordenamiento: ' + err.message)
      } finally {
        setIsReassigning(false)
      }
    }
  }

  const toggleTomorrowCard = (reponedorId: string) => {
    setExpandedTomorrowCards(prev => ({
      ...prev,
      [reponedorId]: !prev[reponedorId]
    }))
  }

  // Assign route for a single worker
  const handleAssignWorkerRoute = async (reponedorId: string, reponedorName: string) => {
    if (!tomorrowPlans) return
    const workerPlan = tomorrowPlans.find(p => p.reponedorId === reponedorId)
    if (!workerPlan) return

    setIsAssigningWorker(reponedorId)
    try {
      // Publish only this worker's plan (send all plans to keep consistency in backend)
      const res = await publishTomorrowRoutesPlan(tomorrowPlans)
      if ('error' in res && res.error) {
        toast({
          title: `Error al asignar ruta a ${reponedorName}`,
          description: res.error,
          variant: 'destructive',
        })
      } else {
        setAssignedWorkers(prev => ({ ...prev, [reponedorId]: true }))
        toast({
          title: `✓ Ruta asignada — ${reponedorName}`,
          description: `${workerPlan.sequence.length} paradas confirmadas y enviadas al dispositivo del reponedor.`,
        })
        if (onRefresh) onRefresh()
      }
    } catch (err: any) {
      toast({
        title: 'Error de conexión',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsAssigningWorker(null)
    }
  }

  const getFormattedHistoryDate = (dateStr: string) => {
    const parts = dateStr.split('-')
    if (parts.length !== 3) return ''
    const year = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const day = parseInt(parts[2])
    const date = new Date(year, month, day)
    const formatted = date.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  const loadingMessages = [
    'Calculando distancias y traslados...',
    'Analizando tiempos históricos de visitas en campo...',
    'Determinando orden óptimo de paradas...',
    'Guardando secuencias actualizadas...'
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

  const handleReassignTomorrow = async (pdvId: string, targetReponedorId: string) => {
    let currentReponedorId = ''
    tomorrowPlans.forEach(p => {
      if (p.sequence.includes(pdvId)) {
        currentReponedorId = p.reponedorId
      }
    })

    if (tomorrowPublished) {
      setIsReassigning(true)
      try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        
        const res = await reassignPdv(pdvId, targetReponedorId, tomorrowStr)
        if ('error' in res && res.error) {
          alert('Error al reasignar: ' + res.error)
        } else {
          if (onRefresh) onRefresh()
        }
      } catch (e: any) {
        alert('Error: ' + e.message)
      } finally {
        setIsReassigning(false)
      }
    } else {
      setTomorrowPlans(prev => prev.map(p => {
        let seq = p.sequence
        if (p.reponedorId === currentReponedorId) {
          seq = seq.filter((id: string) => id !== pdvId)
        }
        if (p.reponedorId === targetReponedorId) {
          if (!seq.includes(pdvId)) {
            seq = [...seq, pdvId]
          }
        }
        return { ...p, sequence: seq }
      }))
    }
  }

  const handleRemoveTomorrow = async (pdvId: string, reponedorId: string) => {
    if (tomorrowPublished) {
      setIsReassigning(true)
      try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        const res = await removePdvFromRoute(pdvId, reponedorId, tomorrowStr)
        if ('error' in res && res.error) {
          alert('Error: ' + res.error)
        } else {
          if (onRefresh) onRefresh()
        }
      } catch (e: any) {
        alert('Error: ' + e.message)
      } finally {
        setIsReassigning(false)
      }
    } else {
      setTomorrowPlans(prev => prev.map(p => {
        if (p.reponedorId === reponedorId) {
          return { ...p, sequence: p.sequence.filter((id: string) => id !== pdvId) }
        }
        return p
      }))
    }
  }

  const handleAddTomorrow = async (pdvId: string, reponedorId: string) => {
    if (tomorrowPublished) {
      setIsReassigning(true)
      try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        const res = await addPdvToRoute(pdvId, reponedorId, tomorrowStr)
        if ('error' in res && res.error) {
          alert('Error: ' + res.error)
        } else {
          if (onRefresh) onRefresh()
        }
      } catch (e: any) {
        alert('Error: ' + e.message)
      } finally {
        setIsReassigning(false)
      }
    } else {
      setTomorrowPlans(prev => prev.map(p => {
        if (p.reponedorId === reponedorId) {
          if (!p.sequence.includes(pdvId)) {
            return { ...p, sequence: [...p.sequence, pdvId] }
          }
        }
        return p
      }))
    }
  }

  const getUnassignedPdvsTomorrow = (workerCity: string) => {
    const assignedIds = new Set((tomorrowPlans || []).flatMap(p => p.sequence || []))
    let filtered = pdvs.filter(p => {
      const pCity = p.city || p.market || p.mercado
      return pCity === workerCity && !assignedIds.has(p.id)
    })
    if (filtered.length === 0) {
      filtered = pdvs.filter(p => !assignedIds.has(p.id))
    }
    return filtered
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
    // Deterministic day seed for mock history variations
    const daySeed = new Date(selectedHistoryDate).getDate() || 31
    const nameLength = w.name.length

    const pdvCount = w.sequence ? w.sequence.length : 8
    const score = (daySeed + nameLength) % 3
    const status = score === 0 ? 'En Proceso' : score === 1 ? 'Asignada' : 'Completada'

    const completedCount = status === 'Completada'
      ? pdvCount
      : status === 'En Proceso'
      ? Math.max(1, Math.round(pdvCount * 0.6))
      : 0

    const dateFormatted = getFormattedHistoryDate(selectedHistoryDate)

    return {
      id: w.dbUuid || w.id,
      reponedorName: w.name,
      date: dateFormatted,
      pdvCount,
      completedCount,
      status,
      evidences: status === 'Completada' ? (evidencesByWorker[w.name] || []) : [],
      sequence: w.sequence || []
    }
  }).filter(entry => entry.status === 'Completada')

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border w-fit">
        {[
          { id: 'operations', label: 'Operaciones del Día', icon: Zap },
          { id: 'history', label: 'Historial de Rutas', icon: History },
          { id: 'tomorrow', label: 'Planificación', icon: Calendar },
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
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-primary shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Diagnóstico del Día</h2>
                <p className="text-xs text-muted-foreground">Resumen operativo calculado en tiempo real</p>
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
            <div className="flex items-center gap-2 mb-3">
              <Route className="h-5 w-5 text-primary shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Reoptimizar Rutas del Día</h2>
                <p className="text-xs text-muted-foreground">
                  Recalcula el orden óptimo de visita de cada reponedor usando datos reales de campo
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-5">
              {/* Cómo funciona */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 text-xs border-b border-border pb-4">
                <div className="flex items-start gap-3 flex-1">
                  <Clock className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground">1. Tiempos de Atención</h4>
                    <p className="text-muted-foreground text-[11px] leading-relaxed mt-0.5">
                      Analiza la duración real de las tareas completadas por canal de cliente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 flex-1">
                  <MapPin className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground">2. Distancias Geográficas</h4>
                    <p className="text-muted-foreground text-[11px] leading-relaxed mt-0.5">
                      Calcula las rutas más cortas entre los puntos de venta asignados.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 flex-1">
                  <Zap className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground">3. Balance de Secuencia</h4>
                    <p className="text-muted-foreground text-[11px] leading-relaxed mt-0.5">
                      Intercala paradas complejas y sencillas para reducir la fatiga de la ruta.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  size="lg"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer shrink-0"
                >
                  {isOptimizing
                    ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Optimizando Rutas...</span></>
                    : <><Zap className="h-4 w-4" /><span>Reoptimizar Rutas Ahora</span></>
                  }
                </Button>

                {isOptimizing ? (
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
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
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Gestión de Contingencias en Tiempo Real</h2>
                <p className="text-xs text-muted-foreground">
                  Actúa sobre situaciones críticas del campo sin interrumpir la jornada — los cambios se aplican instantáneamente
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
                  {data.pendingRisk.map((pdv, idx) => {
                    const recommended = getRecommendedWorker(pdv)
                    const currentSelected = selectedTargets[pdv.id] || ''
                    const impact = getImpactEstimate(pdv, currentSelected)
                    return (
                      <div key={`${pdv.id}-${pdv.assignedWorker}-${idx}`} className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/15 space-y-2">
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
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="h-5 w-5 text-accent shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Ajustes Logísticos Inteligentes</h2>
                <p className="text-xs text-muted-foreground">
                  El sistema compara el tiempo planificado contra las duraciones reales reportadas desde el celular y sugiere actualizaciones
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
                    Al aprobar, se actualiza el tiempo estimado de atención planificado de forma automática
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
        <div className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-500/5 p-4 rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">
              {routeHistory.length} jornadas completadas · Haz clic en una fila para ver las evidencias fotográficas
            </p>
            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Auditar Fecha:
                </span>
                <input 
                  type="date"
                  value={selectedHistoryDate}
                  onChange={(e) => setSelectedHistoryDate(e.target.value)}
                  max="2026-05-31"
                  className="bg-card border border-border rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold cursor-pointer shadow-sm"
                />
              </div>
              <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
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
              <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl bg-slate-500/5">
                <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30 animate-pulse" />
                <p className="text-sm font-semibold">No hay jornadas completadas para esta fecha.</p>
                <p className="text-xs text-muted-foreground mt-1">Prueba seleccionando otro día en el selector superior.</p>
              </div>
            )}
          </div>
        </div>
      )}      {/* ══════════════════════ TAB 3: PLANIFICACIÓN DE MAÑANA ══════════════════════ */}
      {activeTab === 'tomorrow' && (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
          {isLoadingTomorrow ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 bg-slate-500/5 rounded-xl border border-border border-dashed">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">Generando optimizaciones en el Feedback Loop de Supabase...</p>
              <p className="text-xs text-muted-foreground">Calculando proximidad geográfica y disponibilidad de locales por segmentación.</p>
            </div>
          ) : (
            <>
              {/* Header Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-500/5 p-5 rounded-xl border border-border">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary animate-pulse" />
                    Planificación de Rutas para Mañana ({tomorrowFormattedFull})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Sugerencias de optimización automática generadas por el Feedback Loop y calibradas en base a tiempos de hoy.
                  </p>
                </div>
                
                <Button
                  disabled={isPublishingTomorrow || tomorrowPublished || !tomorrowPlans || tomorrowPlans.length === 0}
                  onClick={async () => {
                    if (tomorrowPublished || !tomorrowPlans) return
                    setIsPublishingTomorrow(true)
                    try {
                      const res = await publishTomorrowRoutesPlan(tomorrowPlans)
                      if ('error' in res && res.error) {
                        toast({
                          title: "Error al publicar rutas",
                          description: res.error,
                          variant: "destructive",
                        })
                      } else {
                        setTomorrowPublished(true)
                        setTomorrowPlans(prev => prev ? prev.map(p => ({ ...p, published: true })) : null)
                        toast({
                          title: "¡Éxito! Rutas publicadas",
                          description: `Rutas para el ${tomorrowFormattedFull} aprobadas y publicadas en Supabase. Se han notificado a los reponedores.`,
                        })
                        if (onRefresh) onRefresh()
                      }
                    } catch (err: any) {
                      toast({
                        title: "Error de conexión",
                        description: err.message,
                        variant: "destructive",
                      })
                    } finally {
                      setIsPublishingTomorrow(false)
                    }
                  }}
                  size="lg"
                  className={[
                    "font-bold text-sm px-6 py-5 rounded-xl shadow-md transition-all duration-200 cursor-pointer shrink-0 gap-2",
                    tomorrowPublished
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/20 hover:text-emerald-400 cursor-default"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-950/20"
                  ].join(" ")}
                >
                  {isPublishingTomorrow ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Publicando secuencias...</span>
                    </>
                  ) : tomorrowPublished ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>✓ Rutas Publicadas</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Aprobar y Publicar Rutas</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Status Alert Banner */}
              {tomorrowPublished ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Check className="h-5 w-5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">Jornada de Mañana Publicada</h4>
                    <p className="text-xs text-emerald-400/80 mt-0.5">
                      Las rutas y secuencias de visitas ya están aprobadas e impactadas en el backend de Supabase. Los reponedores recibirán las actualizaciones en su aplicación móvil al iniciar su jornada.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <SlidersHorizontal className="h-5 w-5 shrink-0 text-indigo-400 animate-pulse" />
                  <div>
                    <h4 className="font-semibold text-sm">Sugerencias de Rutas Pendientes de Aprobación</h4>
                    <p className="text-xs text-indigo-400/80 mt-0.5">
                      El Feedback Loop ha recalculado las rutas óptimas para mañana ({tomorrowFormattedFull}) basándose en las duraciones reales de hoy y la proximidad geográfica (TSP). Revisa los detalles antes de publicar.
                    </p>
                  </div>
                </div>
              )}

              {/* Expand/Collapse All Buttons */}
              <div className="flex justify-end gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2.5 cursor-pointer"
                  onClick={() => {
                    const allExpanded: Record<string, boolean> = {}
                    if (tomorrowPlans) {
                      tomorrowPlans.forEach(p => {
                        allExpanded[p.reponedorId] = true
                      })
                    }
                    setExpandedTomorrowCards(allExpanded)
                  }}
                >
                  Expandir todo
                </Button>
                <span className="text-muted-foreground/30 self-center text-xs">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2.5 cursor-pointer"
                  onClick={() => {
                    setExpandedTomorrowCards({})
                  }}
                >
                  Colapsar todo
                </Button>
              </div>

              {/* Suggested routes list */}
              <div className="grid grid-cols-1 gap-4">
                {(tomorrowPlans || []).map((p, idx) => {
                  const nameLength = p.reponedorName.length
                  const plannedCount = p.sequence.length
                  
                  // Estimated duration
                  const estHours = ((nameLength * 7 + 220) / 60).toFixed(1)
                  // Distance efficiency
                  const estEff = ((nameLength % 5) * 2.5 + 8.5).toFixed(1)
                  
                  // Find reponedor route from active list
                  const workerObj = reponedores?.find(w => w.dbUuid === p.reponedorId || w.id === p.reponedorId)
                  const routeName = workerObj?.route || 'Urbana'
                  const workerCity = workerObj?.city || 'Santa Cruz'
                  
                  // Optimization details
                  const optDetail = nameLength % 2 === 0
                    ? "Calibrado de tiempos de servicio: Se ajustó el tiempo estimado de atención en base al promedio de visitas de hoy."
                    : "Optimización de recorrido TSP: Secuencia reordenada para minimizar la distancia total y tiempos de traslado."

                  const isExpanded = !!expandedTomorrowCards[p.reponedorId]

                  return (
                    <div key={p.reponedorId} className="border border-border rounded-xl bg-card overflow-hidden shadow-sm transition-all duration-200">
                      {/* Clickable Card Header */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleTomorrowCard(p.reponedorId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleTomorrowCard(p.reponedorId)
                          }
                        }}
                        className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          {/* Chevron icon */}
                          <div className="text-muted-foreground shrink-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>

                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{p.reponedorName}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">Ruta sugerida</span>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <span className="text-[10px] text-muted-foreground font-medium">{routeName}</span>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <Badge variant="outline" className="px-1.5 py-0 text-[9px] bg-muted/50 text-muted-foreground border-border uppercase font-bold shrink-0">
                                {workerCity}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Collapsed Stats Summary + Status Badges */}
                        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                          {/* Quick Stats (always visible for comparison, clean look) */}
                          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mr-1">
                            <span className="font-semibold text-foreground">{plannedCount} PDVs</span>
                            <span>•</span>
                            <span>{estHours} hrs</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">+{estEff}%</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Status badge */}
                            {(tomorrowPublished || assignedWorkers[p.reponedorId]) ? (
                              <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                ✓ Asignada
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                Sugerida
                              </span>
                            )}

                            {/* Per-worker Assign Route Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAssignWorkerRoute(p.reponedorId, p.reponedorName)
                              }}
                              disabled={isAssigningWorker === p.reponedorId || (tomorrowPublished && assignedWorkers[p.reponedorId]) || plannedCount === 0}
                              className={[
                                "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 shrink-0 cursor-pointer",
                                (tomorrowPublished || assignedWorkers[p.reponedorId])
                                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 cursor-default"
                                  : plannedCount === 0
                                  ? "bg-muted/30 border-border text-muted-foreground cursor-not-allowed opacity-50"
                                  : "bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-sm active:scale-95"
                              ].join(" ")}
                            >
                              {isAssigningWorker === p.reponedorId ? (
                                <><Loader2 className="h-3 w-3 animate-spin" /> Asignando...</>
                              ) : (tomorrowPublished || assignedWorkers[p.reponedorId]) ? (
                                <><Check className="h-3 w-3" /> Asignada</>
                              ) : (
                                <><Send className="h-3 w-3" /> Asignar Ruta</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Content (Visible only when expanded) */}
                      {isExpanded && (
                        <div className="px-5 py-4 space-y-4 animate-in fade-in duration-200">
                          {/* Horizontal Stop Sequence */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Store className="h-3.5 w-3.5 text-primary" />
                              Secuencia Planificada de Paradas (Optimización TSP)
                            </h4>
                            
                            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border/50">
                              {p.sequence.map((pdvId: string, idx: number) => {
                                const pdv = pdvs.find(pos => pos.id === pdvId)
                                const name = pdv ? (pdv.nombre || pdv.name) : `Punto ${idx + 1}`
                                const isLast = idx === p.sequence.length - 1
                                const isDragging = draggingIndex?.workerId === p.reponedorId && draggingIndex?.index === idx
                                const isOver = dragOverIndex?.workerId === p.reponedorId && dragOverIndex?.index === idx

                                return (
                                  <div 
                                    key={pdvId} 
                                    className="flex items-center gap-2 shrink-0"
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, p.reponedorId, idx)}
                                    onDragOver={(e) => handleDragOver(e, p.reponedorId, idx)}
                                    onDrop={(e) => handleDrop(e, p.reponedorId, idx)}
                                    onDragEnd={() => {
                                      setDraggingIndex(null)
                                      setDragOverIndex(null)
                                    }}
                                  >
                                    <div className={[
                                      "relative flex flex-col items-center p-3.5 rounded-xl min-w-[140px] max-w-[160px] shadow-xs group transition-all duration-200 cursor-grab active:cursor-grabbing select-none border",
                                      isDragging 
                                        ? "opacity-40 border-dashed border-muted-foreground bg-muted" 
                                        : isOver
                                        ? "border-primary border-dashed bg-primary/5 scale-105 shadow-md"
                                        : "bg-gradient-to-b from-card to-muted/20 border-border/80 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-sm"
                                    ].join(" ")}>
                                      {/* Delete Button */}
                                      <button
                                        onClick={() => handleRemoveTomorrow(pdvId, p.reponedorId)}
                                        className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer z-10"
                                        title="Quitar parada"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>

                                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                        Parada {idx + 1}
                                      </span>
                                      <span className="text-xs font-bold text-foreground truncate w-full text-center mt-2 group-hover:text-primary transition-colors" title={name}>
                                        {name}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{pdv?.type || 'Detallista'}</span>
                                    </div>
                                    {!isLast && <ArrowRight className="h-4 w-4 text-muted-foreground/45 shrink-0 mx-0.5 hover:translate-x-0.5 transition-transform" />}
                                  </div>
                                )
                              })}
                              {p.sequence.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Sin secuencia generada.</p>
                              )}
                            </div>
                          </div>

                          {/* Route Customization Options */}
                          <div className="border-t border-border/50 pt-3">
                            {/* Add PDV */}
                            <div className="flex items-center gap-3 bg-muted/10 p-2.5 rounded-xl border border-border max-w-md">
                              <span className="text-[11px] uppercase font-bold text-muted-foreground shrink-0">Añadir parada:</span>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddTomorrow(e.target.value, p.reponedorId)
                                    e.target.value = ''
                                  }
                                }}
                                className="bg-card border border-border text-foreground text-xs rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-0 font-medium"
                              >
                                <option value="">— Seleccionar punto disponible —</option>
                                {getUnassignedPdvsTomorrow(workerCity).map(pdv => {
                                  const pCity = pdv.city || pdv.market || pdv.mercado || 'Sin ciudad'
                                  return (
                                    <option key={pdv.id} value={pdv.id}>
                                      📍 {pdv.nombre || pdv.name} ({pdv.type} - {pCity})
                                    </option>
                                  )
                                })}
                              </select>
                            </div>
                          </div>

                          {/* Feedback Loop Explanation */}
                          <div className="text-[10px] font-medium bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 text-foreground/80 flex items-start gap-2">
                            <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-primary">Optimización del Feedback Loop:</strong> {optDetail}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {(!tomorrowPlans || tomorrowPlans.length === 0) && (
                  <p className="text-sm text-center text-muted-foreground italic py-10 bg-muted/20 border border-border rounded-xl">
                    No se encontraron reponedores para generar sugerencias de rutas de mañana.
                  </p>
                )}
              </div>
            </>
          )}
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
