'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return dbUser?.role === 'admin'
}

export async function addMachine(name: string) {
  if (!(await checkAdmin())) return { error: 'Unauthorized' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('machines')
    .insert({ 
      machine_name: name,
      is_active: true
    })

  if (error) {
    console.error('Database error in addMachine:', error)
    return { error: error.message }
  }
  
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleMachineActive(id: string, currentStatus: boolean) {
  if (!(await checkAdmin())) return { error: 'Unauthorized' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('machines')
    .update({ is_active: !currentStatus })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath(`/machine/${id}`)
  return { success: true }
}

export async function adminRemoveFromQueue(queueId: string) {
  if (!(await checkAdmin())) return { error: 'Unauthorized' }

  const adminSupabase = createAdminClient()
  
  // Check current status and machine_id before removing
  const { data: currentItem } = await adminSupabase
    .from('queue')
    .select('status, machine_id')
    .eq('id', queueId)
    .single()

  const { error, count } = await adminSupabase
    .from('queue')
    .update({ status: 'cancelled' })
    .eq('id', queueId)

  if (error) return { error: error.message }
  if (count === 0) return { error: 'Queue item not found' }

  // If the removed user was washing, move the next person up
  if (currentItem?.status === 'washing') {
    const { data: nextUsers } = await adminSupabase
      .from('queue')
      .select('*')
      .eq('machine_id', currentItem.machine_id)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)

    if (nextUsers && nextUsers.length > 0) {
      await adminSupabase
        .from('queue')
        .update({ status: 'washing', start_time: new Date().toISOString() })
        .eq('id', nextUsers[0].id)
        
      await adminSupabase.from('notifications').insert({
        user_id: nextUsers[0].user_id,
        message: 'The laundry for the previous person was cancelled. It is now your turn!'
      })
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true }
}
