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

  return Array.from(groups.values()).sort((a, b) => {
    return (
      getCreatedAtValue(b.latestCreatedAt) -
      getCreatedAtValue(a.latestCreatedAt)
    );
  });
}

function groupReadyRequestsByOrder(items: Request[]): ReadyGuestCard[] {
  const groups = new Map<string, ReadyGuestCard>();

  for (const request of items) {
    const normalizedGuestName = (request.guestName || "Guest").trim() || "Guest";
    const orderKey =
      request.orderGroupId ||
      (typeof request.orderNumber === "number"
        ? `order-number-${request.orderNumber}`
        : `request-${request.id}`);

    const groupKey = `ready__order__${orderKey}`;
    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.requests.push(request);
      existingGroup.requestIds.push(request.id);
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
    return (
      getCreatedAtValue(b.latestCreatedAt) -
      getCreatedAtValue(a.latestCreatedAt)
    );
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
    () => groupReadyRequestsByOrder(readyRequests),
    [readyRequests]
  );

  const totalActiveRequests =
    pendingRequests.length + preparingRequests.length + readyRequests.length;

  const totalVisibleGroups =
    pendingGroups.length + preparingGroups.length + readyGroups.length;

  const handleStatusUpdate = async (
    requestIds: string[],
    nextStatus: "preparing" | "ready" | "completed"
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
            ? `${idsToUpdate.length} item${
                idsToUpdate.length === 1 ? "" : "s"
              } moved to preparing`
            : nextStatus === "ready"
            ? `${idsToUpdate.length} item${
                idsToUpdate.length === 1 ? "" : "s"
              } marked ready`
            : `${idsToUpdate.length} item${
                idsToUpdate.length === 1 ? "" : "s"
              } completed`,
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

  const handleCompletePickup = async (requestIds: string[]) => {
    await handleStatusUpdate(requestIds, "completed");
  };

  if (!eventId) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#141821] p-5 sm:p-6">
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Queue
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Missing event context
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
            Queue data cannot load until a valid event is attached to this host
            session.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#141821] p-5 sm:p-6">
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
            Queue
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Loading queue
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
            Pulling live request activity for this event.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#141821]">
          <div className="border-b border-white/6 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
                  Live Queue
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  Request Flow
                </h2>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Total Requests
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {totalActiveRequests}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 sm:px-5">
            <div className="rounded-2xl border border-yellow-400/12 bg-yellow-500/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-yellow-200/70">
                Pending
              </p>
              <p className="mt-1 text-lg font-semibold text-yellow-300">
                {pendingRequests.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#508CFF]/12 bg-[#508CFF]/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#BCD2FF]/70">
                Preparing
              </p>
              <p className="mt-1 text-lg font-semibold text-[#9FC0FF]">
                {preparingRequests.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/12 bg-emerald-500/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/70">
                Ready
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-300">
                {readyRequests.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                Visible Groups
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {totalVisibleGroups}
              </p>
            </div>
          </div>
        </div>

        <QueueView
          pending={pendingGroups}
          preparing={preparingGroups}
          ready={readyGroups}
          onStartPreparing={handleStartPreparing}
          onMarkReady={handleMarkReady}
          onCompletePickup={handleCompletePickup}
          updatingIds={updatingIds}
        />
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm text-white shadow-xl backdrop-blur transition ${
            toast.type === "success"
              ? "border-[#508CFF]/20 bg-[#10192C]/95"
              : "border-red-400/20 bg-[#3A1313]/95"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{toast.type === "success" ? "✅" : "❌"}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}