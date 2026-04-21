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

  return <div>{/* KEEP EXISTING JSX BODY UNCHANGED */}</div>;
}