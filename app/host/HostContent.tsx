"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HostNav from "@/app/components/HostNav";
import QueueView from "@/app/components/QueueView";

type Tab = "menu" | "queue";

export default function HostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [activeTab, setActiveTab] = useState<Tab>("menu");

  // 🔐 HARD EVENT GUARD
  useEffect(() => {
    if (!eventId) {
      router.replace("/my-events");
    }
  }, [eventId, router]);

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading event...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">

      {/* 🔙 BACK TO HUB */}
      <div className="px-4 pt-4">
        <button
          onClick={() => router.push("/my-events")}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          ← My Events
        </button>
      </div>

      {/* 🔝 HOST NAV (GLOBAL ACTION BAR) */}
      <HostNav
        eventId={eventId}
        onNavigate={setActiveTab}
      />

      {/* 🧭 TAB SWITCHER */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() => setActiveTab("menu")}
          className={`px-4 py-2 rounded-full text-sm transition ${
            activeTab === "menu"
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Menu
        </button>

        <button
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 rounded-full text-sm transition ${
            activeTab === "queue"
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Queue
        </button>
      </div>

      {/* 📦 CONTENT AREA */}
      <div className="p-4 space-y-4">

        {/* MENU TAB */}
        {activeTab === "menu" && (
          <div className="space-y-3">

            <button
              onClick={() =>
                router.push(`/add-menu?event=${eventId}`)
              }
              className="bg-white text-black px-4 py-2 rounded-lg font-medium"
            >
              Open Menu Manager
            </button>

            <p className="text-sm text-gray-400">
              Manage inventory and menu items for this event.
            </p>

          </div>
        )}

        {/* QUEUE TAB (LIVE SYSTEM) */}
        {activeTab === "queue" && (
          <QueueView eventId={eventId} />
        )}

      </div>
    </div>
  );
}