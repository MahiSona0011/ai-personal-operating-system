"use client";
import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

/** Mount once in the root layout. Fully unstyled sonner + token classes, so toasts follow both themes. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-lg border border-border bg-elevated p-3 text-sm text-foreground shadow-sm dark:shadow-none",
          title: "font-medium",
          description: "text-xs text-fg-secondary",
          actionButton:
            "ml-auto shrink-0 rounded-md bg-accent-solid px-2.5 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-solid/90",
          cancelButton: "ml-auto shrink-0 rounded-md px-2.5 py-1 text-xs text-fg-secondary hover:bg-surface",
          closeButton: "border border-border bg-elevated text-fg-secondary hover:text-foreground",
          success: "[&_[data-icon]]:text-success-fg",
          error: "[&_[data-icon]]:text-destructive-fg",
        },
      }}
    />
  );
}
