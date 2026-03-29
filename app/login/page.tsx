'use client'

import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { WashingMachine } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-10 md:p-14 rounded-[3rem] w-full max-w-md relative overflow-hidden group border-white/10"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-primary opacity-30 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="text-center mb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 bg-primary/20 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.2)] relative overflow-hidden"
          >
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 5, 0],
                y: [0, -2, 0, -2, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <WashingMachine className="w-10 h-10 text-primary" strokeWidth={2.5} />
            </motion.div>
            
            {/* Spinning "water" effect around the icon */}
            <div className="absolute inset-2 border-2 border-primary/30 border-t-primary rounded-full animate-[spin_4s_linear_infinite]" />
          </motion.div>
          <motion.h1 
            className="text-4xl font-black mb-3 text-glow tracking-tighter"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            SPJG WashQueue
          </motion.h1>
          <motion.p 
            className="text-foreground/40 font-medium tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Next-gen laundry management.
          </motion.p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full relative flex items-center justify-center gap-4 bg-white text-black py-4.5 px-6 rounded-2xl font-bold shadow-2xl shadow-white/5 transition-all disabled:opacity-50"
        >
          {isLoading ? (
             <WashingMachine className="w-5 h-5 animate-spin text-primary" strokeWidth={3} />
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </>
          )}
        </motion.button>
        
        <p className="text-center mt-10 text-[10px] text-foreground/20 font-bold uppercase tracking-[0.2em]">
          Securely handled by Supabase
        </p>
      </motion.div>
    </div>
  )
}
