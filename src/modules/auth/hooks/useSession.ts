"use client"

import { useState, useEffect } from "react"

export type Session = {
  user: {
    id: string
    name: string
    phone: string
    role: string
    tenantId: string
  }
} | null

export function useSession() {
  const [data, setData] = useState<Session>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session")
        const json = await res.json()
        if (json.data && json.data.user) {
          setData(json.data)
          setStatus("authenticated")
        } else {
          setData(null)
          setStatus("unauthenticated")
        }
      } catch (err) {
        console.error("fetchSession failed:", err)
        setData(null)
        setStatus("unauthenticated")
      }
    }
    fetchSession()
  }, [])

  return { data, status }
}
