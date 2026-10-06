"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { SHORTCUTS } from "@/lib/hotkeys";
import { Button } from "@/components/ui/button";
import { useCommandStore } from "@/store/commandStore";

/** The "?" sheet: every keyboard shortcut. */
export function ShortcutSheet() {
  const open = useCommandStore((s) => s.helpOpen);
  const setOpen = useCommandStore((s) => s.setHelpOpen);

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-sm dark:shadow-none">
          <AlertDialog.Title className="text-base font-semibold text-foreground">Keyboard shortcuts</AlertDialog.Title>
          <AlertDialog.Description className="sr-only">Shortcuts work anywhere except while typing in a field.</AlertDialog.Description>
          <ul className="mt-3 divide-y divide-border">
            {SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="text-foreground">{s.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {s.keys.map((k, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && s.keys[0] === "g" && <span className="text-xs text-fg-muted">then</span>}
                      <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-sans text-xs text-fg-secondary">{k}</kbd>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">Close</Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
