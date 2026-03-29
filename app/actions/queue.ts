'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function joinQueue(machineId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Unauthorized' }

  // Get current max position for the machine
  const { data: qData, error: qErr } = await supabase
    .from('queue')
    .select('position')
    .eq('machine_id', machineId)
    .in('status', ['waiting', 'washing'])
    .order('position', { ascending: false })
    .limit(1)

  const position = qData && qData.length > 0 ? qData[0].position + 1 : 1
  const isWashing = position === 1

  // Get default wash time from env, default to 60 if not set
  const defaultMins = Number(process.env.NEXT_PUBLIC_DEFAULT_WASH_TIME_MINS) || 60
  const estimatedEndTime = isWashing 
    ? new Date(Date.now() + defaultMins * 60000).toISOString() 
    : null

  // Insert into queue
  const { error } = await supabase
    .from('queue')
    .insert({
      user_id: user.id,
      machine_id: machineId,
      position,
      status: isWashing ? 'washing' : 'waiting',
      start_time: isWashing ? new Date().toISOString() : null,
      estimated_end_time: estimatedEndTime
    })

  if (error) {
    console.error('joinQueue error:', error)
    return { error: 'Failed to join queue' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/machine/${machineId}`)
  return { success: true }
}

export async function finishWashing(queueId: string, machineId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Update current item to 'done'
  const { error: updErr } = await supabase
    .from('queue')
    .update({ status: 'done', end_time: new Date().toISOString() })
    .eq('id', queueId)
    .eq('user_id', user.id) // security check, unless admin

  if (updErr) return { error: updErr.message }

  // Auto-move the next user in line
  const { data: nextUsers } = await supabase
    .from('queue')
    .select('*')
    .eq('machine_id', machineId)
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1)

  if (nextUsers && nextUsers.length > 0) {
    const defaultMins = Number(process.env.NEXT_PUBLIC_DEFAULT_WASH_TIME_MINS) || 60
    const estimatedEndTime = new Date(Date.now() + defaultMins * 60000).toISOString()

    // Make them washing
    await supabase
      .from('queue')
      .update({ 
        status: 'washing', 
        start_time: new Date().toISOString(),
        estimated_end_time: estimatedEndTime
      })
      .eq('id', nextUsers[0].id)
      
    // Send Notification to next user
    await supabase.from('notifications').insert({
      user_id: nextUsers[0].user_id,
      message: 'It is your turn! The washing machine is ready for you.'
    })
  }

  revalidatePath('/dashboard')
  revalidatePath(`/machine/${machineId}`)
  return { success: true }
}

export async function updateEstimatedTime(queueId: string, machineId: string, durationMins: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const estimatedEndTime = new Date(Date.now() + durationMins * 60000).toISOString()

  const { error } = await supabase
    .from('queue')
    .update({ estimated_end_time: estimatedEndTime })
    .eq('id', queueId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/machine/${machineId}`)
  return { success: true }
}

export async function startWashing(queueId: string, machineId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const defaultMins = Number(process.env.NEXT_PUBLIC_DEFAULT_WASH_TIME_MINS) || 60
  const estimatedEndTime = new Date(Date.now() + defaultMins * 60000).toISOString()

  const { error } = await supabase
    .from('queue')
    .update({ 
      status: 'washing', 
      start_time: new Date().toISOString(),
      estimated_end_time: estimatedEndTime 
    })
    .eq('id', queueId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/machine/${machineId}`)
  return { success: true }
}

export async function cancelQueue(queueId: string, machineId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Unauthorized' }

  // Check current status before cancelling
  const { data: currentItem } = await supabase
    .from('queue')
    .select('status')
    .eq('id', queueId)
    .single()

  const { error, count } = await supabase
    .from('queue')
    .update({ status: 'cancelled' })
    .eq('id', queueId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  if (count === 0) return { error: 'Queue item not found or already removed' }

  // If the user was washing, move the next person up
  if (currentItem?.status === 'washing') {
    const { data: nextUsers } = await supabase
      .from('queue')
      .select('*')
      .eq('machine_id', machineId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)

    if (nextUsers && nextUsers.length > 0) {
      await supabase
        .from('queue')
        .update({ status: 'washing', start_time: new Date().toISOString() })
        .eq('id', nextUsers[0].id)
        
      await supabase.from('notifications').insert({
        user_id: nextUsers[0].user_id,
        message: 'The previous user left! It is now your turn at the washing machine.'
      })
    }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/machine/${machineId}`)
  return { success: true }
}

export async function removeTimedOutUser(queueId: string, machineId: string) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'Unauthorized' }

  const { data: qItem } = await supabase
    .from('queue')
    .select('*')
    .eq('id', queueId)
    .single()

  if (!qItem) return { error: 'Queue item not found' }
  if (qItem.status !== 'washing') return { error: 'User is not currently washing' }

  // Verify timeout server-side
  const maxWaitMins = Number(process.env.NEXT_PUBLIC_MAX_WAIT_TIME_MINUTES) || 10
  const timeoutLimit = new Date(new Date(qItem.estimated_end_time).getTime() + maxWaitMins * 60000)
  
  if (new Date() < timeoutLimit) {
    return { error: 'Grace period has not expired yet' }
  }

  // Update status to timed_out
  const { error: updErr } = await supabase
    .from('queue')
    .update({ status: 'timed_out', end_time: new Date().toISOString() })
    .eq('id', queueId)

  if (updErr) return { error: updErr.message }

  // Auto-move the next user in line (Reuse logic from finishWashing)
  const { data: nextUsers } = await supabase
    .from('queue')
    .select('*')
    .eq('machine_id', machineId)
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1)

  if (nextUsers && nextUsers.length > 0) {
    const defaultMins = Number(process.env.NEXT_PUBLIC_DEFAULT_WASH_TIME_MINS) || 60
    const estimatedEndTime = new Date(Date.now() + defaultMins * 60000).toISOString()

    await supabase
      .from('queue')
      .update({ 
        status: 'washing', 
        start_time: new Date().toISOString(),
        estimated_end_time: estimatedEndTime
      })
      .eq('id', nextUsers[0].id)
      
    await supabase.from('notifications').insert({
      user_id: nextUsers[0].user_id,
      message: 'The previous user timed out! It is now your turn. The machine is ready for you.'
    })
  }

  revalidatePath('/dashboard')
  revalidatePath(`/machine/${machineId}`)
  return { success: true }
}
