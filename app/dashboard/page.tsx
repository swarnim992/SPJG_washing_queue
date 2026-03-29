import { createClient } from '@/utils/supabase/server'
import DashboardClient from '@/app/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch all machines
  const { data: machines, error } = await supabase
    .from('machines')
    .select('*')
    .order('machine_name', { ascending: true })

  // Fetch active queues (waiting, washing)
  const { data: queues, error: qError } = await supabase
    .from('queue')
    .select(`
      id, machine_id, position, status, start_time, estimated_end_time,
      user:users(id, name, room_number)
    `)
    .in('status', ['waiting', 'washing'])
    .order('position', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="w-full">
      <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-glow tracking-tight">Machine Status</h1>
          <p className="text-foreground/60 mt-1">Real-time overview of all washing machines</p>
        </div>
      </div>

      <DashboardClient
        initialMachines={machines || []}
        initialQueues={(queues as any) || []}
        currentUser={user}
      />
    </div>
  )
}
