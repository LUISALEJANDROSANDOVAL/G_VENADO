'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, ShieldAlert, Users, Search, UserCheck } from 'lucide-react'
import { adminCreateUser, adminUpdateUser, deactivateWorker } from '@/app/actions'

interface AdminUsersTabProps {
  users: any[]
  onRefresh: () => void
  currentUserEmail?: string
}

export function AdminUsersTab({ users, onRefresh, currentUserEmail }: AdminUsersTabProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // User CRUD modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'REPONEDOR',
    departamento: '',
    is_active: true
  })
  const [isSubmittingUser, setIsSubmittingUser] = useState(false)

  // Filtered users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && user.is_active !== false) || 
                          (filterStatus === 'inactive' && user.is_active === false)
    return matchesSearch && matchesRole && matchesStatus
  })

  // Handle User Modal open/close
  const handleOpenUserModal = (user?: any) => {
    if (user) {
      setEditUser(user)
      setUserFormData({
        name: user.name,
        email: user.email,
        role: user.role || 'REPONEDOR',
        departamento: user.departamento || '',
        is_active: user.is_active !== false
      })
    } else {
      setEditUser(null)
      setUserFormData({
        name: '',
        email: '',
        role: 'REPONEDOR',
        departamento: '',
        is_active: true
      })
    }
    setIsUserModalOpen(true)
  }

  // Handle User Save (Create/Update)
  const handleSaveUser = async () => {
    if (!userFormData.name || !userFormData.email) {
      toast({
        variant: "destructive",
        title: "Campos vacíos",
        description: "Por favor complete el nombre y correo electrónico.",
      })
      return
    }

    setIsSubmittingUser(true)
    let res;
    if (editUser) {
      res = await adminUpdateUser(editUser.id, userFormData)
    } else {
      res = await adminCreateUser(userFormData)
    }
    setIsSubmittingUser(false)

    if (res.error) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: res.error,
      })
    } else {
      toast({
        title: "Registro guardado",
        description: editUser ? "El usuario ha sido actualizado correctamente." : "El usuario ha sido registrado.",
      })
      setIsUserModalOpen(false)
      onRefresh()
    }
  }

  // Handle User Deactivation
  const handleDeactivateUser = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro que desea dar de baja a ${name}?`)) return
    
    const res = await deactivateWorker(id)
    if (res.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.error,
      })
    } else {
      toast({
        title: "Usuario dado de baja",
        description: "El estado del usuario se ha cambiado a inactivo.",
      })
      onRefresh()
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Directorio de Usuarios y Roles</h2>
          <p className="text-sm text-slate-500 mt-1">
            Crea, edita y da de baja usuarios con acceso a la aplicación móvil o paneles web de supervisión.
          </p>
        </div>
        <Button onClick={() => handleOpenUserModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all self-start md:self-auto">
          <Plus className="h-4 w-4" /> Crear Usuario
        </Button>
      </div>

      {/* Filters block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white dark:bg-[#092140]/30 border-slate-200 dark:border-slate-800 rounded-xl w-full"
          />
        </div>

        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="bg-white dark:bg-[#092140]/30 border-slate-200 dark:border-slate-800 rounded-xl">
            <SelectValue placeholder="Filtrar por Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="REPONEDOR">REPONEDOR</SelectItem>
            <SelectItem value="SUPERVISOR">SUPERVISOR</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-white dark:bg-[#092140]/30 border-slate-200 dark:border-slate-800 rounded-xl">
            <SelectValue placeholder="Filtrar por Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table Card */}
      <Card className="border-slate-200 shadow-sm dark:bg-slate-900/30 dark:border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/40">
              <TableRow className="border-slate-200 dark:border-slate-800">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3.5 pl-6">Nombre</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3.5">Correo Institucional</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3.5">Departamento</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3.5">Rol asignado</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3.5 text-center">Estado</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3.5 text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-slate-200 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                  <TableCell className="py-4 pl-6 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-600 dark:text-slate-300">
                      {user.name.substring(0, 2)}
                    </div>
                    <span>{user.name}</span>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600 dark:text-slate-400 font-medium">{user.email}</TableCell>
                  <TableCell className="py-4">
                    <span className="text-xs text-slate-500 font-semibold">{user.departamento || 'N/A'}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge className={`font-extrabold text-[10px] px-2 py-0.5 border-none uppercase ${
                      user.role === 'ADMIN' 
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' 
                        : user.role === 'SUPERVISOR' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <Badge className={`font-extrabold text-[9px] px-2 border-none ${
                      user.is_active !== false 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-slate-300/10 text-slate-500'
                    }`}>
                      {user.is_active !== false ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-right pr-6 space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenUserModal(user)} className="h-8 w-8 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {user.is_active !== false && user.email !== currentUserEmail && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeactivateUser(user.id, user.name)} className="h-8 w-8 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer" title="Inactivar">
                        <ShieldAlert className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    No se encontraron usuarios coincidentes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Create/Edit Dialog Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-[#092140] border-slate-200 dark:border-slate-850 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              {editUser ? 'Editar Registro de Usuario' : 'Registrar Nuevo Usuario'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="user-name" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nombre Completo</label>
              <Input 
                id="user-name" 
                placeholder="Ej. Carlos Ayala" 
                value={userFormData.name} 
                onChange={e => setUserFormData({ ...userFormData, name: e.target.value })} 
                className="w-full bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="user-email" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
              <Input 
                id="user-email" 
                type="email"
                placeholder="usuario@gmail.com" 
                value={userFormData.email} 
                onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} 
                className="w-full bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="user-role" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Rol de Acceso</label>
                <Select 
                  value={userFormData.role} 
                  onValueChange={val => setUserFormData({ ...userFormData, role: val })}
                >
                  <SelectTrigger id="user-role" className="bg-slate-50 border-slate-200 rounded-xl">
                    <SelectValue placeholder="Seleccione Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REPONEDOR">REPONEDOR</SelectItem>
                    <SelectItem value="SUPERVISOR">SUPERVISOR</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="user-dept" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Departamento</label>
                <Input 
                  id="user-dept" 
                  placeholder="Ej. Santa Cruz" 
                  value={userFormData.departamento} 
                  onChange={e => setUserFormData({ ...userFormData, departamento: e.target.value })} 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {editUser && (
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="user-status" 
                  checked={userFormData.is_active} 
                  onChange={e => setUserFormData({...userFormData, is_active: e.target.checked})}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <label htmlFor="user-status" className="text-sm font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  Usuario Activo (Permitir Acceso)
                </label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)} className="rounded-xl font-semibold border-slate-200 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={isSubmittingUser} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 rounded-xl shadow-md">
              {isSubmittingUser ? 'Guardando...' : 'Guardar Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
