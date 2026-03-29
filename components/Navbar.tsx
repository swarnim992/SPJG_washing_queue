'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LogOut, User as UserIcon, ShieldCheck } from 'lucide-react'
import { User } from '@supabase/supabase-js'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) checkAdminRole(session.user.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkAdminRole(session.user.id)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    
    setIsAdmin(data?.role === 'admin')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="glass sticky top-0 z-50 w-full px-4 py-3 flex justify-between items-center shadow-lg shadow-black/20 rounded-b-2xl border-x-0 border-t-0 border-b border-white/5">
      <div className="flex items-center gap-6">
        <div 
          className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent cursor-pointer tracking-tighter"
          onClick={() => router.push('/dashboard')}
        >
          WashQueue
        </div>
        
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent/80 hover:text-accent bg-accent/5 hover:bg-accent/10 border border-accent/10 hover:border-accent/30 rounded-full transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </button>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/70 bg-white/5 p-1.5 sm:px-3 sm:py-1.5 rounded-full border border-white/5">
            <UserIcon className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline max-w-[100px] truncate">{user.user_metadata?.full_name || user.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 text-sm font-bold transition-all hover:bg-destructive/20 hover:text-destructive text-foreground/80 rounded-xl border border-white/5 hover:border-destructive/30"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      )}
    </nav>
  )
}
