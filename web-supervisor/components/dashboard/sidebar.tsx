'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { LayoutDashboard, BarChart3, Map, Route, Database, Moon, Sun, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activeModule: string
  onModuleChange: (module: string) => void
  activeReponedoresCount?: number
}

// Custom SVG Logo Icon drawing 4 diamonds arranged in a cross
function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Diamond 1 (Top) */}
      <path d="M12 4.5 L15 7.5 L12 10.5 L9 7.5 Z" />
      {/* Diamond 2 (Left) */}
      <path d="M7.5 9 L10.5 12 L7.5 15 L4.5 12 Z" />
      {/* Diamond 3 (Right) */}
      <path d="M16.5 9 L19.5 12 L16.5 15 L13.5 12 Z" />
      {/* Diamond 4 (Bottom) */}
      <path d="M12 13.5 L15 16.5 L12 19.5 L9 16.5 Z" />
    </svg>
  )
}

export function Sidebar({ activeModule, onModuleChange, activeReponedoresCount }: SidebarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const modules = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'map', label: 'Seguimiento en Vivo', icon: Map },
    { id: 'routes', label: 'Rutas & Historial', icon: Route },
    { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
    { id: 'pdv', label: 'Maestro de PDVs', icon: Database },
  ]

  const isDark = mounted ? (theme === 'dark' || resolvedTheme === 'dark') : false

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <aside className="w-64 border-r border-sidebar-border bg-[#00457C] h-full flex flex-col justify-between shrink-0 text-white select-none">
      
      {/* Top Section: Logo and Navigation */}
      <div className="flex flex-col">
        {/* Logo (Matching the style of the screenshot) */}
        <div className="p-6 border-b border-sidebar-border/30 flex items-center gap-3">
          <img src="/logo.png" alt="Grupo Venado Logo" className="w-10 h-10 object-contain shrink-0 filter drop-shadow-md" />
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-[15px] tracking-wider uppercase text-white leading-none">Grupo</span>
            <span className="text-[11px] text-white/80 font-bold uppercase tracking-widest mt-1">Venado</span>
          </div>
        </div>

        {/* Navigation Modules */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest px-3 mb-4">
            Módulos
          </p>
          <nav className="space-y-1">
            {modules.map((module) => {
              const Icon = module.icon
              const isActive = activeModule === module.id
              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange(module.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer text-left',
                    isActive 
                      ? 'bg-white/12 text-white shadow-sm font-bold' 
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className={cn('h-4.5 w-4.5 transition-transform duration-200', isActive ? 'scale-105' : '')} />
                  <span>{module.label}</span>
                  
                  {/* Premium Notification Badge next to Map Module */}
                  {module.id === 'map' && activeReponedoresCount !== undefined && activeReponedoresCount > 0 && (
                    <span className="ml-auto bg-white text-[#00457C] text-[10px] font-extrabold px-1.5 py-0.5 rounded-md min-w-[20px] text-center shadow-sm">
                      {activeReponedoresCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Theme Toggle and Logout */}
      <div className="p-4 border-t border-sidebar-border/30 space-y-4">
        {/* Toggle Dark Mode */}
        <div 
          onClick={toggleTheme}
          className="flex items-center justify-between px-3 py-2 text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </div>
          <div className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isDark} 
              onChange={() => {}} // handled by parent div click
            />
            <div className={cn(
              "w-9 h-5 rounded-full transition-all relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all",
              isDark 
                ? "bg-emerald-500 after:translate-x-full" 
                : "bg-white/20"
            )}></div>
          </div>
        </div>

        {/* Logout Button */}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 bg-white/10 hover:bg-white/20 text-white rounded-xl py-2.5 px-4 font-bold border-none transition-all active:scale-98 cursor-pointer text-xs"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </Button>
      </div>

      {/* Custom Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-full shrink-0">
                <LogOut className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-foreground">¿Cerrar Sesión?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">¿Desea cerrar la sesión de supervisión?</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowLogoutConfirm(false)}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-foreground border-border hover:bg-muted transition-all"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  localStorage.removeItem('supervisor_session')
                  window.location.reload()
                }}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm border-none cursor-pointer"
              >
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}

    </aside>
  )
}
