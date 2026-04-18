"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function EventClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [name, setName] = useState("");

  useEffect(() => {
    if (!eventId) {
      router.replace("/my-events");
    }
  }, [eventId, router]);

  if (!eventId) return null;

  const handleJoin = () => {
    if (!name.trim()) return;

    const session = {
      eventId,
      guestId: crypto.randomUUID(),
      guestName: name.trim(),
    };

    localStorage.setItem("partyflow_guest_session", JSON.stringify(session));

    router.replace(`/menu?event=${eventId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-white p-4">
      <div className="w-full max-w-sm space-y-4">

        <h1 className="text-xl font-semibold text-center">
          Enter Event
        </h1>

        <input
          className="w-full p-3 rounded text-black"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={handleJoin}
          className="w-full bg-white text-black p-3 rounded"
        >
          Join Event
        </button>

      </div>
    </div>
  );
}