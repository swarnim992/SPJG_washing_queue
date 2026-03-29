'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { UserIcon, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { joinQueue, finishWashing, cancelQueue, updateEstimatedTime, startWashing, removeTimedOutUser } from '@/app/actions/queue'
import TimerDisplay from '@/components/TimerDisplay'

export default function MachineClient({
  machine,
  initialQueues,
  currentUser
}: {
  machine: any
  initialQueues: any[]
  currentUser: any
}) {
  const [queues, setQueues] = useState(initialQueues)
  const supabase = createClient()
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [hours, setHours] = useState('1')
  const [mins, setMins] = useState('0')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000) // Update every 10s for removable check
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`machine-${machine.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue', filter: `machine_id=eq.${machine.id}` },
        () => router.refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [machine.id, router, supabase])

  useEffect(() => {
    setQueues(initialQueues)
  }, [initialQueues])

  const sortedQueues = queues.sort((a, b) => a.position - b.position)
  const isUserInQueue = queues.some(q => q.user?.id === currentUser?.id)
  const userQueueItem = queues.find(q => q.user?.id === currentUser?.id)
  const currentWashing = queues.find(q => q.status === 'washing')
  const isFirstInLine = sortedQueues.length > 0 && sortedQueues[0].user?.id === currentUser?.id

  const handleAction = async (action: 'join' | 'finish' | 'cancel' | 'updateTime' | 'start' | 'removeTimeout', targetQueueId?: string) => {
    setLoadingAction(action === 'removeTimeout' ? `remove-${targetQueueId}` : action)
    let result: any = { success: true }
    
    if (action === 'join') {
      result = await joinQueue(machine.id)
    } else if (action === 'finish' && userQueueItem) {
      result = await finishWashing(userQueueItem.id, machine.id)
    } else if (action === 'cancel' && userQueueItem) {
      result = await cancelQueue(userQueueItem.id, machine.id)
    } else if (action === 'updateTime' && userQueueItem) {
      const totalMins = (parseInt(hours) || 0) * 60 + (parseInt(mins) || 0)
      result = await updateEstimatedTime(userQueueItem.id, machine.id, totalMins)
    } else if (action === 'start' && userQueueItem) {
      result = await startWashing(userQueueItem.id, machine.id)
    } else if (action === 'removeTimeout' && targetQueueId) {
      result = await removeTimedOutUser(targetQueueId, machine.id)
    }

    if (result?.error) {
      alert(`Error: ${result.error}`)
    } else {
      router.refresh()
    }
    setLoadingAction(null)
  }

  const isRemovable = (q: any) => {
    if (q.status !== 'washing') return false
    const maxWaitMins = Number(process.env.NEXT_PUBLIC_MAX_WAIT_TIME_MINUTES) || 10
    const timeoutTime = new Date(q.estimated_end_time).getTime() + maxWaitMins * 60000
    return now > timeoutTime
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => router.push('/dashboard')}
          className="p-3 rounded-full hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground/80" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-glow tracking-tight">{machine.machine_name}</h1>
          <p className="text-foreground/60">{machine.is_active ? 'Active & Ready' : 'Out of Order'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              Live Queue Status
            </h2>
            
            <div className="space-y-3">
              <AnimatePresence>
                {sortedQueues.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="p-8 text-center text-foreground/50 border border-dashed border-white/10 rounded-xl"
                  >
                    No one is in the queue right now. Be the first!
                  </motion.div>
                ) : (
                  sortedQueues.map((q, idx) => (
                    <motion.div
                      key={q.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, height: 0 }}
                      className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between border gap-4 ${
                        q.status === 'washing' 
                          ? 'bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.1)]' 
                          : q.user?.id === currentUser?.id 
                            ? 'bg-white/10 border-white/20' 
                            : 'bg-black/20 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black ${
                          q.status === 'washing' ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-secondary text-foreground/50'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold truncate ${q.user?.id === currentUser?.id ? 'text-white' : 'text-foreground/80'}`}>
                            {q.user?.name} {q.user?.id === currentUser?.id && '(You)'}
                          </p>
                          <p className="text-xs text-foreground/50 truncate">Room: {q.user?.room_number}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto border-t border-white/5 pt-3 sm:border-0 sm:pt-0">
                        {q.status === 'washing' && (
                          <div className="flex items-center gap-3">
                            <TimerDisplay endTime={q.estimated_end_time} showLabel={true} className="scale-90 origin-left sm:origin-center" />
                            {isRemovable(q) && q.user?.id !== currentUser?.id && (
                              <button
                                onClick={() => handleAction('removeTimeout', q.id)}
                                disabled={loadingAction === `remove-${q.id}`}
                                className="px-3 py-1.5 bg-destructive text-white text-[10px] font-bold rounded-lg hover:bg-destructive/80 transition-colors flex items-center gap-1 shadow-lg shadow-destructive/20"
                              >
                                {loadingAction === `remove-${q.id}` ? '...' : <><XCircle className="w-3 h-3" /> Remove</>}
                              </button>
                            )}
                          </div>
                        )}
                        <div className="text-right flex-shrink-0">
                          <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full ${
                            q.status === 'washing' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-foreground/60'
                          }`}>
                            {q.status}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-white/5 sticky top-24">
            <h2 className="text-lg font-bold mb-4">Actions</h2>
            
            {!machine.is_active ? (
              <div className="p-4 bg-destructive/20 text-destructive border border-destructive/30 rounded-xl text-center text-sm font-semibold">
                Machine is out of order
              </div>
            ) : (
              <div className="space-y-4">
                {!isUserInQueue ? (
                  <button
                    onClick={() => handleAction('join')}
                    disabled={loadingAction === 'join'}
                    className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {loadingAction === 'join' ? 'Joining...' : 'Join Queue Now'}
                  </button>
                ) : (
                  <>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center mb-4 text-sm text-foreground/70">
                      You are in the queue at position <span className="font-bold text-white">{sortedQueues.findIndex(q => q.user?.id === currentUser?.id) + 1}</span>
                    </div>

                    {userQueueItem?.status === 'waiting' && isFirstInLine && (
                      <button
                        onClick={() => handleAction('start')}
                        disabled={loadingAction === 'start'}
                        className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mb-4"
                      >
                         <Clock className="w-5 h-5" />
                         {loadingAction === 'start' ? 'Starting...' : 'Start Washing'}
                      </button>
                    )}

                    {userQueueItem?.status === 'washing' && (
                      <div className="space-y-4 p-4 bg-primary/5 rounded-2xl border border-primary/20 mb-4 animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary/70 mb-2">Estimated Wash Time</h3>
                        <div className="flex gap-3 items-end">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-black uppercase text-foreground/30 ml-1">Hrs</label>
                            <input
                              type="number"
                              value={hours}
                              onChange={(e) => setHours(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-center font-bold font-mono outline-none focus:border-primary transition-all"
                              min="0"
                              max="24"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-black uppercase text-foreground/30 ml-1">Mins</label>
                            <input
                              type="number"
                              value={mins}
                              onChange={(e) => setMins(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-center font-bold font-mono outline-none focus:border-primary transition-all"
                              min="0"
                              max="59"
                            />
                          </div>
                          <button
                            onClick={() => handleAction('updateTime')}
                            disabled={loadingAction === 'updateTime'}
                            className="bg-primary text-primary-foreground p-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex-shrink-0"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-foreground/40 italic pl-1 leading-tight">Setting hours and mins will reset the timer to exactly that much time from now.</p>
                      </div>
                    )}

                    {userQueueItem?.status === 'washing' && (
                      <button
                        onClick={() => handleAction('finish')}
                        disabled={loadingAction === 'finish'}
                        className="w-full py-4 rounded-xl bg-green-500 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                      >
                         <CheckCircle2 className="w-5 h-5" />
                         {loadingAction === 'finish' ? 'Updating...' : 'Mark as Done'}
                      </button>
                    )}

                    <button
                      onClick={() => handleAction('cancel')}
                      disabled={loadingAction === 'cancel'}
                      className="w-full py-4 rounded-xl bg-destructive text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-destructive/20 flex items-center justify-center gap-2"
                    >
                       <XCircle className="w-5 h-5" />
                       {loadingAction === 'cancel' ? 'Cancelling...' : 'Leave Queue'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
