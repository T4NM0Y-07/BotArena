import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-[3px] border-transparent text-sm font-semibold tracking-tight transition-[transform,box-shadow,background-color,color] duration-150 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default:
          "border-nb-ink bg-nb-lime text-nb-ink shadow-[4px_4px_0_0_var(--color-nb-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#d5fa80] hover:shadow-[2px_2px_0_0_var(--color-nb-ink)]",
        destructive:
          "border-nb-ink bg-nb-red text-nb-ink shadow-[4px_4px_0_0_var(--color-nb-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-nb-ink)]",
        outline:
          "border-nb-ink bg-nb-surface text-nb-ink shadow-[4px_4px_0_0_var(--color-nb-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-nb-sand hover:shadow-[2px_2px_0_0_var(--color-nb-ink)]",
        secondary:
          "border-nb-ink bg-nb-sand text-nb-ink shadow-[4px_4px_0_0_var(--color-nb-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-nb-ink)]",
        ghost:
          "border-transparent bg-transparent text-foreground hover:border-nb-ink hover:bg-nb-sand",
        link: "border-transparent bg-transparent px-1 text-foreground underline decoration-2 underline-offset-4 hover:bg-nb-lime",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 px-6 text-base has-[>svg]:px-4",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
