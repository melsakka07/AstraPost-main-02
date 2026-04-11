import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
  "checked"
> {
  checked?: boolean | "indeterminate";
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, indeterminate, checked, onCheckedChange, ...props }, ref) => {
    // Determine the final checked state for the Radix primitive
    const primitiveChecked = indeterminate ? "indeterminate" : (checked ?? false);

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={primitiveChecked}
        onCheckedChange={(newChecked: boolean | "indeterminate") => {
          onCheckedChange?.(newChecked);
        }}
        className={cn(
          "peer border-primary bg-background ring-offset-background focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground size-4 shrink-0 rounded-sm border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn("flex items-center justify-center text-current")}
        >
          {indeterminate ? <Minus className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
