"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for deletions. */
  destructive?: boolean;
  /** The user must type this exact text before the confirm button enables (e.g. for account deletion). */
  typeToConfirm?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  typeToConfirm,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const blocked = typeToConfirm !== undefined && typed !== typeToConfirm;

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in" />
        <AlertDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-border bg-surface p-5 shadow-sm dark:shadow-none animate-fade-in"
          )}
        >
          <AlertDialog.Title className="text-base font-semibold text-foreground">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-1.5 text-sm text-fg-secondary">{description}</AlertDialog.Description>
          )}

          {typeToConfirm !== undefined && (
            <div className="mt-4 space-y-1.5">
              <label htmlFor="confirm-type" className="text-xs text-fg-secondary">
                Type <span className="font-semibold text-foreground">{typeToConfirm}</span> to confirm
              </label>
              <input
                id="confirm-type"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={destructive ? "destructive" : "default"}
                disabled={blocked || loading}
                onClick={() => void onConfirm()}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
