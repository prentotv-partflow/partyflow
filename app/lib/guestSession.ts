import { STORAGE_KEYS } from "./storageKeys";
import type { GuestSession } from "../types/session";

export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEYS.guestSession);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GuestSession;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.guestSession);
    return null;
  }
}

export function setGuestSession(session: GuestSession) {
  localStorage.setItem(STORAGE_KEYS.guestSession, JSON.stringify(session));
}

export function clearGuestSession() {
  localStorage.removeItem(STORAGE_KEYS.guestSession);
}