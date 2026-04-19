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
    <div className="rounded-3xl border border-white/6 bg-[#0E121B]/92 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.03] p-2.5">
            <Image
              src="/branding/partyflow-logo-interface.png"
              alt="PartyFlow logo"
              width={34}
              height={34}
              className="h-[34px] w-[34px] object-contain"
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

      <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-1.5">
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