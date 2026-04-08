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

function MenuContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState("");

  const [menu, setMenu] = useState<
    { id: string; name: string; qty: number }[]
  >([]);

  const [requests, setRequests] = useState<
    { name: string; guest: string; id: string }[]
  >([]);

  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  // 🔥 LOAD MENU (REAL-TIME)
  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", eventId, "menu"),
      (snapshot) => {
        const items: any[] = [];

        snapshot.forEach((doc) => {
          items.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setMenu(items);
      }
    );

    // 👤 Guest ID
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

  // 🔥 SAFE REQUEST (TRANSACTION)
  const handleRequest = async (item: {
    id: string;
    name: string;
    qty: number;
  }) => {
    if (!guestName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!eventId) {
      alert("Missing event ID");
      return;
    }

    setLoadingItem(item.id);

    try {
      const itemRef = doc(db, "events", eventId, "menu", item.id);

      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error("Item does not exist");
        }

        const currentQty = itemDoc.data().qty;

        if (currentQty <= 0) {
          throw new Error("Out of stock");
        }

        // ✅ Reduce inventory safely
        transaction.update(itemRef, {
          qty: currentQty - 1,
        });

        // ✅ Save request
        const requestRef = doc(collection(db, "requests"));
        transaction.set(requestRef, {
          eventId,
          itemName: item.name,
          guestName: guestName.trim(),
          guestId,
          createdAt: serverTimestamp(),
        });
      });

      console.log("✅ Transaction successful");

      // Optional UI update (real-time will sync anyway)
      setRequests((prev) => [
        ...prev,
        {
          name: item.name,
          guest: guestName.trim(),
          id: guestId,
        },
      ]);

    } catch (error: any) {
      console.error("❌ ERROR:", error);

      if (error.message === "Out of stock") {
        alert("Item just ran out 😅");
      } else {
        alert("Failed to send request. Try again.");
      }
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

        <p className="text-xs text-gray-400 text-center">
          Welcome! Enter your name and request items
        </p>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-md w-full mx-auto">

        <div className="bg-white p-3 rounded-xl shadow-sm">
          <input
            type="text"
            placeholder="Enter your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm text-black"
          />
        </div>

        <div className="space-y-3">
          {menu.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-base text-black">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500">
                  {item.qty} available
                </p>
              </div>

              <button
                onClick={() => handleRequest(item)}
                disabled={
                  loadingItem === item.id ||
                  item.qty === 0 ||
                  !guestName.trim()
                }
                className={`px-4 py-2 rounded-lg text-sm ${
                  loadingItem === item.id ||
                  item.qty === 0 ||
                  !guestName.trim()
                    ? "bg-gray-300 text-gray-500"
                    : "bg-black text-white"
                }`}
              >
                {loadingItem === item.id
                  ? "Sending..."
                  : !guestName.trim()
                  ? "Enter Name"
                  : item.qty === 0
                  ? "Out"
                  : "Request"}
              </button>
            </div>
          ))}
        </div>

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
              {requests.map((req, i) => (
                <li key={i}>• {req.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
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