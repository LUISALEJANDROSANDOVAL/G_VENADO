'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, PowerOff } from 'lucide-react'
import { createWorker, updateWorker, deactivateWorker } from '@/app/actions'
import { useToast } from '@/hooks/use-toast'

export function WorkersTab({ reponedores, onRefresh }: { reponedores: any[], onRefresh?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [filterDepartment, setFilterDepartment] = useState('all')
  const { toast } = useToast()

  const filteredWorkers = (reponedores || []).filter(w => filterDepartment === 'all' || w.city === filterDepartment)

  const handleOpen = (worker?: any) => {
    if (worker) {
      setEditWorker(worker)
      setFormData({ name: worker.name, email: worker.email || '' })
    } else {
      setEditWorker(null)
      setFormData({ name: '', email: '' })
    }
    setIsOpen(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    let res;
    if (editWorker) {
      res = await updateWorker(editWorker.dbUuid, formData)
    } else {
      res = await createWorker({ ...formData, email: formData.email || `${formData.name.toLowerCase().replace(' ', '.')}@venado.com` })
    }
    setIsLoading(false)

    if (res.error) {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    } else {
      toast({ title: 'Éxito', description: editWorker ? 'Reponedor actualizado.' : 'Reponedor creado.' })
      setIsOpen(false)
      if (onRefresh) onRefresh()
    }
  }

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres dar de baja a ${name}? (Esto es reversible desde la Base de Datos)`)) return;
    
    setIsLoading(true)
    const res = await deactivateWorker(id)
    setIsLoading(false)

    if (res.error) {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    } else {
      toast({ title: 'Éxito', description: 'Reponedor dado de baja (Inactivo).' })
      if (onRefresh) onRefresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold">Personal de Campo Activo</h2>
          <p className="text-xs text-muted-foreground mt-1">Administra las cuentas de los reponedores que pueden acceder a la app móvil.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-full sm:w-[250px] bg-background/50 text-sm shadow-sm">
              <SelectValue placeholder="Filtrar por Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              <SelectItem value="La Paz">La Paz</SelectItem>
              <SelectItem value="Santa Cruz">Santa Cruz</SelectItem>
              <SelectItem value="Cochabamba">Cochabamba</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpen()} className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md">
            <Plus className="h-4 w-4" /> Añadir Reponedor
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editWorker ? 'Editar Reponedor' : 'Nuevo Reponedor'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right text-sm font-semibold">Nombre</label>
              <Input id="name" placeholder="Ej. Juan Pérez" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right text-sm font-semibold">Email</label>
              <Input id="email" type="email" placeholder="juan@venado.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.name}>{isLoading ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border w-full shadow-sm">
        <CardContent className="pt-6">
          <div className="rounded-lg border border-border overflow-x-auto w-full">
            <Table className="w-full">
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-foreground/70 font-semibold w-[40%]">Nombre</TableHead>
                  <TableHead className="text-foreground/70 font-semibold w-[30%]">Email</TableHead>
                  <TableHead className="text-foreground/70 font-semibold w-[20%]">Ciudad Base</TableHead>
                  <TableHead className="text-foreground/70 font-semibold w-[10%] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((w) => (
                  <TableRow key={w.id} className="border-border group hover:bg-muted/30 hover:translate-x-1 transition-all duration-300 cursor-default">
                    <TableCell className="py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-sm">{w.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground text-sm">{w.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">{w.city || 'Asignación Dinámica'}</Badge>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="ghost" size="icon" title="Editar Reponedor" onClick={() => handleOpen(w)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Dar de Baja (Inactivar)" onClick={() => handleDeactivate(w.dbUuid, w.name)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                        <PowerOff className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredWorkers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No hay reponedores activos en la base de datos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
