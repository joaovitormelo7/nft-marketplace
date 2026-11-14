import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
};
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "default", size = "default", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn("button", `button-${variant}`, `button-${size}`, className)}
      {...props}
    />
  );
});
