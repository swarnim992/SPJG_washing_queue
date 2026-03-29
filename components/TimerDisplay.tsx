'use client'

import { useEffect, useState } from 'react'

interface TimerDisplayProps {
  endTime: string | null
  className?: string
  showLabel?: boolean
}

export default function TimerDisplay({ endTime, className = '', showLabel = true }: TimerDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)
  const [isGracePeriod, setIsGracePeriod] = useState(false)
  const [isFullyTimedOut, setIsFullyTimedOut] = useState(false)

  useEffect(() => {
    if (!endTime) return

    const maxWaitMins = Number(process.env.NEXT_PUBLIC_MAX_WAIT_TIME_MINUTES) || 10
    const end = new Date(endTime).getTime()
    const graceEnd = end + maxWaitMins * 60000

    const calculateTime = () => {
      const now = new Date().getTime()
      const diffToEnd = end - now
      const diffToGraceEnd = graceEnd - now
      
      if (diffToEnd > 0) {
        // Normal countdown
        setIsExpired(false)
        setIsGracePeriod(false)
        setIsFullyTimedOut(false)
        setTimeLeft(formatTime(diffToEnd))
      } else if (diffToGraceEnd > 0) {
        // Grace period
        setIsExpired(true)
        setIsGracePeriod(true)
        setIsFullyTimedOut(false)
        setTimeLeft(formatTime(diffToGraceEnd))
      } else {
        // Fully timed out
        setIsExpired(true)
        setIsGracePeriod(false)
        setIsFullyTimedOut(true)
        setTimeLeft('TIMED OUT')
      }
    }

    const formatTime = (ms: number) => {
      const absMs = Math.abs(ms)
      const hours = Math.floor(absMs / (1000 * 60 * 60))
      const mins = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((absMs % (1000 * 60)) / 1000)
      return `${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)

    return () => clearInterval(timer)
  }, [endTime])

  if (!endTime) return null

  return (
    <div className={`${className} flex flex-col items-center`}>
      {showLabel && (
        <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${
          isFullyTimedOut ? 'text-destructive' : isGracePeriod ? 'text-amber-500' : 'text-foreground/30'
        }`}>
          {isFullyTimedOut ? 'Removable' : isGracePeriod ? 'Grace Period' : 'Remaining'}
        </span>
      )}
      <span className={`font-mono font-bold tabular-nums transition-colors ${
        isFullyTimedOut ? 'text-destructive animate-pulse' : 
        isGracePeriod ? 'text-amber-500' : 
        'text-primary'
      }`}>
        {timeLeft}
      </span>
    </div>
  )
}
