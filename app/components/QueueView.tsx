"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";

type Status = "pending" | "preparing" | "ready";

type Request = {
  id: string;
  guestName: string;
  itemName: string;
  status: Status;
  createdAt?: any;
};

export default function QueueView({ eventId }: { eventId: string }) {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "events", eventId, "requests"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Request[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Request, "id">),
      }));

      setRequests(data);
    });

    return () => unsubscribe();
  }, [eventId]);

  // 🧠 GROUP BY ITEM
  const grouped = requests.reduce<Record<string, Request[]>>(
    (acc, req) => {
      if (!acc[req.itemName]) acc[req.itemName] = [];
      acc[req.itemName].push(req);
      return acc;
    },
    {}
  );

  // 🔄 CONTROLLED TRANSITIONS
  const advanceStatus = async (req: Request) => {
    const ref = doc(db, "events", eventId, "requests", req.id);

    let next: Status = req.status;

    if (req.status === "pending") next = "preparing";
    else if (req.status === "preparing") next = "ready";

    // ❌ ready cannot advance
    if (req.status === "ready") return;

    await updateDoc(ref, { status: next });
  };

  const resetStatus = async (req: Request) => {
    const ref = doc(db, "events", eventId, "requests", req.id);
    await updateDoc(ref, { status: "pending" });
  };

  if (requests.length === 0) {
    return <div className="text-sm text-gray-500">No orders yet.</div>;
  }

  return (
    <div className="space-y-4">

      {Object.entries(grouped).map(([itemName, group]) => {

        const pending = group.filter(g => g.status === "pending").length;
        const preparing = group.filter(g => g.status === "preparing").length;
        const ready = group.filter(g => g.status === "ready").length;

        return (
          <div
            key={itemName}
            className="bg-white p-4 rounded-xl shadow"
          >
            {/* HEADER */}
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">{itemName}</h2>
              <span className="text-sm text-gray-500">
                {group.length} orders
              </span>
            </div>

            {/* STATUS SUMMARY */}
            <div className="text-xs mb-3 space-x-2">
              <span className="text-yellow-600">Pending: {pending}</span>
              <span className="text-blue-600">Preparing: {preparing}</span>
              <span className="text-green-600">Ready: {ready}</span>
            </div>

            {/* REQUESTS */}
            <div className="space-y-2">
              {group.map((req) => {

                const isPending = req.status === "pending";
                const isPreparing = req.status === "preparing";
                const isReady = req.status === "ready";

                return (
                  <div
                    key={req.id}
                    className={`flex justify-between items-center p-2 rounded-lg ${
                      isPending
                        ? "bg-yellow-50"
                        : isPreparing
                        ? "bg-blue-50"
                        : "bg-green-50"
                    }`}
                  >
                    <span className="text-sm">
                      {req.guestName}
                    </span>

                    <div className="flex gap-2">

                      {/* PRIMARY ACTION */}
                      <button
                        onClick={() => advanceStatus(req)}
                        disabled={isReady}
                        className={`text-xs px-3 py-1 rounded ${
                          isPending
                            ? "bg-blue-500 text-white"
                            : isPreparing
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {isPending
                          ? "Prepare"
                          : isPreparing
                          ? "Ready"
                          : "Done"}
                      </button>

                      {/* RESET */}
                      <button
                        onClick={() => resetStatus(req)}
                        className="text-xs px-2 py-1 bg-gray-200 rounded"
                      >
                        Reset
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        );
      })}

    </div>
  );
}