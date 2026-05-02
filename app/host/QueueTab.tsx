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
  runTransaction,
  serverTimestamp,
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

type ConnectionStatus = "connecting" | "live" | "reconnecting" | "error";

type FirestoreTimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  toMillis?: () => number;
} | null;

type RequestWithInventory = Request & {
  menuItemId?: string;
  itemId?: string;
  menuId?: string;
};

function getQueueCacheKey(eventId: string) {
  return `partyflow_host_queue_snapshot_${eventId}`;
}

function readCachedQueue(eventId: string) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getQueueCacheKey(eventId));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Request[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedQueue(eventId: string, requests: Request[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getQueueCacheKey(eventId), JSON.stringify(requests));
  } catch {
    // localStorage can fail in private mode or quota limits. Queue still works live.
  }
}

function timestampToMillis(value?: FirestoreTimestampLike) {
  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    const nanos =
      typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
    return value.seconds * 1000 + Math.floor(nanos / 1_000_000);
  }

  return 0;
}

function getCreatedAtValue(createdAt?: FirestoreTimestampLike) {
  return timestampToMillis(createdAt);
}

function getPendingStartValue(request: Request) {
  return (
    timestampToMillis(request.pendingAt) || timestampToMillis(request.createdAt)
  );
}

function getPendingAgeLevel(minutes: number) {
  if (minutes >= 10) return "attention";
  if (minutes >= 5) return "waiting";
  return "normal";
}

function getPendingAgeLabel(minutes: number) {
  if (minutes >= 10) return `Needs attention · ${minutes}m`;
  if (minutes >= 5) return `Waiting ${minutes}m`;
  return "";
}

function getGroupPendingAgeInfo(requests: Request[], currentTimeMs: number) {
  const oldestPendingStart = requests.reduce((oldest, request) => {
    const value = getPendingStartValue(request);

    if (!value) return oldest;
    if (!oldest) return value;

    return Math.min(oldest, value);
  }, 0);

  if (!oldestPendingStart) {
    return {
      queueAgeMinutes: 0,
      queueAgeLevel: "normal" as const,
      queueAgeLabel: "",
    };
  }

  const queueAgeMinutes = Math.max(
    Math.floor((currentTimeMs - oldestPendingStart) / 60000),
    0
  );

  return {
    queueAgeMinutes,
    queueAgeLevel: getPendingAgeLevel(queueAgeMinutes),
    queueAgeLabel: getPendingAgeLabel(queueAgeMinutes),
  };
}

function getEffectiveStatus(request: Request): Status {
  const completedMs = timestampToMillis(request.completedAt);
  if (completedMs > 0) return "completed";

  const readyMs = timestampToMillis(request.readyAt);
  if (readyMs > 0) return "ready";

  const preparingMs = timestampToMillis(request.preparingAt);
  if (preparingMs > 0) return "preparing";

  const pendingMs = timestampToMillis(request.pendingAt);
  if (pendingMs > 0) return "pending";

  return request.status;
}

function getMenuItemIdFromRequest(request: RequestWithInventory) {
  return request.menuItemId || request.itemId || request.menuId || "";
}

function isTimestampToday(value?: FirestoreTimestampLike) {
  const timestampMs = timestampToMillis(value);

  if (!timestampMs) return false;

  const timestampDate = new Date(timestampMs);
  const now = new Date();

  return (
    timestampDate.getFullYear() === now.getFullYear() &&
    timestampDate.getMonth() === now.getMonth() &&
    timestampDate.getDate() === now.getDate()
  );
}

function getMostRequestedItemLabel(requests: Request[]) {
  const itemTotals = new Map<string, { name: string; quantity: number }>();

  requests.forEach((request) => {
    const normalizedName = request.itemName.trim();

    if (!normalizedName) return;

    const key = normalizedName.toLowerCase();
    const quantity = Math.max(Number(request.quantity ?? 1), 1);
    const existing = itemTotals.get(key);

    if (existing) {
      existing.quantity += quantity;
      return;
    }

    itemTotals.set(key, {
      name: normalizedName,
      quantity,
    });
  });

  const topItem = Array.from(itemTotals.values()).sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return a.name.localeCompare(b.name);
  })[0];

  if (!topItem) return "No requests yet";

  return `${topItem.name} · ${topItem.quantity}`;
}

function getConnectionLabel(status: ConnectionStatus) {
  switch (status) {
    case "connecting":
      return "Connecting";
    case "live":
      return "Live";
    case "reconnecting":
      return "Reconnecting";
    case "error":
      return "Connection issue";
    default:
      return "Connecting";
  }
}

