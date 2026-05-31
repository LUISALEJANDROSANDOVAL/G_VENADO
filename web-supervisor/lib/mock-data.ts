// Mock data types and generators
export type ClientType = 'Pareto' | 'Mayorista' | 'Detallista'
export type MicroTask = 'Limpieza' | 'Bandeo' | 'POP'
export type RouteType = 'Urbana' | 'Rural' | 'Carretera'
export type WorkerStatus = 'En PDV Pareto' | 'En Trayecto' | 'Retrasado' | 'Completado'

export type WeekDay = 'LUN' | 'MAR' | 'MIÉ' | 'JUE' | 'VIE' | 'SÁB'

export interface PDV {
  id: string
  nombre: string
  type: ClientType
  lat: number
  lng: number
  lastVisit?: string
  visited: boolean
  availableDays: WeekDay[]
  city?: string
}

export interface Reponedor {
  id: string
  dbUuid?: string
  name: string
  route: RouteType
  status: WorkerStatus
  currentPDV?: string
  sequence?: string[]
  lat?: number
  lng?: number
  routeProgress: number
  delay: number
  activeOrders: number
  city?: string
}

export interface KPIData {
  coverageRate: number
  timeDeviation: number
  activeWorkers: number
  totalWorkers: number
  criticalAlerts: number
}

export interface AnalyticsData {
  effectiveMinutes: Array<{
    microTask: MicroTask
    Pareto: number
    Mayorista: number
    Detallista: number
  }>
  routeCompliance: Array<{
    time: string
    onTime: number
    delayed: number
  }>
}

export interface RouteOptData {
  overloaded: Array<{
    id: string
    name: string
    delay: number
    reason: string
  }>
  pendingRisk: Array<{
    id: string
    name: string
    location: string
    assignedWorker: string
    priority: 'Alta' | 'Media' | 'Baja'
  }>
}

// Generators
export const generatePDVs = (count: number = 150): PDV[] => {
  const names = [
    'Bodega Central', 'Supermercado Norte', 'Tienda Rural', 'Mini Mercado Centro',
    'Almacén Sur', 'Drogería Premium', 'Autoservicio Este', 'Comercio Mayorista',
    'Punto de Venta Premium', 'Distribuidora Local',
  ]

  const pdvs: PDV[] = []
  for (let i = 0; i < count; i++) {
    const types: ClientType[] = ['Pareto', 'Mayorista', 'Detallista']
    
    let city = 'Cochabamba'
    let lat = -17.3895
    let lng = -66.1568
    
    if (i % 3 === 1) {
      city = 'Santa Cruz'
      lat = -17.7862
      lng = -63.1812
    } else if (i % 3 === 2) {
      city = 'La Paz'
      lat = -16.5000
      lng = -68.1500
    }

    pdvs.push({
      id: `PDV-${String(i + 1).padStart(4, '0')}`,
      nombre: `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      lat: lat + (Math.random() - 0.5) * 0.08,
      lng: lng + (Math.random() - 0.5) * 0.08,
      visited: Math.random() > 0.3,
      lastVisit: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : undefined,
      availableDays: ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'],
      city
    })
  }
  return pdvs
}

export const generateReponedores = (count: number = 12): Reponedor[] => {
  const names = [
    'Carlos Méndez', 'Ana García', 'José Torres', 'María López',
    'Roberto Sánchez', 'Elena Rodríguez', 'Miguel Hernández', 'Laura Martínez',
    'David Pérez', 'Sofía Díaz', 'Juan Moreno', 'Carmen Ruiz',
  ]

  const statuses: WorkerStatus[] = ['En PDV Pareto', 'En Trayecto', 'Retrasado', 'Completado']

  const reponedores: Reponedor[] = []
  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const mockId = `REP-${String(i + 1).padStart(3, '0')}`
    const workerCity = ['Cochabamba', 'Santa Cruz', 'La Paz'][i % 3]
    
    const sequence: string[] = []
    const sequenceLength = 6 + (i % 3)
    
    const cityPdvsIndices: number[] = []
    for (let pIdx = 0; pIdx < 150; pIdx++) {
      if (pIdx % 3 === i % 3) {
        cityPdvsIndices.push(pIdx + 1)
      }
    }

    for (let j = 0; j < sequenceLength; j++) {
      const pdvIdx = cityPdvsIndices[(Math.floor(i / 3) * 8 + j) % cityPdvsIndices.length]
      sequence.push(`PDV-${String(pdvIdx).padStart(4, '0')}`)
    }

    const currentPdvId = sequence[Math.floor(Math.random() * sequence.length)]
    
    const cityCoords = {
      'Cochabamba': { lat: -17.3895, lng: -66.1568 },
      'Santa Cruz': { lat: -17.7862, lng: -63.1812 },
      'La Paz': { lat: -16.5000, lng: -68.1500 }
    }
    const coords = cityCoords[workerCity as keyof typeof cityCoords] || cityCoords['Santa Cruz']
    const lat = coords.lat + (i * 0.005)
    const lng = coords.lng + (i * 0.005)

    reponedores.push({
      id: mockId,
      dbUuid: mockId,
      name: names[i % names.length],
      route: ['Urbana', 'Rural', 'Carretera'][i % 3] as RouteType,
      status,
      currentPDV: currentPdvId,
      sequence,
      lat,
      lng,
      routeProgress: Math.random() * 100,
      delay: status === 'Retrasado' ? Math.floor(Math.random() * 90) + 15 : Math.random() * 15,
      activeOrders: Math.floor(Math.random() * 8) + 1,
      city: workerCity
    })
  }
  return reponedores
}

export const generateKPIData = (): KPIData => {
  return {
    coverageRate: 87 + Math.random() * 10,
    timeDeviation: 8 + Math.random() * 12,
    activeWorkers: 11,
    totalWorkers: 12,
    criticalAlerts: Math.floor(Math.random() * 4) + 1,
  }
}

export const generateAnalyticsData = (): AnalyticsData => {
  return {
    effectiveMinutes: [
      { microTask: 'Limpieza', Pareto: 240, Mayorista: 180, Detallista: 120 },
      { microTask: 'Bandeo', Pareto: 300, Mayorista: 200, Detallista: 140 },
      { microTask: 'POP', Pareto: 180, Mayorista: 140, Detallista: 90 },
    ],
    routeCompliance: [
      { time: '06:00', onTime: 12, delayed: 0 },
      { time: '09:00', onTime: 11, delayed: 1 },
      { time: '12:00', onTime: 10, delayed: 2 },
      { time: '15:00', onTime: 9, delayed: 3 },
      { time: '18:00', onTime: 8, delayed: 4 },
      { time: '21:00', onTime: 7, delayed: 5 },
    ],
  }
}

export const generateRouteOptData = (): RouteOptData => {
  return {
    overloaded: [
      { id: 'REP-001', name: 'Carlos Méndez', delay: 45, reason: 'Retrasado por checklist complejo en Cliente Pareto' },
      { id: 'REP-003', name: 'José Torres', delay: 32, reason: 'Tráfico intenso en ruta principal' },
    ],
    pendingRisk: [
      { id: 'PDV-0087', name: 'Bodega Sur', location: 'La Boca', assignedWorker: 'Maria López', priority: 'Alta' },
      { id: 'PDV-0132', name: 'Supermercado Este', location: 'Flores', assignedWorker: 'Sin asignar', priority: 'Alta' },
      { id: 'PDV-0045', name: 'Mini Market Centro', location: 'San Telmo', assignedWorker: 'David Pérez', priority: 'Media' },
    ],
  }
}
