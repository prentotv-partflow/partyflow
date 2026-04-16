"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  deleteDoc,
  doc,
  runTransaction,
} from "firebase/firestore";
import useRole from "../hooks/useRole"; // ✅ NEW

type MenuItem = {
  id: string;
  name: string;
  qty: number;
};

export default function AddMenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = useRole(); // ✅ NEW

  const eventId =
    searchParams.get("event") || searchParams.get("eventId");

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // 🔥 NAVIGATION HANDLER
  const goTo = (path: string) => {
    if (!eventId) return;
    router.push(`${path}?event=${eventId}`);
  };

  // 🔥 REAL-TIME MENU
  useEffect(() => {
    if (!eventId) return;

    const q = query(collection(db, "events", eventId, "menu"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MenuItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<MenuItem, "id">),
      }));

      // ✅ Alphabetical sort (case-insensitive)
      items.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );

      setMenu(items);
    });

    return () => unsubscribe();
  }, [eventId]);

  // 🔥 ADD / MERGE ITEM
  const addItem = async () => {
    if (!itemName.trim() || !quantity.trim()) {
      alert("Please fill in all fields");
      return;
    }

    const qtyNumber = Number(quantity);

    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      alert("Quantity must be valid");
      return;
    }

    if (!eventId) return;

    try {
      setLoading(true);

      const menuRef = collection(db, "events", eventId, "menu");

      const existing = menu.find(
        (item) =>
          item.name.toLowerCase() ===
          itemName.trim().toLowerCase()
      );

      if (existing) {
        const ref = doc(
          db,
          "events",
          eventId,
          "menu",
          existing.id
        );

        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref);
          const currentQty = snap.data()?.qty || 0;

          transaction.update(ref, {
            qty: currentQty + qtyNumber,
          });
        });
      } else {
        const ref = doc(menuRef);

        await runTransaction(db, async (transaction) => {
          transaction.set(ref, {
            name: itemName.trim(),
            qty: qtyNumber,
            createdAt: serverTimestamp(),
          });
        });
      }

      setItemName("");
      setQuantity("");
      setShowSuggestions(false);
      nameInputRef.current?.focus();

    } catch (error) {
      console.error(error);
      alert("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 DELETE
  const handleDelete = async (id: string) => {
    if (!eventId) return;
    await deleteDoc(doc(db, "events", eventId, "menu", id));
  };

  // 🔥 UPDATE QTY
  const updateQty = async (id: string, delta: number) => {
    if (!eventId) return;

    const ref = doc(db, "events", eventId, "menu", id);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const currentQty = snap.data()?.qty || 0;

      const newQty = currentQty + delta;
      if (newQty < 0) return;

      transaction.update(ref, { qty: newQty });
    });
  };

  // 🔍 Suggestions
  const suggestions = menu.filter((item) =>
    item.name
      .toLowerCase()
      .includes(itemName.toLowerCase())
  );

  const exactMatch = menu.find(
    (item) =>
      item.name.toLowerCase() === itemName.toLowerCase()
  );

  if (!eventId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Missing event ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* 🔥 ROLE-AWARE NAV BAR */}
      <div className="sticky top-0 z-20 bg-[#0A0C12] border-b border-white/5 px-4 py-3 flex justify-between items-center text-white">
        <h1 className="text-sm font-semibold">PartyFlow Host</h1>

        <div className="flex gap-2 text-xs flex-wrap">
          {/* ALWAYS AVAILABLE */}
          <button
            onClick={() => goTo("/host")}
            className="px-3 py-1 rounded-full bg-white/10"
          >
            Queue
          </button>

          <button
            onClick={() => goTo("/add-menu")}
            className="px-3 py-1 rounded-full bg-white/10"
          >
            Add Menu
          </button>

          {/* HOST ONLY */}
          {role === "host" && (
            <>
              <button
                onClick={() => router.push("/my-events")}
                className="px-3 py-1 rounded-full bg-white/10"
              >
                Events
              </button>

              <button
                onClick={() => router.push("/create-event")}
                className="px-3 py-1 rounded-full bg-white/10"
              >
                Create
              </button>
            </>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-md">

          <h1 className="text-xl font-bold mb-4 text-center">
            Add Menu Items 🍹🔥🔥🔥
          </h1>

          {/* ITEM NAME */}
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Item Name"
            className="w-full mb-2 p-3 border rounded-lg"
            value={itemName}
            onChange={(e) => {
              setItemName(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                qtyInputRef.current?.focus();
              }
            }}
          />

          {/* SUGGESTIONS */}
          {showSuggestions &&
            itemName &&
            suggestions.length > 0 &&
            !exactMatch && (
              <div className="mb-2 border rounded-lg max-h-32 overflow-y-auto">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="p-2 text-sm hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setItemName(s.name);
                      setShowSuggestions(false);
                      qtyInputRef.current?.focus();
                    }}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            )}

          {/* QUANTITY */}
          <input
            ref={qtyInputRef}
            type="number"
            placeholder="Quantity"
            className="w-full mb-3 p-3 border rounded-lg"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
          />

          <button
            onClick={addItem}
            className="w-full bg-black text-white p-3 rounded-lg"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Item"}
          </button>

          {/* MENU LIST */}
          <div className="space-y-2 mt-4">
            {menu.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-3 items-center p-2 border rounded"
              >
                <span className="truncate">{item.name}</span>

                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="px-2 bg-gray-200 rounded"
                  >
                    -
                  </button>

                  <span>{item.qty}</span>

                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="px-2 bg-gray-200 rounded"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 text-right"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}