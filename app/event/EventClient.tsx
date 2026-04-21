"use client";

import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { setGuestSession } from "../lib/guestSession";

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

  const trimmedName = useMemo(() => name.trim(), [name]);
  const canJoin = trimmedName.length > 0;

  if (!eventId) return null;

  const handleJoin = () => {
    if (!trimmedName) return;

    const session = {
      eventId,
      guestId: crypto.randomUUID(),
      guestName: trimmedName,
    };

    setGuestSession(session);

    router.replace(`/menu?event=${eventId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-[#8B5CFF]/15 bg-[#1B1F2C]/95 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
          <div className="border-b border-white/6 px-6 py-6 text-center">
            <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <Image
                src="/branding/partyflow-logo-interface.png"
                alt="PartyFlow logo"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
              <span className="text-sm font-semibold tracking-tight text-white">
                PartyFlow
              </span>
            </div>

            <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[#B8A6FF]">
              Guest Entry
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Join the Event
            </h1>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Enter your name to open the live guest menu and track your
              requests in real time.
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-2xl border border-[#8B5CFF]/10 bg-[#101522] p-4">
              <label className="mb-2 block text-sm font-medium text-white/80">
                Your Name
              </label>

              <input
                className="w-full rounded-2xl border border-white/10 bg-[#0D111B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#8B5CFF]/60"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleJoin();
                  }
                }}
              />

              <p className="mt-3 text-xs leading-5 text-white/38">
                Your name helps the host identify your requests in the queue.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/6 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                  Live Access
                </p>
                <p className="mt-1 text-sm text-white/72">
                  Enter the menu instantly
                </p>
              </div>

              <div className="rounded-2xl border border-[#8B5CFF]/12 bg-[#8B5CFF]/8 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#D5C7FF]/70">
                  Real Time
                </p>
                <p className="mt-1 text-sm text-[#EEE7FF]">
                  Track request updates live
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/6 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                Event Access
              </p>
              <p className="mt-1 text-sm leading-6 text-white/72">
                Your guest session is stored on this device so you can stay
                connected to this event menu during use.
              </p>
            </div>

            <button
              onClick={handleJoin}
              disabled={!canJoin}
              className="mt-5 w-full rounded-full border border-[#8B5CFF]/30 bg-[#8B5CFF]/24 px-4 py-3 text-sm font-medium text-[#E9E0FF] transition hover:bg-[#8B5CFF]/34 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35"
            >
              Join Event
            </button>

            <p className="mt-3 text-center text-xs text-white/32">
              No sign-in required for guests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}