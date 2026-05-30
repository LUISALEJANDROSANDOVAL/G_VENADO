'use client'

import { useState } from 'react'
import { AlertTriangle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { RouteOptData } from '@/lib/mock-data'

interface RouteManagementProps {
  data: RouteOptData
}

export function RouteManagement({ data }: RouteManagementProps) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimized, setOptimized] = useState(false)

  const handleOptimize = () => {
    setIsOptimizing(true)
    setTimeout(() => {
      setIsOptimizing(false)
      setOptimized(true)
      setTimeout(() => setOptimized(false), 3000)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex gap-4">
        <Button
          onClick={handleOptimize}
          disabled={isOptimizing}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Zap className="h-4 w-4" />
          {isOptimizing ? 'Optimizing...' : 'Re-optimize Routes'}
        </Button>
        {optimized && (
          <div className="flex items-center gap-2 text-sm font-medium text-accent">
            <div className="h-2 w-2 rounded-full bg-accent"></div>
            Routes optimized successfully!
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overloaded Workers */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Overloaded Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.overloaded.map((worker) => (
                <div
                  key={worker.id}
                  className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg hover:bg-destructive/10 cursor-move transition-colors"
                  draggable
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-foreground">{worker.name}</div>
                      <div className="text-xs text-foreground/60">{worker.id}</div>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {worker.delay}m delay
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-foreground/70">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p>{worker.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending At Risk */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Pending PDVs at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.pendingRisk.map((pdv) => (
                <div
                  key={pdv.id}
                  className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg hover:bg-destructive/10 cursor-move transition-colors"
                  draggable
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-foreground">{pdv.name}</div>
                      <div className="text-xs text-foreground/60">{pdv.location}</div>
                    </div>
                    <Badge
                      variant={pdv.priority === 'High' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {pdv.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-foreground/60">
                    Assigned: <span className="font-medium">{pdv.assignedWorker}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Info */}
      <Card className="border-border bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-foreground/60">Workers to rebalance</div>
              <div className="text-2xl font-bold text-foreground mt-1">{data.overloaded.length}</div>
            </div>
            <div>
              <div className="text-foreground/60">PDVs at risk</div>
              <div className="text-2xl font-bold text-foreground mt-1">{data.pendingRisk.length}</div>
            </div>
            <div>
              <div className="text-foreground/60">High priority</div>
              <div className="text-2xl font-bold text-destructive mt-1">
                {data.pendingRisk.filter((p) => p.priority === 'High').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
