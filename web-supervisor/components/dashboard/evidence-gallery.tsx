'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Calendar, User, Store, Search, MapPin, X, ArrowRight, Clock } from 'lucide-react'

interface PhotoEvidence {
  id: string
  reponedorName: string
  pdvName: string
  taskName: string
  /** @deprecated use beforeUrl */
  photoUrl?: string
  beforeUrl: string
  afterUrl: string | null
  lat: number | null
  lng: number | null
  timestamp: string
}

interface EvidenceGalleryProps {
  evidences: PhotoEvidence[]
}

// ─── Task color map ────────────────────────────────────────────────────────────
const TASK_COLORS: Record<string, string> = {
  Limpieza: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  Bandeo: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  POP: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

// ─── Geo-modal with Leaflet (loaded lazily) ───────────────────────────────────
function GeoModal({
  pdvName,
  lat,
  lng,
  onClose,
}: {
  pdvName: string
  lat: number
  lng: number
  onClose: () => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    let L: any
    async function init() {
      if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return
      // @ts-ignore
      L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 16)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Custom pulse marker
      const pulseIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:32px;height:32px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(99,102,241,0.35);animation:pulse 1.6s infinite;"></div>
            <div style="position:absolute;inset:6px;border-radius:50%;background:#6366f1;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);"></div>
          </div>
          <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.7);opacity:0}}</style>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      L.marker([lat, lng], { icon: pulseIcon })
        .addTo(map)
        .bindPopup(`<b>${pdvName}</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        .openPopup()

      // Geofencing radius ring — 50m
      L.circle([lat, lng], {
        radius: 50,
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '4 4',
      }).addTo(map)
    }
    init()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, pdvName])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/15">
              <MapPin className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{pdvName}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Map */}
        <div ref={mapRef} className="w-full h-[420px] bg-muted" />

        {/* Footer */}
        <div className="px-5 py-2.5 bg-card border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-indigo-500 opacity-70" />
          <span>Área de geofencing validada: radio de 50 m</span>
        </div>
      </div>
    </div>
  )
}

// ─── Before / After image panel ───────────────────────────────────────────────
function PhotoPanel({
  label,
  url,
  taskName,
  onZoom,
}: {
  label: 'Antes' | 'Después'
  url: string | null
  taskName: string
  onZoom: (url: string) => void
}) {
  const isAfter = label === 'Después'

  if (!url) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-muted/40 border border-dashed border-border rounded-lg h-44 px-3">
        <div className="p-2.5 rounded-full bg-muted">
          <Clock className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-[11px] text-center text-muted-foreground/70 leading-tight">
          Esperando evidencia de cierre en Flutter...
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex-1 relative overflow-hidden rounded-lg cursor-pointer group h-44 border border-border"
      onClick={() => onZoom(url)}
    >
      <img
        src={url}
        alt={`${label} - ${taskName}`}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {/* Gradient + label */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      <span
        className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border
          ${isAfter
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
          }`}
      >
        {label}
      </span>
      {/* Zoom hint */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
          <Camera className="h-3 w-3" /> Ampliar
        </span>
      </div>
    </div>
  )
}

// ─── Main Gallery ─────────────────────────────────────────────────────────────
export function EvidenceGallery({ evidences }: EvidenceGalleryProps) {
  const [filterTask, setFilterTask] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [geoTarget, setGeoTarget] = useState<{ pdvName: string; lat: number; lng: number } | null>(null)

  // Normalize old-format evidences (single photoUrl) to new format
  const normalizedEvidences: PhotoEvidence[] = evidences.map((ev) => ({
    ...ev,
    beforeUrl: ev.beforeUrl ?? ev.photoUrl ?? '',
    afterUrl: ev.afterUrl ?? null,
    lat: ev.lat ?? null,
    lng: ev.lng ?? null,
  }))

  const filtered = normalizedEvidences.filter((ev) => {
    const matchesTask = filterTask === 'todos' || ev.taskName.toLowerCase() === filterTask.toLowerCase()
    const matchesSearch =
      ev.reponedorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.pdvName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTask && matchesSearch
  })

  const completedCount = filtered.filter((e) => e.afterUrl).length
  const pendingCount = filtered.filter((e) => !e.afterUrl).length

  return (
    <div className="space-y-6">
      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Evidencias', value: filtered.length, color: 'text-foreground' },
          { label: 'Ciclo Completo ✓', value: completedCount, color: 'text-emerald-400' },
          { label: 'Cierre Pendiente ⏳', value: pendingCount, color: 'text-amber-400' },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="pt-5 pb-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por reponedor o PDV..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
              {['todos', 'Limpieza', 'Bandeo', 'POP'].map((task) => (
                <Button
                  key={task}
                  variant={filterTask === task ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterTask(task)}
                  className="capitalize shrink-0"
                >
                  {task === 'todos' ? 'Todos' : task}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Evidence Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((ev) => (
          <Card
            key={ev.id}
            className="border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-black/20 transition-all duration-300 hover:-translate-y-0.5"
          >
            {/* Card header row */}
            <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-foreground truncate">{ev.pdvName}</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {ev.reponedorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(ev.timestamp).toLocaleString('es-ES', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Geo-pin button */}
              {ev.lat !== null && ev.lng !== null && (
                <button
                  title={`Ver en mapa: ${ev.pdvName}`}
                  onClick={() =>
                    setGeoTarget({ pdvName: ev.pdvName, lat: ev.lat!, lng: ev.lng! })
                  }
                  className="shrink-0 p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/25 hover:border-indigo-400/50 text-indigo-400 hover:text-indigo-300 transition-all duration-200 hover:scale-110"
                >
                  <MapPin className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Task badge */}
            <div className="px-4 pb-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold border ${TASK_COLORS[ev.taskName] ?? 'bg-muted/50 text-muted-foreground border-border'}`}
              >
                {ev.taskName}
              </Badge>
            </div>

            {/* ── Antes / Después side-by-side ── */}
            <CardContent className="px-4 pb-4">
              <div className="flex gap-2 items-stretch">
                <PhotoPanel
                  label="Antes"
                  url={ev.beforeUrl}
                  taskName={ev.taskName}
                  onZoom={setSelectedPhoto}
                />

                {/* Arrow separator */}
                <div className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-10 bg-border" />
                    <div className="p-1 rounded-full bg-muted border border-border">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="w-px h-10 bg-border" />
                  </div>
                </div>

                <PhotoPanel
                  label="Después"
                  url={ev.afterUrl}
                  taskName={ev.taskName}
                  onZoom={setSelectedPhoto}
                />
              </div>

              {/* Completion indicator */}
              <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2 py-1.5
                ${ev.afterUrl
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                <span>{ev.afterUrl ? '✓ Ciclo de auditoría completo' : '⏳ Esperando foto de cierre...'}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground/45 mb-3" />
            <p className="text-sm font-medium">No se encontraron evidencias fotográficas para este filtro.</p>
          </div>
        )}
      </div>

      {/* ── Photo Zoom Modal ── */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[88vh] rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto}
              alt="Evidencia ampliada"
              className="w-full h-auto max-h-[88vh] object-contain"
            />
            <button
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors flex items-center gap-1.5 text-xs"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-3.5 w-3.5" /> Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── Geo Map Modal ── */}
      {geoTarget && (
        <GeoModal
          pdvName={geoTarget.pdvName}
          lat={geoTarget.lat}
          lng={geoTarget.lng}
          onClose={() => setGeoTarget(null)}
        />
      )}
    </div>
  )
}
