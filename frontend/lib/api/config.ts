// Sridinesh flips USE_MOCK to false after the final branch merge.
// You never change this value yourself.
export const USE_MOCK = true;
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
