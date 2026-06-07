'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Camera, ShieldAlert, Award, FileCheck2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function AdminMediaTab() {
  const { toast } = useToast()
  const [photos, setPhotos] = useState<any[]>([
    { id: 1, reponedor: 'Carlos Méndez', pdv: 'Supermercado Fidalga Norte', task: 'Limpieza de Góndolas', img: '/photo_evidence_1.jpg', status: 'pending', time: 'Hace 15 minutos' },
    { id: 2, reponedor: 'Ana García', pdv: 'Hipermaxi Doble Vía', task: 'Bandeo y Acomodo', img: '/photo_evidence_2.jpg', status: 'pending', time: 'Hace 45 minutos' },
    { id: 3, reponedor: 'José Torres', pdv: 'Mercado Abasto Florida', task: 'Colocación Material POP', img: '/photo_evidence_3.jpg', status: 'approved', time: 'Hace 2 horas' },
    { id: 4, reponedor: 'María López', pdv: 'Tienda G-Venado Central', task: 'Bandeo y Acomodo', img: '/photo_evidence_4.jpg', status: 'rejected', time: 'Hace 4 horas' }
  ])

  const handleApprove = (id: number, name: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p))
    toast({
      title: "Evidencia Aprobada",
      description: `La fotografía de ${name} ha sido aprobada y archivada.`,
    })
  }

  const handleReject = (id: number, name: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p))
    toast({
      variant: "destructive",
      title: "Evidencia Rechazada",
      description: `La fotografía de ${name} ha sido rechazada. Se notificó al reponedor.`,
    })
  }

  const pendingCount = photos.filter(p => p.status === 'pending').length
  const approvedCount = photos.filter(p => p.status === 'approved').length
  const rejectedCount = photos.filter(p => p.status === 'rejected').length

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Media QA Center & Evidencias</h2>
          <p className="text-sm text-slate-500 mt-1">
            Revisa y audita el material fotográfico cargado por el personal de campo en tiempo real.
          </p>
        </div>
      </div>

      {/* KPI Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendientes de QA</span>
              <h3 className="text-2xl font-black text-amber-500">{pendingCount}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Camera className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aprobadas</span>
              <h3 className="text-2xl font-black text-emerald-500">{approvedCount}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rechazadas</span>
              <h3 className="text-2xl font-black text-rose-500">{rejectedCount}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {photos.map(photo => (
          <Card key={photo.id} className={`border shadow-sm overflow-hidden flex flex-col justify-between transition-all ${
            photo.status === 'approved' 
              ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' 
              : photo.status === 'rejected' 
                ? 'border-rose-500/30 ring-1 ring-rose-500/20' 
                : 'border-slate-200 dark:border-slate-800'
          }`}>
            <div className="relative aspect-square bg-slate-900 flex items-center justify-center">
              {/* Fallback image display using CSS pattern because generated images might not exist */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 to-slate-900 flex flex-col items-center justify-center p-4">
                <Camera className="h-10 w-10 text-slate-700 mb-2" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">{photo.task}</span>
                <span className="text-[9px] text-slate-600 font-mono mt-1 text-center">{photo.pdv}</span>
              </div>
              
              {/* Badge for status */}
              <div className="absolute top-3 right-3">
                <Badge className={`font-extrabold text-[9px] border-none px-2 py-0.5 uppercase ${
                  photo.status === 'approved' 
                    ? 'bg-emerald-500 text-white' 
                    : photo.status === 'rejected' 
                      ? 'bg-rose-500 text-white' 
                      : 'bg-amber-500 text-white'
                }`}>
                  {photo.status === 'approved' ? 'Aprobada' : photo.status === 'rejected' ? 'Rechazada' : 'Pendiente QA'}
                </Badge>
              </div>
            </div>

            <div className="p-4 space-y-3 bg-white dark:bg-slate-900/60">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{photo.reponedor}</h4>
                <p className="text-[10px] text-slate-400 font-semibold">{photo.time}</p>
              </div>

              {photo.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <Button 
                    onClick={() => handleApprove(photo.id, photo.reponedor)} 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 gap-1.5 rounded-lg cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" /> Aprobar
                  </Button>
                  <Button 
                    onClick={() => handleReject(photo.id, photo.reponedor)} 
                    variant="outline"
                    className="flex-1 border-rose-250 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold h-8 gap-1.5 rounded-lg cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" /> Rechazar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
