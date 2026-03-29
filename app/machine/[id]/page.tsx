import { createClient } from '@/utils/supabase/server'
import MachineClient from '@/app/machine/[id]/MachineClient'

export default async function MachinePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: machine } = await supabase
    .from('machines')
    .select('*')
    .eq('id', id)
    .single()

  if (!machine) {
    return <div className="p-8 text-center text-red-500">Machine not found</div>
  }

  const { data: queues } = await supabase
    .from('queue')
    .select(`
      id, machine_id, position, status, start_time, estimated_end_time,
      user:users(id, name, room_number)
    `)
    .eq('machine_id', id)
    .in('status', ['waiting', 'washing'])
    .order('position', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="w-full max-w-4xl mx-auto">
      <MachineClient 
        machine={machine} 
        initialQueues={queues || []}
        currentUser={user}
      />
    </div>
  )
}
