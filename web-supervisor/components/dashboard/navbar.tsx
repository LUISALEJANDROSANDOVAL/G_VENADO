'use client'

import { useState, useEffect } from 'react'
import { Bell, Settings, User, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SessionUser {
  name: string
  email: string
  role: string
}

export function Navbar() {
  const [currentUser, setCurrentUser] = useState<SessionUser>({
    name: 'Usuario',
    email: '',
    role: 'SUPERVISOR',
  })

  useEffect(() => {
    try {
      const sessionStr = localStorage.getItem('supervisor_session')
      if (sessionStr) {
        const session = JSON.parse(sessionStr)
        setCurrentUser({
          name: session.name || (session.role === 'ADMIN' ? 'Administrador del Sistema' : 'Supervisor General'),
          email: session.email || '',
          role: session.role || 'SUPERVISOR',
        })
      }
    } catch (e) {
      console.error('Error reading auth session in navbar:', e)
    }
  }, [])

  const isAdmin = currentUser.role === 'ADMIN'

  const panelTitle = isAdmin ? 'Consola de Administración' : 'Torre de Control'
  const panelSub   = isAdmin ? 'Panel Administrativo'      : 'Operaciones de Campo'

  return (
    <nav className="border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isAdmin ? 'bg-rose-600' : 'bg-primary'
          }`}>
            {isAdmin
              ? <ShieldCheck className="h-4 w-4 text-white" />
              : <div className="text-primary-foreground font-bold text-lg">C</div>
            }
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground leading-tight">{panelTitle}</h1>
            <p className="text-xs text-muted-foreground">{panelSub}</p>
          </div>
          {isAdmin && (
            <Badge className="ml-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider">
              Admin
            </Badge>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center text-[10px]">
              3
            </span>
          </Button>

          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-3 h-9 cursor-pointer"
                title="Perfil de usuario"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                  isAdmin ? 'bg-rose-600' : 'bg-primary'
                }`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-bold text-foreground leading-none">{currentUser.name}</span>
                  <span className="text-[10px] text-muted-foreground">{currentUser.role}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border border-border shadow-md rounded-xl p-1.5">
              <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
                <span className="font-bold text-sm text-foreground">{currentUser.name}</span>
                <span className="text-[11px] text-muted-foreground font-medium">{currentUser.email}</span>
                <Badge className={`mt-1 self-start text-[9px] font-extrabold border-none px-1.5 py-0.5 ${
                  isAdmin
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                }`}>
                  {currentUser.role}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border my-1" />
              <DropdownMenuItem
                className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-600 dark:focus:bg-rose-500/20 cursor-pointer flex items-center gap-2 px-2.5 py-2 rounded-lg font-semibold text-xs"
                onClick={() => {
                  localStorage.removeItem('supervisor_session')
                  window.location.href = '/'
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
