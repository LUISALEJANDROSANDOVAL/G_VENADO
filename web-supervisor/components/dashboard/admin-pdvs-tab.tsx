'use client'

import { PDVsTab } from './pdv-master'

interface AdminPdvsTabProps {
  pdvs: any[]
  onRefresh?: () => void
}

/**
 * Normalizes Supabase `points_of_sale` rows to the shape that PDVsTab expects.
 * PDVsTab was written for mock-data which uses: nombre, lat, lng, type, city, visited
 */
function normalizePdvs(raw: any[]) {
  return raw.map(p => ({
    // ── Identifiers ──────────────────────────────────────────────────────
    id:     p.id    ?? '',
    nombre: p.nombre ?? p.name ?? '',

    // ── Geography ────────────────────────────────────────────────────────
    lat:    Number(p.lat ?? p.latitude  ?? -17.7862),
    lng:    Number(p.lng ?? p.longitude ?? -63.1812),

    // ── Category — map Supabase enums to mock labels ──────────────────────
    type: (() => {
      const raw = (p.type ?? p.category ?? 'DETALLISTA').toUpperCase()
      if (raw === 'PARETO')    return 'PARETO'
      if (raw === 'MAYORISTA') return 'MAYORISTA'
      if (raw === 'MINORISTA') return 'MINORISTA'
      return 'DETALLISTA'
    })(),

    // ── City / market ─────────────────────────────────────────────────────
    city:    p.city ?? p.market ?? 'Santa Cruz',

    // ── Visit state (not tracked in DB for now) ───────────────────────────
    visited:     p.visited     ?? false,
    visitedTime: p.visitedTime ?? null,

    // ── Timing ────────────────────────────────────────────────────────────
    estimatedMinutes:     p.estimatedMinutes     ?? p.base_duration_minutes ?? 30,
    base_duration_minutes: p.base_duration_minutes ?? p.estimatedMinutes     ?? 30,

    // ── Optional extras ───────────────────────────────────────────────────
    address:          p.address       ?? p.market ?? '',
    photoUrl:         p.photoUrl      ?? null,
    reponedorNombre:  p.reponedorNombre ?? null,
    daysOfWeek:       p.daysOfWeek    ?? [],
    availableDays:    p.availableDays ?? [],
    lastVisit:        p.lastVisit     ?? null,
  }))
}

export function AdminPdvsTab({ pdvs, onRefresh }: AdminPdvsTabProps) {
  const normalizedPdvs = normalizePdvs(pdvs)

  return (
    <div className="animate-in fade-in duration-200">
      <PDVsTab pdvs={normalizedPdvs as any} photoEvidences={[]} onRefresh={onRefresh} />
    </div>
  )
}
