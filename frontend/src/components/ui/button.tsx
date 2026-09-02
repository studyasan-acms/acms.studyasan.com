import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2",
  {
    variants: {
      variant: {
        // shadcn defaults
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-saBlueSubtle hover:text-saBlue",
        link:
          "text-primary underline-offset-4 hover:underline",
        // StudyAsan brand variants
        "brand-primary":
          "bg-saBlue text-white hover:bg-saBlueDarkHover shadow-sm active:translate-y-px",
        "brand-accent":
          "bg-saVividOrange text-white hover:bg-saOrangeDark shadow-sm active:translate-y-px",
        "brand-outline":
          "border border-saBlue text-saBlue hover:bg-saBlueSubtle",
        "brand-ghost":
          "text-saBlue hover:bg-saBlueSubtle",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs:  "h-7 rounded-md px-2.5 text-xs",
        sm:  "h-9 rounded-md px-3",
        lg:  "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }