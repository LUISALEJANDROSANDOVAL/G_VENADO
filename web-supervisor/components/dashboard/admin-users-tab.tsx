'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Pencil, ShieldOff, Search,
  User, Mail, Building2, ShieldCheck, X,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { adminCreateUser, adminUpdateUser, deactivateWorker } from '@/app/actions'

interface AdminUsersTabProps {
  users: any[]
  onRefresh: () => void
  currentUserEmail?: string
}

// Role badge color map
const ROLE_COLORS: Record<string, string> = {
  ADMIN:      'bg-rose-100   text-rose-700   dark:bg-rose-950/50   dark:text-rose-300',
  SUPERVISOR: 'bg-blue-100   text-blue-700   dark:bg-blue-950/50   dark:text-blue-300',
  REPONEDOR:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
}

// Avatar background color map
const AVATAR_COLORS: Record<string, string> = {
  ADMIN:      'bg-rose-500',
  SUPERVISOR: 'bg-blue-600',
  REPONEDOR:  'bg-emerald-600',
}

const DEPARTMENTS = [
  'Sistemas', 'Operaciones', 'Logística',
  'Ventas', 'Administración', 'Campo',
]

export function AdminUsersTab({ users, onRefresh, currentUserEmail }: AdminUsersTabProps) {
  const { toast } = useToast()

  // Filters
  const [searchTerm,    setSearchTerm]    = useState('')
  const [filterRole,    setFilterRole]    = useState('all')
  const [filterStatus,  setFilterStatus]  = useState('all')

  // Modal states
  const [isModalOpen,   setIsModalOpen]   = useState(false)
  const [editUser,      setEditUser]      = useState<any>(null)
  const [isSaving,      setIsSaving]      = useState(false)
  const [formData,      setFormData]      = useState({
    name: '', email: '', role: 'REPONEDOR', departamento: '', is_active: true,
  })

  // ─── Filtered & sorted users ───────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        const q = searchTerm.toLowerCase()
        const matchSearch  = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
        const matchRole    = filterRole   === 'all' || u.role === filterRole
        const matchStatus  = filterStatus === 'all'
          || (filterStatus === 'active'   &&  u.is_active !== false)
          || (filterStatus === 'inactive' &&  u.is_active === false)
        return matchSearch && matchRole && matchStatus
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }, [users, searchTerm, filterRole, filterStatus])

  // ─── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditUser(null)
    setFormData({ name: '', email: '', role: 'REPONEDOR', departamento: '', is_active: true })
    setIsModalOpen(true)
  }

  const openEdit = (user: any) => {
    setEditUser(user)
    setFormData({
      name:         user.name        || '',
      email:        user.email       || '',
      role:         user.role        || 'REPONEDOR',
      departamento: user.departamento || '',
      is_active:    user.is_active   !== false,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Nombre y correo son obligatorios.' })
      return
    }
    setIsSaving(true)
    const res = editUser
      ? await adminUpdateUser(editUser.id, formData)
      : await adminCreateUser(formData)
    setIsSaving(false)

    if (res?.error) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: res.error })
    } else {
      toast({ title: editUser ? 'Usuario actualizado' : 'Usuario creado', description: 'Los cambios se guardaron correctamente.' })
      setIsModalOpen(false)
      onRefresh()
    }
  }

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro que desea dar de baja a ${name}?`)) return
    const res = await deactivateWorker(id)
    if (res?.error) {
      toast({ variant: 'destructive', title: 'Error', description: res.error })
    } else {
      toast({ title: 'Usuario dado de baja', description: 'El estado del usuario se cambió a inactivo.' })
      onRefresh()
    }
  }

  const patch = (key: string, val: any) => setFormData(prev => ({ ...prev, [key]: val }))

  // ─── Avatar initials helper ────────────────────────────────────────────────
  const getInitials = (name: string) => name?.trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??'

  return (
    <div className="space-y-5 animate-in fade-in duration-200">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Directorio de Usuarios y Roles
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crea, edita y da de baja usuarios con acceso a la aplicación móvil o paneles web de supervisión.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold px-5 h-10 rounded-xl shadow-md cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          Crear Usuario
        </Button>
      </div>

      {/* ── Filters Row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search — takes all available space */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-background border-border rounded-xl w-full"
          />
        </div>

        {/* Role filter */}
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-background border-border rounded-xl font-semibold text-sm cursor-pointer">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="REPONEDOR">Reponedor</SelectItem>
            <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48 h-10 bg-background border-border rounded-xl font-semibold text-sm cursor-pointer">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Count label ─────────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground font-semibold -mt-2">
        Mostrando {filteredUsers.length} de {users.length} usuarios registrados
      </p>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-border hover:bg-muted/40">
              <TableHead className="pl-6 py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[30%]">Nombre</TableHead>
              <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[25%]">Correo Institucional</TableHead>
              <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[15%]">Departamento</TableHead>
              <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[12%]">Rol asignado</TableHead>
              <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[10%] text-center">Estado</TableHead>
              <TableHead className="py-3.5 pr-6 font-bold text-xs uppercase tracking-wider text-muted-foreground w-[8%] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow
                key={user.id}
                className="border-border group hover:bg-muted/30 hover:translate-x-1 transition-all duration-300 cursor-default"
              >
                {/* Nombre + avatar */}
                <TableCell className="pl-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 ${AVATAR_COLORS[user.role] ?? 'bg-slate-500'}`}>
                      {getInitials(user.name)}
                    </div>
                    <span className="font-semibold text-sm text-foreground">{user.name}</span>
                  </div>
                </TableCell>

                {/* Email */}
                <TableCell className="py-3.5 text-sm text-muted-foreground font-medium">
                  {user.email}
                </TableCell>

                {/* Departamento */}
                <TableCell className="py-3.5">
                  <span className="text-xs text-muted-foreground font-semibold">
                    {user.departamento || 'N/A'}
                  </span>
                </TableCell>

                {/* Rol */}
                <TableCell className="py-3.5">
                  <Badge className={`font-extrabold text-[10px] px-2.5 py-0.5 border-none uppercase tracking-wide ${ROLE_COLORS[user.role] ?? ''}`}>
                    {user.role}
                  </Badge>
                </TableCell>

                {/* Estado */}
                <TableCell className="py-3.5 text-center">
                  <Badge className={`font-bold text-[10px] px-2.5 py-0.5 border-none ${
                    user.is_active !== false
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200/50 text-slate-400 dark:bg-slate-800/50'
                  }`}>
                    {user.is_active !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>

                {/* Acciones */}
                <TableCell className="py-3.5 pr-6 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => openEdit(user)}
                      title="Editar usuario"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {user.is_active !== false && user.email !== currentUserEmail && (
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleDeactivate(user.id, user.name)}
                        title="Dar de baja"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <User className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm font-semibold">No se encontraron usuarios</p>
                    <p className="text-xs">Intenta ajustar los filtros o crear un nuevo usuario</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL: Create / Edit User — Premium Design
      ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden">

          {/* Header */}
          <div className={`px-6 pt-6 pb-5 border-b border-border ${editUser ? 'bg-blue-600/5 dark:bg-blue-600/10' : 'bg-emerald-600/5 dark:bg-emerald-600/10'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar preview */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-inner ${AVATAR_COLORS[formData.role] ?? 'bg-slate-500'}`}>
                  {formData.name ? getInitials(formData.name) : '??'}
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-foreground leading-tight">
                    {editUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editUser
                      ? `Modificando registro de ${editUser.name}`
                      : 'Complete los datos para registrar el usuario'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost" size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer -mt-1 -mr-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3 w-3" /> Nombre Completo
              </Label>
              <Input
                id="modal-name"
                placeholder="Ej. Carlos Ayala Paniagua"
                value={formData.name}
                onChange={e => patch('name', e.target.value)}
                className="h-10 bg-background border-border rounded-xl text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Correo Electrónico
              </Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="usuario@venado.com"
                value={formData.email}
                onChange={e => patch('email', e.target.value)}
                disabled={!!editUser}
                className="h-10 bg-background border-border rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {editUser && (
                <p className="text-[11px] text-muted-foreground">El correo no puede modificarse una vez creado.</p>
              )}
            </div>

            {/* Rol + Departamento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="modal-role" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" /> Rol de Acceso
                </Label>
                <Select value={formData.role} onValueChange={val => patch('role', val)}>
                  <SelectTrigger id="modal-role" className="h-10 bg-background border-border rounded-xl text-sm cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REPONEDOR">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Reponedor
                      </div>
                    </SelectItem>
                    <SelectItem value="SUPERVISOR">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        Supervisor
                      </div>
                    </SelectItem>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Role badge preview */}
                <div className="pt-1">
                  <Badge className={`font-extrabold text-[10px] px-2.5 py-1 border-none uppercase ${ROLE_COLORS[formData.role] ?? ''}`}>
                    {formData.role}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-dept" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> Departamento / Ciudad
                </Label>
                <Select
                  value={formData.departamento || '__custom__'}
                  onValueChange={val => patch('departamento', val === '__custom__' ? '' : val)}
                >
                  <SelectTrigger id="modal-dept" className="h-10 bg-background border-border rounded-xl text-sm cursor-pointer">
                    <SelectValue placeholder="Seleccionar ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__custom__">Sin asignar</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="O escribe uno personalizado..."
                  value={formData.departamento}
                  onChange={e => patch('departamento', e.target.value)}
                  className="h-9 bg-background border-border rounded-xl text-xs mt-1"
                />
              </div>
            </div>

            {/* Estado (only on edit) */}
            {editUser && (
              <div className="border border-border rounded-xl p-4 bg-muted/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  {formData.is_active
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                  }
                  Estado del Usuario
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.is_active}
                    onClick={() => patch('is_active', !formData.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      formData.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {formData.is_active ? 'Usuario Activo' : 'Usuario Inactivo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.is_active
                        ? 'Tiene acceso a la aplicación móvil y paneles web'
                        : 'Sin acceso — no puede iniciar sesión'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl font-semibold border-border hover:bg-muted cursor-pointer h-10 px-5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={`h-10 px-6 rounded-xl font-bold text-white shadow-md cursor-pointer transition-all ${
                editUser
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSaving
                ? 'Guardando...'
                : editUser
                  ? 'Guardar Cambios'
                  : 'Crear Usuario'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
