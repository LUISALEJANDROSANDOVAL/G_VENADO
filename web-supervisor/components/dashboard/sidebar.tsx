'use client'

import { BarChart3, Map, Route, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activeModule: string
  onModuleChange: (module: string) => void
}

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const modules = [
    { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
    { id: 'map', label: 'Seguimiento en Vivo', icon: Map },
    { id: 'routes', label: 'Rutas & Historial', icon: Route },
    { id: 'pdv', label: 'Maestro de PDVs', icon: Database },
  ]

  return (
    <aside className="w-64 border-r border-border bg-sidebar min-h-[calc(100vh-64px)]">
      <div className="p-6">
        <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wide mb-4">
          Módulos
        </p>
        <nav className="space-y-2">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Button
                key={module.id}
                onClick={() => onModuleChange(module.id)}
                variant={activeModule === module.id ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 text-left',
                  activeModule === module.id && 'bg-sidebar-primary text-sidebar-primary-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{module.label}</span>
              </Button>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-6">
        <div className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wide mb-3">
          Estado
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent"></div>
            <span className="text-sm text-sidebar-foreground/80">Sistema Activo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-chart-2"></div>
            <span className="text-sm text-sidebar-foreground/80">12 Reponedores Activos</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
