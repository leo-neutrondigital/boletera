"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Collapsible = ({ open = false, onOpenChange, children }: CollapsibleProps) => {
  const [isOpen, setIsOpen] = React.useState(open)

  React.useEffect(() => {
    setIsOpen(open)
  }, [open])

  const handleToggle = React.useCallback(() => {
    const newState = !isOpen
    setIsOpen(newState)
    onOpenChange?.(newState)
  }, [isOpen, onOpenChange])

  return (
    <div data-state={isOpen ? "open" : "closed"}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === CollapsibleTrigger) {
            return React.cloneElement(child as React.ReactElement<CollapsibleTriggerProps>, { onClick: handleToggle })
          }
          if (child.type === CollapsibleContent) {
            return React.cloneElement(child as React.ReactElement<CollapsibleContentProps>, { isOpen })
          }
        }
        return child
      })}
    </div>
  )
}

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  asChild?: boolean
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, asChild = false, onClick, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ...props,
        ref,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(e)
          children.props.onClick?.(e)
        },
      })
    }

    return (
      <button ref={ref} onClick={onClick} {...props}>
        {children}
      </button>
    )
  }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  isOpen?: boolean
}

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, className, isOpen = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
          className
        )}
        {...props}
      >
        <div className={isOpen ? "block" : "hidden"}>
          {children}
        </div>
      </div>
    )
  }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
