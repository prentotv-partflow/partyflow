"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../firebase";
import { getGuestSession } from "../lib/guestSession";
import { formatCurrency } from "../lib/formatCurrency";
import type { GuestSession } from "../types/session";
import {
  collection,
  serverTimestamp,
  onSnapshot,
  doc,
  runTransaction,
} from "firebase/firestore";

type MenuItem = {
  id: string;
  name: string;
  qty: number;
  price?: number;
};

type RequestStatus = "pending" | "preparing" | "ready" | "completed";

type FirestoreTimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  toMillis?: () => number;
} | null;

type RequestItem = {
  id: string;
  itemName: string;
  quantity: number;
  status: RequestStatus;
  guestId: string;
  orderNumber?: number;
  orderGroupId?: string;
  createdAt?: FirestoreTimestampLike;
  pendingAt?: FirestoreTimestampLike;
  preparingAt?: FirestoreTimestampLike;
  readyAt?: FirestoreTimestampLike;
  completedAt?: FirestoreTimestampLike;
};

type CartItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
};

type AddFeedbackMode = "idle" | "teach" | "pulse";

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

function getEffectiveRequestStatus(request: RequestItem): RequestStatus {
  const completedMs = timestampToMillis(request.completedAt);
  if (completedMs > 0) return "completed";

  const readyMs = timestampToMillis(request.readyAt);
  if (readyMs > 0) return "ready";

  const preparingMs = timestampToMillis(request.preparingAt);
  if (preparingMs > 0) return "preparing";

  const pendingMs = timestampToMillis(request.pendingAt);
  if (pendingMs > 0) return "pending";

  return request.status ?? "pending";
}

function getLifecycleSortTime(request: RequestItem) {
  const completedMs = timestampToMillis(request.completedAt);
  const readyMs = timestampToMillis(request.readyAt);
  const preparingMs = timestampToMillis(request.preparingAt);
  const pendingMs = timestampToMillis(request.pendingAt);
  const createdMs = timestampToMillis(request.createdAt);

  return completedMs || readyMs || preparingMs || pendingMs || createdMs || 0;
}

function getStatusBadgeClass(status: RequestStatus) {
  switch (status) {
    case "pending":
      return "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300";
    case "preparing":
      return "border border-[#508CFF]/20 bg-[#508CFF]/12 text-[#9FC0FF]";
    case "ready":
      return "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
    case "completed":
      return "border border-white/10 bg-white/5 text-white/70";
    default:
      return "border border-white/10 bg-white/5 text-white/70";
  }
}

function getStatusLabel(status: RequestStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready for pickup";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

function getStatusNote(status: RequestStatus, orderNumber?: number) {
  const orderText =
    typeof orderNumber === "number" ? ` order #${orderNumber}` : " your order";

  switch (status) {
    case "pending":
      return "Your request is in the queue.";
    case "preparing":
      return "Your item is being prepared.";
    case "ready":
      return `Ready for pickup. Pay at bar and give${orderText}.`;
    case "completed":
      return `Pickup complete for${orderText}.`;
    default:
      return "";
  }
}

function getStatusAccentClass(status: RequestStatus) {
  switch (status) {
    case "pending":
      return "bg-yellow-400/80";
    case "preparing":
      return "bg-[#508CFF]";
    case "ready":
      return "bg-emerald-400";
    case "completed":
      return "bg-white/30";
    default:
      return "bg-white/30";
  }
}

function getStatusPriority(status: RequestStatus) {
  switch (status) {
    case "ready":
      return 0;
    case "preparing":
      return 1;
    case "pending":
      return 2;
    case "completed":
      return 3;
    default:
      return 4;
  }
}

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [session, setSessionState] = useState<GuestSession | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [submittingCart, setSubmittingCart] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [recentRequestIds, setRecentRequestIds] = useState<string[]>([]);
  const [highlightedStatusId, setHighlightedStatusId] = useState<string | null>(
    null
  );
  const [activityJumpHighlight, setActivityJumpHighlight] = useState(false);
  const [addFeedbackMap, setAddFeedbackMap] = useState<
    Record<string, AddFeedbackMode>
  >({});
  const [taughtAddCount, setTaughtAddCount] = useState(0);
  const [cartPulse, setCartPulse] = useState(false);

  const previousStatusMapRef = useRef<Record<string, RequestStatus>>({});
  const initialSnapshotLoadedRef = useRef(false);
  const activitySectionRef = useRef<HTMLElement | null>(null);
  const addFeedbackTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const lastAddAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!eventId) return;

    const existing = getGuestSession();

    if (existing && existing.eventId === eventId) {
      setSessionState(existing);
      setChecking(false);
      return;
    }

    router.replace(`/event?event=${eventId}`);
  }, [eventId, router]);

  useEffect(() => {
  return () => {
    Object.values(addFeedbackTimeoutsRef.current).forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
  };
}, []);

