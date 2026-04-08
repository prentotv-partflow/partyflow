"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";

export default function AddMenuContent() {
  const searchParams = useSearchParams();

  const eventId =
    searchParams.get("eventId") || searchParams.get("event");

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [menu, setMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ REAL-TIME LISTENER (NO orderBy for now)
  useEffect(() => {
    if (!eventId) {
      console.log("❌ No eventId — listener not started");
      return;
    }

    console.log("👀 Listening to event:", eventId);

    const q = query(
      collection(db, "events", eventId, "menu")
    );

    const unsubscribe = onSnapshot(
      q,
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
      },
      (error) => {
        console.error("❌ SNAPSHOT ERROR:", error);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  const addItem = async () => {
    console.log("🔥 BUTTON CLICKED");

    if (!itemName || !quantity) {
      alert("Please fill in all fields");
      return;
    }

    const qtyNumber = Number(quantity);

    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      alert("Quantity must be valid");
      return;
    }

    if (!eventId) {
      console.log("❌ Missing event ID");
      alert("Missing event ID in URL");
      return;
    }

    try {
      setLoading(true);

      console.log("🚀 Writing to Firestore:", {
        eventId,
        itemName,
        qtyNumber,
      });

      await addDoc(
        collection(db, "events", eventId, "menu"),
        {
          name: itemName,
          qty: qtyNumber,
          createdAt: serverTimestamp(),
        }
      );

      console.log("✅ SAVED TO FIREBASE");

      setItemName("");
      setQuantity("");

    } catch (error: any) {
      console.error("❌ FIREBASE ERROR:", error);
      alert("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-md">
        <h1 className="text-xl font-bold mb-4 text-center">
            Add Menu Items 🍹🔥🔥🔥
        </h1>

        <input
          type="text"
          placeholder="Item Name (e.g. Rum Punch)"
          className="w-full mb-3 p-3 border rounded-lg"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Quantity Available"
          className="w-full mb-3 p-3 border rounded-lg"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <button
              onClick={() => {
              console.log("🔥 BUTTON CLICKED");
              alert("BUTTON WORKS");
         }}
>
          Add Item
        </button>

        <div className="space-y-2">
          {menu.map((item) => (
            <div
              key={item.id}
              className="flex justify-between p-2 border rounded"
            >
              <span>{item.name}</span>
              <span>{item.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}