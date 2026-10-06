"use client";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseRangeParam, rangeToParam, type RangeDays } from "@/lib/range";

/**
 * The selected chart range, kept in the URL as `?range=30d` so a reload or a shared link keeps it.
 * Components using this must sit under a <Suspense> boundary (Next requires it for useSearchParams).
 */
export function useRangeParam(): [RangeDays, (range: RangeDays) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = parseRangeParam(searchParams.get("range"));

  const setRange = useCallback(
    (next: RangeDays) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", rangeToParam(next));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return [range, setRange];
}
