"use client"

import type { ReactNode } from "react"

import { SessionProvider } from "next-auth/react"

interface AuthProviderProps {
  children: ReactNode
  session?: any
}

export default function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider
      session={session}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
}