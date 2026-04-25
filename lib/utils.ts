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
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  
  // Required for Firefox
  document.body.appendChild(a);
  
  // Small delay to ensure browser handles the click
  setTimeout(() => {
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }, 0);
}

/**
 * Checks if the current environment is a Capacitor application.
 * This is a client-side check.
 */
export function isCapacitorApp(): boolean {
  if (typeof window === "undefined") return false;
  
  const win = window as any;
  return !!(win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform());
}
