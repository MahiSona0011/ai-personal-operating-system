"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createQueryClient } from "@/lib/query-client";
import { ConfirmHost } from "@/components/ui/confirm-host";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ConfirmHost />
    </QueryClientProvider>
  );
}
