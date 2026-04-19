"use client";

import Image from "next/image";
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
    <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0A0C12]/95 px-4 py-3 backdrop-blur">
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.03] p-2">
            <Image
              src="/branding/partyflow-logo-interface.png"
              alt="PartyFlow logo"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Host Navigation
            </p>
            <h1 className="mt-1 text-sm font-semibold text-white">
              PartyFlow Host
            </h1>
          </div>
        </div>
      </div>

      {/* NAV BUTTONS */}
      <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] p-1.5">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTabChange("queue")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === "queue"
                ? "bg-white text-black shadow-sm"
                : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Queue
          </button>

          <button
            onClick={() => handleTabChange("menu")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === "menu"
                ? "bg-white text-black shadow-sm"
                : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Menu
          </button>

          <button
            onClick={() => router.push("/my-events")}
            className="rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            My Events
          </button>
        </div>
      </div>
    </div>
  );
}