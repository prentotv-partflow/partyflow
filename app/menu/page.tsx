"use client";

import { Suspense, useState, useEffect } from "react";
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

  // 🔐 SESSION CHECK
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

  // 🍽️ MENU LISTENER
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

  // 🧾 MY REQUESTS LISTENER
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

  // 🔥 REQUEST ITEM (guest only creates request)
  const handleRequest = async (item: MenuItem) => {
    if (!session) return;
    if (loadingItem) return;

    if (item.qty <= 0) {
      setToast("❌ Out of stock");
      setTimeout(() => setToast(null), 2000);
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
      setTimeout(() => setToast(null), 2000);
    } catch (err: any) {
      setToast(`❌ ${err.message}`);
      setTimeout(() => setToast(null), 2500);
    } finally {
      setLoadingItem(null);
    }
  };

  if (checking || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-white">
        Entering event...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-white p-4 shadow-sm">
        <h1 className="text-center text-lg font-semibold">
          Party Menu 🍽️
        </h1>

        <p className="text-center text-xs text-gray-500">
          {session.guestName}
        </p>
      </div>

      {/* MENU */}
      <div className="mx-auto flex-1 w-full max-w-md space-y-4 p-4">
        {menu.length === 0 ? (
          <p className="text-center text-sm text-gray-400">
            No items available
          </p>
        ) : (
          <div className="space-y-3">
            {menu.map((item) => (
              <div
                key={item.id}
                className="flex justify-between rounded-xl bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold">{item.name}</p>

                  <p className="text-xs text-gray-500">
                    {item.qty} available
                  </p>
                </div>

                <button
                  onClick={() => handleRequest(item)}
                  disabled={
                    loadingItem === item.id || item.qty === 0
                  }
                  className={`rounded-lg px-4 py-2 text-sm ${
                    item.qty === 0
                      ? "bg-gray-300 text-gray-500"
                      : "bg-black text-white"
                  }`}
                >
                  {item.qty === 0
                    ? "Out"
                    : loadingItem === item.id
                    ? "..."
                    : "Request"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* REQUESTS */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold">
            Your Requests
          </h2>

          {requests.length === 0 ? (
            <p className="text-xs text-gray-400">
              No requests yet
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {requests.map((req) => (
                <li key={req.id}>
                  • {req.itemName} x{req.quantity} (
                  {req.status})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-black px-4 py-2 text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function GuestMenu() {
  return (
    <Suspense fallback={<div>Loading menu...</div>}>
      <MenuContent />
    </Suspense>
  );
}