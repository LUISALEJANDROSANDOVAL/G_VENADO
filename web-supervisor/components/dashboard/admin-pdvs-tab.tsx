'use client'

import { PDVsTab } from './pdv-master'

interface AdminPdvsTabProps {
  pdvs: any[]
  onRefresh?: () => void
}

export function AdminPdvsTab({ pdvs, onRefresh }: AdminPdvsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Directorio Maestro de Tiendas (PDV)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Consulta, edita, da de baja y asocia los puntos de venta habilitados para las rutas operativas de Industrias Venado.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <PDVsTab pdvs={pdvs} photoEvidences={[]} onRefresh={onRefresh} />
      </div>
    </div>
  )
}
