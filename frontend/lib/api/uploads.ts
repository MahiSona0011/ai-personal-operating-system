import apiClient from "./client";
import type { User } from "@/types";

export const uploadsApi = {
  avatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<User>("/uploads/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
