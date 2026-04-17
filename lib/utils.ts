import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Saves a Blob to the user's device and attempts to open it.
 * This is primarily for web-based downloads.
 */
export function saveAndOpenBlob(blob: Blob, filename: string, contentType: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Checks if the current environment is a Capacitor application.
 * This is a client-side check.
 */
export function isCapacitorApp(): boolean {
  return typeof window !== "undefined" && typeof (window as any).Capacitor !== "undefined";
}
