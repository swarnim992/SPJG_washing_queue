import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import { ShieldAlert, ShieldCheck } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (dbUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 bg-destructive/10 rounded-3xl flex items-center justify-center mb-8 border border-destructive/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">Access Denied</h1>
        <p className="text-foreground/40 max-w-sm font-medium">You do not have administrative privileges to access this console.</p>
        <button 
          onClick={() => redirect('/dashboard')}
          className="mt-10 px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-sm font-bold transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  // Fetch machines and active queues
  const { data: machines } = await supabase.from('machines').select('*').order('machine_name')
  const { data: queues } = await supabase
    .from('queue')
    .select(`
      id, machine_id, position, status,
      user:users(id, name, room_number)
    `)
    .in('status', ['waiting', 'washing'])
    .order('position', { ascending: true })

  return (
    <div className="w-full">
      <div className="mb-10 p-6 bg-accent/5 border border-accent/10 rounded-3xl flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.1)_0%,transparent_50%)]" />
         <div className="relative z-10">
            <h1 className="text-4xl font-black text-glow tracking-tighter text-white">Admin Console</h1>
            <p className="text-foreground/40 mt-1 font-medium italic">High-level control of machines and user sessions.</p>
         </div>
         <div className="hidden md:flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 relative z-10">
            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <p className="text-xs font-black uppercase tracking-widest text-foreground/30">Auth Level</p>
               <p className="text-sm font-bold text-accent">Administrator</p>
            </div>
         </div>
      </div>
      
      <AdminClient 
        initialMachines={machines || []} 
        initialQueues={queues || []}
      />
    </div>
  )
}
