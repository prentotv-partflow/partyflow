"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
      return "border border-blue-400/20 bg-blue-500/10 text-blue-300";
    case "ready":
      return "border border-green-400/20 bg-green-500/10 text-green-300";
    default:
      return "border border-white/10 bg-white/5 text-white/70";
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

        setRequests(list);
      }
    );

    return () => unsubscribe();
  }, [session]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 2200);

    return () => clearTimeout(timeout);
  }, [toast]);

  const handleRequest = async (item: MenuItem) => {
    if (!session || loadingItem) return;

    if (item.qty <= 0) {
      setToast("❌ Out of stock");
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

      setToast(`✅ ${item.name} requested`);
    } catch (err: any) {
      setToast(`❌ ${err.message}`);
    } finally {
      setLoadingItem(null);
    }
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });
  }, [requests]);

  if (checking || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] text-white">
        Entering event...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] text-white">
      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0A0C12]/70 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 py-4">
          <p className="text-center text-[10px] uppercase tracking-[0.18em] text-[#B8A6FF]">
            Guest Menu
          </p>

          <h1 className="mt-2 text-center text-xl font-semibold">
            Party Menu 🍽️
          </h1>

          <p className="mt-1 text-center text-sm text-white/55">
            {session.guestName}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-4">
        {/* MENU CARD */}
        <div className="rounded-3xl border border-[#8B5CFF]/15 bg-[#1B1F2C] p-4">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8A6FF]">
              Available Items
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              Order from the menu
            </h2>

            <p className="mt-1 text-sm text-white/55">
              Tap request to send an item to the host queue.
            </p>
          </div>

          {menu.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#101522] px-4 py-10 text-center">
              <p className="text-sm text-white/45">No items available</p>
              <p className="mt-1 text-xs text-white/25">
                The host has not added menu items yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {menu.map((item) => {
                const isOut = item.qty === 0;
                const isLoading = loadingItem === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-[#101522] p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        {item.name}
                      </p>

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
                          : "border-[#8B5CFF]/20 bg-[#8B5CFF]/22 text-[#E2D9FF] hover:bg-[#8B5CFF]/32"
                      }`}
                    >
                      {isOut ? "Out" : isLoading ? "Requesting..." : "Request"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* REQUESTS CARD */}
        <div className="rounded-3xl border border-[#8B5CFF]/15 bg-[#1B1F2C] p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8A6FF]">
                Your Activity
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Your Requests
              </h2>

              <p className="mt-1 text-sm text-white/55">
                Track each request as it moves through the queue.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
              {sortedRequests.length}
            </span>
          </div>

          {sortedRequests.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#101522] px-4 py-10 text-center">
              <p className="text-sm text-white/45">No requests yet</p>
              <p className="mt-1 text-xs text-white/25">
                Your requested items will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-white/6 bg-[#101522] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {req.itemName}
                      </p>

                      <p className="mt-1 text-xs text-white/45">
                        Quantity: {req.quantity}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${getStatusBadgeClass(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-[#8B5CFF]/20 bg-[#25153D]/95 px-4 py-3 text-sm text-white shadow-xl backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function GuestMenu() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] text-white">
          Loading menu...
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}