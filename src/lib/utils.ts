import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLatency(latencyInSeconds: number): string {
  if (latencyInSeconds < 1) {
    return `${Math.round(latencyInSeconds * 1000)}ms`;
  } else if (latencyInSeconds < 60) {
    return `${Math.round(latencyInSeconds)}s`;
  } else {
    const minutes = Math.floor(latencyInSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}
