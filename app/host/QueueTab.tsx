"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/app/firebase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import QueueView from "@/app/components/QueueView";
import {
  GroupedRequestCard,
  ReadyGuestCard,
  Request,
  Status,
} from "@/app/types/queue";

type ToastType = "success" | "error";

type ToastState = {
  message: string;
  type: ToastType;
} | null;

function getCreatedAtValue(createdAt: any) {
  return createdAt?.seconds ?? 0;
}

function groupRequestsByItem(
  items: Request[],
  status: Status
): GroupedRequestCard[] {
  const groups = new Map<string, GroupedRequestCard>();

  for (const request of items) {
    const normalizedItemName = request.itemName.trim();
    const groupKey = `${status}__${normalizedItemName.toLowerCase()}`;

    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.requests.push(request);
      existingGroup.requestIds.push(request.id);
      existingGroup.orderCount += 1;
      existingGroup.totalQuantity += request.quantity ?? 1;

      const requestCreatedAt = getCreatedAtValue(request.createdAt);
      const latestCreatedAt = getCreatedAtValue(existingGroup.latestCreatedAt);

      if (requestCreatedAt >= latestCreatedAt) {
        existingGroup.latestCreatedAt = request.createdAt;
      }
    } else {
      groups.set(groupKey, {
        groupKey,
        itemName: normalizedItemName,
        status,
        totalQuantity: request.quantity ?? 1,
        orderCount: 1,
        requestIds: [request.id],
        requests: [request],
        latestCreatedAt: request.createdAt,
      });
    }
  }

  return Array.from(groups.values());
}

function groupReadyRequestsByGuest(items: Request[]): ReadyGuestCard[] {
  const groups = new Map<string, ReadyGuestCard>();

  for (const request of items) {
    const normalizedGuestName = (request.guestName || "Guest").trim() || "Guest";
    const groupKey = `ready__guest__${normalizedGuestName.toLowerCase()}`;

    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.requests.push(request);
      existingGroup.requestIds.push(request.id);
      existingGroup.orderCount += 1;
      existingGroup.totalQuantity += request.quantity ?? 1;

      const requestCreatedAt = getCreatedAtValue(request.createdAt);
      const latestCreatedAt = getCreatedAtValue(existingGroup.latestCreatedAt);

      if (requestCreatedAt >= latestCreatedAt) {
        existingGroup.latestCreatedAt = request.createdAt;
      }
    } else {
      groups.set(groupKey, {
        groupKey,
        guestName: normalizedGuestName,
        status: "ready",
        totalQuantity: request.quantity ?? 1,
        orderCount: 1,
        requestIds: [request.id],
        requests: [request],
        latestCreatedAt: request.createdAt,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    return getCreatedAtValue(b.latestCreatedAt) - getCreatedAtValue(a.latestCreatedAt);
  });
}

export default function QueueTab() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!eventId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const requestsRef = collection(db, "events", eventId, "requests");
    const requestsQuery = query(requestsRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data: Request[] = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<Request, "id">),
        }));

        setRequests(data);
        setLoading(false);
      },
      (error) => {
        console.error("Queue listener error:", error);
        setRequests([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [toast]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );

  const preparingRequests = useMemo(
    () => requests.filter((request) => request.status === "preparing"),
    [requests]
  );

  const readyRequests = useMemo(
    () => requests.filter((request) => request.status === "ready"),
    [requests]
  );

  const pendingGroups = useMemo(
    () => groupRequestsByItem(pendingRequests, "pending"),
    [pendingRequests]
  );

  const preparingGroups = useMemo(
    () => groupRequestsByItem(preparingRequests, "preparing"),
    [preparingRequests]
  );

  const readyGroups = useMemo(
    () => groupReadyRequestsByGuest(readyRequests),
    [readyRequests]
  );

  const handleStatusUpdate = async (
    requestIds: string[],
    nextStatus: "preparing" | "ready"
  ) => {
    if (!eventId || requestIds.length === 0) return;

    const idsToUpdate = requestIds.filter((requestId) => {
      return !updatingIds.includes(requestId);
    });

    if (idsToUpdate.length === 0) return;

    try {
      setUpdatingIds((prev) => [...prev, ...idsToUpdate]);

      await Promise.all(
        idsToUpdate.map((requestId) => {
          const requestRef = doc(db, "events", eventId, "requests", requestId);
          return updateDoc(requestRef, { status: nextStatus });
        })
      );

      setToast({
        message:
          nextStatus === "preparing"
            ? `${idsToUpdate.length} item${idsToUpdate.length === 1 ? "" : "s"} moved to preparing`
            : `${idsToUpdate.length} item${idsToUpdate.length === 1 ? "" : "s"} marked ready`,
        type: "success",
      });
    } catch (error) {
      console.error("Failed to update grouped requests:", error);

      setToast({
        message: "Failed to update request group",
        type: "error",
      });
    } finally {
      setUpdatingIds((prev) =>
        prev.filter((id) => !idsToUpdate.includes(id))
      );
    }
  };

  const handleStartPreparing = async (requestIds: string[]) => {
    await handleStatusUpdate(requestIds, "preparing");
  };

  const handleMarkReady = async (requestIds: string[]) => {
    await handleStatusUpdate(requestIds, "ready");
  };

  if (!eventId) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-4 py-10 text-sm text-white/60">
        Missing event context.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-4 py-10 text-sm text-white/60">
        Loading queue...
      </div>
    );
  }

  return (
    <>
      <QueueView
        pending={pendingGroups}
        preparing={preparingGroups}
        ready={readyGroups}
        onStartPreparing={handleStartPreparing}
        onMarkReady={handleMarkReady}
        updatingIds={updatingIds}
      />

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg transition ${
            toast.type === "success" ? "bg-black" : "bg-[#7A1D1D]"
          }`}
        >
          {toast.type === "success" ? "✅ " : "❌ "}
          {toast.message}
        </div>
      )}
    </>
  );
}