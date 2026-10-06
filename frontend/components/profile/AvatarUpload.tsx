"use client";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadsApi } from "@/lib/api/uploads";
import { useAuthStore } from "@/store/authStore";

export function AvatarUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const initials = (user?.display_name ?? user?.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("File must be an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const updated = await uploadsApi.avatar(file);
      setUser(updated);
    } catch {
      setError("Upload failed — check your connection and try again");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="relative group w-16 h-16 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-accent/10 flex items-center justify-center text-lg font-bold text-accent-fg">
            {initials}
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <Loader2 size={18} className="text-white animate-spin" />
          ) : (
            <Camera size={18} className="text-white" />
          )}
        </div>
      </button>

      <p className="text-xs text-fg-secondary">
        Click to change · jpeg, png, webp, gif · max 5 MB
      </p>

      {error && <p className="text-xs text-destructive-fg">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
