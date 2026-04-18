export type GuestSession = {
  eventId: string;
  guestId: string;
  guestName: string;
};

const KEY = "partyflow_guest_session";

export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  return JSON.parse(raw);
}

export function setGuestSession(session: GuestSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearGuestSession() {
  localStorage.removeItem(KEY);
}