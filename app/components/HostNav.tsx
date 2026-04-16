"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function HostNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const goTo = (path: string) => {
    if (!eventId) return;
    router.push(`${path}?event=${eventId}`);
  };

  return (
    <div className="sticky top-0 z-20 bg-[#0A0C12] border-b border-white/5 px-4 py-3 flex justify-between items-center">

      <h1 className="text-sm font-semibold text-white">
        PartyFlow Host
      </h1>

      <div className="flex gap-2 text-xs">
        <button
          onClick={() => goTo("/host")}
          className="px-3 py-1 rounded-full bg-white/10 text-white"
        >
          Queue
        </button>

        <button
          onClick={() => goTo("/add-menu")}
          className="px-3 py-1 rounded-full bg-white/10 text-white"
        >
          Add Menu
        </button>
      </div>
    </div>
  );
}