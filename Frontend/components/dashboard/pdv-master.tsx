'use client'

import { useState, useMemo } from 'react'
import { Search, Upload } from 'lucide-react'
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
import type { PDV, ClientType } from '@/lib/mock-data'

interface PDVMasterProps {
  pdvs: PDV[]
}

export function PDVMaster({ pdvs }: PDVMasterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ClientType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'visited' | 'unvisited'>('all')

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

  const typeColor = (type: ClientType) => {
    switch (type) {
      case 'Pareto':
        return 'bg-red-100 text-red-800'
      case 'Mayorista':
        return 'bg-blue-100 text-blue-800'
      case 'Detallista':
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-dashed border-2 border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4 py-8 cursor-pointer hover:bg-muted/30 rounded-lg transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Drop CSV or Excel file here</p>
              <p className="text-sm text-muted-foreground">to update PDV Master data</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as ClientType | 'all')}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Pareto">Pareto</SelectItem>
            <SelectItem value="Mayorista">Mayorista</SelectItem>
            <SelectItem value="Detallista">Detallista</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'visited' | 'unvisited')}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="visited">Visited</SelectItem>
            <SelectItem value="unvisited">Unvisited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>PDV Master Data</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {filteredPDVs.length} of {pdvs.length} PDVs
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-foreground/70">PDV ID</TableHead>
                  <TableHead className="text-foreground/70">Business Name</TableHead>
                  <TableHead className="text-foreground/70">Classification</TableHead>
                  <TableHead className="text-foreground/70">Coordinates</TableHead>
                  <TableHead className="text-foreground/70">Last Visit</TableHead>
                  <TableHead className="text-foreground/70 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPDVs.slice(0, 50).map((pdv) => (
                  <TableRow key={pdv.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm text-foreground/70">{pdv.id}</TableCell>
                    <TableCell className="font-medium text-foreground">{pdv.nombre}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs font-medium ${typeColor(pdv.type)}`}>
                        {pdv.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground/60">
                      {pdv.lat.toFixed(5)}, {pdv.lng.toFixed(5)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/60">
                      {pdv.lastVisit ? new Date(pdv.lastVisit).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={pdv.visited ? 'secondary' : 'outline'} className="text-xs">
                        {pdv.visited ? 'Visited' : 'Unvisited'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredPDVs.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No PDVs match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
