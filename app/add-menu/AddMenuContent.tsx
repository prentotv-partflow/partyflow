"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export default function AddMenuContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [menu, setMenu] = useState<
    { name: string; qty: number }[]
  >([]);

  const addItem = async () => {
    console.log("🔥 BUTTON CLICKED");

    if (!itemName || !quantity) {
      console.log("❌ Missing input");
      return;
    }

    if (!eventId) {
      console.log("❌ Missing event ID");
      alert("Missing event ID in URL");
      return;
    }

    console.log("✅ Event ID:", eventId);
    console.log("✅ Item:", itemName, quantity);

    try {
      await addDoc(
        collection(db, "events", eventId, "menu"),
        {
          name: itemName,
          qty: Number(quantity),
        }
      );

      console.log("✅ SAVED TO FIREBASE");

      setMenu((prev) => [
        ...prev,
        { name: itemName, qty: Number(quantity) },
      ]);

      setItemName("");
      setQuantity("");

    } catch (error: any) {
      console.error("❌ FIREBASE ERROR:", error);
      alert(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-md">
        <h1 className="text-xl font-bold mb-4 text-center">
          Add Menu Items 🍹
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
          onClick={addItem}
          className="w-full bg-black text-white py-3 rounded-lg mb-4"
        >
          Add Item
        </button>

        <div className="space-y-2">
          {menu.map((item, index) => (
            <div
              key={index}
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