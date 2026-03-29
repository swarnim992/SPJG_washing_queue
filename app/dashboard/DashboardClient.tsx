'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { WashingMachine, Clock, UserIcon, ArrowRight, Activity, Ban } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { joinQueue } from '../actions/queue'

type Machine = {
  id: string
  machine_name: string
  status: string
  is_active: boolean
}

type QueueItem = {
  id: string
  machine_id: string
  position: number
  status: string
  start_time: string | null
  estimated_end_time: string | null
  user: {
    id: string
    name: string
    room_number: string
  }
}

import TimerDisplay from '@/components/TimerDisplay'

export default function DashboardClient({
  initialMachines,
  initialQueues,
  currentUser
}: {
  initialMachines: Machine[]
  initialQueues: QueueItem[]
  currentUser: any
}) {
  const [machines, setMachines] = useState(initialMachines)
  const [queues, setQueues] = useState(initialQueues)
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        (payload) => {
          // Trigger a lightweight soft refresh of the router to refetch Server Components data
          // Or we can manually merge state here if preferred.
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machines' },
        (payload) => router.refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  // Effect to sync prop updates from Server Component refresh
  useEffect(() => {
    setMachines(initialMachines)
    setQueues(initialQueues)
  }, [initialMachines, initialQueues])

  const handleJoin = async (machineId: string) => {
    setLoading(machineId)
    await joinQueue(machineId)
    setLoading(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {machines.map((machine, idx) => {
        const machineQueue = queues
          .filter(q => q.machine_id === machine.id)
          .sort((a, b) => a.position - b.position)
        
        const currentWashing = machineQueue.find(q => q.status === 'washing')
        const nextInLine = machineQueue.find(q => q.status === 'waiting')
        const qLength = machineQueue.filter(q => q.status === 'waiting').length

        const isUserInQueue = machineQueue.some(q => q.user?.id === currentUser?.id)

        return (
          <motion.div
            key={machine.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
            className={`glass-card rounded-3xl overflow-hidden relative group border ${!machine.is_active ? 'border-destructive/30' : 'border-white/5 hover:border-primary/40 hover:shadow-primary/10 shadow-xl shadow-black/20'} transition-all duration-500`}
          >
            {/* Glow logic */}
            {machine.is_active && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            <div className="p-6">
              <div className="flex justify-between items-start mb-6 relative">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${
                    !machine.is_active ? 'bg-destructive/20 text-destructive' :
                    currentWashing ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-500'
                  }`}>
                    {machine.is_active ? <WashingMachine className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{machine.machine_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${
                           !machine.is_active ? 'bg-destructive animate-pulse' :
                           currentWashing ? 'bg-primary animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                        }`} />
                        <span className="text-[10px] text-foreground/40 font-black tracking-[0.2em] uppercase">
                           {!machine.is_active ? 'Offline' : currentWashing ? 'In Use' : 'Ready'}
                        </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 transition-colors group-hover:bg-white/10">
                  <p className="text-[10px] text-foreground/40 mb-2 uppercase tracking-[0.2em] font-black">Current User</p>
                  {currentWashing ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-accent/20 flex-shrink-0 flex items-center justify-center text-accent border border-accent/20">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground/90 leading-none mb-1 truncate">{currentWashing.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-foreground/40 font-medium leading-none truncate">Room: {currentWashing.user?.room_number}</p>
                        </div>
                      </div>
                      <div className="flex justify-end sm:block">
                        <TimerDisplay endTime={currentWashing.estimated_end_time} showLabel={false} className="items-end" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-foreground/30 italic">No active session</p>
                  )}
                </div>

                <div className="flex justify-between items-center px-1">
                  <div>
                    <p className="text-[10px] text-foreground/40 uppercase tracking-[0.2em] font-black mb-1">Queue Size</p>
                    <p className="text-2xl font-black font-mono text-glow">{qLength}</p>
                  </div>
                  {nextInLine && (
                    <div className="text-right">
                       <p className="text-[10px] text-foreground/40 uppercase tracking-[0.2em] font-black mb-1">Next up</p>
                       <p className="text-sm font-bold text-foreground/70">{nextInLine.user?.name.split(' ')[0]}</p>
                    </div>
                  )}
                </div>
              </div>

              {machine.is_active && (
                <div className="mt-6 flex gap-3 relative z-10">
                   <button
                     onClick={() => router.push(`/machine/${machine.id}`)}
                     className="flex-1 py-3 px-4 rounded-xl bg-secondary/80 text-foreground text-sm font-bold border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                   >
                     View Details <ArrowRight className="w-4 h-4" />
                   </button>
                   
                   {!isUserInQueue && (
                     <button
                       onClick={() => handleJoin(machine.id)}
                       disabled={loading === machine.id}
                       className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50"
                     >
                       {loading === machine.id ? 'Joining...' : 'Join Queue'}
                     </button>
                   )}
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
