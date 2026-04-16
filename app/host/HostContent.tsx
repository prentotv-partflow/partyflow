"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import useRole from "../hooks/useRole";
import { QRCodeCanvas } from "qrcode.react"; // ✅ FIXED

// TYPES
type Request = {
  id: string;
  itemName: string;
  quantity: number;
  user: string;
  status: "pending" | "preparing" | "ready";
  createdAt?: any;
};

type AggregatedRequest = {
  itemName: string;
  totalQty: number;
  orderCount: number;
  requests: Request[];
  createdAt?: any;
  status: "pending" | "preparing" | "ready";
  statusCounts: {
    pending: number;
    preparing: number;
    ready: number;
  };
};

export default function HostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = useRole();

  const eventId = searchParams.get("event");

  const [requests, setRequests] = useState<Request[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const guestUrl = eventId ? `${origin}/menu?event=${eventId}` : "";

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const copyLink = () => {
    if (!guestUrl) return;
    navigator.clipboard.writeText(guestUrl);
    showToast("Guest link copied");
  };

  // NAV
  const goTo = (path: string) => {
    if (!eventId) return;
    router.push(`${path}?event=${eventId}`);
  };

  // FETCH REQUESTS
  useEffect(() => {
    if (!eventId) return;

    const q = collection(db, "events", eventId, "requests");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Request[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        list.push({
          id: docSnap.id,
          itemName: data.itemName || "Unknown Item",
          quantity: data.quantity || 1,
          user: data.guestName || "Unknown",
          status: data.status || "pending",
          createdAt: data.createdAt,
        });
      });

      list.sort((a, b) => {
        const aTime = a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.seconds ?? 0;
        return aTime - bTime;
      });

      setRequests(list);
    });

    return () => unsubscribe();
  }, [eventId]);

  // AGGREGATE
  const aggregateRequests = (requests: Request[]): AggregatedRequest[] => {
    const map = new Map<string, AggregatedRequest>();

    const statusPriority = {
      pending: 1,
      preparing: 2,
      ready: 3,
    };

    for (const req of requests) {
      const key = req.itemName.toLowerCase().trim();

      if (!map.has(key)) {
        map.set(key, {
          itemName: req.itemName,
          totalQty: 0,
          orderCount: 0,
          requests: [],
          createdAt: req.createdAt,
          status: req.status,
          statusCounts: {
            pending: 0,
            preparing: 0,
            ready: 0,
          },
        });
      }

      const group = map.get(key)!;

      group.totalQty += req.quantity;
      group.orderCount += 1;
      group.requests.push(req);

      const reqTime = req.createdAt?.seconds ?? Infinity;
      const groupTime = group.createdAt?.seconds ?? Infinity;

      if (reqTime < groupTime) {
        group.createdAt = req.createdAt;
      }

      group.statusCounts[req.status] += 1;

      if (
        statusPriority[req.status] <
        statusPriority[group.status]
      ) {
        group.status = req.status;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return aTime - bTime;
    });
  };

  const aggregated = aggregateRequests(requests);

  // ACTIONS
  const updatePendingToPreparing = async (group: AggregatedRequest) => {
    if (!eventId) return;

    const targets = group.requests.filter(
      (r) => r.status === "pending"
    );

    if (targets.length === 0) {
      showToast("No pending items");
      return;
    }

    await Promise.all(
      targets.map((req) => {
        const ref = doc(db, "events", eventId, "requests", req.id);
        return updateDoc(ref, { status: "preparing" });
      })
    );

    showToast(`${targets.length} item(s) preparing`);
  };

  const updatePreparingToReady = async (group: AggregatedRequest) => {
    if (!eventId) return;

    const targets = group.requests.filter(
      (r) => r.status === "preparing"
    );

    if (targets.length === 0) {
      showToast("No preparing items");
      return;
    }

    await Promise.all(
      targets.map((req) => {
        const ref = doc(db, "events", eventId, "requests", req.id);
        return updateDoc(ref, { status: "ready" });
      })
    );

    showToast(`${targets.length} item(s) ready`);
  };

  const resetAllToPending = async (group: AggregatedRequest) => {
    if (!eventId) return;

    const targets = group.requests.filter(
      (r) => r.status !== "pending"
    );

    if (targets.length === 0) {
      showToast("Nothing to reset");
      return;
    }

    await Promise.all(
      targets.map((req) => {
        const ref = doc(db, "events", eventId, "requests", req.id);
        return updateDoc(ref, { status: "pending" });
      })
    );

    showToast(`${targets.length} item(s) reset`);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">

      {/* NAV */}
      <div className="sticky top-0 z-20 bg-[#0A0C12] border-b border-white/5 px-4 py-3 flex justify-between items-center">
        <h1 className="text-sm font-semibold">PartyFlow Host</h1>

        <div className="flex gap-2 text-xs flex-wrap">
          <button onClick={() => goTo("/host")} className="px-3 py-1 rounded-full bg-white/10">Queue</button>
          <button onClick={() => goTo("/add-menu")} className="px-3 py-1 rounded-full bg-white/10">Add Menu</button>

          {role === "host" && (
            <>
              <button onClick={() => router.push("/my-events")} className="px-3 py-1 rounded-full bg-white/10">Events</button>
              <button onClick={() => router.push("/create-event")} className="px-3 py-1 rounded-full bg-white/10">Create</button>
            </>
          )}
        </div>
      </div>

      <div className="p-4">

        {/* QR SECTION */}
        {eventId && origin && (
          <div className="mb-6 p-4 bg-[#191C24] rounded-2xl border border-white/5">
            <p className="text-xs text-gray-400 mb-2">Guest Access</p>

            <div className="flex flex-col items-center gap-3">
              <QRCodeCanvas
                value={guestUrl}
                size={140}
                bgColor="#0A0C12"
                fgColor="#ffffff"
              />

              <p className="text-[10px] text-gray-500 text-center break-all">
                {guestUrl}
              </p>

              <button
                onClick={copyLink}
                className="text-xs px-3 py-1 rounded-full bg-white/10"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Event Queue</h1>
          <p className="text-sm text-gray-400">
            Managing event: {eventId}
          </p>
        </div>

        {/* LIST */}
        {aggregated.length === 0 ? (
          <p className="text-gray-400 text-sm">No requests yet...</p>
        ) : (
          <div className="space-y-3">
            {aggregated.map((group) => {
              const hasPending = group.statusCounts.pending > 0;
              const hasPreparing = group.statusCounts.preparing > 0;
              const hasNonPending =
                group.statusCounts.preparing > 0 ||
                group.statusCounts.ready > 0;

              return (
                <div
                  key={group.itemName.toLowerCase()}
                  className="p-4 rounded-2xl border bg-[#191C24] border-white/5"
                >
                  <h2 className="font-medium mb-2">
                    {group.itemName} (x{group.totalQty})
                  </h2>

                  <div className="flex gap-2 text-xs flex-wrap">
                    <button
                      disabled={!hasPending}
                      onClick={() => updatePendingToPreparing(group)}
                      className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400"
                    >
                      Preparing
                    </button>

                    <button
                      disabled={!hasPreparing}
                      onClick={() => updatePreparingToReady(group)}
                      className="px-3 py-1 rounded-full bg-green-500/20 text-green-400"
                    >
                      Ready
                    </button>

                    <button
                      disabled={!hasNonPending}
                      onClick={() => resetAllToPending(group)}
                      className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black px-4 py-2 rounded-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}