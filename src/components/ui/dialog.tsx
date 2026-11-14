import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className="dialog-content">
        <DialogPrimitive.Title className="font-display text-2xl">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Close aria-label="Fechar" className="dialog-close">
          ×
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
