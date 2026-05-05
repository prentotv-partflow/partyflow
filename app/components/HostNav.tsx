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
    <div className="px-1 py-1 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.03] p-2.5">
            <Image
              src="/branding/partyflow-logo-interface.png"
              alt="PartyFlow logo"
              width={42}
              height={42}
              className="h-[42px] w-[42px] object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
              PartyFlow Host
            </h1>
            <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-white/35">
              Event Control Center
            </p>
          </div>
        </div>
      </div>

      {/* Tabs (tightened + softly anchored) */}
      <div className="mt-3">
        <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-white/[0.03] p-1">
          <button
            onClick={() => handleTabChange("queue")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === "queue"
                ? "bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Queue
          </button>

          <button
            onClick={() => handleTabChange("menu")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === "menu"
                ? "bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
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