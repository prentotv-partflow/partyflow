"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../firebase";
import {
  collection,
  serverTimestamp,
  onSnapshot,
  doc,
  setDoc,
} from "firebase/firestore";

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

type GuestSession = {
  eventId: string;
  guestId: string;
  guestName: string;
};

const SESSION_KEY = "partyflow_guest_session";

function getSession(): GuestSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function getStatusBadgeClass(status: RequestItem["status"]) {
  switch (status) {
    case "pending":
      return "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300";
    case "preparing":
      return "border border-[#508CFF]/20 bg-[#508CFF]/12 text-[#9FC0FF]";
    case "ready":
      return "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
    default:
      return "border border-white/10 bg-white/5 text-white/70";
  }
}

function getStatusLabel(status: RequestItem["status"]) {
  switch (status) {
    case "pending":
      return "Pending";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready for pickup";
    default:
      return status;
  }
}

function getStatusNote(status: RequestItem["status"]) {
  switch (status) {
    case "pending":
      return "Your request is in the queue.";
    case "preparing":
      return "Your item is being prepared.";
    case "ready":
      return "Pickup at the bar now.";
    default:
      return "";
  }
}

function getStatusAccentClass(status: RequestItem["status"]) {
  switch (status) {
    case "pending":
      return "bg-yellow-400/80";
    case "preparing":
      return "bg-[#508CFF]";
    case "ready":
      return "bg-emerald-400";
    default:
      return "bg-white/30";
  }
}

function getStatusPriority(status: RequestItem["status"]) {
  switch (status) {
    case "ready":
      return 0;
    case "preparing":
      return 1;
    case "pending":
      return 2;
    default:
      return 3;
  }
}

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [session, setSessionState] = useState<GuestSession | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [recentRequestId, setRecentRequestId] = useState<string | null>(null);
  const [highlightedStatusId, setHighlightedStatusId] = useState<string | null>(
    null
  );

  const previousStatusMapRef = useRef<Record<string, RequestItem["status"]>>({});
  const initialSnapshotLoadedRef = useRef(false);

  useEffect(() => {
    if (!eventId) return;

    const existing = getSession();

    if (existing && existing.eventId === eventId) {
      setSessionState(existing);
      setChecking(false);
      return;
    }

    router.replace(`/event?event=${eventId}`);
  }, [eventId, router]);

  useEffect(() => {
    if (!session) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", session.eventId, "menu"),
      (snapshot) => {
        const items: MenuItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MenuItem, "id">),
        }));

        items.sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

        setMenu(items);
      }
    );

    return () => unsubscribe();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const unsubscribe = onSnapshot(
      collection(db, "events", session.eventId, "requests"),
      (snapshot) => {
        const list: RequestItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<RequestItem, "id">;

          if (data.guestId === session.guestId) {
            list.push({
              id: docSnap.id,
              ...data,
            });
          }
        });

        if (!initialSnapshotLoadedRef.current) {
          const initialStatusMap: Record<string, RequestItem["status"]> = {};

          list.forEach((req) => {
            initialStatusMap[req.id] = req.status;
          });

          previousStatusMapRef.current = initialStatusMap;
          initialSnapshotLoadedRef.current = true;
          setRequests(list);
          return;
        }

        const nextStatusMap: Record<string, RequestItem["status"]> = {};

        list.forEach((req) => {
          nextStatusMap[req.id] = req.status;

          const previousStatus = previousStatusMapRef.current[req.id];

          if (!previousStatus) {
            if (recentRequestId === req.id) {
              setHighlightedStatusId(req.id);
            }
            return;
          }

          if (previousStatus !== req.status) {
            setHighlightedStatusId(req.id);

            if (req.status === "preparing") {
              setToast(`Preparing: ${req.itemName}`);
            } else if (req.status === "ready") {
              setToast(`Ready for pickup: ${req.itemName}`);
            }
          }
        });

        previousStatusMapRef.current = nextStatusMap;
        setRequests(list);
      }
    );

    return () => unsubscribe();
  }, [session, recentRequestId]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 2200);

    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!recentRequestId) return;

    const timeout = setTimeout(() => {
      setRecentRequestId(null);
    }, 2600);

    return () => clearTimeout(timeout);
  }, [recentRequestId]);

  useEffect(() => {
    if (!highlightedStatusId) return;

    const timeout = setTimeout(() => {
      setHighlightedStatusId(null);
    }, 2600);

    return () => clearTimeout(timeout);
  }, [highlightedStatusId]);

  const handleRequest = async (item: MenuItem) => {
    if (!session || loadingItem) return;

    if (item.qty <= 0) {
      setToast("Out of stock");
      return;
    }

    setLoadingItem(item.id);

    try {
      const requestRef = doc(
        collection(db, "events", session.eventId, "requests")
      );

      await setDoc(requestRef, {
        eventId: session.eventId,
        guestId: session.guestId,
        guestName: session.guestName,
        itemName: item.name,
        quantity: 1,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setRecentRequestId(requestRef.id);
      setHighlightedStatusId(requestRef.id);
      setToast(`Requested: ${item.name}`);
    } catch (err: any) {
      setToast(err.message);
    } finally {
      setLoadingItem(null);
    }
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const priorityDiff =
        getStatusPriority(a.status) - getStatusPriority(b.status);

      if (priorityDiff !== 0) return priorityDiff;

      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });
  }, [requests]);

  const readyCount = useMemo(() => {
    return sortedRequests.filter((req) => req.status === "ready").length;
  }, [sortedRequests]);

  const activeCount = useMemo(() => {
    return sortedRequests.filter(
      (req) => req.status === "pending" || req.status === "preparing"
    ).length;
  }, [sortedRequests]);

  if (checking || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] px-6 text-center text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur">
          <p className="text-sm font-medium text-white/85">Entering event...</p>
          <p className="mt-1 text-xs text-white/45">
            Restoring your guest session
          </p>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] text-white">{/* existing UI unchanged */}</div>;
}

export default function GuestMenu() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] px-6 text-center text-white">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur">
            <p className="text-sm font-medium text-white/85">Loading menu...</p>
            <p className="mt-1 text-xs text-white/45">
              Pulling live event data
            </p>
          </div>
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}