'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setRoomNumber(roomNumber: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Use upsert to ensure the row exists even if the trigger hasn't fired
  const { error } = await supabase
    .from('users')
    .upsert({ 
      id: user.id, 
      email: user.email, 
      name: user.user_metadata?.full_name || user.email,
      room_number: roomNumber 
    })

  if (error) {
    console.error('Error updating room number:', error)
    return { error: 'Failed to update room number' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
