'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search, Upload, Download, Eye, Flag, Copy, Check, ExternalLink, X,
  Plus, Pencil, Trash2, Store, Tag, Compass, Clock, MapPin, Building2
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { PDV, ClientType, WeekDay } from '@/lib/mock-data'
import { uploadPdvs, createPdv, updatePdv, deletePdv } from '@/app/actions'
import { useToast } from '@/hooks/use-toast'

interface PDVMasterProps {
  pdvs: PDV[]
  photoEvidences?: any[]
  onRefresh?: () => void
}

export function PDVsTab({ pdvs, photoEvidences = [], onRefresh }: PDVMasterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ClientType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'visited' | 'unvisited'>('all')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New States
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [copiedPdvId, setCopiedPdvId] = useState<string | null>(null)
  const [selectedPdvHistory, setSelectedPdvHistory] = useState<PDV | null>(null)
  const [selectedPdvReport, setSelectedPdvReport] = useState<PDV | null>(null)
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null)
  
  // Inconsistency Report form state
  const [reportType, setReportType] = useState('coordinates')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSuccessMsg, setReportSuccessMsg] = useState('')

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // PDV Form States
  const [isPdvModalOpen, setIsPdvModalOpen] = useState(false)
  const [editPdvData, setEditPdvData] = useState<any>(null)
  const [pdvFormData, setPdvFormData] = useState({
    name: '', market: 'Santa Cruz', category: 'DETALLISTA', latitude: '', longitude: '', base_duration_minutes: '30'
  })
  const [isSavingPdv, setIsSavingPdv] = useState(false)
  const { toast } = useToast()

  // Reset page on search or filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, filterStatus])

  // Auto-calculate market based on longitude
  useEffect(() => {
    const lng = parseFloat(pdvFormData.longitude)
    if (!isNaN(lng)) {
      let newCity = 'Cochabamba'
      if (lng < -67) newCity = 'La Paz'
      else if (lng > -64) newCity = 'Santa Cruz'
      
      if (pdvFormData.market !== newCity) {
        setPdvFormData(prev => ({ ...prev, market: newCity }))
      }
    }
  }, [pdvFormData.longitude, pdvFormData.market])

  const handleOpenPdvModal = (pdv?: any) => {
    if (pdv) {
      setEditPdvData(pdv)
      setPdvFormData({
        name: pdv.nombre,
        market: pdv.city || 'Santa Cruz',
        category: pdv.type.toUpperCase(),
        latitude: String(pdv.lat),
        longitude: String(pdv.lng),
        base_duration_minutes: pdv.base_duration_minutes ? String(pdv.base_duration_minutes) : '30'
      })
    } else {
      setEditPdvData(null)
      setPdvFormData({ name: '', market: 'Santa Cruz', category: 'DETALLISTA', latitude: '', longitude: '', base_duration_minutes: '30' })
    }
    setIsPdvModalOpen(true)
  }

  const handleSavePdv = async () => {
    setIsSavingPdv(true)
    const payload = {
      name: pdvFormData.name,
      market: pdvFormData.market,
      category: pdvFormData.category,
      latitude: parseFloat(pdvFormData.latitude),
      longitude: parseFloat(pdvFormData.longitude),
      base_duration_minutes: parseInt(pdvFormData.base_duration_minutes)
    }

    let res;
    if (editPdvData) {
      res = await updatePdv(editPdvData.id, payload)
    } else {
      const newId = `PDV-${Math.floor(1000 + Math.random() * 9000)}`
      res = await createPdv({ ...payload, id: newId })
    }
    setIsSavingPdv(false)

    if (res.error) {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    } else {
      toast({ title: 'Éxito', description: editPdvData ? 'PDV actualizado.' : 'PDV creado.' })
      setIsPdvModalOpen(false)
      if (onRefresh) onRefresh()
    }
  }

  const handleDeletePdv = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el punto de venta "${name}"?`)) return;
    
    setIsSavingPdv(true)
    const res = await deletePdv(id)
    setIsSavingPdv(false)

    if (res.error) {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    } else {
      toast({ title: 'Éxito', description: 'PDV eliminado.' })
      if (onRefresh) onRefresh()
    }
  }

  const handleCopyCoords = (lat: number, lng: number, pdvId: string) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`)
    setCopiedPdvId(pdvId)
    setTimeout(() => {
      setCopiedPdvId(null)
    }, 2000)
  }

  const submitReport = () => {
    if (!selectedPdvReport) return
    const reportTypeLabels: Record<string, string> = {
      coordinates: 'Coordenadas erróneas',
      closed: 'Establecimiento cerrado/No existe',
      name: 'Cambio de nombre comercial',
      other: 'Otras inconsistencias'
    }
    const label = reportTypeLabels[reportType] || reportType
    
    // Simulate successful notification to administrator
    setReportSuccessMsg(`¡Reporte enviado! Inconsistencia de tipo "${label}" registrada para "${selectedPdvReport.nombre}".`)
    setSelectedPdvReport(null)
    setReportDetails('')
    
    setTimeout(() => {
      setReportSuccessMsg('')
    }, 5000)
  }

  // Helper to generate visit history for Drawer
  const getPDVHistory = (pdv: PDV) => {
    const realEvidences = photoEvidences.filter(ev => ev.pdvName === pdv.nombre || ev.pdvName === pdv.id);
    
    if (realEvidences.length > 0) {
      return realEvidences.map(ev => ({
        date: new Date(ev.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        reponedor: ev.reponedorName,
        status: ev.afterUrl ? 'Completado ✓' : 'En Proceso ⏳',
        details: ev.taskName,
        beforeUrl: ev.beforeUrl,
        afterUrl: ev.afterUrl
      }))
    }

    // Fallback si no hay evidencias reales
    const isVisited = pdv.visited
    const history = []
    
    const dateToday = pdv.lastVisit 
      ? new Date(pdv.lastVisit).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
      : '30/05/2026, 14:30'

    if (isVisited) {
      history.push({
        date: dateToday,
        reponedor: 'Carlos Méndez',
        status: 'Completado ✓',
        details: 'Checklist completado con éxito. Se colocó 100% de exhibidores en góndolas principales y material POP en la entrada.',
        beforeUrl: null,
        afterUrl: null
      })
    }
    history.push({
      date: '28/05/2026, 11:15',
      reponedor: 'Ana García',
      status: 'Completado ✓',
      details: 'Limpieza de exhibidores realizada. Se reabasteció el stock de productos Pareto. Inventario en góndolas reportado sin anomalías.',
      beforeUrl: null,
      afterUrl: null
    })
    history.push({
      date: '25/05/2026, 09:40',
      reponedor: 'José Torres',
      status: 'Alerta / Incompleto ⚠️',
      details: 'No se pudo completar el bandeo debido a la falta de espacio en góndola. El encargado del PDV solicitó reagendar limpieza profunda.',
      beforeUrl: null,
      afterUrl: null
    })
    return history
  }

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
            nombre: rowData.name || rowData.nombre || 'PDV Importado',
            market: rowData.market || rowData.mercado || 'Santa Cruz',
            type: (rowData.category || rowData.clasificacion || rowData.type || 'DETALLISTA').toUpperCase(),
            lat: lat,
            lng: lng,
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
      const displayName = pdv.nombre ?? (pdv as any).name ?? ''
      const displayId   = pdv.id ?? ''
      const displayType = pdv.type ?? (pdv as any).category ?? ''
      const matchesSearch =
        displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayId.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || displayType.toUpperCase() === filterType.toUpperCase()
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'visited' && pdv.visited) ||
        (filterStatus === 'unvisited' && !pdv.visited)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [pdvs, searchTerm, filterType, filterStatus])

  // Derive paginated data
  const totalPages = Math.ceil(filteredPDVs.length / rowsPerPage)
  const startRow = filteredPDVs.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0
  const endRow = Math.min(currentPage * rowsPerPage, filteredPDVs.length)

  const paginatedPDVs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredPDVs.slice(start, start + rowsPerPage)
  }, [filteredPDVs, currentPage, rowsPerPage])

  const pageNumbers = useMemo(() => {
    const pages = []
    const range = 1
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...')
      }
    }
    return pages
  }, [currentPage, totalPages])

  const ALL_DAYS: WeekDay[] = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

  const todayIdx = new Date().getDay()
  const todayAbbr: WeekDay | null = (
    ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'] as WeekDay[]
  )[todayIdx - 1] ?? null

  const DAY_COLORS: Record<WeekDay, string> = {
    LUN: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    MAR: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'MIÉ': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    JUE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    VIE: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    'SÁB': 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  }

  const typeColor = (type: string) => {
    const t = (type ?? '').toUpperCase()
    if (t === 'PARETO') {
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-none'
    }
    if (t === 'MAYORISTA') {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-none'
    }
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-none'
  }

  return (
    <div className="space-y-5 w-full mx-auto animate-in fade-in duration-200">
      {/* Title and Actions Row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Directorio de Puntos de Venta
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Administra los puntos de venta maestros, carga plantillas geográficas y exporta reportes de cobertura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            onClick={() => handleOpenPdvModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold px-5 h-10 rounded-xl shadow-md cursor-pointer transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nuevo PDV
          </Button>
          <Button
            onClick={() => setShowUploadZone(!showUploadZone)}
            variant="outline"
            className={`h-10 px-5 rounded-xl border border-border shadow-md font-semibold text-sm cursor-pointer transition-all gap-2 ${showUploadZone ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20' : 'bg-background hover:bg-muted'}`}
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button 
            onClick={handleExportBI} 
            variant="outline" 
            className="h-10 px-5 rounded-xl border border-blue-600/30 hover:border-blue-600 text-blue-600 dark:text-blue-400 bg-background/50 hover:bg-blue-600/5 cursor-pointer font-bold shadow-md transition-all gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar para BI
          </Button>
        </div>
      </div>

      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre comercial o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-background border-border rounded-xl w-full text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as ClientType | 'all')}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-background border-border rounded-xl font-semibold text-sm cursor-pointer">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="Pareto">Pareto</SelectItem>
            <SelectItem value="Mayorista">Mayorista</SelectItem>
            <SelectItem value="Detallista">Detallista</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'visited' | 'unvisited')}>
          <SelectTrigger className="w-full sm:w-48 h-10 bg-background border-border rounded-xl font-semibold text-sm cursor-pointer">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="visited">Visitados hoy</SelectItem>
            <SelectItem value="unvisited">No visitados hoy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count label */}
      <p className="text-xs text-muted-foreground font-semibold -mt-2">
        Mostrando {filteredPDVs.length} de {pdvs.length} puntos de venta registrados
      </p>

      {showUploadZone && (
        <Card className="border-dashed border-2 border-primary/40 bg-primary/5 animate-in slide-in-from-top-4 duration-300 rounded-2xl">
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
              className={`flex items-center justify-center gap-4 py-8 cursor-pointer hover:bg-muted/30 rounded-xl transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-foreground">
                  {isUploading ? 'Procesando archivo...' : 'Haz clic aquí para seleccionar un archivo CSV'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Columnas aceptadas: id, nombre, mercado, clasificacion, lat, lng, duracion
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm w-full">
        <div className="overflow-x-auto w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 border-border hover:bg-muted/40">
                <TableHead className="pl-6 py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[30%]">Nombre Comercial</TableHead>
                <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[15%]">Clasificación</TableHead>
                <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[22%]">Coordenadas</TableHead>
                <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[18%]">Disponibilidad</TableHead>
                <TableHead className="py-3.5 pr-6 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[15%] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {paginatedPDVs.map((pdv) => (
                  <TableRow key={pdv.id} className="border-border group hover:bg-muted/30 hover:translate-x-1 transition-all duration-300 cursor-default">
                    <TableCell className="py-3.5">
                      <div className="flex flex-col">
                        <span 
                          className="font-semibold text-foreground text-sm"
                        >
                          {pdv.nombre}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          #{pdv.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold border ${typeColor(pdv.type)}`}
                      >
                        {pdv.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/70">
                        <span className="truncate max-w-[130px]">{pdv.lat.toFixed(5)}, {pdv.lng.toFixed(5)}</span>
                        <button
                          onClick={() => handleCopyCoords(pdv.lat, pdv.lng, pdv.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                          title="Copiar Coordenadas"
                        >
                          {copiedPdvId === pdv.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${pdv.lat},${pdv.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          title="Ver en Google Maps"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Frecuencia: {pdv.availableDays ? pdv.availableDays.length : 0} veces / sem.
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {ALL_DAYS.map((day) => {
                            const isActive = (pdv.availableDays ?? []).includes(day)
                            const isToday = day === todayAbbr
                            return (
                              <span
                                key={day}
                                title={isActive ? `Atiende los ${day}` : `No disponible los ${day}`}
                                className={[
                                  'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[9px] font-bold border transition-all select-none',
                                  isActive
                                    ? DAY_COLORS[day]
                                    : 'bg-muted/30 text-muted-foreground/30 border-border/30',
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
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenPdvModal(pdv)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                          title="Editar PDV"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePdv(pdv.id, pdv.nombre)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Eliminar PDV"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPdvReport(pdv)
                            setReportType('coordinates')
                            setReportDetails('')
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                          title="Reportar Inconsistencia"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPDVs.length === 0 && (
            <div className="py-16 text-center border-t border-border bg-card">
              <p className="text-sm font-semibold text-muted-foreground">Ningún PDV coincide con los filtros</p>
              <p className="text-xs text-muted-foreground mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}

        {/* Pagination Controls */}
        {filteredPDVs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-card">
            {/* Rows per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-card border border-border rounded-xl px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs text-muted-foreground">
                Mostrando {startRow} - {endRow} de {filteredPDVs.length} PDVs
              </span>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 px-2 text-xs cursor-pointer font-semibold rounded-lg"
              >
                Primero
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 px-2 text-xs cursor-pointer font-semibold rounded-lg"
              >
                Anterior
              </Button>
              
              {/* Dynamic Page Numbers */}
              {pageNumbers.map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-2 text-xs text-muted-foreground">
                      ...
                    </span>
                  )
                }
                return (
                  <Button
                    key={p}
                    variant={currentPage === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(Number(p))}
                    className={`h-8 w-8 text-xs cursor-pointer font-semibold rounded-lg ${currentPage === p ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    {p}
                  </Button>
                )
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 px-2 text-xs cursor-pointer font-semibold rounded-lg"
              >
                Siguiente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 px-2 text-xs cursor-pointer font-semibold rounded-lg"
              >
                Último
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedPdvHistory && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={() => setSelectedPdvHistory(null)}
          />
          <div className="relative w-full max-w-md bg-card border-l border-border h-full shadow-2xl p-6 flex flex-col z-50 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">{selectedPdvHistory.nombre}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">#{selectedPdvHistory.id}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setSelectedPdvHistory(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              <div className="bg-slate-500/5 p-4 rounded-xl border border-border space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Clasificación de Cliente:</span>
                  <span className="font-semibold text-foreground">{selectedPdvHistory.type}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Coordenadas del Punto:</span>
                  <span className="font-mono text-foreground">{selectedPdvHistory.lat.toFixed(5)}, {selectedPdvHistory.lng.toFixed(5)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Estado de Hoy:</span>
                  <Badge 
                    variant="outline"
                    className={selectedPdvHistory.visited ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold" : "bg-muted/30 text-muted-foreground"}
                  >
                    {selectedPdvHistory.visited ? '✓ Visitado hoy' : 'Pendiente'}
                  </Badge>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Historial Reciente de Visitas</h4>
                <div className="relative border-l-2 border-border pl-4 ml-2.5 space-y-6">
                  {getPDVHistory(selectedPdvHistory).map((visit, index) => (
                    <div key={index} className="relative">
                      <div className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border border-card ${
                        visit.status.includes('Completado') ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{visit.reponedor}</span>
                          <span className="text-[10px] text-muted-foreground">{visit.date}</span>
                        </div>
                        <div className="text-[10px] font-semibold">
                          Estado: <span className={visit.status.includes('Completado') ? 'text-emerald-400' : 'text-amber-400'}>{visit.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground/80 leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border/40">
                          {visit.details}
                        </p>
                        {(visit.beforeUrl || visit.afterUrl) && (
                          <div className="flex gap-2 mt-2">
                            {visit.beforeUrl && (
                              <img 
                                src={visit.beforeUrl} 
                                alt="Antes" 
                                className="h-16 w-16 object-cover rounded cursor-pointer border border-border hover:opacity-80 transition-opacity"
                                onClick={() => setViewPhotoUrl(visit.beforeUrl)}
                              />
                            )}
                            {visit.afterUrl && (
                              <img 
                                src={visit.afterUrl} 
                                alt="Después" 
                                className="h-16 w-16 object-cover rounded cursor-pointer border border-border hover:opacity-80 transition-opacity"
                                onClick={() => setViewPhotoUrl(visit.afterUrl)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewPhotoUrl && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewPhotoUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[88vh] rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={viewPhotoUrl} alt="Evidencia ampliada" className="w-full h-auto max-h-[88vh] object-contain" />
            <button className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors flex items-center gap-1.5 text-xs cursor-pointer" onClick={() => setViewPhotoUrl(null)}>
              <X className="h-3.5 w-3.5" /> Cerrar
            </button>
          </div>
        </div>
      )}

      {selectedPdvReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200 p-4">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={() => setSelectedPdvReport(null)}
          />
          <div className="relative bg-card border border-border w-full max-w-md rounded-xl shadow-2xl p-6 z-50 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Flag className="h-4 w-4 text-amber-500 animate-pulse" /> Reportar Inconsistencia
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setSelectedPdvReport(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Punto de Venta:</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{selectedPdvReport.nombre} <span className="text-xs text-muted-foreground font-mono">({selectedPdvReport.id})</span></p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tipo de Inconsistencia:</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-full text-foreground">
                    <SelectValue placeholder="Seleccione el motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coordinates">📍 Coordenadas erróneas / ubicación incorrecta</SelectItem>
                    <SelectItem value="closed">🔒 Establecimiento cerrado / ya no existe</SelectItem>
                    <SelectItem value="name">🏷️ Cambio de nombre comercial</SelectItem>
                    <SelectItem value="other">📝 Otras inconsistencias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Notas / Comentarios:</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Por favor, describe detalladamente la discrepancia para que el Administrador pueda corregirla en el maestro de datos..."
                  className="w-full h-24 bg-muted/20 border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 border-t border-border pt-4">
              <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setSelectedPdvReport(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={submitReport} className="bg-primary text-primary-foreground font-semibold hover:bg-primary/95 cursor-pointer">
                Enviar Reporte
              </Button>
            </div>
          </div>
        </div>
      )}

      {reportSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-medium text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-350">
          <Check className="h-4 w-4 shrink-0" />
          <span>{reportSuccessMsg}</span>
          <button onClick={() => setReportSuccessMsg('')} className="ml-2 font-bold hover:opacity-80 text-white cursor-pointer">×</button>
        </div>
      )}

      {/* ─── PDV Create / Edit Modal ─── Premium Design ─────────────── */}
      <Dialog open={isPdvModalOpen} onOpenChange={setIsPdvModalOpen}>
        <DialogContent className="sm:max-w-[540px] p-0 gap-0 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden">

          {/* Header */}
          <div className={`px-6 pt-6 pb-5 border-b border-border ${editPdvData ? 'bg-blue-600/5 dark:bg-blue-600/10' : 'bg-emerald-600/5 dark:bg-emerald-600/10'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner ${editPdvData ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-foreground leading-tight">
                    {editPdvData ? 'Editar Punto de Venta' : 'Nuevo Punto de Venta'}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editPdvData
                      ? `Modificando: ${editPdvData.nombre ?? editPdvData.name ?? editPdvData.id}`
                      : 'Registrar un nuevo PDV en el directorio logístico'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost" size="icon"
                onClick={() => setIsPdvModalOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer -mt-1 -mr-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-muted-foreground" /> Nombre Comercial
              </Label>
              <Input
                value={pdvFormData.name}
                onChange={e => setPdvFormData({ ...pdvFormData, name: e.target.value })}
                className="h-10 bg-background border-border rounded-xl text-sm"
                placeholder="Ej. Supermercado Ketal Centro"
              />
            </div>

            {/* Clasificación + Ciudad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Clasificación
                </Label>
                <Select value={pdvFormData.category} onValueChange={v => setPdvFormData({ ...pdvFormData, category: v })}>
                  <SelectTrigger className="h-10 bg-background border-border rounded-xl text-sm cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARETO">🔴 Pareto</SelectItem>
                    <SelectItem value="MAYORISTA">🟡 Mayorista</SelectItem>
                    <SelectItem value="DETALLISTA">🟢 Detallista</SelectItem>
                    <SelectItem value="MINORISTA">🔵 Minorista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Ciudad / Mercado
                </Label>
                <Select disabled value={pdvFormData.market} onValueChange={v => setPdvFormData({ ...pdvFormData, market: v })}>
                  <SelectTrigger className="h-10 bg-background border-border rounded-xl text-sm cursor-pointer disabled:opacity-70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Santa Cruz">Santa Cruz</SelectItem>
                    <SelectItem value="Cochabamba">Cochabamba</SelectItem>
                    <SelectItem value="La Paz">La Paz</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Se calcula automáticamente por longitud</p>
              </div>
            </div>

            {/* Coordenadas */}
            <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-muted-foreground" /> Coordenadas GPS (WGS84)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Latitud</Label>
                  <Input
                    type="number" step="0.000001"
                    value={pdvFormData.latitude}
                    onChange={e => setPdvFormData({ ...pdvFormData, latitude: e.target.value })}
                    className="h-9 bg-background border-border rounded-lg text-xs font-mono"
                    placeholder="-17.7862"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Longitud</Label>
                  <Input
                    type="number" step="0.000001"
                    value={pdvFormData.longitude}
                    onChange={e => setPdvFormData({ ...pdvFormData, longitude: e.target.value })}
                    className="h-9 bg-background border-border rounded-lg text-xs font-mono"
                    placeholder="-63.1812"
                  />
                </div>
              </div>
            </div>

            {/* Duración */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Tiempo de Auditoría (minutos)
              </Label>
              <Input
                type="number"
                value={pdvFormData.base_duration_minutes}
                onChange={e => setPdvFormData({ ...pdvFormData, base_duration_minutes: e.target.value })}
                className="h-10 bg-background border-border rounded-xl text-sm"
                placeholder="30"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setIsPdvModalOpen(false)}
              className="rounded-xl font-semibold border-border hover:bg-muted cursor-pointer h-10 px-5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSavePdv}
              disabled={isSavingPdv || !pdvFormData.name || !pdvFormData.latitude || !pdvFormData.longitude}
              className={`h-10 px-6 rounded-xl font-bold text-white shadow-md cursor-pointer transition-all ${
                editPdvData
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSavingPdv ? 'Guardando...' : editPdvData ? 'Guardar Cambios' : 'Crear PDV'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
