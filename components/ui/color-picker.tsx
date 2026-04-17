import * as React from "react"

import { cn } from "@/lib/utils"

export interface ColorPickerProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const ColorPicker = React.forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.(event.target.value);
    };

    return (
      <input
        type="color"
        ref={ref}
        className={cn(
          "w-10 h-10 rounded-md border border-input cursor-pointer",
          className
        )}
        value={value}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
ColorPicker.displayName = "ColorPicker"

export { ColorPicker }
