const fs = require('fs');
let code = fs.readFileSync('app/actions.ts', 'utf-8');

// I want to cleanly remove everything after publishRoutesPlanForDate and replace it.
const publishIdx = code.indexOf('export async function publishRoutesPlanForDate');
if (publishIdx !== -1) {
  let cleanCode = code.slice(0, publishIdx);
  
  cleanCode += `export async function publishRoutesPlanForDate(plans: any[], dateStr: string) {
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
    console.error('Failed to publish tomorrow routes plan:', e)
    return { error: e.message || 'Error al publicar planificación.' }
  }
}

export async function addPdvToRoute(pdvId: string, reponedorId: string, dateStr: string) {
  try {
    const { data: plan, error: fetchErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('optimized_pos_sequence')
      .eq('reponedor_id', reponedorId)
      .eq('date', dateStr)
      .single()

    if (fetchErr) throw new Error(fetchErr.message)

    let sequence = plan?.optimized_pos_sequence || []
    if (!sequence.includes(pdvId)) {
      sequence = [...sequence, pdvId]
      
      const { error: updateErr } = await supabaseAdmin
        .from('daily_routes_plan')
        .update({ optimized_pos_sequence: sequence })
        .eq('reponedor_id', reponedorId)
        .eq('date', dateStr)

      if (updateErr) throw new Error(updateErr.message)
    }

    return { success: true }
  } catch (e: any) {
    console.error('Failed to add pdv to route:', e)
    return { error: e.message || 'Error al añadir parada' }
  }
}

export async function removePdvFromRoute(pdvId: string, reponedorId: string, dateStr: string) {
  try {
    const { data: plan, error: fetchErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .select('optimized_pos_sequence')
      .eq('reponedor_id', reponedorId)
      .eq('date', dateStr)
      .single()

    if (fetchErr) throw new Error(fetchErr.message)

    let sequence = plan?.optimized_pos_sequence || []
    sequence = sequence.filter((id: string) => id !== pdvId)
      
    const { error: updateErr } = await supabaseAdmin
      .from('daily_routes_plan')
      .update({ optimized_pos_sequence: sequence })
      .eq('reponedor_id', reponedorId)
      .eq('date', dateStr)

    if (updateErr) throw new Error(updateErr.message)

    return { success: true }
  } catch (e: any) {
    console.error('Failed to remove pdv from route:', e)
    return { error: e.message || 'Error al eliminar parada' }
  }
}
`;
  fs.writeFileSync('app/actions.ts', cleanCode, 'utf-8');
  console.log('Fixed syntax in app/actions.ts');
} else {
  console.log('Could not find publishRoutesPlanForDate');
}
