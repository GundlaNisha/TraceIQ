import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses backend UTC datetime strings into a localized Date object.
 * Correctly handles naive ISO strings ("2026-08-20T15:37:27") and explicit UTC strings ("...Z", "+00:00").
 */
export function parseUTCDate(dateInput: string | Date | undefined | null): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  const str = String(dateInput).trim();
  if (!str) return new Date();

  // If it already has timezone indicator ('Z' or timezone offset +HH:MM or -HH:MM at end), parse directly
  if (str.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(str) || /[+-]\d{4}$/.test(str)) {
    return new Date(str);
  }

  // Otherwise, backend stored timestamp in UTC without offset, append 'Z'
  return new Date(`${str}Z`);
}

/**
 * Formats relative time ("3 minutes ago", "just now") in the user's local timezone.
 */
export function formatTimeAgo(dateInput: string | Date | undefined | null): string {
  try {
    const d = parseUTCDate(dateInput);
    if (isNaN(d.getTime())) return "recently";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "recently";
  }
}

/**
 * Formats full human-readable date & time in the user's local timezone.
 */
export function formatDateTime(dateInput: string | Date | undefined | null): string {
  try {
    const d = parseUTCDate(dateInput);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Recently";
  }
}
