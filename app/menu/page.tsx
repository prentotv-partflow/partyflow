"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../firebase";
import {
  collection,
  serverTimestamp,
  onSnapshot,
  doc,
  setDoc,
} from "firebase/firestore";

type MenuItem = {
  id: string;
  name: string;
  qty: number;
};

type RequestItem = {
  id: string;
  itemName: string;
  quantity: number;
  status: "pending" | "preparing" | "ready";
  guestId: string;
  createdAt?: any;
};

type GuestSession = {
  eventId: string;
  guestId: string;
  guestName: string;
};

const SESSION_KEY = "partyflow_guest_session";

function getSession(): GuestSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function getStatusBadgeClass(status: RequestItem["status"]) {
  switch (status) {
    case "pending":
      return "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300";
    case "preparing":
      return "border border-[#508CFF]/20 bg-[#508CFF]/12 text-[#9FC0FF]";
    case "ready":
      return "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
    default:
      return "border border-white/10 bg-white/5 text-white/70";
  }
}

function getStatusLabel(status: RequestItem["status"]) {
  switch (status) {
    case "pending":
      return "Pending";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready for pickup";
    default:
      return status;
  }
}

function getStatusNote(status: RequestItem["status"]) {
  switch (status) {
    case "pending":
      return "Your request is in the queue.";
    case "preparing":
      return "Your item is being prepared.";
    case "ready":
      return "Pickup at the bar now.";
    default:
      return "";
  }
}

function getStatusAccentClass(status: RequestItem["status"]) {
  switch (status) {
    case "pending":
      return "bg-yellow-400/80";
    case "preparing":
      return "bg-[#508CFF]";
    case "ready":
      return "bg-emerald-400";
    default:
      return "bg-white/30";
  }
}

