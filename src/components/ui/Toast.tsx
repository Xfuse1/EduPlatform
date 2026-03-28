"use client"

import { Toaster as SonnerToaster, toast } from "sonner"
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"

export const Toaster = () => {
  return (
    <SonnerToaster
      position="top-right"
      dir="rtl"
      richColors
      closeButton
      duration={4000}
      className="font-sans"
    />
  )
}

export const showToast = {
  success: (message: string, description?: string) => 
    toast.success(message, {
      description,
      icon: <CheckCircle2 className="h-5 w-5" />,
    }),
  error: (message: string, description?: string) => 
    toast.error(message, {
      description,
      icon: <AlertCircle className="h-5 w-5" />,
    }),
  warning: (message: string, description?: string) => 
    toast.warning(message, {
      description,
      icon: <AlertTriangle className="h-5 w-5" />,
    }),
  info: (message: string, description?: string) => 
    toast.info(message, {
      description,
      icon: <Info className="h-5 w-5" />,
    }),
}
