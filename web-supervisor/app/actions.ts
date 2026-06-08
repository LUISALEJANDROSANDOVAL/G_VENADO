'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://myoorvexgxgdrpllbtru.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'

// Create an admin client that bypasses RLS policies
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function checkDatabaseEmpty() {
  try {
    const { count, error } = await supabaseAdmin
      .from('points_of_sale')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error checking database status:', error)
      return { error: error.message }
    }

    return { isEmpty: count === 0 }
  } catch (e: any) {
    return { error: e.message || 'Error de conexión' }
  }
}

export async function seedDatabase() {
  console.log('Starting database seeding...')
  try {
    // 1. Clean existing data
    await supabaseAdmin.from('task_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('reponedor_routes_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('daily_routes_plan').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('users').delete().neq('role', 'SUPERVISOR')
    await supabaseAdmin.from('points_of_sale').delete().neq('id', 'DUMMY')
    await supabaseAdmin.from('micro_tasks').delete().neq('id', -1)

    // 2. Insert Supervisor (if not exists)
    const { data: existingSuper } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'supervisor@venado.com')
      .single()

    if (!existingSuper) {
      await supabaseAdmin.from('users').insert({
        name: 'Supervisor General',
        email: 'supervisor@venado.com',
        role: 'SUPERVISOR',
        is_active: true
      })
    }

    // 3. Insert Reponedores
    const reponedoresData = [
      { name: 'Carlos Méndez', email: 'carlos@venado.com' },
      { name: 'Ana García', email: 'ana@venado.com' },
      { name: 'José Torres', email: 'jose@venado.com' },
      { name: 'María López', email: 'maria@venado.com' },
      { name: 'Roberto Sánchez', email: 'roberto@venado.com' },
      { name: 'Elena Rodríguez', email: 'elena@venado.com' },
      { name: 'Miguel Hernández', email: 'miguel@venado.com' },
      { name: 'Laura Martínez', email: 'laura@venado.com' },
      { name: 'David Pérez', email: 'david@venado.com' },
      { name: 'Sofía Díaz', email: 'sofia@venado.com' },
      { name: 'Juan Moreno', email: 'juan@venado.com' },
      { name: 'Carmen Ruiz', email: 'carmen@venado.com' }
    ]

    const { data: insertedWorkers, error: workersError } = await supabaseAdmin
      .from('users')
      .insert(
        reponedoresData.map(w => ({
          name: w.name,
          email: w.email,
          role: 'REPONEDOR',
          is_active: true
        }))
      )
      .select()

    if (workersError) throw new Error('Error inserting workers: ' + workersError.message)

    // 4. Insert Micro Tasks
    const microTasksData = [
      { task_name: 'Limpieza', client_category: 'TODOS' },
      { task_name: 'Bandeo', client_category: 'PARETO' },
      { task_name: 'POP', client_category: 'TODOS' }
    ]

    const { data: insertedTasks, error: tasksError } = await supabaseAdmin
      .from('micro_tasks')
      .insert(microTasksData)
      .select()

    if (tasksError) throw new Error('Error inserting tasks: ' + tasksError.message)

    // 5. Insert Points of Sale (150 PDVs)
    const pdvNames = [
      'Bodega Central', 'Supermercado Norte', 'Tienda Rural', 'Mini Mercado Centro',
      'Almacén Sur', 'Drogería Premium', 'Autoservicio Este', 'Comercio Mayorista',
      'Punto de Venta Premium', 'Distribuidora Local'
    ]
    const categories = ['PARETO', 'MAYORISTA', 'DETALLISTA', 'MINORISTA']

    const pdvsToInsert = []
    for (let i = 0; i < 150; i++) {
      const category = categories[i % categories.length]
      
      // Bolivia cities and coordinates
      let market = 'Cochabamba'
      let lat = -17.3895
      let lng = -66.1568
      
      if (i % 3 === 1) {
        market = 'Santa Cruz'
        lat = -17.7862
        lng = -63.1812
      } else if (i % 3 === 2) {
        market = 'La Paz'
        lat = -16.5000
        lng = -68.1500
      }

      pdvsToInsert.push({
        id: `PDV-${String(i + 1).padStart(4, '0')}`,
        name: `${pdvNames[i % pdvNames.length]} ${Math.floor(i / pdvNames.length) + 1}`,
        market: market,
        category: category,
        latitude: lat + (Math.random() - 0.5) * 0.08,
        longitude: lng + (Math.random() - 0.5) * 0.08,
        base_duration_minutes: 20 + (i % 5) * 10
      })
    }

    const { error: pdvsError } = await supabaseAdmin
      .from('points_of_sale')
      .insert(pdvsToInsert)

    if (pdvsError) throw new Error('Error inserting PDVs: ' + pdvsError.message)

    // 6. Create Daily Route Plans for today for each worker
    const todayStr = new Date().toISOString().split('T')[0]
    
    for (let i = 0; i < insertedWorkers.length; i++) {
      const worker = insertedWorkers[i]
      const workerCity = ['Cochabamba', 'Santa Cruz', 'La Paz'][i % 3]
      const cityPdvs = pdvsToInsert.filter(p => p.market === workerCity)
      
      // Assign 8 random PDVs to this worker from their city
      const workerPdvSequence = []
      for (let j = 0; j < 8; j++) {
        const pdvIndex = (Math.floor(i / 3) * 8 + j) % cityPdvs.length
        workerPdvSequence.push(cityPdvs[pdvIndex].id)
      }

      // Random status
      const statuses = ['ASIGNADA', 'EN_PROCESO', 'COMPLETADA']
      const status = statuses[i % statuses.length]

      const { data: plan, error: planError } = await supabaseAdmin
        .from('daily_routes_plan')
        .insert({
          reponedor_id: worker.id,
          date: todayStr,
          optimized_pos_sequence: workerPdvSequence,
          status: status
        })
        .select()
        .single()

      if (planError) throw new Error('Error creating route plan: ' + planError.message)

      // If status is EN_PROCESO or COMPLETADA, insert some logs (visited PDVs)
      if (status === 'EN_PROCESO' || status === 'COMPLETADA') {
        const visitedCount = status === 'COMPLETADA' ? 8 : 3 + (i % 4) // 3 to 6 visited
        
        for (let j = 0; j < visitedCount; j++) {
          const pdvId = workerPdvSequence[j]
          
          // Add logs for each microtask
          for (const task of insertedTasks) {
            // Only add Pareto task if classification matches
            const pdvObj = pdvsToInsert.find(p => p.id === pdvId)
            if (task.client_category === 'PARETO' && pdvObj?.category !== 'PARETO') {
              continue
            }

            const startTime = new Date()
            startTime.setHours(8 + j, 0, 0)
            const duration = 600 + Math.floor(Math.random() * 900) // 10 to 25 mins
            const endTime = new Date(startTime.getTime() + duration * 1000)

            const photoUrls = [
              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
              'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=600',
              'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=600',
              'https://images.unsplash.com/photo-1583258292688-d0213df4a3a8?auto=format&fit=crop&q=80&w=600'
            ]
            const hasPhoto = (i + j + task.id) % 3 === 0
            const photoUrl = hasPhoto ? photoUrls[(i + j + task.id) % photoUrls.length] : null

            await supabaseAdmin.from('task_logs').insert({
              route_plan_id: plan.id,
              pos_id: pdvId,
              task_id: task.id,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              duration_seconds: duration,
              photo_url: photoUrl,
              is_offline: false
            })
          }
        }

        // Add history
        const startH = new Date()
        startH.setHours(8, 0, 0)
        const endH = new Date()
        endH.setHours(8 + visitedCount, 0, 0)

        await supabaseAdmin.from('reponedor_routes_history').insert({
          route_plan_id: plan.id,
          start_time: startH.toISOString(),
          end_time: endH.toISOString(),
          travel_time_minutes: visitedCount * 15,
          distance_meters: visitedCount * 2500
        })
      }
    }

    console.log('Seeding completed successfully!')
    return { success: true }
  } catch (e: any) {
    console.error('Seeding failed:', e)
    return { error: e.message || 'Error de base de datos' }
  }
}

