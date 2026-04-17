"use client";

import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
};

export default function HostNav({ eventId }: Props) {
  const router = useRouter();

  const goTo = (path: string) => {
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
          className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          Queue
        </button>

        <button
          onClick={() => goTo("/add-menu")}
          className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          Add Menu
        </button>
      </div>
    </div>
  );
}