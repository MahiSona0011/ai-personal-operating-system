"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

import { createContext, useContext } from "react";
const SelectContext = createContext<SelectContextValue>({
  open: false,
  setOpen: () => {},
});

export function Select({ value, onValueChange, children, disabled }: SelectProps) {
  const [open, setOpen] = useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen: disabled ? () => {} : setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex items-center justify-between w-full h-9 px-3 rounded-md border border-border bg-transparent text-sm text-foreground hover:bg-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-accent",
        className
      )}
    >
      {children}
      <ChevronDown size={14} className={cn("ml-2 transition-transform", open && "rotate-180")} />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useContext(SelectContext);
  return <span className={cn(!value && "text-muted-foreground")}>{value || placeholder}</span>;
}

export function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = useContext(SelectContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-surface shadow-lg py-1 max-h-60 overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { value: selected, onValueChange, setOpen } = useContext(SelectContext);
  return (
    <div
      onClick={() => { onValueChange?.(value); setOpen(false); }}
      className={cn(
        "px-3 py-2 text-sm cursor-pointer hover:bg-elevated transition-colors",
        selected === value && "text-accent-fg font-medium",
        className
      )}
    >
      {children}
    </div>
  );
}
