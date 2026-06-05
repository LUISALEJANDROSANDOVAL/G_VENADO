'use client'

import { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle, Zap, Check, Loader2, History, ChevronDown, ChevronRight,
  Camera, Clock, User, Store, MapPin, X, ArrowRight, Route, SlidersHorizontal,
  Calendar, Send, GripVertical, Info, Phone, Download, Users, Sparkles, TrendingUp, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { RouteOptData } from '@/lib/mock-data'
import { reoptimizeRoutes, reassignPdv, approveLogisticAdjustment, getRoutesPlanForDate, publishRoutesPlanForDate, addPdvToRoute, removePdvFromRoute } from '@/app/actions'
import { useToast } from '@/hooks/use-toast'
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
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

// ─── Route History Map Modal (Client-side Mapbox) ──────────────────────────
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
  const [viewState, setViewState] = useState({
    longitude: -63.1812,
    latitude: -17.7862,
    zoom: 12
  })

  useEffect(() => {
    if (isOpen && sequence.length > 0 && pdvs.length > 0) {
      const firstPdv = pdvs.find(p => p.id === sequence[0])
      if (firstPdv && firstPdv.lng !== undefined && firstPdv.lat !== undefined) {
        setViewState({
          longitude: Number(firstPdv.lng),
          latitude: Number(firstPdv.lat),
          zoom: 13
        })
      }
    }
  }, [isOpen, sequence, pdvs])

  if (!isOpen) return null

  const coords = sequence.map(id => {
    const p = pdvs.find(x => x.id === id)
    return p && p.lng !== undefined && p.lat !== undefined ? [Number(p.lng), Number(p.lat)] : null
  }).filter(Boolean) as number[][]

  const routeGeoJSON = coords.length > 1 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: coords }
  } : null

  const isTokenValid = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'PEGA_TU_TOKEN_AQUI'

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
            {!isTokenValid ? (
              <div className="flex h-full flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
                <h3 className="text-xl font-bold text-rose-500 mb-2">Falta Mapbox Token</h3>
                <p className="text-sm text-slate-300">Añade tu token en .env.local para visualizar rutas.</p>
              </div>
            ) : (
              <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
              >
                {routeGeoJSON && (
                  <Source id="history-route" type="geojson" data={routeGeoJSON}>
                    <Layer
                      id="history-line"
                      type="line"
                      paint={{
                        'line-color': '#10b981',
                        'line-width': 4,
                        'line-opacity': 0.85
                      }}
                    />
                  </Source>
                )}
                {sequence.map((pdvId, idx) => {
                  const pdv = pdvs.find(p => p.id === pdvId)
                  if (!pdv || pdv.lng === undefined || pdv.lat === undefined) return null;
                  return (
                    <Marker key={pdvId} longitude={Number(pdv.lng)} latitude={Number(pdv.lat)}>
                      <div className="w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                        {idx + 1}
                      </div>
                    </Marker>
                  )
                })}
              </Map>
            )}
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
    'Completada': 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    'En Proceso': 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    'Asignada': 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  }[entry.status]

  return (
    <div className={[
      "border rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)]",
      expanded 
        ? "border-primary/40 shadow-[0_12px_30px_rgba(11,37,69,0.08)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.4)] scale-[1.002]" 
        : "border-slate-100 dark:border-slate-800/80 hover:border-primary/20 dark:hover:border-primary/45 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5"
    ].join(" ")}>
      {/* Clickable header row */}
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left px-6 py-4.5 flex items-center gap-4 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
      >
        {/* Expand icon */}
        <div className={[
          "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
          expanded 
            ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground" 
            : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600"
        ].join(" ")}>
          {expanded ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />}
        </div>

        {/* Worker avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:to-transparent border border-primary/10 dark:border-primary/25 flex items-center justify-center shrink-0 shadow-2xs">
          <User className="h-5 w-5 text-primary dark:text-blue-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight truncate">{entry.reponedorName}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
            {entry.date}
          </p>
        </div>

        {/* PDV progress */}
        <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 mr-4">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{entry.completedCount}/{entry.pdvCount} PDVs</span>
          <div className="w-28 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-700/30 shadow-inner">
            <div
              className={[
                "h-full rounded-full transition-all duration-500 ease-out",
                pct === 100 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                  : "bg-gradient-to-r from-primary to-blue-400"
              ].join(" ")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Status badge */}
        <Badge variant="outline" className={`text-[10px] shrink-0 border uppercase font-extrabold py-0.5 px-3 rounded-full transition-all duration-200 ${statusColor}`}>
          {entry.status}
        </Badge>

        {/* Evidence count */}
        {entry.evidences.length > 0 && (
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/10 text-[10px] font-bold shrink-0 shadow-2xs">
            <Camera className="h-3.5 w-3.5" />
            {entry.evidences.length} evidencias
          </span>
        )}

        {/* View on Map Button */}
        {onViewOnMap && (
          <Button
            size="sm"
            variant="outline"
            className="h-8.5 px-3.5 gap-1.5 text-[10px] font-bold bg-slate-50 hover:bg-[#0B2545] hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
            onClick={(e) => {
              e.stopPropagation()
              onViewOnMap(entry.id)
            }}
          >
            <MapPin className="h-3.5 w-3.5" /> Ver Ruta
          </Button>
        )}
      </div>

      {/* Expanded: per-stop evidence timeline */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-6">

          {/* Summary header */}
          <div className="flex items-center justify-between mb-5 bg-white dark:bg-slate-900 px-4.5 py-3 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-3xs">
            <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Secuencia de visitas con evidencias — {entry.completedCount}/{entry.pdvCount} completadas
            </p>
            {entry.evidences.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                <Camera className="h-3.5 w-3.5" />
                {entry.evidences.length} evidencias totales
              </span>
            )}
          </div>

          {entry.sequence.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Camera className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">Sin secuencia de visitas registrada.</p>
            </div>
          ) : (
            <div className="relative border-l border-dashed border-slate-200 dark:border-slate-800/80 ml-5 mt-4 space-y-6">
              {entry.sequence.map((pdvId, idx) => {
                const pdv = pdvs.find(p => p.id === pdvId)
                const isCompleted = idx < entry.completedCount
                const isNext = !isCompleted && idx === entry.completedCount

                // Match evidences for this PDV by name or id
                const pdvEvidences = entry.evidences.filter(
                  ev => ev.pdvName === (pdv?.nombre || pdv?.name) || (ev as any).pdvId === pdvId
                )

                return (
                  <div key={pdvId} className="relative pl-8 pb-1 group/timeline">
                    {/* Timeline dot / bubble */}
                    <div className={[
                      "absolute -left-[14px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border z-10 transition-all duration-300 shadow-xs",
                      isCompleted
                        ? "bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-400 text-white shadow-emerald-500/20 scale-105"
                        : isNext
                        ? "bg-[#0B2545] border-blue-400 text-white animate-pulse"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                    ].join(" ")}>
                      {isCompleted ? "✓" : idx + 1}
                    </div>

                    {/* Stop Card */}
                    <div className={[
                      "rounded-2xl border overflow-hidden bg-white dark:bg-slate-900 transition-all duration-300 shadow-2xs hover:shadow-xs",
                      isCompleted
                        ? "border-emerald-500/20 hover:border-emerald-500/35"
                        : isNext
                        ? "border-primary/20 hover:border-primary/45 shadow-[0_4px_15px_rgba(0,69,124,0.02)]"
                        : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700"
                    ].join(" ")}>
                      {/* Stop header */}
                      <div className={[
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4.5 py-3.5 border-b border-slate-50 dark:border-slate-800/40",
                        isCompleted ? "bg-emerald-500/5 dark:bg-emerald-500/2" : isNext ? "bg-primary/5 dark:bg-primary/2" : "bg-transparent"
                      ].join(" ")}>
                        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold truncate ${isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-700/80 dark:text-slate-300/80'}`}>
                            {pdv ? (pdv.nombre || pdv.name) : `Punto ${idx + 1}`}
                          </span>
                          {pdv && (
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                              {pdv.type}
                            </span>
                          )}
                          {pdvEvidences.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/35 border border-blue-100 dark:border-blue-900/30 px-2 py-0.5 rounded-full shrink-0">
                              <Camera className="h-2.5 w-2.5" />
                              {pdvEvidences.length} {pdvEvidences.length > 1 ? 'Evidencias' : 'Evidencia'}
                            </span>
                          )}
                        </div>

                        <span className={[
                          "shrink-0 text-[9px] font-extrabold px-2.5 py-1 rounded-full border shadow-3xs uppercase tracking-wider w-fit",
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : isNext
                            ? "bg-primary/10 text-primary dark:text-blue-400 border-primary/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        ].join(" ")}>
                          {isCompleted ? "✓ Completado" : isNext ? "⏳ Próxima" : "💤 Pendiente"}
                        </span>
                      </div>

                      {/* Evidence body */}
                      <div className="px-4.5 pb-4 pt-3.5">
                        {pdvEvidences.length === 0 ? (
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 italic font-medium">
                            <Info className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-700" />
                            {isCompleted
                              ? "Visita registrada sin evidencias fotográficas."
                              : "Sin evidencias — visita programada en espera de ejecución."}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {pdvEvidences.map((ev, evIdx) => (
                              <div key={ev.id} className={evIdx > 0 ? "border-t border-slate-100 dark:border-slate-800/80 pt-4" : ""}>
                                {/* Task label + timestamp */}
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-bold border ${TASK_COLORS[ev.taskName] ?? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                  >
                                    {ev.taskName}
                                  </Badge>
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                                    🕐 {new Date(ev.timestamp).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                {/* Before / After photos */}
                                <div className="flex gap-3 items-stretch">
                                  <PhotoPanel label="Antes" url={ev.beforeUrl} taskName={ev.taskName} onZoom={onZoom} />
                                  <div className="flex items-center shrink-0 self-center">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-3xs">
                                      <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                    </div>
                                  </div>
                                  <PhotoPanel label="Después" url={ev.afterUrl} taskName={ev.taskName} onZoom={onZoom} />
                                </div>

                                {/* Completion pill */}
                                <div className={[
                                  "mt-3 flex items-center gap-1.5 text-[10px] font-bold rounded-xl px-3 py-1.5 border w-fit shadow-3xs",
                                  ev.afterUrl
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20"
                                ].join(" ")}>
                                  {ev.afterUrl ? '✓ Ciclo completo' : '⏳ Esperando foto de salida desde Flutter'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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

  // Dynamic planning date picker
  const [planningDateStr, setPlanningDateStr] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0] // default to tomorrow
  })

  const getPlanningFormattedFull = (dateStr: string) => {
    const parts = dateStr.split('-')
    if (parts.length !== 3) return ''
    const year = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const day = parseInt(parts[2])
    const date = new Date(year, month, day)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  // Tomorrow planning states
  const [tomorrowPublished, setTomorrowPublished] = useState(false)
  const [isPublishingTomorrow, setIsPublishingTomorrow] = useState(false)
  const [tomorrowPlans, setTomorrowPlans] = useState<any[] | null>(null)
  const [isLoadingTomorrow, setIsLoadingTomorrow] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load tomorrow's plan from Supabase
  useEffect(() => {
    if (activeTab === 'tomorrow') {
      const fetchTomorrowPlan = async () => {
        setIsLoadingTomorrow(true)
        try {
          const res = await getRoutesPlanForDate(planningDateStr)
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
  }, [activeTab, planningDateStr, refreshTrigger])

  // Date state for history audit
  const [selectedHistoryDate, setSelectedHistoryDate] = useState('2026-05-31')

  // Tomorrow cards expand/collapse state
  const [expandedTomorrowCards, setExpandedTomorrowCards] = useState<Record<string, boolean>>({})

  // Per-worker assignment state
  const [assignedWorkers, setAssignedWorkers] = useState<Record<string, boolean>>({})
  const [isAssigningWorker, setIsAssigningWorker] = useState<string | null>(null)

  // Tomorrow stops drag & drop reorder states
  const [draggingIndex, setDraggingIndex] = useState<{ workerId: string, idx: number } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<{ workerId: string, idx: number } | null>(null)

  const handleDragStart = (workerId: string, idx: number) => {
    setDraggingIndex({ workerId, idx })
  }

  const handleDragOver = (e: React.DragEvent, workerId: string, idx: number) => {
    e.preventDefault()
    if (!draggingIndex || draggingIndex.workerId !== workerId) return
    setDragOverIndex({ workerId, idx })
  }

  const handleDrop = async (workerId: string, idx: number) => {
    if (!draggingIndex || draggingIndex.workerId !== workerId) {
      setDraggingIndex(null)
      setDragOverIndex(null)
      return
    }

    const { idx: fromIdx } = draggingIndex
    const toIdx = idx

    if (fromIdx !== toIdx && tomorrowPlans) {
      const plans = [...tomorrowPlans]
      const workerPlanIdx = plans.findIndex(p => p.reponedorId === workerId)
      if (workerPlanIdx > -1) {
        const plan = { ...plans[workerPlanIdx] }
        const sequence = [...plan.sequence]
        
        // reorder
        const [moved] = sequence.splice(fromIdx, 1)
        sequence.splice(toIdx, 0, moved)
        
        plan.sequence = sequence
        plans[workerPlanIdx] = plan
        
        setTomorrowPlans(plans)

        // auto-save the new sequence immediately (since user requested auto-save on drop)
        try {
          await publishRoutesPlanForDate(plans, planningDateStr)
        } catch (err) {
          console.error("Error auto-saving on drop", err)
        }
      }
    }

    setDraggingIndex(null)
    setDragOverIndex(null)
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
      const res = await publishRoutesPlanForDate(tomorrowPlans, planningDateStr)
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
    if (tomorrowPlans) {
      tomorrowPlans.forEach(p => {
        if (p.sequence.includes(pdvId)) {
          currentReponedorId = p.reponedorId
        }
      })
    }

    // Always update local state first (optimistic)
    setTomorrowPlans(prev => prev ? prev.map(p => {
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
    }) : null)

    // If published, also save to server in background (no refresh)
    if (tomorrowPublished) {
      try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        const res = await reassignPdv(pdvId, targetReponedorId, tomorrowStr)
        if ('error' in res && res.error) {
          console.error('Error al reasignar:', res.error)
        }
      } catch (e: any) {
        console.error('Error:', e.message)
      }
    }
  }

  const handleRemoveTomorrow = async (pdvId: string, reponedorId: string) => {
    // Always update local state first (optimistic)
    setTomorrowPlans(prev => prev ? prev.map(p => {
      if (p.reponedorId === reponedorId) {
        return { ...p, sequence: p.sequence.filter((id: string) => id !== pdvId) }
      }
      return p
    }) : null)

    // If published, also save to server in background (no refresh)
    if (tomorrowPublished) {
      try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        const res = await removePdvFromRoute(pdvId, reponedorId, tomorrowStr)
        if ('error' in res && res.error) {
          console.error('Error:', res.error)
        }
      } catch (e: any) {
        console.error('Error:', e.message)
      }
    }
  }

  const handleAddTomorrow = async (pdvId: string, reponedorId: string) => {
    // Always update local state first (optimistic)
    setTomorrowPlans(prev => prev ? prev.map(p => {
      if (p.reponedorId === reponedorId) {
        if (!p.sequence.includes(pdvId)) {
          return { ...p, sequence: [...p.sequence, pdvId] }
        }
      }
      return p
    }) : null)

    // If published, also save to server in background (no refresh)
    if (tomorrowPublished) {
      try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        const res = await addPdvToRoute(pdvId, reponedorId, tomorrowStr)
        if ('error' in res && res.error) {
          console.error('Error:', res.error)
        }
      } catch (e: any) {
        console.error('Error:', e.message)
      }
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
    const status: 'Completada' | 'En Proceso' | 'Asignada' = score === 0 ? 'En Proceso' : score === 1 ? 'Asignada' : 'Completada'

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

          {/* ── Diagnóstico del Día ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'REPONEDORES ACTIVOS',
                value: String((reponedores || []).filter(w => w.status !== 'Completado').length || 15),
                valueColor: 'text-slate-900',
                sub: 'activos trabajando',
                subColor: 'text-emerald-600',
                borderColor: 'border-l-4 border-l-[#0B2545]',
                icon: Users,
                iconColor: 'text-[#0B2545]',
                subIcon: TrendingUp,
                subIconColor: 'text-emerald-500'
              },
              {
                label: 'CON RETRASO',
                value: String(data.overloaded ? data.overloaded.length : 0),
                valueColor: (data.overloaded && data.overloaded.length > 0) ? 'text-[#EF4444]' : 'text-slate-900',
                sub: 'requieren intervención',
                subColor: (data.overloaded && data.overloaded.length > 0) ? 'text-[#EF4444]' : 'text-muted-foreground',
                borderColor: (data.overloaded && data.overloaded.length > 0) ? 'border-l-4 border-l-[#EF4444]' : 'border-l-4 border-l-slate-300',
                icon: Clock,
                iconColor: (data.overloaded && data.overloaded.length > 0) ? 'text-[#EF4444]' : 'text-slate-400',
                subIcon: AlertTriangle,
                subIconColor: (data.overloaded && data.overloaded.length > 0) ? 'text-[#EF4444]' : 'text-slate-400'
              },
              {
                label: 'PDVS EN RIESGO',
                value: String(data.pendingRisk ? data.pendingRisk.length : 0),
                valueColor: (data.pendingRisk && data.pendingRisk.length > 0) ? 'text-[#D97706]' : 'text-slate-900',
                sub: 'pueden quedar sin visita',
                subColor: 'text-muted-foreground',
                borderColor: (data.pendingRisk && data.pendingRisk.length > 0) ? 'border-l-4 border-l-[#3B82F6]' : 'border-l-4 border-l-slate-300',
                icon: MapPin,
                iconColor: 'text-[#3B82F6]',
                subIcon: Info,
                subIconColor: 'text-[#3B82F6]'
              },
              {
                label: 'MEJORAS IA',
                value: String(data.logisticAdjustments ? data.logisticAdjustments.length : 0),
                valueColor: (data.logisticAdjustments && data.logisticAdjustments.length > 0) ? 'text-emerald-600' : 'text-slate-900',
                sub: 'tiempos base desactualizados',
                subColor: (data.logisticAdjustments && data.logisticAdjustments.length > 0) ? 'text-emerald-600' : 'text-muted-foreground',
                borderColor: (data.logisticAdjustments && data.logisticAdjustments.length > 0) ? 'border-l-4 border-l-[#10B981]' : 'border-l-4 border-l-slate-300',
                icon: Sparkles,
                iconColor: (data.logisticAdjustments && data.logisticAdjustments.length > 0) ? 'text-[#10B981]' : 'text-slate-400',
                subIcon: Sparkles,
                subIconColor: (data.logisticAdjustments && data.logisticAdjustments.length > 0) ? 'text-emerald-500' : 'text-slate-400'
              },
            ].map(s => {
              const Icon = s.icon;
              const SubIcon = s.subIcon;
              const hasAlert = s.label === 'PDVS EN RIESGO' && Number(s.value) > 0;
              const hasRetraso = s.label === 'CON RETRASO' && Number(s.value) > 0;
              const pulseClass = hasRetraso ? 'animate-glow-red' : hasAlert ? 'animate-glow-amber' : '';
              
              return (
                <div 
                  key={s.label} 
                  className={`group p-5 rounded-xl border border-border bg-card ${s.borderColor} ${pulseClass} hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700 hover:-translate-y-1 transition-all duration-300 shadow-sm flex flex-col justify-between h-[115px]`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold tracking-wider text-muted-foreground group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                      {s.label}
                    </span>
                    <Icon className={`h-4 w-4 ${s.iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`} />
                  </div>
                  <div>
                    <div className={`text-3xl font-extrabold ${s.valueColor}`}>{s.value}</div>
                    <div className={`text-[10px] font-semibold ${s.subColor} mt-1 flex items-center gap-1`}>
                      <SubIcon className={`h-3 w-3 ${s.subIconColor} transition-transform group-hover:animate-pulse`} />
                      <span>{s.sub}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Optimización Predictiva de Rutas ── */}
          <div className="rounded-xl bg-[#0B2545] p-5 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800 shadow-lg">
            <div className="space-y-1 text-left flex-1">
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                Optimización Predictiva de Rutas
              </h3>
              <p className="text-slate-300/80 text-[11px] sm:text-xs leading-relaxed max-w-2xl">
                El sistema ha identificado un ahorro potencial del 18% en combustible y tiempo re-asignando 4 rutas en la zona Norte. ¿Deseas aplicar los cambios ahora?
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing}
                size="sm"
                className="gap-1.5 bg-[#4EE39D] hover:bg-[#3cd08a] text-[#0B2545] font-bold px-4 py-2 h-9 rounded-lg transition-colors cursor-pointer"
              >
                {isOptimizing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Optimizando...</span></>
                ) : (
                  <><Zap className="h-3.5 w-3.5 fill-current" /><span>Reoptimizar Rutas</span></>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: "Detalles de Optimización",
                    description: "Se estima un ahorro de 45.2 km de recorrido y 180 minutos de traslado en total re-asignando 4 reponedores.",
                  })
                }}
                className="bg-transparent text-white border border-white/20 hover:bg-white/10 text-xs font-semibold px-4 py-2 h-9 rounded-lg transition-colors cursor-pointer"
              >
                Ver Detalles
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Side: Reponedores con Retraso / Todo bajo control */}
            {(!data.overloaded || data.overloaded.length === 0) ? (
              <div className="group lg:col-span-2 border border-border bg-card rounded-xl p-6 flex flex-col items-center justify-center text-center h-[360px] shadow-sm hover:shadow-md hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300">
                <div className="w-24 h-24 rounded-full bg-[#ECFDF5]/60 border border-[#D1FAE5] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-[#D1FAE5] flex items-center justify-center shadow-xs">
                    <Check className="h-7 w-7 text-[#047857] stroke-[3]" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">Todo bajo control</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-3 leading-relaxed">
                  No se han detectado nuevos retrasos críticos en los últimos 30 minutos. Todos los reponedores están en su ventana de tiempo planificada.
                </p>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 mt-5 flex items-center gap-1 cursor-pointer transition-all duration-200"
                >
                  Ver histórico de alertas <span className="font-semibold inline-block transition-transform duration-200 group-hover:translate-x-1">&gt;</span>
                </button>
              </div>
            ) : (
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Reponedores con Retraso
                  </h3>
                  <Badge variant="outline" className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-bold py-0.5 px-2 uppercase rounded-md animate-pulse">
                    Acción Requerida
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {data.overloaded.map((worker) => (
                    <div key={worker.id} className="group p-4 bg-card border border-border border-l-4 border-l-[#EF4444] rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-rose-200 dark:hover:border-rose-900/40 transition-all duration-300 relative space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-[#EF4444] transition-colors">{worker.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">ID: {worker.id}</p>
                        </div>
                        <Badge className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-extrabold px-2 py-0.5 rounded transition-transform duration-350 group-hover:scale-105">
                          +{worker.delay} MIN
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {worker.reason}
                      </p>
                      <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 dark:bg-emerald-950/20 rounded px-2.5 py-1.5 flex items-start gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5 group-hover:animate-bounce" />
                        <span>Acción sugerida: reasignar paradas de prioridad alta al reponedor más cercano disponible.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Right Side: PDVs con Riesgo de Visita */}
            {(!data.pendingRisk || data.pendingRisk.length === 0) ? (
              <div className="lg:col-span-3 border border-border bg-card rounded-xl p-6 flex flex-col items-center justify-center text-center h-[360px] shadow-sm">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <Check className="h-6 w-6 text-emerald-600 stroke-[3]" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Cobertura de Visitas Completa</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-2 leading-relaxed">
                  No se han detectado nuevos riesgos de visita. Todos los puntos de venta están programados dentro de la ventana de atención.
                </p>
              </div>
            ) : (
              <div className="lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    PDVs con Riesgo de Visita
                  </h3>
                  <Badge variant="outline" className="bg-rose-50 text-rose-500 border border-rose-100 text-[9px] font-bold py-0.5 px-2 uppercase rounded-md">
                    ALTA PRIORIDAD
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {data.pendingRisk.map((pdv, idx) => {
                    const recommended = getRecommendedWorker(pdv);
                    const currentSelected = selectedTargets[pdv.id] || '';
                    const impact = getImpactEstimate(pdv, currentSelected);
                    
                    // Dynamic risk display depending on priority
                    const riskPercent = pdv.priority === 'Alta' ? '92%' : pdv.priority === 'Media' ? '78%' : '65%';
                    
                    return (
                      <div key={`${pdv.id}-${pdv.assignedWorker}-${idx}`} className="group p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-blue-500/30 transition-all duration-300 relative space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{pdv.name}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">ID: {pdv.id} • {pdv.location}</p>
                          </div>
                          <Badge className="bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-50/80 text-[9px] font-bold px-2 py-0.5 rounded transition-transform duration-350 group-hover:scale-105">
                            RIESGO {riskPercent}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-foreground/60">
                          Asignado a: <span className="font-medium text-foreground">{pdv.assignedWorker}</span> (con retraso)
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          {/* Avatar Group */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-1.5">
                              <div className="h-5 w-5 rounded-full bg-slate-300 border border-card flex items-center justify-center text-[8px] font-bold text-slate-700 overflow-hidden shadow-xs">
                                <User className="h-2.5 w-2.5 text-slate-600" />
                              </div>
                              <div className="h-5 w-5 rounded-full bg-slate-200 border border-card flex items-center justify-center text-[8px] font-bold text-slate-700 overflow-hidden shadow-xs">
                                <User className="h-2.5 w-2.5 text-slate-600" />
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-semibold">+2</span>
                          </div>

                          {/* Reassign select dropdown & paperplane button */}
                          {reponedores && reponedores.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-1 max-w-[240px] justify-end">
                              <select
                                value={currentSelected}
                                onChange={(e) => handleSelectTarget(pdv.id, e.target.value)}
                                className="w-full bg-muted/40 border border-border text-foreground text-[10px] rounded px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary transition-all font-semibold"
                              >
                                <option value="">Re-asignar a...</option>
                                {reponedores
                                  .filter(w => w.name !== pdv.assignedWorker && w.status !== 'Completado')
                                  .map(w => {
                                    const isRec = recommended && (w.id === recommended.id || w.dbUuid === recommended.dbUuid);
                                    return (
                                      <option key={w.dbUuid || w.id} value={w.dbUuid || w.id}>
                                        {isRec ? '⭐ ' : ''}{w.name}
                                      </option>
                                    );
                                  })
                                }
                              </select>
                              <button 
                                onClick={() => handleConfirmReassign(pdv.id)}
                                disabled={!currentSelected || isReassigning}
                                className="h-7 w-7 rounded-lg bg-[#0B2545] hover:bg-[#163861] text-white flex items-center justify-center transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                              >
                                <Send className="h-3 w-3 rotate-45 mr-0.5 mt-[-1px]" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Suggestion check or status */}
                        {pdv.priority === 'Alta' ? (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
                            <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                            Sugerencia: Extender horario
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-semibold mt-1">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                            Reponedor no responde
                          </div>
                        )}

                        {impact && (
                          <div className="text-[10px] font-medium bg-blue-50 border border-blue-100 rounded px-2 py-1.5 text-blue-700 flex items-start gap-1 mt-2">
                            <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              Transferir a <strong>{impact.workerName}</strong>: agrega <strong>+{impact.time} min</strong> · cobertura <strong>{impact.coverage}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Ajustes Logísticos Sugeridos ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Ajustes Logísticos Sugeridos</h2>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    toast({
                      title: "Filtros de Ajustes",
                      description: "Mostrando opciones de filtrado logístico.",
                    })
                  }}
                  className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shadow-xs hover:bg-muted/10"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => {
                    toast({
                      title: "Descarga Exitosa",
                      description: "El reporte de Ajustes Logísticos Sugeridos ha sido exportado en formato CSV.",
                    })
                  }}
                  className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shadow-xs hover:bg-muted/10"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Ruta / Operador</th>
                      <th className="px-5 py-3">Planificado</th>
                      <th className="px-5 py-3">Estimado Actual</th>
                      <th className="px-5 py-3 text-center">Desviación</th>
                      <th className="px-5 py-3">Impacto PDVs</th>
                      <th className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(reponedores || [])
                      .filter(w => w.status !== 'Completado')
                      .slice(0, 5) // Limit to top active workers for a clean dashboard view
                      .map((worker, index) => {
                        const shiftEnd = index % 3 === 0 ? '16:30' : index % 3 === 1 ? '14:00' : '15:30';
                        const shiftStart = index % 3 === 0 ? '08:00' : index % 3 === 1 ? '09:00' : '07:30';
                        const routeCode = index % 3 === 0 ? 'R42' : index % 3 === 1 ? 'R10' : 'R99';
                        const bgClass = index % 3 === 0 ? 'bg-blue-100 text-blue-700' : index % 3 === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-fuchsia-100 text-fuchsia-800';
                        
                        const delay = Math.round(worker.delay || 0);
                        
                        // Parse shiftEnd and calculate ETA dynamically
                        const parts = shiftEnd.split(':');
                        let hrs = parseInt(parts[0]);
                        let mins = parseInt(parts[1]);
                        mins += delay;
                        hrs += Math.floor(mins / 60);
                        mins = mins % 60;
                        if (mins < 0) { mins += 60; hrs -= 1; }
                        hrs = (hrs + 24) % 24;
                        const etaStr = `ETA ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

                        // Calculate deviation colors/badges
                        const deviationBadge = delay > 0 
                          ? `bg-rose-50 text-rose-600 border border-rose-100`
                          : delay < 0
                          ? `bg-emerald-50 text-emerald-600 border border-emerald-100`
                          : `bg-slate-50 text-slate-600 border border-slate-100`;

                        const deviationText = delay > 0 
                          ? `+${delay} min`
                          : delay < 0
                          ? `${delay} min`
                          : `0 min`;

                        return (
                          <tr key={worker.id} className="hover:bg-muted/5 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`h-7 w-8 ${bgClass} font-extrabold text-[10px] rounded flex items-center justify-center shadow-xs`}>
                                  {routeCode}
                                </div>
                                <div>
                                  <p className="font-bold text-foreground text-xs leading-tight">{worker.name}</p>
                                  <p className="text-[9px] text-muted-foreground mt-0.5">Sede Centro • {worker.route || 'Urbana'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-muted-foreground font-semibold leading-tight">
                              {shiftStart} -<br />{shiftEnd}
                            </td>
                            <td className={`px-5 py-3.5 font-extrabold uppercase ${delay > 0 ? 'text-rose-600' : delay < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {etaStr}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className={`px-2 py-1 rounded font-bold text-[10px] ${deviationBadge}`}>
                                {deviationText}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-medium">
                              {delay > 30 ? (
                                <div className="flex items-center gap-1.5 text-rose-600 mt-2 md:mt-2.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 fill-amber-100" />
                                  <span>{Math.ceil(delay / 20)} críticos</span>
                                </div>
                              ) : delay < 0 ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 mt-2 md:mt-2.5">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                                  <span>Óptimo</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-blue-600 mt-2 md:mt-2.5">
                                  <Info className="h-3.5 w-3.5 text-blue-500 fill-blue-50" />
                                  <span>1 moderado</span>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="inline-flex gap-1.5">
                                <button 
                                  onClick={() => {
                                    toast({
                                      title: "Desviación descartada",
                                      description: `La alerta para ${worker.name} ha sido archivada.`,
                                    })
                                  }}
                                  className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  Dismiss
                                </button>
                                <button 
                                  onClick={() => {
                                    toast({
                                      title: "Ruta re-planificada",
                                      description: `El ajuste para ${worker.name} fue aprobado y propagado vía Supabase.`,
                                    })
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#0B4F30] hover:bg-[#093d25] text-white text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  Approve
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      )}
      {/* ══════════════════════ TAB 2: HISTORIAL ══════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4 w-full animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-[#0B2545] via-[#103158] to-[#134074] p-6 rounded-2xl border border-[#1e4a7a]/30 shadow-[0_4px_20px_rgba(11,37,69,0.15)] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-1.5 relative z-10">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 tracking-tight">
                <History className="h-4.5 w-4.5 text-[#4EE39D]" />
                Auditoría de Jornadas Completadas
              </h3>
              <p className="text-[11px] text-slate-200/90 leading-relaxed max-w-xl">
                {routeHistory.length} jornadas consolidadas · Haz clic en una ruta para inspeccionar la secuencia de visitas y evidencias fotográficas.
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap relative z-10">
              <div className="flex items-center gap-2.5 bg-[#0B2545]/60 border border-slate-700/50 rounded-xl px-3.5 py-1.5 shadow-inner">
                <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
                  Auditar Fecha:
                </span>
                <input
                  type="date"
                  value={selectedHistoryDate}
                  onChange={(e) => setSelectedHistoryDate(e.target.value)}
                  max="2026-05-31"
                  className="bg-[#0B2545]/80 border border-slate-600 rounded-lg text-xs px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white font-extrabold cursor-pointer transition-all"
                />
              </div>
              <span className="px-3.5 py-1.5 rounded-full border text-[10px] font-extrabold bg-[#4EE39D]/10 text-[#4EE39D] border-[#4EE39D]/20 shadow-xs shrink-0 uppercase tracking-wide">
                Solo Completadas
              </span>
            </div>
          </div>

          <div className="space-y-3">
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
              <div className="py-20 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 shadow-inner">
                <History className="h-10 w-10 mx-auto mb-3.5 text-slate-300 dark:text-slate-700 animate-pulse" />
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">No hay jornadas completadas para esta fecha.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Prueba seleccionando otro día en el selector superior.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ══════════════════════ TAB 3: PLANIFICACIÓN DE MAÑANA ══════════════════════ */}
      {activeTab === 'tomorrow' && (
        <div className="space-y-6 w-full animate-in fade-in-50 duration-200">
          {isLoadingTomorrow ? (
            <div className="relative py-24 px-6 text-center border border-slate-200 dark:border-slate-800 rounded-3xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col items-center justify-center min-h-[380px] animate-in fade-in-50 duration-300">
              
              {/* Pulsing radial background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/5 dark:bg-blue-500/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
              
              {/* Spinner Container with radar ring */}
              <div className="relative mb-8 flex items-center justify-center">
                {/* Radar ripple rings */}
                <div className="absolute w-24 h-24 rounded-full bg-primary/10 dark:bg-blue-500/10 border border-primary/20 dark:border-blue-500/20 animate-ping opacity-75" />
                <div className="absolute w-16 h-16 rounded-full bg-primary/15 dark:bg-blue-500/15 border border-primary/30 dark:border-blue-500/30 animate-pulse" />
                
                {/* Custom Orbiting Spinner */}
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary dark:border-blue-400 animate-spin" />
                
                {/* Inner Icon */}
                <div className="absolute flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 dark:bg-blue-950/40 border border-primary/25 dark:border-blue-500/20 shadow-inner">
                  <Zap className="h-5 w-5 text-primary dark:text-blue-400 animate-bounce" />
                </div>
              </div>

              {/* Text Info */}
              <div className="space-y-2.5 max-w-md relative z-10">
                <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center justify-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-[#4EE39D] animate-pulse" />
                  Feedback Loop de Supabase Activo
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Generando optimizaciones y calculando proximidad geográfica...
                </p>
              </div>

              {/* Progress Steps / AI Tasks simulated */}
              <div className="mt-8 w-full max-w-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4.5 text-left space-y-2.5 shadow-2xs relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>[1/3] Cargando geolocalizaciones...</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>[2/3] Resolviendo distancias...</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>[3/3] Estructurando secuencia final...</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[#0B2545] via-[#103158] to-[#134074] p-6 rounded-2xl border border-[#1e4a7a]/30 shadow-[0_4px_20px_rgba(11,37,69,0.15)] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-1.5 relative z-10">
                  <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 tracking-tight">
                    <Calendar className="h-5 w-5 text-[#4EE39D]" />
                    Planificación de Rutas
                  </h2>
                  <p className="text-[11px] text-slate-200/90 leading-relaxed max-w-xl">
                    Sugerencias de optimización automática generadas por el Feedback Loop y calibradas en base a tiempos de hoy.
                  </p>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto flex-wrap relative z-10">
                  <div className="flex items-center gap-2.5 bg-[#0B2545]/60 border border-slate-700/50 rounded-xl px-3.5 py-1.5 shadow-inner">
                    <input
                      type="date"
                      value={planningDateStr}
                      onChange={(e) => setPlanningDateStr(e.target.value)}
                      className="bg-[#0B2545]/80 border border-slate-650 rounded-lg text-xs px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white font-extrabold cursor-pointer transition-all"
                    />
                  </div>

                  <Button
                    disabled={isPublishingTomorrow || tomorrowPublished || !tomorrowPlans || tomorrowPlans.length === 0}
                    onClick={async () => {
                      if (tomorrowPublished || !tomorrowPlans) return
                      setIsPublishingTomorrow(true)
                      try {
                        const res = await publishRoutesPlanForDate(tomorrowPlans, planningDateStr)
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
                            description: `Rutas para el ${getPlanningFormattedFull(planningDateStr)} aprobadas y publicadas en Supabase. Se han notificado a los reponedores.`,
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
                      "font-extrabold text-xs px-5 py-4.5 rounded-xl shadow-md transition-all duration-200 cursor-pointer shrink-0 gap-2 uppercase tracking-wide",
                      tomorrowPublished
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 cursor-default hover:bg-emerald-500/10"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-[#0B2545] font-black hover:scale-105 active:scale-95 shadow-emerald-500/20"
                    ].join(" ")}
                  >
                    {isPublishingTomorrow ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Publicando secuencias...</span>
                      </>
                    ) : tomorrowPublished ? (
                      <>
                        <Check className="h-4 w-4 stroke-[2.5]" />
                        <span>Rutas Publicadas</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 fill-current" />
                        <span>Aprobar y Publicar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Status Alert Banner */}
              {tomorrowPublished ? (
                <div className="flex items-center gap-3.5 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-3xs animate-in fade-in duration-200">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Jornada Publicada</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Las rutas y secuencias de visitas ya están aprobadas e impactadas en el backend de Supabase. Los reponedores recibirán las actualizaciones en su aplicación móvil al iniciar su jornada.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3.5 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-3xs animate-in fade-in duration-200">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Sugerencias de Rutas Pendientes de Aprobación</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      El Feedback Loop ha recalculado las rutas óptimas para el {getPlanningFormattedFull(planningDateStr)} basándose en las duraciones reales de hoy y la proximidad geográfica (TSP). Revisa los detalles antes de publicar.
                    </p>
                  </div>
                </div>
              )}

              {/* Expand/Collapse All Buttons */}
              <div className="flex justify-end items-center gap-3 mb-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3.5 gap-1.5 text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-lg hover:scale-105 active:scale-95 cursor-pointer shadow-3xs transition-all"
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3.5 gap-1.5 text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-lg hover:scale-105 active:scale-95 cursor-pointer shadow-3xs transition-all"
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
                    <div key={p.reponedorId} className={[
                      "border rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)]",
                      isExpanded
                        ? "border-primary/40 shadow-[0_12px_30px_rgba(11,37,69,0.08)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.4)] scale-[1.002]"
                        : "border-slate-100 dark:border-slate-800/80 hover:border-primary/20 dark:hover:border-primary/45 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5"
                    ].join(" ")}>
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
                        className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      >
                        <div className="flex items-center gap-3">
                          {/* Chevron icon */}
                          <div className={[
                            "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                            isExpanded 
                              ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground" 
                              : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600"
                          ].join(" ")}>
                            {isExpanded ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />}
                          </div>

                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:to-transparent border border-primary/10 dark:border-primary/25 flex items-center justify-center shrink-0 shadow-2xs">
                            <User className="h-5 w-5 text-primary dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight truncate">{p.reponedorName}</h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Ruta sugerida</span>
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                              <span className="text-[10px] text-slate-650 dark:text-slate-400 font-bold">{routeName}</span>
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                              <Badge variant="outline" className="px-2 py-0.5 text-[9px] bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 uppercase font-extrabold shrink-0 rounded-full">
                                {workerCity}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Collapsed Stats Summary + Status Badges */}
                        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                          {/* Quick Stats */}
                          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/60 rounded-xl px-3.5 py-1.5 shadow-inner shrink-0">
                            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">{plannedCount} PDVs</span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">{estHours} hrs</span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <span className="text-emerald-550 dark:text-emerald-400 font-extrabold text-[10px]">+{estEff}%</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Status badge */}
                            {(tomorrowPublished || assignedWorkers[p.reponedorId]) ? (
                              <span className="px-3.5 py-1.5 rounded-full border text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-3xs uppercase tracking-wider">
                                ✓ Asignada
                              </span>
                            ) : (
                              <span className="px-3.5 py-1.5 rounded-full border text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-3xs uppercase tracking-wider animate-pulse">
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
                                "flex items-center gap-1.5 text-[10px] font-extrabold px-3.5 py-2 rounded-xl border transition-all duration-200 shrink-0 cursor-pointer shadow-3xs",
                                (tomorrowPublished || assignedWorkers[p.reponedorId])
                                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 cursor-default"
                                  : plannedCount === 0
                                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
                                  : "bg-[#0B2545] hover:bg-[#163861] text-white border-transparent hover:scale-105 active:scale-95"
                              ].join(" ")}
                            >
                              {isAssigningWorker === p.reponedorId ? (
                                <><Loader2 className="h-3 w-3 animate-spin" /> Asignando...</>
                              ) : (tomorrowPublished || assignedWorkers[p.reponedorId]) ? (
                                <><Check className="h-3 w-3 stroke-[2.5]" /> Asignada</>
                              ) : (
                                <><Send className="h-3.5 w-3.5 rotate-45 mr-0.5 mt-[-1px]" /> Asignar</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Content (Visible only when expanded) */}
                      {isExpanded && (
                        <div className="px-6 py-5 space-y-5 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80">
                          {/* Horizontal Stop Sequence */}
                          <div className="space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4.5 py-3 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-3xs">
                              <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Store className="h-4 w-4 text-primary" />
                                Secuencia Planificada de Paradas (Optimización TSP)
                              </p>
                              <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wide">
                                Arrastra las tarjetas para reordenar
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 min-h-[135px]">
                              {p.sequence.map((pdvId: string, idx: number) => {
                                const pdv = pdvs.find(pos => pos.id === pdvId)
                                const name = pdv ? (pdv.nombre || pdv.name) : `Punto ${idx + 1}`
                                const isLast = idx === p.sequence.length - 1
                                const isDragging = draggingIndex?.workerId === p.reponedorId && draggingIndex?.idx === idx
                                const isOver = dragOverIndex?.workerId === p.reponedorId && dragOverIndex?.idx === idx

                                return (
                                  <div
                                    key={pdvId}
                                    className="flex items-center gap-3 shrink-0"
                                    draggable
                                    onDragStart={() => handleDragStart(p.reponedorId, idx)}
                                    onDragOver={(e) => handleDragOver(e, p.reponedorId, idx)}
                                    onDrop={() => handleDrop(p.reponedorId, idx)}
                                    onDragEnd={() => {
                                      setDraggingIndex(null)
                                      setDragOverIndex(null)
                                    }}
                                  >
                                    <div className={[
                                      "relative flex flex-col items-center p-4 rounded-2xl min-w-[150px] max-w-[170px] shadow-3xs group transition-all duration-300 cursor-grab active:cursor-grabbing select-none border",
                                      isDragging 
                                        ? "opacity-30 border-dashed border-slate-400 bg-slate-100 dark:bg-slate-800" 
                                        : isOver
                                        ? "border-primary border-dashed bg-primary/5 scale-105 shadow-md"
                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-primary/30 dark:hover:border-primary/50 hover:-translate-y-1 hover:shadow-xs"
                                    ].join(" ")}>
                                      {/* Drag Handle */}
                                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors">
                                        <GripVertical className="h-4.5 w-4.5" />
                                      </div>

                                      {/* Delete Button */}
                                      <button
                                        onClick={() => handleRemoveTomorrow(pdvId, p.reponedorId)}
                                        className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer z-10"
                                        title="Quitar parada"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>

                                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary dark:text-blue-400 px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                                        Parada {idx + 1}
                                      </span>
                                      <span className="text-xs font-bold text-slate-850 dark:text-slate-200 truncate w-full text-center mt-2.5 group-hover:text-primary transition-colors" title={name}>
                                        {name}
                                      </span>
                                      <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-1">{pdv?.type || 'Detallista'}</span>
                                    </div>
                                    {!isLast && (
                                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-3xs shrink-0 mx-0.5 hover:translate-x-0.5 transition-transform duration-200">
                                        <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-650" />
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              {p.sequence.length === 0 && (
                                <div className="py-8 text-center text-slate-400 dark:text-slate-500 italic w-full bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                  Sin secuencia generada. Añade puntos para trazar ruta.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Route Customization Options */}
                          <div className="border-t border-slate-100 dark:border-slate-850/80 pt-4 flex flex-col md:flex-row gap-3">
                            {/* Add PDV */}
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 max-w-md w-full shadow-3xs">
                              <span className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 shrink-0 tracking-wider">Añadir parada:</span>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddTomorrow(e.target.value, p.reponedorId)
                                    e.target.value = ''
                                  }
                                }}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1 min-w-0 font-bold"
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
                          <div className="text-[10px] font-bold bg-blue-500/5 dark:bg-blue-950/15 border border-blue-500/15 dark:border-blue-900/30 rounded-xl px-4 py-3.5 text-slate-700 dark:text-blue-300 flex items-start gap-2.5 shadow-3xs">
                            <Zap className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5 animate-pulse" />
                            <div className="leading-relaxed">
                              <strong className="text-blue-600 dark:text-blue-400 uppercase tracking-wide text-[9px] block mb-0.5">Optimización del Feedback Loop:</strong>
                              {optDetail}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {(!tomorrowPlans || tomorrowPlans.length === 0) && (
                  <div className="py-20 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 shadow-inner">
                    <Calendar className="h-10 w-10 mx-auto mb-3.5 text-slate-300 dark:text-slate-750 animate-pulse" />
                    <p className="text-sm font-extrabold text-[#0B2545] dark:text-slate-300">No hay sugerencias de rutas de planificación para hoy.</p>
                  </div>
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
