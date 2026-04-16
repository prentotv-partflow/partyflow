"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase";
import {
  collection,
  serverTimestamp,
  onSnapshot,
  doc,
  runTransaction,
} from "firebase/firestore";

// ✅ TYPES
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

function MenuContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const nameFromUrl = searchParams.get("name");

  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState("");

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  // ✅ Initialize guest name
  useEffect(() => {
    if (nameFromUrl) {
      setGuestName(nameFromUrl);
    }
  }, [nameFromUrl]);

  // 🔥 Load menu + guestId
  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", eventId, "menu"),
      (snapshot) => {
        const items: MenuItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<MenuItem, "id">),
        }));

        // ✅ Alphabetical sort
        items.sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

        setMenu(items);
      }
    );

    const storedId = localStorage.getItem("guestId");
    if (storedId) {
      setGuestId(storedId);
    } else {
      const newId = Math.floor(1000 + Math.random() * 9000).toString();
      localStorage.setItem("guestId", newId);
      setGuestId(newId);
    }

    return () => unsubscribe();
  }, [eventId]);

  // 🔥 Listen to THIS guest's requests
  useEffect(() => {
    if (!eventId || !guestId) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", eventId, "requests"),
      (snapshot) => {
        const list: RequestItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<RequestItem, "id">;

          if (data.guestId === guestId) {
            list.push({
              ...data,
              id: docSnap.id,
            });
          }
        });

        // ✅ Alphabetical + stable
        list.sort((a, b) => {
          const nameCompare = a.itemName
            .toLowerCase()
            .localeCompare(b.itemName.toLowerCase());

          if (nameCompare !== 0) return nameCompare;

          return (
            (a.createdAt?.seconds || 0) -
            (b.createdAt?.seconds || 0)
          );
        });

        setRequests(list);
      }
    );

    return () => unsubscribe();
  }, [eventId, guestId]);

  // 🔥 Request handler (FIXED)
  const handleRequest = async (item: MenuItem) => {
    if (!guestName.trim()) {
      setToast("❌ Missing guest name");
      setTimeout(() => setToast(null), 2000);
      return;
    }

    if (!eventId) {
      setToast("❌ Missing event ID");
      setTimeout(() => setToast(null), 2000);
      return;
    }

    if (loadingItem) return;

    setLoadingItem(item.id);

    try {
      const itemRef = doc(db, "events", eventId, "menu", item.id);
      const requestsRef = collection(db, "events", eventId, "requests");

      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) throw new Error("Item missing");

        const currentQty = itemDoc.data().qty;
        if (currentQty <= 0) throw new Error("Out of stock");

        // ✅ ALWAYS CREATE NEW REQUEST
        const requestRef = doc(requestsRef);

        transaction.set(requestRef, {
          eventId,
          guestId,
          guestName: guestName.trim(),
          itemName: item.name,
          quantity: 1,
          status: "pending",
          createdAt: serverTimestamp(),
        });

        // ✅ Deduct inventory
        transaction.update(itemRef, {
          qty: currentQty - 1,
        });
      });

      setToast(`✅ ${item.name} added`);
      setTimeout(() => setToast(null), 2000);

    } catch (error: any) {
      console.error("❌ REQUEST ERROR:", error);

      setToast(`❌ ${error.message || "Failed"}`);
      setTimeout(() => setToast(null), 2000);
    } finally {
      setLoadingItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-center">
          Party Menu 🍽️
        </h1>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-md w-full mx-auto">

        {/* MENU */}
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
                disabled={
                  loadingItem === item.id ||
                  item.qty === 0
                }
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

        {/* 🛒 YOUR REQUESTS */}
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

      {/* 🔔 TOAST */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-lg text-sm">
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