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
    <div className="min-h-screen bg-[#0A0C12] text-white px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-white/8 bg-[#191C24] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
              Guest Entry
            </p>

            <h1 className="mt-2 text-2xl font-semibold">
              Enter Event
            </h1>

            <p className="mt-2 text-sm text-white/55">
              Add your name to join the event menu and track your requests.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <div>
              <label className="mb-2 block text-sm text-white/80">
                Your Name
              </label>

              <input
                className="w-full rounded-2xl border border-white/10 bg-[#0F1218] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#508CFF]/60"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleJoin();
                  }
                }}
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={!name.trim()}
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
            >
              Join Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}