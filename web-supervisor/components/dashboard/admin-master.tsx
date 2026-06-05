'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PDVsTab } from './pdv-master'
import { WorkersTab } from './workers-tab'
import { MapPin, Users } from 'lucide-react'
import type { PDV } from '@/lib/mock-data'

interface AdminMasterProps {
  pdvs: PDV[]
  reponedores: any[]
  onRefresh?: () => void
}

export function AdminMaster({ pdvs, reponedores, onRefresh }: AdminMasterProps) {
  return (
    <div className="space-y-6 w-full mx-auto animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centro de Administración</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestionar el directorio de puntos de venta y personal de campo
          </p>
        </div>
      </div>

      <Tabs defaultValue="pdvs" className="w-full">
        <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none mb-6">
          <TabsTrigger 
            value="pdvs" 
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Puntos de Venta
          </TabsTrigger>
          <TabsTrigger 
            value="workers" 
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary"
          >
            <Users className="h-4 w-4 mr-2" />
            Personal de Campo
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pdvs" className="animate-in fade-in duration-300">
          <PDVsTab pdvs={pdvs} onRefresh={onRefresh} />
        </TabsContent>
        
        <TabsContent value="workers" className="animate-in fade-in duration-300">
          <WorkersTab reponedores={reponedores} onRefresh={onRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
