"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function EventEntryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");

  // ✅ If no eventId, block entry (safety)
  useEffect(() => {
    if (!eventId) {
      console.error("❌ Missing eventId in /event route");
    }
  }, [eventId]);

  const handleJoin = () => {
    if (!guestName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!eventId) {
      setError("Invalid event");
      return;
    }

    const cleanName = guestName.trim();

    // ✅ Persist guest identity
    localStorage.setItem("guestName", cleanName);

    // ✅ CRITICAL: Preserve eventId in redirect
    router.push(`/menu?event=${eventId}&name=${encodeURIComponent(cleanName)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm space-y-4">
        
        <h1 className="text-xl font-semibold text-center">
          Join Event 🎉
        </h1>

        <input
          type="text"
          placeholder="Enter your name"
          value={guestName}
          onChange={(e) => {
            setGuestName(e.target.value);
            setError("");
          }}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />

        {error && (
          <p className="text-red-500 text-xs text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleJoin}
          className="w-full bg-black text-white py-2 rounded-lg text-sm"
        >
          Enter Event
        </button>

      </div>
    </div>
  );
}