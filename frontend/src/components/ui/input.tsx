import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onFocus, onBlur, onChange, value, ...props }, ref) => {
    const isNumberInput = type === "number" && value !== undefined;
    const [isFocused, setIsFocused] = React.useState(false);
    const [draftNumberValue, setDraftNumberValue] = React.useState(
      value === null || value === undefined ? "" : String(value)
    );

    React.useEffect(() => {
      if (isNumberInput && !isFocused) {
        setDraftNumberValue(value === null || value === undefined ? "" : String(value));
      }
    }, [isFocused, isNumberInput, value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isNumberInput) {
        setIsFocused(true);
      }
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isNumberInput) {
        setIsFocused(false);
        // Restore the last committed value if user leaves the field empty.
        if (draftNumberValue === "") {
          setDraftNumberValue(value === null || value === undefined ? "" : String(value));
        }
      }
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumberInput) {
        setDraftNumberValue(e.target.value);
      }
      onChange?.(e);
    };

    return (
      <input
        type={type}
        value={isNumberInput ? draftNumberValue : value}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }