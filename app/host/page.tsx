"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// 🔥 TEMP MOCK DATA (replace with Firestore later)
type Request = {
  id: string;
  item: string;
  user: string;
  status: "pending" | "preparing" | "ready";
};

export default function HostPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    // 🔥 MOCK DATA FOR NOW
    setRequests([
      { id: "1", item: "Vodka Cranberry", user: "Alex", status: "pending" },
      { id: "2", item: "Rum & Coke", user: "Jordan", status: "preparing" },
      { id: "3", item: "Tequila Shot", user: "Chris", status: "ready" },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white p-4">
      
      {/* 🔥 HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Event Queue</h1>
        <p className="text-sm text-gray-400">
          Managing event: {eventId}
        </p>
      </div>

      {/* 🔥 QUEUE LIST */}
      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="bg-[#191C24] p-4 rounded-2xl border border-white/5"
          >
            {/* Top Row */}
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-medium">{req.item}</h2>

              {/* STATUS */}
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  req.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : req.status === "preparing"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-green-500/20 text-green-400"
                }`}
              >
                {req.status}
              </span>
            </div>

            {/* User */}
            <p className="text-sm text-gray-400 mb-3">
              Requested by {req.user}
            </p>

            {/* ACTION BUTTONS */}
            <div className="flex gap-2">
              <button className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs">
                Prepare
              </button>

              <button className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                Ready
              </button>

              <button className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs">
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}