import { toast } from "sonner";

type ApiErrorShape = {
  response?: { status?: number; data?: { detail?: unknown; message?: unknown } };
  request?: unknown;
  message?: string;
};

/** A human-readable message from a failed request. Understands FastAPI's `detail` (string or validation list),
 *  network failures, rate limits and 5xx responses; never returns an empty string. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (typeof err === "string" && err.trim()) return err;
  const e = err as ApiErrorShape | null | undefined;
  if (!e || typeof e !== "object") return fallback;

  const status = e.response?.status;
  const detail = e.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; loc?: unknown[] };
    if (first?.msg) {
      const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1] ?? "") : "";
      return field && field !== "body" ? `${field}: ${first.msg}` : first.msg;
    }
  }
  const message = e.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;

  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status && status >= 500) return "The server hit a problem. Please try again shortly.";
  if (!e.response && e.request) return "Can't reach the server. Check your connection and try again.";
  if (e.message && !e.response) return e.message;
  return fallback;
}

export function toastSuccess(message: string, description?: string) {
  return toast.success(message, { description });
}

export function toastError(err: unknown, fallback?: string) {
  return toast.error(errorMessage(err, fallback));
}

/** A success toast with an Undo action; `onUndo` runs if the user clicks it before the toast closes. */
export function toastUndo(label: string, onUndo: () => void | Promise<void>, durationMs = 6000) {
  return toast(label, {
    duration: durationMs,
    action: { label: "Undo", onClick: () => void onUndo() },
  });
}
