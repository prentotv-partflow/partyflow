"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../firebase";
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

function setSession(session: GuestSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
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

  // 🔐 SESSION INITIALIZATION (SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    if (!eventId) return;

    const existing = getSession();

    // valid session
    if (existing && existing.eventId === eventId) {
      setSessionState(existing);
      setChecking(false);
      return;
    }

    // missing session → redirect to onboarding
    router.replace(`/event?event=${eventId}`);
  }, [eventId, router]);

  // 🔥 MENU LISTENER
  useEffect(() => {
    if (!session) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", session.eventId, "menu"),
      (snapshot) => {
        const items: MenuItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<MenuItem, "id">),
        }));

        items.sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

        setMenu(items);
      }
    );

    return () => unsubscribe();
  }, [session]);

  // 🔥 REQUEST LISTENER (ONLY THIS GUEST)
  useEffect(() => {
    if (!session) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", session.eventId, "requests"),
      (snapshot) => {
        const list: RequestItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<RequestItem, "id">;

          if (data.guestId === session.guestId) {
            list.push({ ...data, id: docSnap.id });
          }
        });

        setRequests(list);
      }
    );

    return () => unsubscribe();
  }, [session]);

  // 🔥 REQUEST ITEM
  const handleRequest = async (item: MenuItem) => {
    if (!session) return;
    if (loadingItem) return;

    setLoadingItem(item.id);

    try {
      const itemRef = doc(db, "events", session.eventId, "menu", item.id);
      const requestRef = doc(collection(db, "events", session.eventId, "requests"));

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(itemRef);
        if (!snap.exists()) throw new Error("Item missing");

        const currentQty = snap.data().qty;
        if (currentQty <= 0) throw new Error("Out of stock");

        tx.set(requestRef, {
          eventId: session.eventId,
          guestId: session.guestId,
          guestName: session.guestName,
          itemName: item.name,
          quantity: 1,
          status: "pending",
          createdAt: serverTimestamp(),
        });

        tx.update(itemRef, { qty: currentQty - 1 });
      });

      setToast(`✅ ${item.name} requested`);
      setTimeout(() => setToast(null), 2000);

    } catch (err: any) {
      setToast(`❌ ${err.message}`);
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
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-center">
          Party Menu 🍽️
        </h1>

        <p className="text-xs text-gray-500 text-center">
          {session.guestName}
        </p>
      </div>

      {/* MENU */}
      <div className="flex-1 p-4 space-y-4 max-w-md w-full mx-auto">

        {menu.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">
            No items available
          </p>
        ) : (
          <div className="space-y-3">
            {menu.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl shadow-sm flex justify-between"
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.qty} available
                  </p>
                </div>

                <button
                  onClick={() => handleRequest(item)}
                  disabled={loadingItem === item.id || item.qty === 0}
                  className={`px-4 py-2 rounded-lg text-sm ${
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
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-2 text-sm">
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
                  • {req.itemName} x{req.quantity} ({req.status})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg text-sm">
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