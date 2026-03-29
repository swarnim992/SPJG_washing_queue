'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { setRoomNumber } from '../actions/user'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const [room, setRoom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!room.trim()) return

    setLoading(true)
    setError(null)
    
    try {
      const res = await setRoomNumber(room.trim())
      if (res.error) {
        setError(res.error)
      } else {
        // Hard refresh to ensure middleware sees the updated database records
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 md:p-12 rounded-3xl w-full max-w-md relative overflow-hidden"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2 text-glow">Welcome to WashQueue</h1>
          <p className="text-foreground/70">Please set your room number to continue so others know who's using the machine.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="room" className="text-sm font-semibold text-foreground/80 pl-1">
              Room Number
            </label>
            <input
              id="room"
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g., A-101"
              required
              className="px-4 py-3 rounded-xl bg-background border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-foreground/30"
            />
          </div>

          {error && <p className="text-destructive text-sm font-medium px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading || !room.trim()}
            className="w-full relative flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white py-4 px-6 rounded-2xl font-bold shadow-xl transition-all hover:shadow-primary/30 disabled:opacity-50 mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Continue <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
