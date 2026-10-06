import apiClient from "./client";

export const exportApi = {
  downloadCheckins: (days = 90) =>
    apiClient
      .get(`/export/checkins.csv?days=${days}`, { responseType: "blob" })
      .then((r) => r.data as Blob),

  downloadHabits: (days = 90) =>
    apiClient
      .get(`/export/habits.csv?days=${days}`, { responseType: "blob" })
      .then((r) => r.data as Blob),
};

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
