"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../firebase";
import { formatCurrency } from "../lib/formatCurrency";
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
  price?: number;
};

const DELETE_CONFIRMATION_PREF_KEY =
  "partyflow_skip_menu_item_delete_confirmation";

export default function AddMenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleteDontShowAgain, setDeleteDontShowAgain] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(DELETE_CONFIRMATION_PREF_KEY);
    setSkipDeleteConfirmation(stored === "true");
  }, []);

  useEffect(() => {
    if (!deleteTarget) return;

    const timeout = setTimeout(() => {
      deleteInputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timeout);
  }, [deleteTarget]);

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

  const handleHostNavChange = (tab: "menu" | "queue") => {
    if (!eventId) return;

    if (tab === "queue") {
      router.push(`/host?event=${eventId}`);
      return;
    }

    router.push(`/add-menu?event=${eventId}`);
  };

  const addItem = async () => {
    if (!itemName.trim() || !quantity.trim() || !price.trim()) {
      alert("Please fill in all fields");
      return;
    }

    const qtyNumber = Number(quantity);
    const priceNumber = Number(price);

    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      alert("Quantity must be valid");
      return;
    }

    if (isNaN(priceNumber) || priceNumber < 0) {
      alert("Price must be valid");
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
            price: priceNumber,
          });
        });
      } else {
        const ref = doc(menuRef);

        await runTransaction(db, async (transaction) => {
          transaction.set(ref, {
            name: itemName.trim(),
            qty: qtyNumber,
            price: priceNumber,
            createdAt: serverTimestamp(),
          });
        });
      }

      setItemName("");
      setQuantity("");
      setPrice("");
      setShowSuggestions(false);
      nameInputRef.current?.focus();
    } catch (error) {
      console.error(error);
      alert("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const closeDeleteModal = () => {
    if (deletingItemId) return;

    setDeleteTarget(null);
    setDeleteConfirmInput("");
    setDeleteDontShowAgain(false);
  };

  const performDelete = async (item: MenuItem) => {
    if (!eventId) return;

    try {
      setDeletingItemId(item.id);
      await deleteDoc(doc(db, "events", eventId, "menu", item.id));

      if (deleteDontShowAgain) {
        localStorage.setItem(DELETE_CONFIRMATION_PREF_KEY, "true");
        setSkipDeleteConfirmation(true);
      }

      closeDeleteModal();
    } catch (error) {
      console.error(error);
      alert("Failed to delete item");
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleDeletePress = async (item: MenuItem) => {
    if (!eventId) return;

    if (skipDeleteConfirmation) {
      try {
        setDeletingItemId(item.id);
        await deleteDoc(doc(db, "events", eventId, "menu", item.id));
      } catch (error) {
        console.error(error);
        alert("Failed to delete item");
      } finally {
        setDeletingItemId(null);
      }
      return;
    }

    setDeleteTarget(item);
    setDeleteConfirmInput("");
    setDeleteDontShowAgain(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteConfirmInput !== deleteTarget.name) {
      alert("Typed name must match exactly");
      return;
    }

    await performDelete(deleteTarget);
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

  const startPriceEdit = (item: MenuItem) => {
    setEditingPriceId(item.id);
    setEditingPriceValue(
      typeof item.price === "number" ? String(item.price) : ""
    );
  };

  const cancelPriceEdit = () => {
    setEditingPriceId(null);
    setEditingPriceValue("");
  };

  const savePrice = async (itemId: string) => {
    if (!eventId) return;

    const nextPrice = Number(editingPriceValue);

    if (editingPriceValue.trim() === "") {
      alert("Price is required");
      return;
    }

    if (isNaN(nextPrice) || nextPrice < 0) {
      alert("Price must be valid");
      return;
    }

    try {
      setSavingPriceId(itemId);

      const ref = doc(db, "events", eventId, "menu", itemId);

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);

        if (!snap.exists()) {
          throw new Error("Item no longer exists");
        }

        transaction.update(ref, {
          price: nextPrice,
        });
      });

      cancelPriceEdit();
    } catch (error) {
      console.error(error);
      alert("Failed to update price");
    } finally {
      setSavingPriceId(null);
    }
  };

  const suggestions = menu.filter((item) =>
    item.name.toLowerCase().includes(itemName.toLowerCase())
  );

  const exactMatch = menu.find(
    (item) => item.name.toLowerCase() === itemName.toLowerCase()
  );

  const deleteNameMatches = deleteTarget
    ? deleteConfirmInput === deleteTarget.name
    : false;

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
    <>
      <div className="min-h-screen bg-[#0A0C12] text-white">
        <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0A0C12]/92 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-6xl px-4 py-4">
            <HostNav
              eventId={eventId}
              activeTab="menu"
              onNavigate={handleHostNavChange}
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#141821] px-5 py-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
                Menu Management
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Add Menu Items</h1>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Add new items, merge quantities for existing items, update
                pricing, and keep stock synced in real time.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#191C24] p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Add or Restock Items</h2>
                <p className="mt-1 text-sm text-white/55">
                  Existing item names will merge, increase quantity, and update
                  the active price.
                </p>
              </div>

              <div className="space-y-3">
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
                />

                {showSuggestions &&
                  itemName &&
                  suggestions.length > 0 &&
                  !exactMatch && (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0F1218]">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="block w-full px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5"
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
                  )}

                <div className="grid grid-cols-2 gap-3">
                  <input
                    ref={qtyInputRef}
                    type="number"
                    placeholder="Qty"
                    className="w-full rounded-2xl border border-white/10 bg-[#0F1218] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#508CFF]/60"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />

                  <input
                    ref={priceInputRef}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Price"
                    className="w-full rounded-2xl border border-white/10 bg-[#0F1218] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#508CFF]/60"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <button
                  onClick={addItem}
                  disabled={loading}
                  className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
                >
                  {loading ? "Adding..." : "Add Item"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#191C24] p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
                    Current Menu
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Live Inventory</h2>
                </div>

                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                  {menu.length}
                </span>
              </div>

              {menu.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-[#0F1218] px-4 py-8 text-center">
                  <p className="text-sm text-white/45">No menu items yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {menu.map((item) => {
                    const isEditingPrice = editingPriceId === item.id;
                    const isSavingPrice = savingPriceId === item.id;
                    const isDeleting = deletingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/6 bg-[#0F1218] p-3"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {item.name}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-white/45">
                                <span>Stock: {item.qty}</span>
                                <span className="text-white/20">•</span>
                                <span>
                                  {typeof item.price === "number"
                                    ? formatCurrency(item.price)
                                    : "Price not set"}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-1.5">
                                <button
                                  onClick={() => updateQty(item.id, -1)}
                                  className="h-7 w-7 rounded-full bg-white/10 text-sm text-white transition hover:bg-white/15"
                                >
                                  -
                                </button>

                                <span className="min-w-[1.75rem] text-center text-xs font-medium text-white">
                                  {item.qty}
                                </span>

                                <button
                                  onClick={() => updateQty(item.id, 1)}
                                  className="h-7 w-7 rounded-full bg-white/10 text-sm text-white transition hover:bg-white/15"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                onClick={() => startPriceEdit(item)}
                                className="rounded-full border border-[#508CFF]/20 bg-[#508CFF]/10 px-3 py-2 text-xs font-medium text-[#9FC0FF] transition hover:bg-[#508CFF]/15"
                              >
                                Edit Price
                              </button>

                              <button
                                onClick={() => handleDeletePress(item)}
                                disabled={isDeleting}
                                className="rounded-full bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>

                          {isEditingPrice ? (
                            <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="New price"
                                  className="flex-1 rounded-2xl border border-white/10 bg-[#0B0F16] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#508CFF]/60"
                                  value={editingPriceValue}
                                  onChange={(e) =>
                                    setEditingPriceValue(e.target.value)
                                  }
                                />

                                <div className="flex gap-2">
                                  <button
                                    onClick={cancelPriceEdit}
                                    disabled={isSavingPrice}
                                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    onClick={() => savePrice(item.id)}
                                    disabled={isSavingPrice}
                                    className="rounded-full bg-white px-3 py-2.5 text-xs font-medium text-black transition hover:bg-gray-200"
                                  >
                                    {isSavingPrice ? "Saving..." : "Save"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-400/20 bg-[#171B27] text-white shadow-2xl">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-red-300">
                Confirm Deletion
              </p>
              <h2 className="mt-1 text-lg font-semibold">Delete Menu Item</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                This action will permanently remove{" "}
                <span className="font-medium text-white">
                  {deleteTarget.name}
                </span>{" "}
                from the live inventory.
              </p>
            </div>

            <div className="space-y-4 p-4">
              <div className="rounded-2xl border border-red-400/15 bg-red-500/8 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-red-200/80">
                  Required confirmation
                </p>
                <p className="mt-2 text-sm text-white/75">
                  Type the exact item name to confirm deletion:
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {deleteTarget.name}
                </p>
              </div>

              <input
                ref={deleteInputRef}
                type="text"
                placeholder="Enter exact item name"
                className="w-full rounded-2xl border border-white/10 bg-[#0B0F16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-red-400/60"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
              />

              <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent"
                  checked={deleteDontShowAgain}
                  onChange={(e) => setDeleteDontShowAgain(e.target.checked)}
                />
                <span className="text-sm leading-5 text-white/75">
                  Do not show this confirmation again for menu item deletion
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={deletingItemId === deleteTarget.id}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmDelete}
                  disabled={
                    deletingItemId === deleteTarget.id || !deleteNameMatches
                  }
                  className="rounded-full bg-red-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-500/20 disabled:text-white/40"
                >
                  {deletingItemId === deleteTarget.id
                    ? "Deleting..."
                    : "Delete Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}