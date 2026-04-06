"use client";

import { useEffect, useState } from "react";

export default function HostDashboard() {
  const [requests, setRequests] = useState<
    { name: string; guest: string; id: string }[]
  >([]);

  useEffect(() => {
    const loadRequests = () => {
      const storedRequests = localStorage.getItem("requests");
      if (storedRequests) {
        setRequests(JSON.parse(storedRequests));
      } else {
        setRequests([]);
      }
    };

    loadRequests();

    window.addEventListener("storage", loadRequests);

    return () => {
      window.removeEventListener("storage", loadRequests);
    };
  }, []);

  // 🧠 Group requests
  const groupedRequests: {
    [key: string]: { count: number; guests: string[] };
  } = {};

  requests.forEach((req) => {
    if (!groupedRequests[req.name]) {
      groupedRequests[req.name] = { count: 0, guests: [] };
    }

    groupedRequests[req.name].count += 1;
    groupedRequests[req.name].guests.push(
      `${req.guest} #${req.id}`
    );
  });

  // ✅ Fulfill request
  const fulfillRequest = (itemName: string) => {
    const storedRequests = localStorage.getItem("requests");
    const parsedRequests = storedRequests
      ? JSON.parse(storedRequests)
      : [];

    const index = parsedRequests.findIndex(
      (req: any) => req.name === itemName
    );

    if (index > -1) {
      parsedRequests.splice(index, 1);
    }

    localStorage.setItem("requests", JSON.stringify(parsedRequests));
    setRequests(parsedRequests);
  };

  return (
  <div className="min-h-screen bg-gray-100 flex flex-col">

    {/* 🔝 Header */}
    <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-center">
        Host Dashboard 📊
      </h1>
    </div>

    {/* 📱 Content */}
    <div className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">

      {requests.length === 0 ? (
        <p className="text-center text-gray-400 text-sm">
          No requests yet
        </p>
      ) : (
        Object.entries(groupedRequests).map(
          ([item, data], index) => (
            <div
              key={index}
              onClick={() => fulfillRequest(item)}
              className="bg-white p-4 rounded-xl shadow-sm active:scale-95 cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <p className="font-semibold">{item}</p>
                <p className="text-sm text-gray-500">
                  × {data.count}
                </p>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {data.guests.join(", ")}
              </p>
            </div>
          )
        )
      )}
    </div>
  </div>
);
}