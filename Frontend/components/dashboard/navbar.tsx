'use client'

import { Bell, Settings, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Navbar() {
  return (
    <nav className="border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <div className="text-primary-foreground font-bold text-lg">C</div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground">Control Tower</h1>
            <p className="text-xs text-muted-foreground">Field Operations</p>
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
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
