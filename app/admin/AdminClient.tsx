'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { addMachine, toggleMachineActive, adminRemoveFromQueue } from '../actions/admin'
import { Trash2, Plus, Power, ShieldAlert } from 'lucide-react'

export default function AdminClient({ initialMachines, initialQueues }: any) {
  const [machines, setMachines] = useState(initialMachines)
  const [queues, setQueues] = useState(initialQueues)
  const [newMachineName, setNewMachineName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreateMachine = async () => {
    if (!newMachineName.trim()) return
    setLoading(true)
    const result = await addMachine(newMachineName)
    console.log('Add machine result:', result)
    setLoading(false)
    
    if (result?.error) {
      alert(`Error: ${result.error}`)
    } else {
      setNewMachineName('')
      window.location.reload()
    }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    await toggleMachineActive(id, current)
    window.location.reload()
  }

  const handleRemoveUser = async (queueId: string) => {
    if (confirm('Are you sure you want to remove this user from the queue?')) {
      await adminRemoveFromQueue(queueId)
      window.location.reload()
    }
  }

  return (
    <div className="space-y-12">
      {/* Create Machine Section */}
      <section className="glass-card p-8 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
          <Plus className="text-accent" /> Add New Machine
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <input
            type="text"
            value={newMachineName}
            onChange={(e) => setNewMachineName(e.target.value)}
            placeholder="e.g., Machine 5"
            className="flex-1 px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/30 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
          />
          <button
            onClick={handleCreateMachine}
            disabled={loading || !newMachineName.trim()}
            className="px-8 py-3.5 bg-accent text-white font-black rounded-2xl shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Create Machine'}
          </button>
        </div>
      </section>

      {machines.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl border border-white/5 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-foreground/20" />
          </div>
          <h3 className="text-xl font-bold text-foreground/40 italic">No machines found</h3>
          <p className="text-sm text-foreground/20 mt-1">Use the panel above to add your first machine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine: any) => {
            const machineQueue = queues
               .filter((q: any) => q.machine_id === machine.id)
               .sort((a: any, b: any) => a.position - b.position)

            return (
              <motion.div key={machine.id} className="glass-card p-6 rounded-3xl border border-white/5 relative group transition-all hover:border-accent/30">
                 {/* Controls */}
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-black tracking-tight">{machine.machine_name}</h3>
                   <button
                     onClick={() => handleToggleActive(machine.id, machine.is_active)}
                     className={`p-2.5 rounded-xl transition-all ${
                        machine.is_active ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                     }`}
                     title={machine.is_active ? 'Mark as Out of Order' : 'Mark as Active'}
                   >
                     <Power className="w-5 h-5" />
                   </button>
                 </div>

                 {/* Queue Management */}
                 <div className="space-y-3">
                   {machineQueue.length === 0 ? (
                      <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest py-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
                        Empty Queue
                      </p>
                   ) : (
                      machineQueue.map((q: any, idx: number) => (
                        <div key={q.id} className="flex justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5 transition-colors hover:bg-white/[0.05]">
                           <div className="overflow-hidden">
                             <p className="font-bold text-sm text-foreground/80 truncate">{q.user?.name}</p>
                             <p className="text-[10px] text-foreground/40 font-black uppercase tracking-wider truncate">Room: {q.user?.room_number}</p>
                           </div>
                           <button
                             onClick={() => handleRemoveUser(q.id)}
                             className="p-2.5 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all shrink-0"
                             title="Force remove user"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      ))
                   )}
                 </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
