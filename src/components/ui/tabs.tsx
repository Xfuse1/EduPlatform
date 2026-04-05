"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Tabs = ({ defaultValue, children, className, onValueChange }: { 
  defaultValue?: string, 
  children: React.ReactNode, 
  className?: string,
  onValueChange?: (value: string) => void
}) => {
  const [value, setValue] = React.useState(defaultValue)
  
  const handleValueChange = (val: string) => {
    setValue(val)
    if (onValueChange) onValueChange(val)
  }

  return (
    <div className={cn("w-full", className)}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<any>, { 
          activeValue: value, 
          onValueChange: handleValueChange 
        })
      })}
    </div>
  )
}

const TabsList = ({ children, className, activeValue, onValueChange }: any) => (
  <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
    {React.Children.map(children, child => {
      if (!React.isValidElement(child)) return child
      return React.cloneElement(child as React.ReactElement<any>, { 
        activeValue, 
        onValueChange 
      })
    })}
  </div>
)

const TabsTrigger = ({ value, children, className, activeValue, onValueChange }: any) => {
  const isActive = activeValue === value
  return (
    <button
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

const TabsContent = ({ value, children, className, activeValue }: any) => {
  if (activeValue !== value) return null
  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
