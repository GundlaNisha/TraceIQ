import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseUTCDate(dateString: string | undefined): Date {
  if (!dateString) return new Date();
  return new Date(dateString.endsWith("Z") ? dateString : dateString + "Z");
}
