import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toastError, toastSuccess } from "@/lib/toast";

/**
 * Mutation options (`meta`) understood by the app-wide mutation cache:
 *   successMessage  shown as a success toast when the mutation succeeds
 *   errorMessage    fallback for the error toast when the API gives no message of its own
 *   silent          the caller reports success/failure itself (e.g. it shows an Undo toast), so stay quiet
 */
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { successMessage?: string; errorMessage?: string; silent?: boolean };
  }
}

/**
 * One QueryClient for the app. Its MutationCache is why no mutation can fail silently: every
 * failed mutation shows an error toast unless it opts out with `meta.silent`.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _vars, _ctx, mutation) => {
        const message = mutation.meta?.successMessage;
        if (message && !mutation.meta?.silent) toastSuccess(message);
      },
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return;
        toastError(error, mutation.meta?.errorMessage);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