export async function getDashboardData() {
  try {
    // 1. Fetch data from Supabase
    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'REPONEDOR')
      .eq('is_active', true)

    const { data: pdvs, error: pdvsErr } = await supabaseAdmin
      .from('points_of_sale')
      .select('*')

    const todayStr = new Date().toISOString().split('T')[0]
    const { data: plans, error: plansErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('*')
      .eq('date', todayStr)

    if (usersErr || pdvsErr || plansErr) {
      throw new Error(`Error fetching database records: ${usersErr?.message || pdvsErr?.message || plansErr?.message}`)
    }

    if (!pdvs || pdvs.length === 0 || !users || users.length === 0) {
      return { isEmpty: true }
    }

    // Get all today's plan IDs
    const planIds = plans?.map(p => p.id) || []
    
    // Fetch logs for these plans
    let taskLogs: any[] = []
    if (planIds.length > 0) {
      const { data: logs, error: logsErr } = await supabaseAdmin
        .from('task_logs')
        .select('*')
        .in('route_plan_id', planIds)
      if (logsErr) throw new Error(logsErr.message)
      taskLogs = logs || []
    }

    // Build visited status maps
    const visitedPdvIds = new Set(taskLogs.map(log => log.pos_id))
    const lastVisitMap: Record<string, string> = {}
    taskLogs.forEach(log => {
      if (log.end_time) {
        if (!lastVisitMap[log.pos_id] || new Date(log.end_time) > new Date(lastVisitMap[log.pos_id])) {
          lastVisitMap[log.pos_id] = log.end_time
        }
      }
    })

    // Weekly availability schedule by category — reflects Industrias Venado operational constraints
    // Pareto: Mon–Fri (daily), Mayorista: Mon/Wed/Fri, Detallista: alternates by PDV index
    type WeekDay = 'LUN' | 'MAR' | 'MIÉ' | 'JUE' | 'VIE' | 'SÁB'
    const ALL_DAYS: WeekDay[] = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

    const getAvailableDays = (category: string, pdvId: string): WeekDay[] => {
      // Use a simple hash on the last digits of PDV id to deterministically vary schedules
      const numericSuffix = parseInt(pdvId.replace(/\D/g, '') || '0', 10)
      switch (category) {
        case 'PARETO':
          // Pareto clients require daily coverage Mon–Fri
          return ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE']
        case 'MAYORISTA':
          // Mayoristas: Mon/Wed/Fri or Tue/Thu depending on zone
          return numericSuffix % 2 === 0
            ? ['LUN', 'MIÉ', 'VIE']
            : ['MAR', 'JUE', 'SÁB']
        case 'MINORISTA':
          // Minoristas: twice a week
          return numericSuffix % 3 === 0
            ? ['LUN', 'JUE']
            : numericSuffix % 3 === 1
            ? ['MAR', 'VIE']
            : ['MIÉ', 'SÁB']
        case 'DETALLISTA':
        default:
          // Detallistas: flexible, once or twice per week
          return numericSuffix % 2 === 0 ? ['LUN', 'MIÉ'] : ['MAR', 'VIE']
      }
    }

    // Map PDVs
    const mappedPdvs = pdvs.map(p => {
      const lat = parseFloat(p.latitude as any)
      const lng = parseFloat(p.longitude as any)
      let city = p.market
      
      if (!isNaN(lng)) {
        if (lng < -67) city = 'La Paz'
        else if (lng > -64) city = 'Santa Cruz'
        else city = 'Cochabamba'
      }

      return {
        id: p.id,
        nombre: p.name,
        type: p.category === 'PARETO' ? 'Pareto' : p.category === 'MAYORISTA' ? 'Mayorista' : 'Detallista',
        lat,
        lng,
        visited: visitedPdvIds.has(p.id),
        lastVisit: lastVisitMap[p.id] || undefined,
        availableDays: getAvailableDays(p.category, p.id),
        city
      }
    })

    // Map Reponedores
    const mappedReponedores = users.map((user, idx) => {
      const plan = plans?.find(p => p.reponedor_id === user.id)
      
      const sequence = plan?.optimized_pos_sequence || []
      const sequenceSet = new Set(sequence)
      
      // Count visited sequence points
      const logsForPlan = taskLogs.filter(log => log.route_plan_id === plan?.id)
      const uniqueVisitedInSequence = new Set(
        logsForPlan.filter(log => sequenceSet.has(log.pos_id)).map(log => log.pos_id)
      )

      const visitedCount = uniqueVisitedInSequence.size
      const totalCount = sequence.length

      const routeProgress = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0
      
      // Determine status
      let status: 'En PDV Pareto' | 'En Trayecto' | 'Retrasado' | 'Completado' = 'En Trayecto'
      let delay = 0
      
      if (plan) {
        if (plan.status === 'COMPLETADA') {
          status = 'Completado'
        } else if (plan.status === 'EN_PROCESO') {
          // If they have visited some but not all, and some delay exists
          const isDelayed = idx % 4 === 0 // mock some delay
          if (isDelayed) {
            status = 'Retrasado'
            delay = 30 + (idx * 5)
          } else if (visitedCount > 0) {
            status = 'En PDV Pareto'
          } else {
            status = 'En Trayecto'
          }
        }
      }

      const currentPdvId = sequence[Math.max(0, visitedCount - 1)]
      const currPdv = mappedPdvs.find(p => p.id === currentPdvId)

      let workerCity = ['Cochabamba', 'Santa Cruz', 'La Paz'][idx % 3]
      if (sequence.length > 0) {
        const firstPdv = mappedPdvs.find(p => p.id === sequence[0])
        if (firstPdv?.city) {
          workerCity = firstPdv.city
        }
      }

      const cityCoords = {
        'Cochabamba': { lat: -17.3895, lng: -66.1568 },
        'Santa Cruz': { lat: -17.7862, lng: -63.1812 },
        'La Paz': { lat: -16.5000, lng: -68.1500 }
      }
      const coords = cityCoords[workerCity as keyof typeof cityCoords] || cityCoords['Santa Cruz']

      return {
        id: user.id.substring(0, 8).toUpperCase(), // Short ID
        dbUuid: user.id, // Keep full UUID
        name: user.name,
        route: (['Urbana', 'Rural', 'Carretera'][idx % 3]) as 'Urbana' | 'Rural' | 'Carretera',
        status,
        currentPDV: currentPdvId || undefined,
        sequence, // Keep full today's sequence
        lat: currPdv?.lat || coords.lat + (idx * 0.005),
        lng: currPdv?.lng || coords.lng + (idx * 0.005),
        routeProgress,
        delay,
        activeOrders: Math.max(1, totalCount - visitedCount),
        city: workerCity
      }
    })

    // Compute KPIs
    const totalWorkers = mappedReponedores.length
    const activeWorkers = plans?.filter(p => p.status === 'EN_PROCESO' || p.status === 'COMPLETADA').length || 0
    const criticalAlerts = mappedReponedores.filter(r => r.status === 'Retrasado').length
    
    // Coverage Rate (rutas completadas vs total rutas del dia)
    const totalRoutes = plans?.length || 0
    const completedRoutes = plans?.filter(p => p.status === 'COMPLETADA').length || 0
    const coverageRate = totalRoutes > 0 ? (completedRoutes / totalRoutes) * 100 : 0

    // Average time deviation
    const timeDeviation = criticalAlerts > 0 
      ? mappedReponedores.reduce((acc, r) => acc + r.delay, 0) / criticalAlerts 
      : 5.4

    // Fetch microtasks from DB to map IDs to names
    const { data: microTasks } = await supabaseAdmin
      .from('micro_tasks')
      .select('*')
    const microTasksMap = new Map(microTasks?.map(t => [t.id, t.task_name]) || [])

    // Aggregate real task durations
    const taskDurations: Record<string, Record<string, number>> = {
      'Limpieza': { 'Pareto': 0, 'Mayorista': 0, 'Detallista': 0 },
      'Bandeo': { 'Pareto': 0, 'Mayorista': 0, 'Detallista': 0 },
      'POP': { 'Pareto': 0, 'Mayorista': 0, 'Detallista': 0 }
    }
    const taskCount: Record<string, Record<string, number>> = {
      'Limpieza': { 'Pareto': 0, 'Mayorista': 0, 'Detallista': 0 },
      'Bandeo': { 'Pareto': 0, 'Mayorista': 0, 'Detallista': 0 },
      'POP': { 'Pareto': 0, 'Mayorista': 0, 'Detallista': 0 }
    }

    taskLogs.forEach(log => {
      const taskName = microTasksMap.get(log.task_id)
      const pdv = mappedPdvs.find(p => p.id === log.pos_id)
      if (taskName && pdv && log.duration_seconds) {
        const cat = pdv.type // 'Pareto', 'Mayorista', 'Detallista'
        if (taskDurations[taskName] && taskDurations[taskName][cat] !== undefined) {
          taskDurations[taskName][cat] += log.duration_seconds
          taskCount[taskName][cat] += 1
        }
      }
    })

    const effectiveMinutes = Object.keys(taskDurations).map(taskName => {
      const pCount = taskCount[taskName]['Pareto']
      const mCount = taskCount[taskName]['Mayorista']
      const dCount = taskCount[taskName]['Detallista']

      return {
        microTask: taskName as any,
        Pareto: pCount > 0 ? Math.round((taskDurations[taskName]['Pareto'] / pCount) / 60) : (taskName === 'Limpieza' ? 240 : taskName === 'Bandeo' ? 300 : 180),
        Mayorista: mCount > 0 ? Math.round((taskDurations[taskName]['Mayorista'] / mCount) / 60) : (taskName === 'Limpieza' ? 180 : taskName === 'Bandeo' ? 200 : 140),
        Detallista: dCount > 0 ? Math.round((taskDurations[taskName]['Detallista'] / dCount) / 60) : (taskName === 'Limpieza' ? 120 : taskName === 'Bandeo' ? 140 : 90),
      }
    })

    const routeCompliance = [
      { time: '06:00', onTime: totalWorkers - criticalAlerts, delayed: 0 },
      { time: '09:00', onTime: Math.max(0, totalWorkers - criticalAlerts), delayed: Math.min(criticalAlerts, 1) },
      { time: '12:00', onTime: Math.max(0, totalWorkers - criticalAlerts - 1), delayed: Math.min(criticalAlerts + 1, 3) },
      { time: '15:00', onTime: Math.max(0, totalWorkers - criticalAlerts), delayed: criticalAlerts },
      { time: '18:00', onTime: totalWorkers - criticalAlerts, delayed: Math.max(0, criticalAlerts - 1) },
    ]

    // Extract photo evidences from task logs — supports Antes/Después layout
    // We group by (pos_id + task_id) so the first photo = "before", the second = "after"
    const evidenceGroupMap = new Map<string, any>()
    taskLogs.forEach(log => {
      if (!log.photo_url) return
      const pdv = mappedPdvs.find(p => p.id === log.pos_id)
      const rawPdv = pdvs.find(p => p.id === log.pos_id)
      const taskName = microTasksMap.get(log.task_id) || 'Microtarea'
      const plan = plans?.find(pl => pl.id === log.route_plan_id)
      const worker = mappedReponedores.find(w => w.dbUuid === plan?.reponedor_id)
      const groupKey = `${log.pos_id}-${log.task_id}`

      const formatUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return supabaseAdmin.storage.from('task-evidences').getPublicUrl(url).data.publicUrl;
      }

      if (!evidenceGroupMap.has(groupKey)) {
        evidenceGroupMap.set(groupKey, {
          id: log.id,
          reponedorName: worker?.name || 'Reponedor',
          pdvName: pdv?.nombre || 'PDV General',
          taskName,
          beforeUrl: formatUrl(log.photo_url),
          afterUrl: null,
          lat: rawPdv?.latitude ?? null,
          lng: rawPdv?.longitude ?? null,
          timestamp: log.end_time || log.start_time || new Date().toISOString(),
          qa_status: log.qa_status || 'Pendientes'
        })
      } else {
        // Second photo for the same task/pdv = closing evidence
        evidenceGroupMap.get(groupKey).afterUrl = formatUrl(log.photo_url)
        // Ensure qa_status is taken from the closing log if it exists
        if (log.qa_status) evidenceGroupMap.get(groupKey).qa_status = log.qa_status
      }
    })

    const photoEvidences: any[] = Array.from(evidenceGroupMap.values())

    // Sort by timestamp desc
    photoEvidences.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Feedback loop: compare actual task logs duration vs points_of_sale.base_duration_minutes
    const pdvLogTotals: Record<string, { sum: number, count: number }> = {}
    taskLogs.forEach(log => {
      if (log.pos_id && log.duration_seconds) {
        if (!pdvLogTotals[log.pos_id]) {
          pdvLogTotals[log.pos_id] = { sum: 0, count: 0 }
        }
        pdvLogTotals[log.pos_id].sum += log.duration_seconds
        pdvLogTotals[log.pos_id].count += 1
      }
    })

    const logisticAdjustments: any[] = []
    pdvs.forEach(pdv => {
      const totals = pdvLogTotals[pdv.id]
      if (totals && totals.count > 0) {
        const avgMinutes = Math.round((totals.sum / totals.count) / 60)
        const baseMinutes = pdv.base_duration_minutes
        
        if (Math.abs(avgMinutes - baseMinutes) >= 5) {
          logisticAdjustments.push({
            pdvId: pdv.id,
            pdvName: pdv.name,
            category: pdv.category,
            currentBase: baseMinutes,
            suggestedBase: avgMinutes,
            difference: avgMinutes - baseMinutes,
            reason: avgMinutes > baseMinutes 
              ? 'Tiempos reales en campo superan la base planificada (Checklist complejo).' 
              : 'Tiempos en campo son menores que la base planificada (Ruta fluida).'
          })
        }
      }
    })

    // Fallback adjustments if empty
    if (logisticAdjustments.length === 0 && pdvs.length > 0) {
      const pdv1 = pdvs[10 % pdvs.length]
      const pdv2 = pdvs[25 % pdvs.length]
      logisticAdjustments.push({
        pdvId: pdv1.id,
        pdvName: pdv1.name,
        category: pdv1.category,
        currentBase: pdv1.base_duration_minutes,
        suggestedBase: pdv1.base_duration_minutes + 15,
        difference: 15,
        reason: 'Tiempos reales en campo superan la base planificada (Checklist de Limpieza/Bandeo complejo).'
      })
      logisticAdjustments.push({
        pdvId: pdv2.id,
        pdvName: pdv2.name,
        category: pdv2.category,
        currentBase: pdv2.base_duration_minutes,
        suggestedBase: Math.max(15, pdv2.base_duration_minutes - 10),
        difference: -10,
        reason: 'Tiempos en campo menores a la base configurada (PDV optimizado).'
      })
    }

    // Route Optimization lists
    const overloaded = mappedReponedores
      .filter(r => r.status === 'Retrasado')
      .map(r => ({
        id: r.id,
        name: r.name,
        delay: r.delay,
        reason: 'Retrasado por checklist complejo en Cliente Pareto'
      }))

    const pendingRisk = mappedReponedores
      .filter(r => (r.status === 'Retrasado' || r.status === 'En Trayecto') && r.currentPDV)
      .slice(0, 3)
      .map((r, i) => {
        const pdvId = r.currentPDV!
        const pdv = mappedPdvs.find(p => p.id === pdvId)
        return {
          id: pdvId,
          name: pdv?.nombre || 'PDV Sin Nombre',
          location: pdv?.type || 'Zona General',
          lat: pdv?.lat,
          lng: pdv?.lng,
          assignedWorker: r.name,
          priority: (i === 0 ? 'Alta' : 'Media') as 'Alta' | 'Media' | 'Baja'
        }
      })

    return {
      isEmpty: false,
      data: {
        pdvs: mappedPdvs,
        reponedores: mappedReponedores,
        kpis: {
          coverageRate,
          timeDeviation,
          activeWorkers,
          totalWorkers,
          criticalAlerts
        },
        analytics: {
          effectiveMinutes,
          routeCompliance
        },
        routeOpt: {
          overloaded,
          pendingRisk,
          logisticAdjustments
        },
        photoEvidences
      }
    }
  } catch (e: any) {
    console.error('Error fetching dashboard data:', e)
    return { error: e.message || 'Error de base de datos' }
  }
}

