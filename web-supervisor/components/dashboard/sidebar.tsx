'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Custom Premium Icons
function IconDashboard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("dash-svg", className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

function IconMap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path className="map-panel-1" d="M3 6l6-3v15l-6 3V6z" />
      <path className="map-panel-2" d="M9 3l6 3v15l-6-3V3z" />
      <path className="map-panel-3" d="M15 6l6-3v15l-6 3V6z" />
    </svg>
  )
}

function IconRoute({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle className="n1" cx="5" cy="18" r="2.5" />
      <circle className="n2" cx="19" cy="6" r="2.5" />
      <path className="f-path" d="M7.5 18h4a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4h1" />
    </svg>
  )
}

function IconAnalytics({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <line className="bar1" x1="7" y1="16" x2="7" y2="12" />
      <line className="bar2" x1="11" y1="16" x2="11" y2="9" />
      <line className="bar3" x1="15" y1="16" x2="15" y2="6" />
    </svg>
  )
}

function IconDatabase({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <g className="db-group">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
      </g>
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

interface SidebarProps {
  activeModule: string
  onModuleChange: (module: string) => void
  activeReponedoresCount?: number
  isAdmin?: boolean
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

export function Sidebar({ activeModule, onModuleChange, activeReponedoresCount, isAdmin = false }: SidebarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const modules = isAdmin ? [
    { id: 'overview',   label: 'Resumen General',    icon: IconDashboard },
    { id: 'users',      label: 'Gestión de Personal', icon: IconUsers },
    { id: 'pdvs',       label: 'Directorio PDVs',     icon: IconDatabase },
    { id: 'audit',      label: 'Auditoría & Logs',    icon: IconShield },
    { id: 'playground', label: 'Sandbox de Rutas',    icon: IconRoute },
  ] : [
    { id: 'dashboard', label: 'Inicio', icon: IconDashboard },
    { id: 'map', label: 'Mapa en Vivo', icon: IconMap },
    { id: 'qa', label: 'Control QA', icon: IconShield },
    { id: 'routes', label: 'Control de Rutas', icon: IconRoute },
    { id: 'analytics', label: 'Reportes y Gráficos', icon: IconAnalytics },
    { id: 'pdv', label: 'Directorio de Tiendas', icon: IconDatabase },
  ]

  const isDark = mounted ? (theme === 'dark' || resolvedTheme === 'dark') : false

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside className={cn(
      "border-r border-sidebar-border bg-[#00457C] h-full flex flex-col justify-between shrink-0 text-white select-none transition-all duration-300 relative",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Toggle Collapse Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-9 bg-[#00457C] border border-sidebar-border/30 rounded-full p-1.5 text-white/70 hover:text-white hover:scale-110 transition-all z-50 shadow-md cursor-pointer"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
      <style>{`
        /* 1. DASHBOARD */
        @keyframes dashPremium {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(0.85) rotate(-5deg); }
          100% { transform: scale(1.05) rotate(5deg); }
        }
        .group:hover .dash-svg { animation: dashPremium 1s cubic-bezier(0.34, 1.56, 0.64, 1) infinite alternate; }

        /* 2. MAPA */
        @keyframes mapFoldLeft {
          0%, 100% { transform: skewY(0deg) scaleX(1) translateY(0); }
          50% { transform: skewY(12deg) scaleX(0.9) translateY(-2px); }
        }
        @keyframes mapFoldRight {
          0%, 100% { transform: skewY(0deg) scaleX(1) translateY(0); }
          50% { transform: skewY(-12deg) scaleX(0.9) translateY(2px); }
        }
        .group:hover .map-panel-1 { animation: mapFoldLeft 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite ease-in-out; transform-origin: left center; transform-box: fill-box; }
        .group:hover .map-panel-2 { animation: mapFoldRight 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite ease-in-out; transform-origin: center center; transform-box: fill-box; }
        .group:hover .map-panel-3 { animation: mapFoldLeft 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite ease-in-out; transform-origin: right center; transform-box: fill-box; }

        /* 3. FLUJO */
        @keyframes magneticPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); stroke-width: 3px; }
        }
        @keyframes dashDisplace {
          to { stroke-dashoffset: -16; }
        }
        .group:hover .n1 { animation: magneticPulse 1s cubic-bezier(0.34, 1.56, 0.64, 1) infinite; transform-origin: 5px 18px; transform-box: fill-box; }
        .group:hover .n2 { animation: magneticPulse 1s cubic-bezier(0.34, 1.56, 0.64, 1) infinite 0.4s; transform-origin: 19px 6px; transform-box: fill-box; }
        .group:hover .f-path { stroke-dasharray: 6 3; animation: dashDisplace 1s linear infinite; }

        /* 4. ESTADÍSTICAS */
        @keyframes barElastic {
          0% { transform: scaleY(1); }
          40% { transform: scaleY(0.3); }
          70% { transform: scaleY(1.2); }
          100% { transform: scaleY(1); }
        }
        .group:hover .bar1 { animation: barElastic 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite; transform-origin: 7px 16px; transform-box: fill-box; }
        .group:hover .bar2 { animation: barElastic 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite 0.2s; transform-origin: 11px 16px; transform-box: fill-box; }
        .group:hover .bar3 { animation: barElastic 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite 0.4s; transform-origin: 15px 16px; transform-box: fill-box; }

        /* 5. BASE DE DATOS */
        @keyframes dbSqueeze {
          0%, 100% { transform: scale(1) translateY(0); }
          33% { transform: scaleX(1.1) scaleY(0.85) translateY(1px); }
          66% { transform: scaleX(0.95) scaleY(1.05) translateY(-1px); }
        }
        .group:hover .db-group { animation: dbSqueeze 1s cubic-bezier(0.45, 0, 0.55, 1) infinite; transform-origin: center bottom; transform-box: fill-box; }
      `}</style>
      {/* Top Section: Logo and Navigation */}
      <div className="flex flex-col overflow-hidden">
        {/* Logo (Matching the style of the screenshot) */}
        <div className={cn("p-6 border-b border-sidebar-border/30 flex items-center gap-3 transition-all", isCollapsed ? "justify-center px-2" : "")}>
          <img src="/logo.png" alt="Grupo Venado Logo" className="w-10 h-10 object-contain shrink-0 filter drop-shadow-md" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 animate-in fade-in zoom-in-95 duration-200">
              <span className="font-extrabold text-[15px] tracking-wider uppercase text-white leading-none">Grupo</span>
              <span className="text-[11px] text-white/80 font-bold uppercase tracking-widest mt-1">Venado</span>
            </div>
          )}
        </div>

        {/* Navigation Modules */}
        <div className={cn("pt-6", isCollapsed ? "px-2" : "px-4")}>
          {!isCollapsed ? (
            <p className="text-[9px] font-semibold text-blue-200/50 uppercase tracking-[0.2em] px-3 mb-4 animate-in fade-in">
              Módulos
            </p>
          ) : (
            <div className="h-4 mb-4" />
          )}
          <nav className="space-y-1">
            {modules.map((module) => {
              const Icon = module.icon
              const isActive = activeModule === module.id
              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange(module.id)}
                  title={isCollapsed ? module.label : undefined}
                  className={cn(
                    'group flex items-center text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer text-left',
                    isCollapsed ? 'justify-center p-3 w-12 mx-auto' : 'w-full gap-3.5 px-4 py-3.5',
                    isActive
                      ? 'bg-white/15 text-white shadow-md font-bold ring-1 ring-white/10'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5 shrink-0 transition-all duration-300 ease-out', 
                    isActive ? 'scale-110 drop-shadow-md text-white' : 'group-hover:scale-125 group-hover:-translate-y-0.5 group-hover:text-blue-100 group-hover:drop-shadow-lg'
                  )} />
                  
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate animate-in fade-in">{module.label}</span>

                      {/* Premium Notification Badge next to Map Module */}
                      {module.id === 'map' && activeReponedoresCount !== undefined && activeReponedoresCount > 0 && (
                        <span className={cn(
                          "ml-auto bg-white text-[#00457C] text-[10px] font-extrabold px-2 py-0.5 rounded-md min-w-[20px] text-center shadow-sm transition-transform duration-300 shrink-0",
                          isActive ? "scale-105" : "group-hover:scale-110"
                        )}>
                          {activeReponedoresCount}
                        </span>
                      )}
                    </>
                  )}

                  {/* Badge for collapsed state */}
                  {isCollapsed && module.id === 'map' && activeReponedoresCount !== undefined && activeReponedoresCount > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-500 text-white text-[8px] font-bold px-1.5 rounded-full shadow-sm">
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
      <div className={cn("p-4 border-t border-sidebar-border/30 space-y-4", isCollapsed ? "px-2" : "")}>
        {/* Toggle Dark Mode */}
        <div
          onClick={toggleTheme}
          title={isCollapsed ? (isDark ? 'Modo Claro' : 'Modo Oscuro') : undefined}
          className={cn(
            "flex items-center text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer",
            isCollapsed ? "justify-center" : "justify-between px-3 py-2"
          )}
        >
          <div className="flex items-center gap-3">
            {isDark ? <Sun className="h-4.5 w-4.5 shrink-0" /> : <Moon className="h-4.5 w-4.5 shrink-0" />}
            {!isCollapsed && <span className="animate-in fade-in truncate">{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>}
          </div>
          {!isCollapsed && (
            <div className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isDark}
                onChange={() => { }} // handled by parent div click
              />
              <div className={cn(
                "w-9 h-5 rounded-full transition-all relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all",
                isDark
                  ? "bg-emerald-500 after:translate-x-full"
                  : "bg-white/20"
              )}></div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          title={isCollapsed ? "Cerrar Sesión" : undefined}
          className={cn(
            "bg-transparent hover:bg-red-500/10 text-white/60 hover:text-red-400 font-semibold border-none transition-all active:scale-98 cursor-pointer text-xs",
            isCollapsed ? "w-12 h-12 p-0 mx-auto justify-center rounded-xl flex" : "w-full justify-start gap-3 rounded-xl py-2.5 px-3"
          )}
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="flex-1 text-left animate-in fade-in">Cerrar Sesión</span>}
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
                onClick={async () => {
                  const { createClient } = await import('@/utils/supabase/client')
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  window.location.href = '/'
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