function getConnectionClass(status: ConnectionStatus) {
  switch (status) {
    case "live":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
    case "connecting":
      return "border-[#508CFF]/20 bg-[#508CFF]/10 text-[#9FC0FF]";
    case "reconnecting":
      return "border-yellow-400/20 bg-yellow-500/10 text-yellow-300";
    case "error":
      return "border-red-400/25 bg-red-500/10 text-red-300";
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}

function getReliabilityMessage(
  status: ConnectionStatus,
  isShowingCachedQueue: boolean
) {
  if (status === "live") return "";
  if (status === "connecting") return "Connecting to live queue...";
  if (isShowingCachedQueue) {
    return "Reconnecting — showing last known queue. Batch actions are paused until live sync returns.";
  }
  return "Connection issue — batch actions are paused until live sync returns.";
}

function groupRequestsByItem(
  items: Request[],
  status: Status,
  currentTimeMs = Date.now()
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

      if (status === "pending") {
        Object.assign(
          existingGroup,
          getGroupPendingAgeInfo(existingGroup.requests, currentTimeMs)
        );
      }
    } else {
      const newGroup: GroupedRequestCard = {
        groupKey,
        itemName: normalizedItemName,
        status,
        totalQuantity: request.quantity ?? 1,
        orderCount: 1,
        requestIds: [request.id],
        requests: [request],
        latestCreatedAt: request.createdAt,
      };

      if (status === "pending") {
        Object.assign(
          newGroup,
          getGroupPendingAgeInfo(newGroup.requests, currentTimeMs)
        );
      }

      groups.set(groupKey, newGroup);
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
      existingGroup.orderCount += 1;

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
  const [nowMs, setNowMs] = useState(Date.now());
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [isShowingCachedQueue, setIsShowingCachedQueue] = useState(false);

  const actionsDisabled = connectionStatus !== "live";
  const reliabilityMessage = getReliabilityMessage(
    connectionStatus,
    isShowingCachedQueue
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!eventId) {
      setRequests([]);
      setLoading(false);
      setConnectionStatus("error");
      setIsShowingCachedQueue(false);
      return;
    }

    setLoading(true);
    setConnectionStatus("connecting");

    const cachedRequests = readCachedQueue(eventId);

    if (cachedRequests.length > 0) {
      setRequests(cachedRequests);
      setIsShowingCachedQueue(true);
      setLoading(false);
    }

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
        writeCachedQueue(eventId, data);
        setLoading(false);
        setNowMs(Date.now());
        setConnectionStatus("live");
        setIsShowingCachedQueue(false);
      },
      (error) => {
        console.error("Queue listener error:", error);

        const cached = readCachedQueue(eventId);

        if (cached.length > 0) {
          setRequests(cached);
          setIsShowingCachedQueue(true);
          setConnectionStatus("reconnecting");
        } else {
          setRequests([]);
          setIsShowingCachedQueue(false);
          setConnectionStatus("error");
        }

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
    () => requests.filter((request) => getEffectiveStatus(request) === "pending"),
    [requests]
  );

  const preparingRequests = useMemo(
    () =>
      requests.filter((request) => getEffectiveStatus(request) === "preparing"),
    [requests]
  );

  const readyRequests = useMemo(
    () => requests.filter((request) => getEffectiveStatus(request) === "ready"),
    [requests]
  );

  const completedTodayRequests = useMemo(() => {
    return requests.filter((request) => {
      return (
        getEffectiveStatus(request) === "completed" &&
        isTimestampToday(request.completedAt)
      );
    });
  }, [requests]);

  const completedTodayCount = completedTodayRequests.length;

  const mostRequestedItemLabel = useMemo(() => {
    return getMostRequestedItemLabel(requests);
  }, [requests]);

  const pendingGroups = useMemo(
    () => groupRequestsByItem(pendingRequests, "pending", nowMs),
    [pendingRequests, nowMs]
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
    nextStatus: "preparing" | "ready"
  ) => {
    if (!eventId || requestIds.length === 0 || actionsDisabled) return;

    const idsToUpdate = requestIds.filter((requestId) => {
      return !updatingIds.includes(requestId);
    });

    if (idsToUpdate.length === 0) return;

    try {
      setUpdatingIds((prev) => [...prev, ...idsToUpdate]);

      await Promise.all(
        idsToUpdate.map((requestId) => {
          const requestRef = doc(db, "events", eventId, "requests", requestId);

          if (nextStatus === "preparing") {
            return updateDoc(requestRef, {
              status: "preparing",
              preparingAt: serverTimestamp(),
            });
          }

          return updateDoc(requestRef, {
            status: "ready",
            readyAt: serverTimestamp(),
          });
        })
      );

      setToast({
        message:
          nextStatus === "preparing"
            ? `${idsToUpdate.length} item${
                idsToUpdate.length === 1 ? "" : "s"
              } added to active batch`
            : `${idsToUpdate.length} item${
                idsToUpdate.length === 1 ? "" : "s"
              } marked batch ready`,
        type: "success",
      });
    } catch (error) {
      console.error("Failed to update grouped requests:", error);

      setToast({
        message: "Failed to update batch",
        type: "error",
      });
    } finally {
      setUpdatingIds((prev) =>
        prev.filter((id) => !idsToUpdate.includes(id))
      );
    }
  };

  const handleCompletePickup = async (requestIds: string[]) => {
    if (!eventId || requestIds.length === 0 || actionsDisabled) return;

    const idsToUpdate = requestIds.filter((requestId) => {
      return !updatingIds.includes(requestId);
    });

    if (idsToUpdate.length === 0) return;

    try {
      setUpdatingIds((prev) => [...prev, ...idsToUpdate]);

      const completedCount = await runTransaction(db, async (transaction) => {
        const requestRefs = idsToUpdate.map((requestId) =>
          doc(db, "events", eventId, "requests", requestId)
        );

        const requestSnapshots = await Promise.all(
          requestRefs.map((requestRef) => transaction.get(requestRef))
        );

        const eligibleRequests: {
          requestId: string;
          requestRef: (typeof requestRefs)[number];
          menuItemId: string;
          quantity: number;
          itemName: string;
        }[] = [];

        const inventoryDeductions = new Map<string, number>();

        requestSnapshots.forEach((requestSnap, index) => {
          if (!requestSnap.exists()) {
            throw new Error("Request not found.");
          }

          const requestData = requestSnap.data() as RequestWithInventory;

          if (requestData.status === "completed" || requestData.completedAt) {
            return;
          }

          const menuItemId = getMenuItemIdFromRequest(requestData);
          const quantity = Math.max(Number(requestData.quantity ?? 1), 1);
          const itemName = requestData.itemName || "Item";

          if (!menuItemId) {
            throw new Error(
              `${itemName} is missing menuItemId. New orders must store the menu item document ID before inventory can auto-reduce.`
            );
          }

          eligibleRequests.push({
            requestId: idsToUpdate[index],
            requestRef: requestRefs[index],
            menuItemId,
            quantity,
            itemName,
          });

          inventoryDeductions.set(
            menuItemId,
            (inventoryDeductions.get(menuItemId) ?? 0) + quantity
          );
        });

        if (eligibleRequests.length === 0) {
          return 0;
        }

        const menuRefs = Array.from(inventoryDeductions.keys()).map(
          (menuItemId) => doc(db, "events", eventId, "menu", menuItemId)
        );

        const menuSnapshots = await Promise.all(
          menuRefs.map((menuRef) => transaction.get(menuRef))
        );

        menuSnapshots.forEach((menuSnap, index) => {
          const menuRef = menuRefs[index];
          const menuItemId = menuRef.id;
          const deduction = inventoryDeductions.get(menuItemId) ?? 0;

          if (!menuSnap.exists()) {
            throw new Error("Menu item not found.");
          }

          const menuData = menuSnap.data() as { qty?: number; name?: string };
          const currentQty = Number(menuData.qty ?? 0);

          if (currentQty < deduction) {
            throw new Error(
              `${menuData.name || "Item"} only has ${currentQty} left. Cannot complete pickup for ${deduction}.`
            );
          }
        });

        menuSnapshots.forEach((menuSnap, index) => {
          const menuRef = menuRefs[index];
          const deduction = inventoryDeductions.get(menuRef.id) ?? 0;
          const menuData = menuSnap.data() as { qty?: number };
          const currentQty = Number(menuData.qty ?? 0);

          transaction.update(menuRef, {
            qty: currentQty - deduction,
          });
        });

        eligibleRequests.forEach(({ requestRef }) => {
          transaction.update(requestRef, {
            status: "completed",
            completedAt: serverTimestamp(),
          });
        });

        return eligibleRequests.length;
      });

      setToast({
        message:
          completedCount === 0
            ? "No eligible items to complete"
            : `${completedCount} item${
                completedCount === 1 ? "" : "s"
              } completed and removed from inventory`,
        type: "success",
      });
    } catch (error) {
      console.error("Failed to complete pickup:", error);

      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to complete pickup",
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

  if (loading && requests.length === 0) {
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
                    Live Queue
                  </p>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${getConnectionClass(
                      connectionStatus
                    )}`}
                  >
                    {getConnectionLabel(connectionStatus)}
                  </span>
                </div>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Request Flow
                </h2>

                {reliabilityMessage ? (
                  <p className="mt-2 max-w-xl text-xs leading-5 text-white/45">
                    {reliabilityMessage}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Total Requests
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {totalActiveRequests}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/12 bg-emerald-500/8 px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/70">
                    Completed Today
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">
                    {completedTodayCount}
                  </p>
                </div>

                <div className="max-w-[160px] rounded-2xl border border-[#8B5CFF]/14 bg-[#8B5CFF]/8 px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#D7C7FF]/75">
                    Most Requested
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">
                    {mostRequestedItemLabel}
                  </p>
                </div>
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
          actionsDisabled={actionsDisabled}
          reliabilityMessage={reliabilityMessage}
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