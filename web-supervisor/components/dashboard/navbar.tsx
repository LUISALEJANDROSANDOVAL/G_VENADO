'use client'

import { useState, useEffect } from 'react'
import { Bell, Settings, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Navbar() {
  const [currentUser, setCurrentUser] = useState({ name: 'Supervisor General', email: 'supervisor@gmail.com' })

  useEffect(() => {
    try {
      const sessionStr = localStorage.getItem('supervisor_session')
      if (sessionStr) {
        const session = JSON.parse(sessionStr)
        if (session.email) {
          setCurrentUser({
            name: session.name || (session.email.split('@')[0] === 'supervisor' ? 'Supervisor General' : 'Administrador'),
            email: session.email
          })
        }
      }
    } catch (e) {
      console.error('Error reading auth session in navbar:', e)
    }
  }, [])

  return (
    <nav className="border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <div className="text-primary-foreground font-bold text-lg">C</div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground">Torre de Control</h1>
            <p className="text-xs text-muted-foreground">Operaciones de Campo</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center text-[10px]">
              3
            </span>
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          {/* User profile dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Usuario" className="cursor-pointer">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border border-border shadow-md rounded-xl p-1.5">
              <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
                <span className="font-bold text-sm text-foreground">{currentUser.name}</span>
                <span className="text-[11px] text-muted-foreground font-medium">{currentUser.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border my-1" />
              <DropdownMenuItem 
                className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-600 dark:focus:bg-rose-500/20 cursor-pointer flex items-center gap-2 px-2.5 py-2 rounded-lg font-semibold text-xs"
                onClick={() => {
                  localStorage.removeItem('supervisor_session')
                  window.location.reload()
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
