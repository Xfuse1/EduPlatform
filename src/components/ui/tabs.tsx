"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type TabsContextValue = {
  activeValue: string | undefined
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext(component: string): TabsContextValue {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error(`${component} must be used within a <Tabs> component`)
  }
  return context
}

type TabsProps = {
  defaultValue?: string
  value?: string
  children: React.ReactNode
  className?: string
  onValueChange?: (value: string) => void
}

const Tabs = ({ defaultValue, value: controlledValue, children, className, onValueChange }: TabsProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const value = controlledValue !== undefined ? controlledValue : internalValue

  const handleValueChange = React.useCallback(
    (val: string) => {
      if (controlledValue === undefined) setInternalValue(val)
      if (onValueChange) onValueChange(val)
    },
    [controlledValue, onValueChange]
  )

  const contextValue = React.useMemo<TabsContextValue>(
    () => ({ activeValue: value, onValueChange: handleValueChange }),
    [value, handleValueChange]
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

type TabsListProps = {
  children: React.ReactNode
  className?: string
}

const TabsList = ({ children, className }: TabsListProps) => (
  <div className={cn("inline-flex min-h-10 max-w-full items-center justify-start overflow-x-auto rounded-md bg-muted p-1 text-muted-foreground", className)}>
    {children}
  </div>
)

type TabsTriggerProps = {
  value: string
  children: React.ReactNode
  className?: string
}

const TabsTrigger = ({ value, children, className }: TabsTriggerProps) => {
  const { activeValue, onValueChange } = useTabsContext("TabsTrigger")
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

type TabsContentProps = {
  value: string
  children: React.ReactNode
  className?: string
}

const TabsContent = ({ value, children, className }: TabsContentProps) => {
  const { activeValue } = useTabsContext("TabsContent")
  if (activeValue !== value) return null
  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
