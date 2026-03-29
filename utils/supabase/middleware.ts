import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isLoginPage = path.startsWith('/login')
  const isAuthCallback = path.startsWith('/auth/callback')

  if (isAuthCallback) {
    return supabaseResponse
  }

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // If user is logged in and trying to access login page, redirect to dashboard
    if (isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Check if user has room_number setup
    const { data: dbUser } = await supabase.from('users').select('room_number').eq('id', user.id).single()
    const isOnboarding = path.startsWith('/onboarding')
    const hasRoomNumber = !!dbUser?.room_number

    if (!hasRoomNumber && !isOnboarding) {
       const url = request.nextUrl.clone()
       url.pathname = '/onboarding'
       return NextResponse.redirect(url)
    }

    if (hasRoomNumber && isOnboarding) {
       const url = request.nextUrl.clone()
       url.pathname = '/dashboard'
       return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
