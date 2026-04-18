"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type GuestSession = {
  eventId: string;
  guestId: string;
  guestName: string;
};

const SESSION_KEY = "partyflow_guest_session";

function setSession(session: GuestSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export default function EventPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // 🚨 HARD GUARD
  useEffect(() => {
    if (!eventId) {
      router.replace("/my-events");
    }
  }, [eventId, router]);

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-white">
        Invalid event link
      </div>
    );
  }

  const handleJoin = () => {
    if (!name.trim()) return;

    setLoading(true);

    const guestId =
      crypto.randomUUID?.() ||
      Math.random().toString(36).substring(2);

    setSession({
      eventId,
      guestId,
      guestName: name.trim(),
    });

    router.replace(`/menu?event=${eventId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-white p-4">

      <div className="w-full max-w-sm space-y-4">

        <h1 className="text-xl font-semibold text-center">
          Enter Event
        </h1>

        <p className="text-sm text-gray-400 text-center">
          You’re joining event: {eventId}
        </p>

        <input
          className="w-full p-3 rounded bg-white text-black"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-white text-black p-3 rounded font-medium disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join Event"}
        </button>

      </div>

    </div>
  );
}