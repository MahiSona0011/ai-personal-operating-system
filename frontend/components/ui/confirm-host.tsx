"use client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmStore } from "@/lib/confirm";

/** Renders the dialog behind `confirm()`. Mount once, in the root providers. */
export function ConfirmHost() {
  const options = useConfirmStore((s) => s.options);
  const settle = useConfirmStore((s) => s.settle);

  return (
    <ConfirmDialog
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      title={options?.title ?? ""}
      description={options?.description}
      confirmLabel={options?.confirmLabel}
      cancelLabel={options?.cancelLabel}
      destructive={options?.destructive}
      typeToConfirm={options?.typeToConfirm}
      onConfirm={() => settle(true)}
    />
  );
}
