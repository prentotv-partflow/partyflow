"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HostNav from "@/app/components/HostNav";
import QueueTab from "@/app/host/QueueTab";

type Tab = "menu" | "queue";

export default function HostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");
  const [activeTab, setActiveTab] = useState<Tab>("menu");

  useEffect(() => {
    if (!eventId) {
      router.replace("/my-events");
    }
  }, [eventId, router]);

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-gray-400">
        Loading event...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">
      <div className="px-4 pt-4">
        <button
          onClick={() => router.push("/my-events")}
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← My Events
        </button>
      </div>

      <HostNav eventId={eventId} onNavigate={setActiveTab} />

      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => setActiveTab("menu")}
          className={`rounded-full px-4 py-2 text-sm transition ${
            activeTab === "menu"
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Menu
        </button>

        <button
          onClick={() => setActiveTab("queue")}
          className={`rounded-full px-4 py-2 text-sm transition ${
            activeTab === "queue"
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Queue
        </button>
      </div>

      <div className="space-y-4 p-4">
        {activeTab === "menu" && (
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/add-menu?event=${eventId}`)}
              className="rounded-lg bg-white px-4 py-2 font-medium text-black"
            >
              Open Menu Manager
            </button>

            <p className="text-sm text-gray-400">
              Manage inventory and menu items for this event.
            </p>
          </div>
        )}

        {activeTab === "queue" && <QueueTab />}
      </div>
    </div>
  );
}