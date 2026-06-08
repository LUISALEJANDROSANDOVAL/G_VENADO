import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Search, Filter, Maximize2, ShieldCheck, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { updateQaStatus } from '@/app/actions'

interface SupervisorQATabProps {
  photoEvidences: any[]
}

export function SupervisorQATab({ photoEvidences = [] }: SupervisorQATabProps) {
  const [filter, setFilter] = useState('Pendientes')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionedIds, setActionedIds] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  // Map backend data to UI expectations
  const mappedPhotos = photoEvidences.map(photo => {
    const timeStr = new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return {
      id: photo.id,
      reponedorName: photo.reponedorName,
      pdvName: photo.pdvName,
      category: photo.taskName,
      url: photo.afterUrl || photo.beforeUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
      status: actionedIds[photo.id] || photo.qa_status || 'Pendientes',
      time: timeStr
    }
  })

  // Filter the photos
  const filteredPhotos = mappedPhotos.filter(photo => {
    const matchesFilter = filter === 'Todas' ? true : photo.status === filter
    const matchesSearch = !searchTerm || 
      photo.reponedorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.pdvName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aprobado': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Rechazado': return 'bg-rose-100 text-rose-800 border-rose-200'
      default: return 'bg-amber-100 text-amber-800 border-amber-200'
    }
  }

  const handleAction = async (id: string, action: 'Aprobado' | 'Rechazado') => {
    // Optimistic UI update
    setActionedIds(prev => ({ ...prev, [id]: action }))
    
    startTransition(async () => {
      const res = await updateQaStatus(id, action)
      if (res?.error) {
        // Revert on error
        setActionedIds(prev => {
          const newIds = { ...prev }
          delete newIds[id]
          return newIds
        })
        toast({
          title: "Error de conexión",
          description: "No se pudo guardar el cambio en la base de datos.",
          variant: "destructive"
        })
      } else {
        toast({
          title: `Evidencia ${action}`,
          description: `La foto ha sido marcada como ${action.toLowerCase()} en el sistema.`,
          variant: action === 'Aprobado' ? 'default' : 'destructive'
        })
      }
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Centro de Calidad (Media QA)</h2>
          <p className="text-muted-foreground text-sm">Aprueba o rechaza las evidencias fotográficas enviadas por los reponedores en tiempo real.</p>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por PDV o Reponedor..."
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              {['Pendientes', 'Aprobado', 'Rechazado', 'Todas'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 whitespace-nowrap rounded-full text-xs font-medium transition-colors ${
                    filter === f 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="text-center py-16 px-4">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Sin evidencias</h3>
              <p className="text-muted-foreground text-sm">No se encontraron fotos que coincidan con los filtros actuales.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Evidencia ${photo.pdvName}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <button className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      <Badge className="bg-black/50 text-white backdrop-blur-md border-none font-medium">
                        {photo.category}
                      </Badge>
                      <Badge className={`backdrop-blur-md border ${getStatusColor(photo.status)}`}>
                        {photo.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="p-4">
                    <h4 className="font-bold text-base mb-1 line-clamp-1">{photo.pdvName}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                        {photo.reponedorName}
                      </span>
                      <span>{photo.time}</span>
                    </div>

                    {/* Action Buttons */}
                    {photo.status === 'Pendientes' && (
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAction(photo.id, 'Rechazado')}
                          className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleAction(photo.id, 'Aprobado')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Aprobar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