function getStatusPriority(status: RequestItem["status"]) {
  switch (status) {
    case "ready":
      return 0;
    case "preparing":
      return 1;
    case "pending":
      return 2;
    default:
      return 3;
  }
}

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [session, setSessionState] = useState<GuestSession | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [recentRequestId, setRecentRequestId] = useState<string | null>(null);
  const [highlightedStatusId, setHighlightedStatusId] = useState<string | null>(
    null
  );
  const [activityJumpHighlight, setActivityJumpHighlight] = useState(false);

  const previousStatusMapRef = useRef<Record<string, RequestItem["status"]>>({});
  const initialSnapshotLoadedRef = useRef(false);
  const activitySectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const existing = getSession();

    if (existing && existing.eventId === eventId) {
      setSessionState(existing);
      setChecking(false);
      return;
    }

    router.replace(`/event?event=${eventId}`);
  }, [eventId, router]);

  useEffect(() => {
    if (!session) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", session.eventId, "menu"),
      (snapshot) => {
        const items: MenuItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MenuItem, "id">),
        }));

        items.sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

        setMenu(items);
      }
    );

    return () => unsubscribe();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", session.eventId, "requests"),
      (snapshot) => {
        const list: RequestItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<RequestItem, "id">;

          if (data.guestId === session.guestId) {
            list.push({
              id: docSnap.id,
              ...data,
            });
          }
        });

        if (!initialSnapshotLoadedRef.current) {
          const initialStatusMap: Record<string, RequestItem["status"]> = {};

          list.forEach((req) => {
            initialStatusMap[req.id] = req.status;
          });

          previousStatusMapRef.current = initialStatusMap;
          initialSnapshotLoadedRef.current = true;
          setRequests(list);
          return;
        }

        const nextStatusMap: Record<string, RequestItem["status"]> = {};

        list.forEach((req) => {
          nextStatusMap[req.id] = req.status;

          const previousStatus = previousStatusMapRef.current[req.id];

          if (!previousStatus) {
            if (recentRequestId === req.id) {
              setHighlightedStatusId(req.id);
            }
            return;
          }

          if (previousStatus !== req.status) {
            setHighlightedStatusId(req.id);

            if (req.status === "preparing") {
              setToast(`Preparing: ${req.itemName}`);
            } else if (req.status === "ready") {
              setToast(`Ready for pickup: ${req.itemName}`);
            }
          }
        });

        previousStatusMapRef.current = nextStatusMap;
        setRequests(list);
      }
    );

    return () => unsubscribe();
  }, [session, recentRequestId]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 2200);

    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!recentRequestId) return;

    const timeout = setTimeout(() => {
      setRecentRequestId(null);
    }, 2600);

    return () => clearTimeout(timeout);
  }, [recentRequestId]);

  useEffect(() => {
    if (!highlightedStatusId) return;

    const timeout = setTimeout(() => {
      setHighlightedStatusId(null);
    }, 2600);

    return () => clearTimeout(timeout);
  }, [highlightedStatusId]);

  useEffect(() => {
    if (!activityJumpHighlight) return;

    const timeout = setTimeout(() => {
      setActivityJumpHighlight(false);
    }, 1600);

    return () => clearTimeout(timeout);
  }, [activityJumpHighlight]);

  const handleRequest = async (item: MenuItem) => {
    if (!session || loadingItem) return;

    if (item.qty <= 0) {
      setToast("Out of stock");
      return;
    }

    setLoadingItem(item.id);

    try {
      const requestRef = doc(
        collection(db, "events", session.eventId, "requests")
      );

      await setDoc(requestRef, {
        eventId: session.eventId,
        guestId: session.guestId,
        guestName: session.guestName,
        itemName: item.name,
        quantity: 1,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setRecentRequestId(requestRef.id);
      setHighlightedStatusId(requestRef.id);
      setToast(`Requested: ${item.name}`);
    } catch (err: any) {
      setToast(err.message);
    } finally {
      setLoadingItem(null);
    }
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const priorityDiff =
        getStatusPriority(a.status) - getStatusPriority(b.status);

      if (priorityDiff !== 0) return priorityDiff;

      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });
  }, [requests]);

  const readyCount = useMemo(() => {
    return sortedRequests.filter((req) => req.status === "ready").length;
  }, [sortedRequests]);

  const activeCount = useMemo(() => {
    return sortedRequests.filter(
      (req) => req.status === "pending" || req.status === "preparing"
    ).length;
  }, [sortedRequests]);

  const hasTrackedRequests = activeCount > 0 || readyCount > 0;

  const handleViewRequests = () => {
    if (!hasTrackedRequests || !activitySectionRef.current) return;

    activitySectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setActivityJumpHighlight(true);
  };

  if (checking || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] px-6 text-center text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <Image
              src="/branding/partyflow-logo-interface.png"
              alt="PartyFlow logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />
          </div>
          <p className="text-sm font-medium text-white/85">Entering event...</p>
          <p className="mt-1 text-xs text-white/45">
            Restoring your guest session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] text-white">
      <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0A0C12]/75 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-2">
              <Image
                src="/branding/partyflow-logo-interface.png"
                alt="PartyFlow logo"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>

            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#B8A6FF]">
                Guest Menu
              </p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight">
                Party Menu
              </h1>
            </div>
          </div>

          <p className="mt-3 text-center text-sm text-white/55">
            Welcome, {session.guestName}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                Active
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {activeCount}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/70">
                Ready
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-300">
                {readyCount}
              </p>
            </div>
          </div>

          {hasTrackedRequests ? (
            <div className="mt-3 flex justify-center">
              <button
                onClick={handleViewRequests}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-[#CDB8FF] transition hover:bg-white/5 hover:text-white"
              >
                <span>View Requests</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-4">
        <section className="overflow-hidden rounded-3xl border border-[#8B5CFF]/15 bg-[#1B1F2C]/95 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
          <div className="border-b border-white/6 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8A6FF]">
              Available Items
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              Order from the menu
            </h2>

            <p className="mt-1 text-sm leading-6 text-white/55">
              Tap the violet button to send a request to the host queue.
            </p>
          </div>

          <div className="p-4">
            {menu.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-[#101522] px-4 py-10 text-center">
                <p className="text-sm font-medium text-white/50">
                  No items available
                </p>
                <p className="mt-1 text-xs leading-5 text-white/28">
                  The host has not added menu items yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {menu.map((item) => {
                  const isOut = item.qty === 0;
                  const isLow = item.qty > 0 && item.qty <= 3;
                  const isLoading = loadingItem === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/6 bg-[#101522] p-4 transition hover:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-white">
                              {item.name}
                            </p>

                            {isOut ? (
                              <span className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                                Out
                              </span>
                            ) : isLow ? (
                              <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-yellow-300">
                                Low stock
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-xs text-white/45">
                            {item.qty} available
                          </p>
                        </div>

                        <button
                          onClick={() => handleRequest(item)}
                          disabled={isLoading || isOut}
                          className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                            isOut
                              ? "cursor-not-allowed border-white/10 bg-white/10 text-white/35"
                              : "border-[#8B5CFF]/30 bg-[#8B5CFF]/24 text-[#E9E0FF] shadow-[0_0_0_1px_rgba(139,92,255,0.06)] hover:bg-[#8B5CFF]/34"
                          }`}
                        >
                          {isOut ? "Out" : isLoading ? "Requesting..." : "Request"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section
          ref={activitySectionRef}
          className={`overflow-hidden rounded-3xl border bg-[#1B1F2C]/95 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-all duration-500 ${
            activityJumpHighlight
              ? "border-[#B8A6FF]/35 shadow-[0_0_0_1px_rgba(184,166,255,0.16),0_10px_30px_rgba(0,0,0,0.22)]"
              : "border-[#8B5CFF]/15"
          }`}
        >
          <div className="border-b border-white/6 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8A6FF]">
                  Your Activity
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Your Requests
                </h2>

                <p className="mt-1 text-sm leading-6 text-white/55">
                  Track each request as it moves through the queue.
                </p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                {sortedRequests.length}
              </span>
            </div>
          </div>

          <div className="p-4">
            {sortedRequests.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-[#101522] px-4 py-10 text-center">
                <p className="text-sm font-medium text-white/50">
                  No requests yet
                </p>
                <p className="mt-1 text-xs leading-5 text-white/28">
                  Once you request an item, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedRequests.map((req) => {
                  const isReady = req.status === "ready";
                  const isRecent = recentRequestId === req.id;
                  const isStatusHighlighted = highlightedStatusId === req.id;

                  const cardClass = isReady
                    ? "border-emerald-400/22 bg-emerald-500/10"
                    : isRecent || isStatusHighlighted
                    ? "border-[#8B5CFF]/28 bg-[#8B5CFF]/8"
                    : "border-white/6 bg-[#101522]";

                  return (
                    <div
                      key={req.id}
                      className={`rounded-2xl border p-4 transition-all duration-300 ${cardClass}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getStatusAccentClass(
                            req.status
                          )}`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-white">
                                  {req.itemName}
                                </p>

                                {isRecent ? (
                                  <span className="rounded-full border border-[#8B5CFF]/25 bg-[#8B5CFF]/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#D7C7FF]">
                                    New
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-1 text-xs text-white/45">
                                Quantity: {req.quantity}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusBadgeClass(
                                req.status
                              )}`}
                            >
                              {getStatusLabel(req.status)}
                            </span>
                          </div>

                          <p
                            className={`mt-3 text-xs ${
                              isReady ? "text-emerald-200/90" : "text-white/48"
                            }`}
                          >
                            {getStatusNote(req.status)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-2xl border border-[#8B5CFF]/20 bg-[#25153D]/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur">
          <p className="text-center font-medium">{toast}</p>
        </div>
      )}
    </div>
  );
}

export default function GuestMenu() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] px-6 text-center text-white">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <Image
                src="/branding/partyflow-logo-interface.png"
                alt="PartyFlow logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>
            <p className="text-sm font-medium text-white/85">Loading menu...</p>
            <p className="mt-1 text-xs text-white/45">
              Pulling live event data
            </p>
          </div>
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}