useEffect(() => {
  if (!cartPulse) return;

  const timeout = setTimeout(() => {
    setCartPulse(false);
  }, 170);

  return () => clearTimeout(timeout);
}, [cartPulse]);

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
          const initialStatusMap: Record<string, RequestStatus> = {};

          list.forEach((req) => {
            initialStatusMap[req.id] = getEffectiveRequestStatus(req);
          });

          previousStatusMapRef.current = initialStatusMap;
          initialSnapshotLoadedRef.current = true;
          setRequests(list);
          return;
        }

        const nextStatusMap: Record<string, RequestStatus> = {};

        list.forEach((req) => {
          const effectiveStatus = getEffectiveRequestStatus(req);
          nextStatusMap[req.id] = effectiveStatus;

          const previousStatus = previousStatusMapRef.current[req.id];

          if (!previousStatus) {
            if (recentRequestIds.includes(req.id)) {
              setHighlightedStatusId(req.id);
            }
            return;
          }

          if (previousStatus !== effectiveStatus) {
            setHighlightedStatusId(req.id);
          }
        });

        previousStatusMapRef.current = nextStatusMap;
        setRequests(list);
      }
    );

    return () => unsubscribe();
  }, [session, recentRequestIds]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (recentRequestIds.length === 0) return;

    const timeout = setTimeout(() => {
      setRecentRequestIds([]);
    }, 2800);

    return () => clearTimeout(timeout);
  }, [recentRequestIds]);

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

  const scrollToActivitySection = () => {
    if (!activitySectionRef.current) return;

    activitySectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setActivityJumpHighlight(true);
  };

  const getCartQuantityForItem = (itemId: string) => {
    return cart.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
  };

  const clearAddFeedback = (itemId: string) => {
    const existingTimeout = addFeedbackTimeoutsRef.current[itemId];

    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete addFeedbackTimeoutsRef.current[itemId];
    }

    setAddFeedbackMap((prev) => {
      if (!prev[itemId] || prev[itemId] === "idle") return prev;
      return {
        ...prev,
        [itemId]: "idle",
      };
    });
  };

  const triggerAddFeedback = (itemId: string) => {
    const now = Date.now();
    const lastAddAt = lastAddAtRef.current[itemId] ?? 0;
    const rapidRepeat = now - lastAddAt < 1500;

    lastAddAtRef.current[itemId] = now;

    if (rapidRepeat) {
      clearAddFeedback(itemId);
      return;
    }

    const shouldTeach = taughtAddCount < 2;
    const nextMode: AddFeedbackMode = shouldTeach ? "teach" : "pulse";
    const timeoutMs = shouldTeach ? 230 : 150;

    const existingTimeout = addFeedbackTimeoutsRef.current[itemId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    setAddFeedbackMap((prev) => ({
      ...prev,
      [itemId]: nextMode,
    }));

    addFeedbackTimeoutsRef.current[itemId] = setTimeout(() => {
      setAddFeedbackMap((prev) => ({
        ...prev,
        [itemId]: "idle",
      }));
      delete addFeedbackTimeoutsRef.current[itemId];
    }, timeoutMs);

    if (shouldTeach) {
  setTaughtAddCount((prev) => prev + 1);
}

setCartPulse(true);
  };

  const addToCart = (item: MenuItem) => {
    const hasPrice = typeof item.price === "number" && item.price >= 0;

    if (!hasPrice) {
      setToast("Price unavailable for this item");
      return;
    }

    if (item.qty <= 0) {
      setToast("Out of stock");
      return;
    }

    const currentInCart = getCartQuantityForItem(item.id);

    if (currentInCart >= item.qty) {
      setToast("No more stock available");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((entry) => entry.itemId === item.id);

      if (existing) {
        return prev.map((entry) =>
          entry.itemId === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }

      return [
        ...prev,
        {
          itemId: item.id,
          itemName: item.name,
          quantity: 1,
          price: item.price as number,
        },
      ];
    });

    triggerAddFeedback(item.id);
  };

  const updateCartQuantity = (itemId: string, nextQuantity: number) => {
    const menuItem = menu.find((entry) => entry.id === itemId);

    if (!menuItem) return;

    if (nextQuantity <= 0) {
      setCart((prev) => prev.filter((entry) => entry.itemId !== itemId));
      return;
    }

    if (nextQuantity > menuItem.qty) {
      setToast("No more stock available");
      return;
    }

    setCart((prev) =>
      prev.map((entry) =>
        entry.itemId === itemId
          ? { ...entry, quantity: nextQuantity }
          : entry
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartOpen(false);
  };

  const handleSubmitCart = async () => {
    if (!session || cart.length === 0 || submittingCart) return;

    try {
      setSubmittingCart(true);

      const createdIds = await runTransaction(db, async (transaction) => {
        const eventRef = doc(db, "events", session.eventId);
        const eventSnap = await transaction.get(eventRef);

        const currentNextOrderNumber =
          typeof eventSnap.data()?.nextOrderNumber === "number"
            ? eventSnap.data()?.nextOrderNumber
            : 101;

        const orderNumber =
          currentNextOrderNumber >= 101 && currentNextOrderNumber <= 999
            ? currentNextOrderNumber
            : 101;

        const nextOrderNumber = orderNumber >= 999 ? 101 : orderNumber + 1;
        const orderGroupId = `${session.eventId}_${orderNumber}_${Date.now()}`;
        const requestCollectionRef = collection(
          db,
          "events",
          session.eventId,
          "requests"
        );

        transaction.set(
          eventRef,
          {
            nextOrderNumber,
          },
          { merge: true }
        );

        const ids: string[] = [];

        cart.forEach((item) => {
          const requestRef = doc(requestCollectionRef);

          ids.push(requestRef.id);

          transaction.set(requestRef, {
  eventId: session.eventId,
  guestId: session.guestId,
  guestName: session.guestName,

  // critical inventory link
  menuItemId: item.itemId,

  itemName: item.itemName,
  quantity: item.quantity,

  status: "pending",
  orderNumber,
  orderGroupId,

  createdAt: serverTimestamp(),
  pendingAt: serverTimestamp(),
  preparingAt: null,
  readyAt: null,
  completedAt: null,
});
        });

        return ids;
      });

      setRecentRequestIds(createdIds);
      setCart([]);
      setCartOpen(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToActivitySection();
        });
      });
    } catch (err: any) {
      setToast(err?.message || "Failed to submit order");
    } finally {
      setSubmittingCart(false);
    }
  };

  const visibleRequests = useMemo(() => {
    return requests.filter(
      (req) => getEffectiveRequestStatus(req) !== "completed"
    );
  }, [requests]);

  const sortedRequests = useMemo(() => {
    return [...visibleRequests].sort((a, b) => {
      const aStatus = getEffectiveRequestStatus(a);
      const bStatus = getEffectiveRequestStatus(b);

      const priorityDiff = getStatusPriority(aStatus) - getStatusPriority(bStatus);

      if (priorityDiff !== 0) return priorityDiff;

      return getLifecycleSortTime(b) - getLifecycleSortTime(a);
    });
  }, [visibleRequests]);

  const readyCount = useMemo(() => {
    return requests.filter(
      (req) => getEffectiveRequestStatus(req) === "ready"
    ).length;
  }, [requests]);

  const activeCount = useMemo(() => {
    return requests.filter((req) => {
      const status = getEffectiveRequestStatus(req);
      return status === "pending" || status === "preparing";
    }).length;
  }, [requests]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const hasReadyOrders = readyCount > 0;

  const handleViewRequests = () => {
    scrollToActivitySection();
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
              className="h-auto w-auto object-contain"
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
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] text-white">
        <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0A0C12]/75 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-md px-4 pb-4 pt-5">
            <div className="flex items-center gap-4">
              <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-3">
                <Image
                  src="/branding/partyflow-logo-interface.png"
                  alt="PartyFlow logo"
                  width={58}
                  height={58}
                  className="h-auto w-auto object-contain"
                  priority
                />
              </div>

              <div className="min-w-0 flex-1 text-left">
                <h1 className="mt-1 text-[29px] font-semibold leading-none tracking-tight">
                  Party Menu
                </h1>
                <p className="mt-2 text-[15px] text-white/55">
                  Welcome, {session.guestName}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                  Active
                </p>
                <p className="mt-0.5 text-base font-semibold text-white">
                  {activeCount}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/8 px-4 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/70">
                  Ready
                </p>
                <p className="mt-0.5 text-base font-semibold text-emerald-300">
                  {readyCount}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={handleViewRequests}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  hasReadyOrders
                    ? "animate-pulse border-emerald-400/35 bg-[linear-gradient(135deg,rgba(16,80,64,0.88),rgba(39,26,67,0.92))] shadow-[0_0_0_1px_rgba(52,211,153,0.12),0_0_28px_rgba(16,185,129,0.14)] hover:border-emerald-300/45 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_0_32px_rgba(16,185,129,0.18)]"
                    : "border-[#8B5CFF]/30 bg-[#8B5CFF]/18 shadow-[0_0_0_1px_rgba(139,92,255,0.08)] hover:bg-[#8B5CFF]/26"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-[10px] uppercase tracking-[0.16em] ${
                        hasReadyOrders ? "text-emerald-200/90" : "text-[#D7C7FF]"
                      }`}
                    >
                      Your Activity
                    </p>

                    {hasReadyOrders ? (
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-400/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-200">
                        Ready now
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {hasReadyOrders
                      ? "Pickup Ready — View Requests"
                      : "View Requests"}
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    hasReadyOrders
                      ? "border border-emerald-300/20 bg-emerald-400/12 text-emerald-100"
                      : "border border-[#B8A6FF]/20 bg-white/5 text-[#E9E0FF]"
                  }`}
                >
                  →
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md space-y-4 px-4 py-4 pb-28">
          <section className="overflow-hidden rounded-3xl border border-[#8B5CFF]/15 bg-[#1B1F2C]/95 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8A6FF]">
                Available Items
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Order from the menu
              </h2>

              <p className="mt-1 text-sm leading-6 text-white/55">
                Add items to your cart, review the total, then confirm before
                sending.
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
                    const inCart = getCartQuantityForItem(item.id);
                    const priceAvailable =
                      typeof item.price === "number" && item.price >= 0;
                    const addFeedback = addFeedbackMap[item.id] ?? "idle";

                    const baseButtonClass =
                      "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.96]";

                    const enabledButtonClass =
                      addFeedback === "teach"
                        ? "border-emerald-300/30 bg-emerald-400/14 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.12),0_0_18px_rgba(16,185,129,0.10)] scale-[1.02]"
                        : addFeedback === "pulse"
                        ? "border-[#8B5CFF]/34 bg-[#8B5CFF]/28 text-[#F3EDFF] shadow-[0_0_0_1px_rgba(139,92,255,0.10),0_0_16px_rgba(139,92,255,0.12)] scale-[1.02]"
                        : "border-[#8B5CFF]/30 bg-[#8B5CFF]/24 text-[#E9E0FF] shadow-[0_0_0_1px_rgba(139,92,255,0.06)] hover:bg-[#8B5CFF]/34";

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/6 bg-[#101522] p-4 transition hover:border-white/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
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

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
                              <span>{item.qty} available</span>
                              <span className="text-white/20">•</span>
                              <span>
                                {priceAvailable
                                  ? formatCurrency(item.price as number)
                                  : "Price unavailable"}
                              </span>
                              {inCart > 0 ? (
                                <>
                                  <span className="text-white/20">•</span>
                                  <span className="text-[#D7C7FF]">
                                    In cart: {inCart}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <button
                            onClick={() => addToCart(item)}
                            disabled={isOut || !priceAvailable}
                            aria-live="polite"
                            className={`${baseButtonClass} ${
                              isOut || !priceAvailable
                                ? "cursor-not-allowed border-white/10 bg-white/10 text-white/35"
                                : enabledButtonClass
                            }`}
                          >
                            <span className="inline-flex min-w-[4.9rem] items-center justify-center gap-1.5 whitespace-nowrap">
                              {isOut
                                ? "Out"
                                : !priceAvailable
                                ? "Unavailable"
                                : addFeedback === "teach"
                                ? "✓ Added"
                                : "+ Add"}
                            </span>
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
                    Once you submit an order, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedRequests.map((req) => {
                    const effectiveStatus = getEffectiveRequestStatus(req);
                    const isReady = effectiveStatus === "ready";
                    const isRecent = recentRequestIds.includes(req.id);
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
                              effectiveStatus
                            )}`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  {typeof req.orderNumber === "number" ? (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                                      Order #{req.orderNumber}
                                    </span>
                                  ) : null}

                                  {isRecent ? (
                                    <span className="rounded-full border border-[#8B5CFF]/25 bg-[#8B5CFF]/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#D7C7FF]">
                                      New
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-2 truncate text-sm font-semibold text-white">
                                  {req.itemName}
                                </p>

                                <p className="mt-1 text-xs text-white/45">
                                  Quantity: {req.quantity}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusBadgeClass(
                                  effectiveStatus
                                )}`}
                              >
                                {getStatusLabel(effectiveStatus)}
                              </span>
                            </div>

                            <p
                              className={`mt-3 text-xs ${
                                isReady ? "text-emerald-200/90" : "text-white/48"
                              }`}
                            >
                              {getStatusNote(effectiveStatus, req.orderNumber)}
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

        {cartItemCount > 0 ? (
          <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-32px)] max-w-md -translate-x-1/2">
            <button
              onClick={() => setCartOpen(true)}
className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-[#25153D]/95 px-4 py-4 text-left text-white backdrop-blur transition-all duration-150 hover:bg-[#2B1844]/95 ${
  cartPulse
    ? "border-[#B8A6FF]/45 shadow-[0_0_0_1px_rgba(184,166,255,0.14),0_12px_34px_rgba(139,92,255,0.22)]"
    : "border-[#8B5CFF]/25 shadow-2xl"
}`}
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#D7C7FF]">
                  Your Cart
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {cartItemCount} item{cartItemCount === 1 ? "" : "s"} in cart
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(cartTotal)}
                </p>
                <p className="mt-1 text-xs text-[#D7C7FF]">Review order</p>
              </div>
            </button>
          </div>
        ) : null}

        {toast && (
          <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-2xl border border-red-400/25 bg-[#3A1313]/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur">
            <p className="text-center font-medium">{toast}</p>
          </div>
        )}
      </div>

      {cartOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#8B5CFF]/18 bg-[#171B27] text-white shadow-2xl">
            <div className="border-b border-white/6 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8A6FF]">
                    Review Order
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Your Cart</h2>
                  <p className="mt-1 text-sm text-white/55">
                    Confirm before sending this order to the host queue.
                  </p>
                </div>

                <button
                  onClick={() => setCartOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="space-y-3">
                {cart.map((item) => {
                  const lineTotal = item.price * item.quantity;

                  return (
                    <div
                      key={item.itemId}
                      className="rounded-2xl border border-white/6 bg-[#101522] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {item.itemName}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-semibold text-white">
                          {formatCurrency(lineTotal)}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-2">
                          <button
                            onClick={() =>
                              updateCartQuantity(item.itemId, item.quantity - 1)
                            }
                            className="h-8 w-8 rounded-full bg-white/10 text-sm font-medium text-white transition hover:bg-white/15"
                          >
                            -
                          </button>

                          <span className="min-w-[2rem] text-center text-sm font-medium text-white">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              updateCartQuantity(item.itemId, item.quantity + 1)
                            }
                            className="h-8 w-8 rounded-full bg-white/10 text-sm font-medium text-white transition hover:bg-white/15"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => updateCartQuantity(item.itemId, 0)}
                          className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/6 px-4 py-4">
              <div className="mb-4 rounded-2xl border border-white/6 bg-[#101522] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white/65">Total</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(cartTotal)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={clearCart}
                  disabled={submittingCart}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  onClick={handleSubmitCart}
                  disabled={submittingCart || cart.length === 0}
                  className="rounded-full bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
                >
                  {submittingCart ? "Submitting..." : "Confirm Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
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
                className="h-auto w-auto object-contain"
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