"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
import HostNav from "../components/HostNav";

type MenuItem = {
  id: string;
  name: string;
  qty: number;
};

export default function AddMenuContent() {
  const searchParams = useSearchParams();

  const eventId = searchParams.get("event");

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!eventId) return;

    const q = query(collection(db, "events", eventId, "menu"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MenuItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<MenuItem, "id">),
      }));

      items.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );

      setMenu(items);
    });

    return () => unsubscribe();
  }, [eventId]);

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
        (item) => item.name.toLowerCase() === itemName.trim().toLowerCase()
      );

      if (existing) {
        const ref = doc(db, "events", eventId, "menu", existing.id);

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

  const handleDelete = async (id: string) => {
    if (!eventId) return;
    await deleteDoc(doc(db, "events", eventId, "menu", id));
  };

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

  const suggestions = menu.filter((item) =>
    item.name.toLowerCase().includes(itemName.toLowerCase())
  );

  const exactMatch = menu.find(
    (item) => item.name.toLowerCase() === itemName.toLowerCase()
  );

  if (!eventId) {
    return (
      <div className="min-h-screen bg-[#0A0C12] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
          <div className="rounded-3xl border border-white/10 bg-[#191C24] px-6 py-8 text-center">
            <p className="text-lg font-semibold">Missing event context</p>
            <p className="mt-2 text-sm text-white/55">
              Menu management needs a valid event to load.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0A0C12]/92 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <HostNav eventId={eventId} activeTab="menu" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-4">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {/* HEADER */}
          <div className="rounded-3xl border border-white/10 bg-[#141821] px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
              Menu Management
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Add Menu Items</h1>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Add new items, merge quantities for existing items, and keep stock
              updated in real time.
            </p>
          </div>

          {/* ADD FORM */}
          <div className="rounded-3xl border border-white/10 bg-[#191C24] p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Add or Restock Items</h2>
              <p className="mt-1 text-sm text-white/55">
                Existing item names will merge and increase quantity.
              </p>
            </div>

            <div className="space-y-3">
              {/* ITEM NAME */}
              <div>
                <label className="mb-2 block text-sm text-white/80">
                  Item Name
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="Item Name"
                  className="w-full rounded-2xl border border-white/10 bg-[#0F1218] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#508CFF]/60"
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
              </div>

              {/* SUGGESTIONS */}
              {showSuggestions &&
                itemName &&
                suggestions.length > 0 &&
                !exactMatch && (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0F1218]">
                    <div className="border-b border-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                      Suggestions
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
                          onClick={() => {
                            setItemName(s.name);
                            setShowSuggestions(false);
                            qtyInputRef.current?.focus();
                          }}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* QUANTITY */}
              <div>
                <label className="mb-2 block text-sm text-white/80">
                  Quantity
                </label>
                <input
                  ref={qtyInputRef}
                  type="number"
                  placeholder="Quantity"
                  className="w-full rounded-2xl border border-white/10 bg-[#0F1218] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#508CFF]/60"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                />
              </div>

              <button
                onClick={addItem}
                className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Item"}
              </button>
            </div>
          </div>

          {/* MENU LIST */}
          <div className="rounded-3xl border border-white/10 bg-[#191C24] p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
                  Current Menu
                </p>
                <h2 className="mt-1 text-lg font-semibold">Live Inventory</h2>
                <p className="mt-1 text-sm text-white/55">
                  Adjust stock levels instantly or remove items from the menu.
                </p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                {menu.length}
              </span>
            </div>

            {menu.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-[#0F1218] px-4 py-10 text-center">
                <p className="text-sm text-white/45">No menu items yet</p>
                <p className="mt-1 text-xs text-white/25">
                  Add your first item to begin building the event menu.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {menu.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/6 bg-[#0F1218] p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          Current stock: {item.qty}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-2">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="h-8 w-8 rounded-full bg-white/10 text-sm font-medium text-white transition hover:bg-white/15"
                          >
                            -
                          </button>

                          <span className="min-w-[2rem] text-center text-sm font-medium text-white">
                            {item.qty}
                          </span>

                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="h-8 w-8 rounded-full bg-white/10 text-sm font-medium text-white transition hover:bg-white/15"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}