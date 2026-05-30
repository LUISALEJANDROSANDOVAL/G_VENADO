'use client'

import { useState, useMemo } from 'react'
import { Search, Upload, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PDV, ClientType, WeekDay } from '@/lib/mock-data'

import { useRef } from 'react'
import { uploadPdvs } from '@/app/actions'

interface PDVMasterProps {
  pdvs: PDV[]
  onRefresh?: () => void
}

export function PDVMaster({ pdvs, onRefresh }: PDVMasterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ClientType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'visited' | 'unvisited'>('all')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        if (!text) throw new Error('El archivo está vacío.')

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
        if (lines.length <= 1) throw new Error('El archivo debe tener una cabecera y datos.')

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        const parsedPdvs = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim())
          if (cols.length < headers.length) continue

          const rowData: Record<string, string> = {}
          headers.forEach((header, index) => {
            rowData[header] = cols[index]
          })

          const lat = parseFloat(rowData.latitude || rowData.lat || '')
          const lng = parseFloat(rowData.longitude || rowData.lng || '')
          
          if (isNaN(lat) || isNaN(lng)) continue

          parsedPdvs.push({
            id: rowData.id || `PDV-${Math.floor(1000 + Math.random() * 9000)}`,
            name: rowData.name || rowData.nombre || 'PDV Importado',
            market: rowData.market || rowData.mercado || 'Buenos Aires',
            category: (rowData.category || rowData.clasificacion || rowData.type || 'DETALLISTA').toUpperCase(),
            latitude: lat,
            longitude: lng,
            base_duration_minutes: parseInt(rowData.base_duration_minutes || rowData.duracion || '30')
          })
        }

        if (parsedPdvs.length === 0) {
          throw new Error('No se encontraron coordenadas válidas (latitud/longitud).')
        }

        const res = await uploadPdvs(parsedPdvs)
        if (res.error) {
          alert('Error al guardar en Supabase: ' + res.error)
        } else {
          alert(`¡Éxito! Se guardaron ${parsedPdvs.length} puntos de venta en Supabase.`)
          if (onRefresh) onRefresh()
        }
      } catch (err: any) {
        alert('Error al procesar archivo CSV: ' + err.message)
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const triggerUpload = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  const handleExportBI = () => {
    try {
      const dataToExport = pdvs.map(pdv => ({
        'ID de PDV': pdv.id,
        'Nombre Comercial': pdv.nombre,
        'Clasificación': pdv.type,
        'Latitud': pdv.lat,
        'Longitud': pdv.lng,
        'Visitado': pdv.visited ? 'Sí' : 'No',
        'Última Visita': pdv.lastVisit ? new Date(pdv.lastVisit).toLocaleDateString() : 'Nunca'
      }))

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Puntos de Venta')

      XLSX.writeFile(workbook, `Reporte_BI_PDVs_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (e: any) {
      alert('Error al exportar a Excel: ' + e.message)
    }
  }

  const filteredPDVs = useMemo(() => {
    return pdvs.filter((pdv) => {
      const matchesSearch =
        pdv.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pdv.id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || pdv.type === filterType
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'visited' && pdv.visited) ||
        (filterStatus === 'unvisited' && !pdv.visited)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [pdvs, searchTerm, filterType, filterStatus])

  // All week days in order
  const ALL_DAYS: WeekDay[] = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

  // Today's day abbreviation for highlight ring
  const todayIdx = new Date().getDay() // 0 = Sun
  const todayAbbr: WeekDay | null = (
    ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'] as WeekDay[]
  )[todayIdx - 1] ?? null // Sunday (0) won't match, returns null

  // Color scheme per day (active pill)
  const DAY_COLORS: Record<WeekDay, string> = {
    LUN: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    MAR: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'MIÉ': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    JUE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    VIE: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    'SÁB': 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  }

  const typeColor = (type: ClientType) => {
    switch (type) {
      case 'Pareto':    return 'bg-red-500/15 text-red-300 border-red-500/30'
      case 'Mayorista': return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      case 'Detallista': return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-dashed border-2 border-border">
        <CardContent className="pt-6">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          <div 
            onClick={triggerUpload}
            className={`flex items-center justify-center gap-4 py-8 cursor-pointer hover:bg-muted/30 rounded-lg transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">
                {isUploading ? 'Procesando archivo...' : 'Haz clic aquí para seleccionar un archivo CSV'}
              </p>
              <p className="text-sm text-muted-foreground">
                Columnas aceptadas: id, nombre, mercado, clasificacion, lat, lng, duracion
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as ClientType | 'all')}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="Pareto">Pareto</SelectItem>
            <SelectItem value="Mayorista">Mayorista</SelectItem>
            <SelectItem value="Detallista">Detallista</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'visited' | 'unvisited')}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="visited">Visitado</SelectItem>
            <SelectItem value="unvisited">No visitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Datos Maestros de PDV</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Mostrando {filteredPDVs.length} de {pdvs.length} PDVs
              </p>
            </div>
            <Button 
              onClick={handleExportBI} 
              variant="outline" 
              className="gap-2 border-primary text-primary hover:bg-primary/5 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Exportar para BI (Excel)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-foreground/70">ID de PDV</TableHead>
                  <TableHead className="text-foreground/70">Nombre Comercial</TableHead>
                  <TableHead className="text-foreground/70">Clasificación</TableHead>
                  <TableHead className="text-foreground/70">Coordenadas</TableHead>
                  <TableHead className="text-foreground/70">Disponibilidad Semanal</TableHead>
                  <TableHead className="text-foreground/70">Estado / Última Visita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPDVs.slice(0, 50).map((pdv) => (
                  <TableRow key={pdv.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm text-foreground/70">{pdv.id}</TableCell>
                    <TableCell className="font-medium text-foreground">{pdv.nombre}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold border ${typeColor(pdv.type)}`}
                      >
                        {pdv.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground/60">
                      {pdv.lat.toFixed(5)}, {pdv.lng.toFixed(5)}
                    </TableCell>

                    {/* ——— Disponibilidad Semanal ——— */}
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {ALL_DAYS.map((day) => {
                          const isActive = (pdv.availableDays ?? []).includes(day)
                          const isToday = day === todayAbbr
                          return (
                            <span
                              key={day}
                              title={isActive ? `Atiende los ${day}` : `No disponible los ${day}`}
                              className={[
                                'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all select-none',
                                isActive
                                  ? DAY_COLORS[day]
                                  : 'bg-muted/30 text-muted-foreground/40 border-border/30',
                                isToday && isActive
                                  ? 'ring-2 ring-offset-1 ring-offset-card ring-current shadow-sm'
                                  : '',
                              ].join(' ')}
                            >
                              {day}
                            </span>
                          )
                        })}
                      </div>
                    </TableCell>

                    {/* Estado + Última visita */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={pdv.visited ? 'secondary' : 'outline'}
                          className={`text-[10px] w-fit ${
                            pdv.visited
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-muted/30 text-muted-foreground border-border'
                          }`}
                        >
                          {pdv.visited ? '✓ Visitado' : 'Pendiente'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground/60">
                          {pdv.lastVisit ? new Date(pdv.lastVisit).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredPDVs.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Ningún PDV coincide con los filtros</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
