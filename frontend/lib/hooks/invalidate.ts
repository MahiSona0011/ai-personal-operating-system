import type { QueryClient } from "@tanstack/react-query";

/** Refetch everything derived from check-ins, habits, goals, sessions and metrics:
 * the dashboard, every area page, and the Life Score trend. Call from a mutation's onSuccess. */
export function invalidateInsights(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["areas"] });
  queryClient.invalidateQueries({ queryKey: ["checkin", "trend"] });
}
