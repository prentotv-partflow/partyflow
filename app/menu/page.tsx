"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

function MenuContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState("");

  // ✅ FIXED TYPE (qty is now number)
  const [menu, setMenu] = useState<
    { id: string; name: string; qty: number }[]
  >([]);

  const [requests, setRequests] = useState<
    { name: string; guest: string; id: string }[]
  >([]);

  const [loading, setLoading] = useState(false);

  // 🔥 LOAD MENU FROM FIREBASE (REAL-TIME)
  useEffect(() => {
    if (!eventId) return;

    // 🔥 Listen to Firebase menu
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

        console.log("🔥 MENU FROM FIREBASE:", items);
        setMenu(items);
      }
    );

    // 👤 Guest ID logic (keep local)
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

  // 🔥 REQUEST HANDLER (still local inventory for now)
  const handleRequest = async (itemIndex: number) => {
    console.log("🚀 BUTTON CLICKED");

    const item = menu[itemIndex];

    if (!guestName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!eventId) {
      alert("Missing event ID");
      return;
    }

    if (item.qty <= 0) {
      alert("Item is out of stock");
      return;
    }

    setLoading(true);

    try {
      // 🔥 Save request to Firebase
      const docRef = await addDoc(collection(db, "requests"), {
        eventId,
        itemName: item.name,
        guestName: guestName.trim(),
        guestId,
        createdAt: serverTimestamp(),
      });

      console.log("✅ Saved with ID:", docRef.id);

      // ⚠️ TEMP: Local update only (will replace with transaction next)
      const updatedMenu = [...menu];
      updatedMenu[itemIndex].qty =
        updatedMenu[itemIndex].qty - 1;

      setMenu(updatedMenu);

      // ✅ Update UI requests list
      setRequests((prev) => [
        ...prev,
        {
          name: item.name,
          guest: guestName.trim(),
          id: guestId,
        },
      ]);

    } catch (error: any) {
      console.error("❌ FULL ERROR:", error);

      alert(
        "Error sending request:\n" +
          (error?.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      
      {/* Header */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-center">
          Party Menu 🍽️
        </h1>

        <p className="text-xs text-gray-400 text-center">
          Welcome! Enter your name and request items
        </p>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-md w-full mx-auto">

        {/* Name */}
        <div className="bg-white p-3 rounded-xl shadow-sm">
          <input
            type="text"
            placeholder="Enter your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm focus:outline-none text-black placeholder-gray-500"
          />
        </div>

        {/* Menu */}
        <div className="space-y-3">
          {menu.map((item, index) => (
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
                onClick={() => handleRequest(index)}
                disabled={
                  loading ||
                  item.qty === 0 ||
                  !guestName.trim()
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  loading ||
                  item.qty === 0 ||
                  !guestName.trim()
                    ? "bg-gray-300 text-gray-500"
                    : "bg-black text-white active:scale-95"
                }`}
              >
                {loading
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

        {/* Requests */}
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