import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-nb-ink placeholder:text-muted-foreground/70 aria-invalid:border-destructive flex field-sizing-content min-h-24 w-full rounded-none border-2 bg-nb-surface px-3 py-2 text-base shadow-[3px_3px_0_0_rgba(20,17,15,0.14)] transition-[color,box-shadow] outline-none focus-visible:border-nb-ink focus-visible:shadow-[3px_3px_0_0_var(--color-nb-ink)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
