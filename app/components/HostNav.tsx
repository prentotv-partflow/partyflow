"use client";

import { useRouter } from "next/navigation";

type Tab = "menu" | "queue";

type Props = {
  eventId: string;
  activeTab?: Tab;
  onNavigate?: (tab: Tab) => void;
};

export default function HostNav({
  eventId,
  activeTab = "menu",
  onNavigate,
}: Props) {
  const router = useRouter();

  const handleTabChange = (tab: Tab) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0A0C12] px-4 py-3">
      {/* TOP BAR */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-white">PartyFlow Host</h1>
      </div>

      {/* NAV BUTTONS */}
      <div className="mt-3 flex gap-2 text-xs">
        <button
          onClick={() => handleTabChange("queue")}
          className={`rounded-full px-3 py-1 transition ${
            activeTab === "queue"
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Queue
        </button>

        <button
          onClick={() => handleTabChange("menu")}
          className={`rounded-full px-3 py-1 transition ${
            activeTab === "menu"
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Menu
        </button>

        <button
          onClick={() => router.push("/my-events")}
          className="rounded-full bg-white/10 px-3 py-1 text-white transition hover:bg-white/20"
        >
          My Events
        </button>
      </div>
    </div>
  );
}