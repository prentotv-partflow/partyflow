"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../firebase";
import { formatCurrency } from "../lib/formatCurrency";
import { STORAGE_KEYS } from "../lib/storageKeys";
import type { MenuItem } from "../types/menu";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
  runTransaction,
} from "firebase/firestore";
import HostNav from "../components/HostNav";

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

  // Back to top
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(
      STORAGE_KEYS.skipMenuDeleteConfirmation
    );

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
    const handleScroll = () => {
      const triggerPoint = window.innerHeight;

      setShowBackToTop(window.scrollY > triggerPoint);
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 140);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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

  const handleBackToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
        await addDoc(menuRef, {
          name: itemName.trim(),
          qty: qtyNumber,
          price: priceNumber,
          createdAt: serverTimestamp(),
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

  const updateQty = async (id: string, delta: number) => {
    if (!eventId) return;

    const ref = doc(db, "events", eventId, "menu", id);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const currentQty = snap.data()?.qty || 0;
      const nextQty = currentQty + delta;

      if (nextQty < 0) return;

      transaction.update(ref, { qty: nextQty });
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

      await updateDoc(doc(db, "events", eventId, "menu", itemId), {
        price: nextPrice,
      });

      cancelPriceEdit();
    } catch (error) {
      console.error(error);
      alert("Failed to update price");
    } finally {
      setSavingPriceId(null);
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
        localStorage.setItem(
          STORAGE_KEYS.skipMenuDeleteConfirmation,
          "true"
        );
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
      <div className="min-h-screen bg-[#0A0C12] text-white flex items-center justify-center px-4">
        <div className="rounded-3xl border border-white/10 bg-[#191C24] px-6 py-8 text-center">
          <p className="text-lg font-semibold">Missing event context</p>
          <p className="mt-2 text-sm text-white/55">
            Menu management needs a valid event to load.
          </p>
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
            {/* Add Item */}
            <section className="rounded-3xl border border-white/8 bg-[#191C24] p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8B5CFF]">
                Menu Control
              </p>

              <h1 className="mt-2 text-2xl font-semibold">Add / Restock</h1>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <input
                  ref={nameInputRef}
                  value={itemName}
                  onChange={(e) => {
                    setItemName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder="Item name"
                  className="rounded-2xl border border-white/10 bg-[#0D1118] px-4 py-3 outline-none"
                />

                <input
                  ref={qtyInputRef}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Qty"
                  inputMode="numeric"
                  className="rounded-2xl border border-white/10 bg-[#0D1118] px-4 py-3 outline-none"
                />

                <input
                  ref={priceInputRef}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  inputMode="decimal"
                  className="rounded-2xl border border-white/10 bg-[#0D1118] px-4 py-3 outline-none"
                />
              </div>

              {itemName &&
              showSuggestions &&
              suggestions.length > 0 &&
              !exactMatch ? (
                <div className="mt-3 rounded-2xl border border-white/8 bg-[#10141C] p-3 text-sm text-white/70">
                  Similar items:
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setItemName(item.name);
                          setShowSuggestions(false);
                        }}
                        className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/5"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                onClick={addItem}
                disabled={loading}
                className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Add Item"}
              </button>
            </section>

            {/* Inventory */}
            <section className="rounded-3xl border border-white/8 bg-[#191C24] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#8B5CFF]">
                    Inventory
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    Current Menu
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">
                  {menu.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {menu.length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-[#10141C] px-4 py-8 text-center text-white/50">
                    No items yet.
                  </div>
                ) : (
                  menu.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/8 bg-[#10141C] p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-sm text-white/55">
                            Qty: {item.qty} •{" "}
                            {typeof item.price === "number"
                              ? formatCurrency(item.price)
                              : "No price"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="rounded-full border border-white/10 px-3 py-2 text-sm"
                          >
                            -1
                          </button>

                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="rounded-full border border-white/10 px-3 py-2 text-sm"
                          >
                            +1
                          </button>

                          {editingPriceId === item.id ? (
                            <>
                              <input
                                value={editingPriceValue}
                                onChange={(e) =>
                                  setEditingPriceValue(e.target.value)
                                }
                                inputMode="decimal"
                                className="w-24 rounded-full border border-white/10 bg-[#0D1118] px-3 py-2 text-sm outline-none"
                              />

                              <button
                                onClick={() => savePrice(item.id)}
                                disabled={savingPriceId === item.id}
                                className="rounded-full bg-white px-4 py-2 text-sm text-black"
                              >
                                Save
                              </button>

                              <button
                                onClick={cancelPriceEdit}
                                className="rounded-full border border-white/10 px-4 py-2 text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startPriceEdit(item)}
                              className="rounded-full border border-white/10 px-4 py-2 text-sm"
                            >
                              Price
                            </button>
                          )}

                          <button
                            onClick={() => handleDeletePress(item)}
                            className="rounded-full bg-red-500/15 px-4 py-2 text-sm text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        {showBackToTop ? (
          <button
            onClick={handleBackToTop}
            aria-label="Back to top"
            className={`fixed bottom-6 right-4 z-40 h-11 w-11 rounded-full border bg-[#141821]/92 text-white shadow-xl backdrop-blur transition-all duration-150 sm:right-6 ${
              isScrolling
                ? "border-white/10 opacity-60 scale-[0.98]"
                : "border-[#508CFF]/25 opacity-100 hover:border-[#508CFF]/45 hover:scale-[1.03]"
            } active:scale-[0.96]`}
          >
            ↑
          </button>
        ) : null}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-400/20 bg-[#171B27] text-white shadow-2xl">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-red-300">
                Confirm Deletion
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Delete Menu Item
              </h2>
            </div>

            <div className="space-y-4 p-4">
              <p className="text-sm text-white/65">
                Type{" "}
                <span className="font-medium text-white">
                  {deleteTarget.name}
                </span>{" "}
                to confirm.
              </p>

              <input
                ref={deleteInputRef}
                value={deleteConfirmInput}
                onChange={(e) =>
                  setDeleteConfirmInput(e.target.value)
                }
                placeholder="Exact item name"
                className="w-full rounded-2xl border border-white/10 bg-[#0D1118] px-4 py-3 outline-none"
              />

              <label className="flex items-center gap-2 text-sm text-white/65">
                <input
                  type="checkbox"
                  checked={deleteDontShowAgain}
                  onChange={(e) =>
                    setDeleteDontShowAgain(e.target.checked)
                  }
                />
                Don't ask again
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={deletingItemId === deleteTarget.id}
                  className="rounded-full border border-white/10 px-4 py-3 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmDelete}
                  disabled={
                    deletingItemId === deleteTarget.id ||
                    !deleteNameMatches
                  }
                  className="rounded-full bg-red-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
                >
                  {deletingItemId === deleteTarget.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}