export async function reoptimizeRoutes() {
  console.log('Running Dual-Criterion Routing Optimization (NN TSP Heuristics) on backend...')
  try {
    const todayStr = new Date().toISOString().split('T')[0]
    
    // Fetch today's plans
    const { data: plans, error: fetchErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('*')
      .eq('date', todayStr)

    if (fetchErr) throw new Error(fetchErr.message)
    if (!plans || plans.length === 0) return { error: 'No hay rutas asignadas para hoy.' }

    // Fetch all PDVs to get coordinates and categories
    const { data: pdvs, error: pdvsErr } = await supabaseAdmin
      .from('points_of_sale')
      .select('*')
    if (pdvsErr) throw new Error(pdvsErr.message)
    const pdvMap = new Map(pdvs.map(p => [p.id, p]))

    // Fetch task logs to calculate real-world averages by category
    const { data: logs } = await supabaseAdmin
      .from('task_logs')
      .select('duration_seconds, pos_id')
    
    // Calculate average duration per category
    const catSum: Record<string, number> = { PARETO: 0, MAYORISTA: 0, DETALLISTA: 0, MINORISTA: 0 }
    const catCount: Record<string, number> = { PARETO: 0, MAYORISTA: 0, DETALLISTA: 0, MINORISTA: 0 }
    
    if (logs && logs.length > 0) {
      logs.forEach(log => {
        const pdv = pdvMap.get(log.pos_id)
        if (pdv && log.duration_seconds) {
          const cat = pdv.category
          catSum[cat] = (catSum[cat] || 0) + log.duration_seconds
          catCount[cat] = (catCount[cat] || 0) + 1
        }
      })
    }

    const catAverages: Record<string, number> = {}
    Object.keys(catSum).forEach(cat => {
      catAverages[cat] = catCount[cat] > 0 ? (catSum[cat] / catCount[cat]) / 60 : (cat === 'PARETO' ? 50 : cat === 'MAYORISTA' ? 40 : 20)
    })

    // Haversine distance calculator (Fallback si falla Mapbox)
    function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371e3
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2)
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    }

    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    // Reoptimize sequence for each plan using Mapbox Matrix API + Strategic Interleaving
    for (const plan of plans) {
      const originalSeq = plan.optimized_pos_sequence || []
      if (originalSeq.length <= 1) continue

      // Filter to valid PDVs we actually have coordinates for
      const planPdvs = originalSeq
        .map((id: string) => pdvMap.get(id))
        .filter(Boolean) as any[]
      
      if (planPdvs.length <= 1) continue

      // Límite de Mapbox Matrix API es 25 puntos por request
      const matrixPdvs = planPdvs.slice(0, 25)
      
      let durationMatrix: number[][] | null = null
      
      // Llamada HTTP a la API oficial de Mapbox Matrix
      if (MAPBOX_TOKEN && MAPBOX_TOKEN !== 'PEGA_TU_TOKEN_AQUI') {
        try {
          const coordinates = matrixPdvs.map(p => `${p.longitude},${p.latitude}`).join(';')
          const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordinates}?annotations=duration&access_token=${MAPBOX_TOKEN}`
          const res = await fetch(url)
          const data = await res.json()
          if (data.code === 'Ok' && data.durations) {
            durationMatrix = data.durations
          }
        } catch (e) {
          console.error('Mapbox Matrix API error:', e)
        }
      }

      // TSP Greedy nearest-neighbor con datos reales de Mapbox
      const optimizedSeq: string[] = []
      let currentIdx = 0
      let current = matrixPdvs[currentIdx]
      optimizedSeq.push(current.id)
      
      const unvisitedIndices = new Set(matrixPdvs.map((_, i) => i).slice(1))
      let lastCategory = current.category

      while (unvisitedIndices.size > 0) {
        let bestIndex = -1
        let bestScore = Infinity

        for (const candidateIdx of unvisitedIndices) {
          const candidate = matrixPdvs[candidateIdx]
          
          let travelDurationSecs = 0
          // Si Mapbox respondió correctamente, usamos el tiempo real de conducción en tráfico
          if (durationMatrix && durationMatrix[currentIdx] && durationMatrix[currentIdx][candidateIdx] !== null) {
            travelDurationSecs = durationMatrix[currentIdx][candidateIdx]
          } else {
            // Fallback a línea recta si falla la API
            const dist = getDistance(
              parseFloat(current.latitude), parseFloat(current.longitude),
              parseFloat(candidate.latitude), parseFloat(candidate.longitude)
            )
            travelDurationSecs = dist / 11 // Asumiendo ~40km/h
          }

          const travelDurationMins = travelDurationSecs / 60
          const workDurationMins = catAverages[candidate.category] || 30
          
          // Doble Criterio Mapbox: 40% tiempo de manejo (tráfico) + 60% tiempo de tarea (retail)
          let score = (0.4 * travelDurationMins) + (0.6 * workDurationMins)

          // Strategic Interleaving (RF-03 load balancing)
          const isLastComplex = lastCategory === 'PARETO' || lastCategory === 'MAYORISTA'
          const isCandidateSimple = candidate.category === 'DETALLISTA' || candidate.category === 'MINORISTA'
          if (isLastComplex && isCandidateSimple) {
            score *= 0.75 // 25% discount to favor interleaving
          }

          if (score < bestScore) {
            bestScore = score
            bestIndex = candidateIdx
          }
        }

        currentIdx = bestIndex
        current = matrixPdvs[currentIdx]
        optimizedSeq.push(current.id)
        lastCategory = current.category
        unvisitedIndices.delete(bestIndex)
      }
      
      // Adjuntar cualquier PDV sobrante (>25) al final sin optimizar matriz completa
      if (planPdvs.length > 25) {
        optimizedSeq.push(...planPdvs.slice(25).map(p => p.id))
      }

      const { error: updateErr } = await supabaseAdmin
        .from('daily_routes_plan')
        .update({ optimized_pos_sequence: optimizedSeq })
        .eq('id', plan.id)

      if (updateErr) throw new Error(updateErr.message)
    }

    return await getDashboardData()
  } catch (e: any) {
    console.error('Re-optimization failed:', e)
    return { error: e.message || 'Error de base de datos' }
  }
}

export async function approveLogisticAdjustment(pdvId: string, newDuration: number) {
  console.log(`Approving logistic adjustment: setting base_duration_minutes for PDV ${pdvId} to ${newDuration}...`)
  try {
    const { error } = await supabaseAdmin
      .from('points_of_sale')
      .update({ base_duration_minutes: newDuration })
      .eq('id', pdvId)

    if (error) throw new Error(error.message)
    return await getDashboardData()
  } catch (e: any) {
    console.error('Failed to approve logistic adjustment:', e)
    return { error: e.message || 'Error al actualizar base_duration_minutes.' }
  }
}

export async function uploadPdvs(pdvsList: any[]) {
  console.log(`Uploading ${pdvsList.length} PDVs to Supabase...`)
  try {
    const formatted = pdvsList.map(p => ({
      id: p.id || `PDV-${Math.floor(1000 + Math.random() * 9000)}`,
      name: p.name || p.nombre || 'PDV Nuevo',
      market: p.market || p.mercado || 'Buenos Aires',
      category: (p.category || p.clasificacion || 'DETALLISTA').toUpperCase(),
      latitude: parseFloat(p.latitude || p.lat || -34.6),
      longitude: parseFloat(p.longitude || p.lng || -58.4),
      base_duration_minutes: parseInt(p.base_duration_minutes || p.duracion || 30)
    }))

    const { error } = await supabaseAdmin
      .from('points_of_sale')
      .upsert(formatted, { onConflict: 'id' })

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (e: any) {
    console.error('PDV upload failed:', e)
    return { error: e.message || 'Error de base de datos' }
  }
}

export async function reassignPdv(pdvId: string, targetReponedorUuid: string, dateStr?: string) {
  const planDate = dateStr || new Date().toISOString().split('T')[0]
  console.log(`Reassigning PDV ${pdvId} to worker ${targetReponedorUuid} on date ${planDate}...`)
  try {
    // 1. Find the plan that currently contains this PDV on this date
    const { data: plans, error: fetchErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('*')
      .eq('date', planDate)

    if (fetchErr) throw new Error(fetchErr.message)
    
    // Fallback: If no plans exist on this date, we just skip removing from source
    const sourcePlan = plans ? plans.find(p => p.optimized_pos_sequence.includes(pdvId)) : null
    
    if (sourcePlan) {
      // Remove from source plan
      const updatedSourceSeq = sourcePlan.optimized_pos_sequence.filter((id: string) => id !== pdvId)
      const { error: updateSourceErr } = await supabaseAdmin
        .from('daily_routes_plan')
        .update({ optimized_pos_sequence: updatedSourceSeq })
        .eq('id', sourcePlan.id)

      if (updateSourceErr) throw new Error(updateSourceErr.message)
    }

    // 2. Find target plan
    const targetPlan = plans ? plans.find(p => p.reponedor_id === targetReponedorUuid) : null

    if (targetPlan) {
      // Append to target plan if not already there
      const updatedTargetSeq = [...targetPlan.optimized_pos_sequence]
      if (!updatedTargetSeq.includes(pdvId)) {
        updatedTargetSeq.push(pdvId)
      }
      
      const { error: updateTargetErr } = await supabaseAdmin
        .from('daily_routes_plan')
        .update({ optimized_pos_sequence: updatedTargetSeq })
        .eq('id', targetPlan.id)

      if (updateTargetErr) throw new Error(updateTargetErr.message)
    } else {
      // Create new plan for target reponedor
      const { error: createErr } = await supabaseAdmin
        .from('daily_routes_plan')
        .insert({
          reponedor_id: targetReponedorUuid,
          date: planDate,
          optimized_pos_sequence: [pdvId],
          status: 'ASIGNADA'
        })

      if (createErr) throw new Error(createErr.message)
    }

    return await getDashboardData()
  } catch (e: any) {
    console.error('Reassignment failed:', e)
    return { error: e.message || 'Error al reasignar punto de venta.' }
  }
}

export async function addPdvToRoute(pdvId: string, reponedorUuid: string, dateStr: string) {
  console.log(`Adding PDV ${pdvId} to worker ${reponedorUuid} on date ${dateStr}...`)
  try {
    // Remove the PDV from any other worker's plan on the same date first
    const { data: otherPlans } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('*')
      .eq('date', dateStr)

    if (otherPlans) {
      for (const otherPlan of otherPlans) {
        if (otherPlan.reponedor_id !== reponedorUuid && otherPlan.optimized_pos_sequence.includes(pdvId)) {
          const newSeq = otherPlan.optimized_pos_sequence.filter((id: string) => id !== pdvId)
          await supabaseAdmin
            .from('daily_routes_plan')
            .update({ optimized_pos_sequence: newSeq })
            .eq('id', otherPlan.id)
        }
      }
    }

    const { data: plan, error: fetchErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('*')
      .eq('reponedor_id', reponedorUuid)
      .eq('date', dateStr)
      .maybeSingle()

    if (fetchErr) throw new Error(fetchErr.message)

    if (plan) {
      const updatedSeq = [...plan.optimized_pos_sequence]
      if (!updatedSeq.includes(pdvId)) {
        updatedSeq.push(pdvId)
      }
      const { error } = await supabaseAdmin
        .from('daily_routes_plan')
        .update({ optimized_pos_sequence: updatedSeq })
        .eq('id', plan.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabaseAdmin
        .from('daily_routes_plan')
        .insert({
          reponedor_id: reponedorUuid,
          date: dateStr,
          optimized_pos_sequence: [pdvId],
          status: 'ASIGNADA'
        })
      if (error) throw new Error(error.message)
    }

    return await getDashboardData()
  } catch (e: any) {
    console.error('Failed to add PDV to route:', e)
    return { error: e.message || 'Error al asignar punto de venta.' }
  }
}

export async function removePdvFromRoute(pdvId: string, reponedorUuid: string, dateStr: string) {
  console.log(`Removing PDV ${pdvId} from worker ${reponedorUuid} on date ${dateStr}...`)
  try {
    const { data: plan, error: fetchErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('*')
      .eq('reponedor_id', reponedorUuid)
      .eq('date', dateStr)
      .maybeSingle()

    if (fetchErr) throw new Error(fetchErr.message)
    if (!plan) throw new Error('No se encontró el plan de ruta.')

    const newSeq = plan.optimized_pos_sequence.filter((id: string) => id !== pdvId)
    const { error } = await supabaseAdmin
      .from('daily_routes_plan')
      .update({ optimized_pos_sequence: newSeq })
      .eq('id', plan.id)

    if (error) throw new Error(error.message)

    return await getDashboardData()
  } catch (e: any) {
    console.error('Failed to remove PDV from route:', e)
    return { error: e.message || 'Error al remover punto de venta de la ruta.' }
  }
}

export async function getRoutesPlanForDate(dateStr: string) {
  try {
    const targetDate = new Date(`${dateStr}T12:00:00Z`)

    // 1. Check if plans already exist for dateStr
    const { data: existingPlans, error: fetchErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('*')
      .eq('date', dateStr)

    if (fetchErr) throw new Error(fetchErr.message)

    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'REPONEDOR')
      .eq('is_active', true)

    if (usersErr) throw new Error(usersErr.message)

    const existingMap = new Map((existingPlans || []).map(p => [p.reponedor_id, p]))

    // 2. Generate suggestions / merge with existing plans
    const { data: pdvs, error: pdvsErr } = await supabaseAdmin
      .from('points_of_sale')
      .select('*')

    if (pdvsErr) throw new Error(pdvsErr.message)

    // Determine day of week for dateStr
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
    const targetDayStr = days[targetDate.getDay()] // e.g. "LUN"

    // Filter PDVs available dateStr
    const getAvailableDays = (category: string, pdvId: string): string[] => {
      const numericSuffix = parseInt(pdvId.replace(/\D/g, '') || '0', 10)
      switch (category) {
        case 'PARETO':
          return ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE']
        case 'MAYORISTA':
          return numericSuffix % 2 === 0
            ? ['LUN', 'MIÉ', 'VIE']
            : ['MAR', 'JUE', 'SÁB']
        case 'MINORISTA':
          return numericSuffix % 3 === 0
            ? ['LUN', 'JUE']
            : numericSuffix % 3 === 1
            ? ['MAR', 'VIE']
            : ['MIÉ', 'SÁB']
        case 'DETALLISTA':
        default:
          return numericSuffix % 2 === 0 ? ['LUN', 'MIÉ'] : ['MAR', 'VIE']
      }
    }

    const availablePdvs = pdvs.filter(p => getAvailableDays(p.category, p.id).includes(targetDayStr))
    const pdvPool = availablePdvs.length > 0 ? availablePdvs : pdvs

    // Greedy nearest-neighbor TSP sequence generator
    function optimizeSequence(pdvsList: any[]) {
      if (pdvsList.length <= 1) return pdvsList.map(p => p.id)
      
      const optimized: string[] = []
      let current = pdvsList[0]
      optimized.push(current.id)
      
      const unvisited = pdvsList.slice(1)
      while (unvisited.length > 0) {
        let bestIdx = 0
        let bestDist = Infinity
        for (let i = 0; i < unvisited.length; i++) {
          const candidate = unvisited[i]
          const dist = Math.pow(parseFloat(current.latitude) - parseFloat(candidate.latitude), 2) + 
                       Math.pow(parseFloat(current.longitude) - parseFloat(candidate.longitude), 2)
          if (dist < bestDist) {
            bestDist = dist
            bestIdx = i
          }
        }
        current = unvisited[bestIdx]
        optimized.push(current.id)
        unvisited.splice(bestIdx, 1)
      }
      return optimized
    }

    // Geographical K-Means Clustering partitioned by City/Department
    const suggestedPlans: any[] = []
    const cities = ['Cochabamba', 'Santa Cruz', 'La Paz']

    for (let cIdx = 0; cIdx < cities.length; cIdx++) {
      const city = cities[cIdx]
      // Workers assigned to this city (using index round-robin matching seedDatabase)
      const cityWorkers = (users || []).filter((_, idx) => idx % 3 === cIdx)
      // PDVs located in this city
      const cityPdvs = pdvPool.filter(p => p.market === city)

      if (cityWorkers.length === 0) continue

      const numCityWorkers = cityWorkers.length

      // Initialize centroids for this city's workers
      const centroids: { lat: number; lng: number }[] = []
      for (let i = 0; i < numCityWorkers; i++) {
        const idx = Math.min(cityPdvs.length - 1, Math.floor((i * cityPdvs.length) / numCityWorkers))
        centroids.push({
          lat: parseFloat(cityPdvs[idx]?.latitude || '-17.7862'),
          lng: parseFloat(cityPdvs[idx]?.longitude || '-63.1812')
        })
      }

      // Run K-Means for 5 iterations within this city
      const assignments: Record<string, number> = {}
      for (let iter = 0; iter < 5; iter++) {
        // 1. Assign each PDV to the nearest centroid
        cityPdvs.forEach(pdv => {
          const pdvLat = parseFloat(pdv.latitude)
          const pdvLng = parseFloat(pdv.longitude)
          let bestIdx = 0
          let bestDist = Infinity
          for (let i = 0; i < numCityWorkers; i++) {
            const dist = Math.pow(pdvLat - centroids[i].lat, 2) + Math.pow(pdvLng - centroids[i].lng, 2)
            if (dist < bestDist) {
              bestDist = dist
              bestIdx = i
            }
          }
          assignments[pdv.id] = bestIdx
        })

        // 2. Recalculate centroids
        const newCentroids = Array.from({ length: numCityWorkers }, () => ({ lat: 0, lng: 0, count: 0 }))
        cityPdvs.forEach(pdv => {
          const clusterIdx = assignments[pdv.id]
          if (clusterIdx !== undefined && newCentroids[clusterIdx]) {
            newCentroids[clusterIdx].lat += parseFloat(pdv.latitude)
            newCentroids[clusterIdx].lng += parseFloat(pdv.longitude)
            newCentroids[clusterIdx].count += 1
          }
        })

        for (let i = 0; i < numCityWorkers; i++) {
          if (newCentroids[i].count > 0) {
            centroids[i] = {
              lat: newCentroids[i].lat / newCentroids[i].count,
              lng: newCentroids[i].lng / newCentroids[i].count
            }
          }
        }
      }

      // Allocate clusters to this city's workers and optimize sequence
      cityWorkers.forEach((user, idx) => {
        const existingPlan = existingMap.get(user.id)
        if (existingPlan) {
          suggestedPlans.push({
            reponedorId: user.id,
            reponedorName: user.name,
            sequence: existingPlan.optimized_pos_sequence,
            published: true,
            status: existingPlan.status
          })
        } else {
          const clusterPdvs = cityPdvs.filter(pdv => assignments[pdv.id] === idx)
          const center = centroids[idx] || { lat: parseFloat(cityPdvs[0]?.latitude || '0'), lng: parseFloat(cityPdvs[0]?.longitude || '0') }

          clusterPdvs.sort((a, b) => {
            const distA = Math.pow(parseFloat(a.latitude) - center.lat, 2) + Math.pow(parseFloat(a.longitude) - center.lng, 2)
            const distB = Math.pow(parseFloat(b.latitude) - center.lat, 2) + Math.pow(parseFloat(b.longitude) - center.lng, 2)
            return distA - distB
          })

          const maxPdvs = 7 + (idx % 2)
          const selectedPdvs = clusterPdvs.slice(0, maxPdvs)
          const optimizedSeq = optimizeSequence(selectedPdvs)

          suggestedPlans.push({
            reponedorId: user.id,
            reponedorName: user.name,
            sequence: optimizedSeq,
            published: false,
            status: 'ASIGNADA'
          })
        }
      })
    }

    const allPublished = (existingPlans || []).length > 0 && (existingPlans || []).length === (users || []).length
    return { published: allPublished, plans: suggestedPlans }
  } catch (e: any) {
    console.error('Failed to get routes plan for date:', e)
    return { error: e.message || 'Error al obtener planificación.' }
  }
}

export async function publishRoutesPlanForDate(plans: any[], dateStr: string) {
  try {
    const rowsToInsert = plans.map(p => ({
      reponedor_id: p.reponedorId,
      date: dateStr,
      optimized_pos_sequence: p.sequence,
      status: 'ASIGNADA'
    }))

    const { error } = await supabaseAdmin
      .from('daily_routes_plan')
      .upsert(rowsToInsert, { onConflict: 'reponedor_id,date' })

    if (error) throw new Error(error.message)

    return { success: true }
  } catch (e: any) {
    console.error('Failed to publish routes plan for date:', e)
    return { error: e.message || 'Error al publicar planificación.' }
  }
}

export async function getTomorrowRoutesPlan() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  return getRoutesPlanForDate(tomorrowStr)
}

export async function publishTomorrowRoutesPlan(plans: any[]) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  return publishRoutesPlanForDate(plans, tomorrowStr)
}

// ─── CRUD Actions for PDVs ───────────────────────────────────────────────────

export async function createPdv(data: any) {
  console.log('--- START createPdv ---')
  console.log('Payload received:', JSON.stringify(data, null, 2))
  try {
    const { error } = await supabaseAdmin.from('points_of_sale').insert(data);
    if (error) {
      console.error('Supabase Error in createPdv:', error)
      throw new Error(error.message);
    }
    console.log('--- SUCCESS createPdv ---')
    return { success: true };
  } catch (e: any) {
    console.error('Catch Error creating PDV:', e);
    return { error: e.message || 'Error al crear PDV.' };
  }
}

export async function updatePdv(id: string, data: any) {
  try {
    const { error } = await supabaseAdmin.from('points_of_sale').update(data).eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e: any) {
    console.error('Error updating PDV:', e);
    return { error: e.message || 'Error al actualizar PDV.' };
  }
}

export async function deletePdv(id: string) {
  try {
    const { error } = await supabaseAdmin.from('points_of_sale').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e: any) {
    console.error('Error deleting PDV:', e);
    return { error: e.message || 'Error al eliminar PDV.' };
  }
}

// ─── CRUD Actions for Reponedores ────────────────────────────────────────────

export async function createWorker(data: any) {
  try {
    const { error } = await supabaseAdmin.from('users').insert({
      ...data,
      role: 'REPONEDOR',
      is_active: true
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e: any) {
    console.error('Error creating worker:', e);
    return { error: e.message || 'Error al crear reponedor.' };
  }
}

export async function updateWorker(id: string, data: any) {
  try {
    const { error } = await supabaseAdmin.from('users').update(data).eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e: any) {
    console.error('Error updating worker:', e);
    return { error: e.message || 'Error al actualizar reponedor.' };
  }
}

export async function deactivateWorker(id: string) {
  try {
    const { error } = await supabaseAdmin.from('users').update({ is_active: false }).eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e: any) {
    console.error('Error deactivating worker:', e);
    return { error: e.message || 'Error al desactivar reponedor.' };
  }
}

// ─── Real Analytics and KPIs Queries ─────────────────────────────────────────

export async function fetchRealAnalytics(startDateStr?: string, endDateStr?: string) {
  try {
    let plansQuery = supabaseAdmin.from('daily_routes_plan').select('*')
    if (startDateStr) plansQuery = plansQuery.gte('date', startDateStr)
    if (endDateStr) plansQuery = plansQuery.lte('date', endDateStr)
    
    const { data: plans, error: plansErr } = await plansQuery
    if (plansErr) throw new Error(plansErr.message)

    // KPI Coverage Rate (rutas completadas vs total rutas asignadas en el rango)
    const totalRoutes = plans?.length || 0
    const completedRoutes = plans?.filter(p => p.status === 'COMPLETADA').length || 0
    const coverageRate = totalRoutes > 0 ? (completedRoutes / totalRoutes) * 100 : 0

    const planIds = plans?.map(p => p.id) || []
    let taskLogs: any[] = []
    
    if (planIds.length > 0) {
      const { data: logs, error: logsErr } = await supabaseAdmin
        .from('task_logs')
        .select('*')
        .in('route_plan_id', planIds)
      if (logsErr) throw new Error(logsErr.message)
      taskLogs = logs || []
    }

    const { data: microTasks } = await supabaseAdmin.from('micro_tasks').select('*')
    const microTasksMap = new Map(microTasks?.map(t => [t.id, t.task_name]) || [])
    const { data: pdvs } = await supabaseAdmin.from('points_of_sale').select('id, category')

    const taskDurations: Record<string, Record<string, number>> = {
      'Limpieza': { 'PARETO': 0, 'MAYORISTA': 0, 'DETALLISTA': 0, 'MINORISTA': 0 },
      'Bandeo': { 'PARETO': 0, 'MAYORISTA': 0, 'DETALLISTA': 0, 'MINORISTA': 0 },
      'POP': { 'PARETO': 0, 'MAYORISTA': 0, 'DETALLISTA': 0, 'MINORISTA': 0 }
    }
    const taskCount: Record<string, Record<string, number>> = {
      'Limpieza': { 'PARETO': 0, 'MAYORISTA': 0, 'DETALLISTA': 0, 'MINORISTA': 0 },
      'Bandeo': { 'PARETO': 0, 'MAYORISTA': 0, 'DETALLISTA': 0, 'MINORISTA': 0 },
      'POP': { 'PARETO': 0, 'MAYORISTA': 0, 'DETALLISTA': 0, 'MINORISTA': 0 }
    }

    taskLogs.forEach(log => {
      const taskName = microTasksMap.get(log.task_id)
      const pdv = pdvs?.find(p => p.id === log.pos_id)
      if (taskName && pdv && log.duration_seconds && taskDurations[taskName]) {
        const cat = pdv.category
        if (taskDurations[taskName][cat] !== undefined) {
          taskDurations[taskName][cat] += log.duration_seconds
          taskCount[taskName][cat] += 1
        }
      }
    })

    const effectiveMinutes = Object.keys(taskDurations).map(taskName => {
      const pCount = taskCount[taskName]['PARETO']
      const mCount = taskCount[taskName]['MAYORISTA']
      const dCount = taskCount[taskName]['DETALLISTA'] + taskCount[taskName]['MINORISTA']
      const dSum = taskDurations[taskName]['DETALLISTA'] + taskDurations[taskName]['MINORISTA']

      return {
        microTask: taskName as any,
        Pareto: pCount > 0 ? Math.round((taskDurations[taskName]['PARETO'] / pCount) / 60) : 0,
        Mayorista: mCount > 0 ? Math.round((taskDurations[taskName]['MAYORISTA'] / mCount) / 60) : 0,
        Detallista: dCount > 0 ? Math.round((dSum / dCount) / 60) : 0,
      }
    })
    
    // Si no hay datos, retornamos algo dummy
    if (effectiveMinutes.every(e => e.Pareto === 0 && e.Mayorista === 0 && e.Detallista === 0)) {
      effectiveMinutes[0] = { microTask: 'Limpieza', Pareto: 240, Mayorista: 180, Detallista: 120 }
      effectiveMinutes[1] = { microTask: 'Bandeo', Pareto: 300, Mayorista: 200, Detallista: 140 }
      effectiveMinutes[2] = { microTask: 'POP', Pareto: 180, Mayorista: 140, Detallista: 90 }
    }

    const { data: users } = await supabaseAdmin.from('users').select('*').eq('role', 'REPONEDOR')
    const totalWorkers = users?.length || 12
    const criticalAlerts = 2 // TODO: implement real delayed worker calc for date range if needed

    const routeCompliance = [
      { time: '06:00', onTime: totalWorkers - criticalAlerts, delayed: 0 },
      { time: '09:00', onTime: Math.max(0, totalWorkers - criticalAlerts), delayed: Math.min(criticalAlerts, 1) },
      { time: '12:00', onTime: Math.max(0, totalWorkers - criticalAlerts - 1), delayed: Math.min(criticalAlerts + 1, 3) },
      { time: '15:00', onTime: Math.max(0, totalWorkers - criticalAlerts), delayed: criticalAlerts },
      { time: '18:00', onTime: totalWorkers - criticalAlerts, delayed: Math.max(0, criticalAlerts - 1) },
    ]

    return {
      success: true,
      data: {
        kpis: {
          coverageRate: Math.round(coverageRate),
          timeDeviation: 5.4,
          activeWorkers: plans?.filter(p => p.status === 'EN_PROCESO' || p.status === 'COMPLETADA').length || 0,
          totalWorkers,
          criticalAlerts
        },
        analytics: {
          effectiveMinutes,
          routeCompliance
        }
      }
    }

  } catch (e: any) {
    console.error('Error in fetchRealAnalytics:', e)
    return { error: e.message }
  }
}


// ─── Authentication handled by Supabase Auth (JWT) ──────────────────────────
export async function getAdminDashboardData() {
  try {
    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('name', { ascending: true })

    const { data: pdvs, error: pdvsErr } = await supabaseAdmin
      .from('points_of_sale')
      .select('*')
      .order('name', { ascending: true })

    if (usersErr || pdvsErr) {
      throw new Error(`Error fetching admin data: ${usersErr?.message || pdvsErr?.message}`)
    }

    // Fetch recent activity from various tables
    const [taskLogsRes, newUsersRes, newPdvsRes, routePlansRes] = await Promise.all([
      supabaseAdmin.from('task_logs').select('created_at, points_of_sale(name)').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('users').select('created_at, email, role').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('points_of_sale').select('created_at, id, name').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('daily_routes_plan').select('created_at, status, users(email)').order('created_at', { ascending: false }).limit(5)
    ])

    const recentItems: any[] = []

    if (taskLogsRes.data) {
      taskLogsRes.data.forEach((log: any) => {
        recentItems.push({
          _time: new Date(log.created_at).getTime(),
          action: `Tarea en PDV completada`,
          user: log.points_of_sale?.name || 'PDV',
          time: log.created_at,
          type: 'success'
        })
      })
    }

    if (newUsersRes.data) {
      newUsersRes.data.forEach((u: any) => {
        recentItems.push({
          _time: new Date(u.created_at).getTime(),
          action: `Usuario registrado (${u.role})`,
          user: u.email,
          time: u.created_at,
          type: 'info'
        })
      })
    }

    if (newPdvsRes.data) {
      newPdvsRes.data.forEach((p: any) => {
        recentItems.push({
          _time: new Date(p.created_at).getTime(),
          action: `PDV creado: ${p.id}`,
          user: 'Sistema',
          time: p.created_at,
          type: 'success'
        })
      })
    }

    if (routePlansRes.data) {
      routePlansRes.data.forEach((r: any) => {
        recentItems.push({
          _time: new Date(r.created_at).getTime(),
          action: `Ruta generada (${r.status})`,
          user: r.users?.email || 'Sistema',
          time: r.created_at,
          type: 'warning'
        })
      })
    }

    recentItems.sort((a, b) => b._time - a._time)
    
    const now = new Date().getTime()
    const recentActivity = recentItems.slice(0, 8).map(item => {
      const diffMinutes = Math.floor((now - item._time) / 60000)
      let timeStr = 'Hace un momento'
      if (diffMinutes > 0 && diffMinutes < 60) timeStr = `Hace ${diffMinutes} min`
      else if (diffMinutes >= 60 && diffMinutes < 1440) timeStr = `Hace ${Math.floor(diffMinutes / 60)} horas`
      else if (diffMinutes >= 1440) timeStr = `Hace ${Math.floor(diffMinutes / 1440)} días`

      return {
        action: item.action,
        user: item.user,
        time: timeStr,
        type: item.type
      }
    })

    return {
      success: true,
      users: users || [],
      pdvs: pdvs || [],
      recentActivity
    }
  } catch (e: any) {
    console.error('Error in getAdminDashboardData Server Action:', e)
    return { success: false, error: e.message || 'Error al cargar datos de administrador.' }
  }
}

export async function adminCreateUser(data: any) {
  try {
    const { error } = await supabaseAdmin.from('users').insert({
      name: data.name,
      email: data.email,
      role: data.role || 'REPONEDOR',
      is_active: true,
      departamento: data.departamento || null
    })
    if (error) throw new Error(error.message)
    return { success: true }
  } catch (e: any) {
    console.error('Error creating user:', e)
    return { error: e.message || 'Error al crear usuario.' }
  }
}

export async function adminUpdateUser(id: string, data: any) {
  try {
    const { error } = await supabaseAdmin.from('users').update({
      name: data.name,
      email: data.email,
      role: data.role,
      is_active: data.is_active,
      departamento: data.departamento || null
    }).eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  } catch (e: any) {
    console.error('Error updating user:', e)
    return { error: e.message || 'Error al actualizar usuario.' }
  }
}

export async function getAdminAuditData() {
  try {
    const [auditRes, activeUsersRes] = await Promise.all([
      supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('users').select('*').in('role', ['ADMIN', 'SUPERVISOR']).eq('is_active', true)
    ])

    const logs: any[] = []
    
    if (auditRes.data) {
      auditRes.data.forEach((a: any) => {
        logs.push({
          id: a.id,
          _time: new Date(a.created_at).getTime(),
          time: a.created_at,
          action: a.action,
          desc: a.description,
          user: a.action === 'Algoritmo de Ruteo' || a.action.includes('Ruta') ? 'Sistema Automático' : 'Trazabilidad BD',
          severity: a.severity,
          ip: 'Servidor',
          device: 'PostgreSQL Trigger'
        })
      })
    }

    logs.sort((a, b) => b._time - a._time)

    const now = new Date().getTime()
    const auditLogs = logs.map(log => {
      const diffMinutes = Math.floor((now - log._time) / 60000)
      let timeStr = 'Hace un momento'
      if (diffMinutes > 0 && diffMinutes < 60) timeStr = `Hace ${diffMinutes} min`
      else if (diffMinutes >= 60 && diffMinutes < 1440) timeStr = `Hace ${Math.floor(diffMinutes / 60)} horas`
      else if (diffMinutes >= 1440) timeStr = `Hace ${Math.floor(diffMinutes / 1440)} días`

      return {
        ...log,
        time: timeStr
      }
    })

    const { data: authUsersRes } = await supabaseAdmin.auth.admin.listUsers()

    let activeSessions: any[] = []
    
    if (authUsersRes && authUsersRes.users && activeUsersRes.data) {
      // Consider "active" if signed in within the last 12 hours
      const recentUsers = authUsersRes.users.filter(u => {
        if (!u.last_sign_in_at) return false
        return (now - new Date(u.last_sign_in_at).getTime()) < 12 * 60 * 60 * 1000
      })
      
      activeSessions = recentUsers.map(u => {
        const publicUser = activeUsersRes.data.find((pu: any) => pu.email === u.email)
        return {
          id: u.id,
          name: publicUser?.name || u.email,
          email: u.email,
          role: publicUser?.role || 'SUPERVISOR',
          ip: `190.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 255)}.x`
        }
      })
    }

    const auditStats = {
      securityActions: auditLogs.filter(l => l.severity === 'high').length,
      activeSessionsCount: activeSessions.length,
      failedAttempts: 0,
      algorithmLogs: auditLogs.filter(l => l.action.includes('Ruta') || l.action.includes('Algoritmo') || l.action.includes('Planificación')).length
    }

    return {
      success: true,
      auditLogs,
      activeSessions,
      auditStats
    }
  } catch (e: any) {
    console.error('Error in getAdminAuditData:', e)
    return { success: false, error: e.message || 'Error al cargar bitácora.' }
  }
}

// ─── QA Status Management ───────────────────────────────────────────
export async function updateQaStatus(taskId: string, status: 'Aprobado' | 'Rechazado') {
  try {
    const { error } = await supabaseAdmin
      .from('task_logs')
      .update({ qa_status: status })
      .eq('id', taskId)

    if (error) throw error

    return { success: true }
  } catch (e: any) {
    console.error('Error updating QA status:', e)
    return { error: e.message }
  }
}
