"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/app/firebase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import QueueView from "@/app/components/QueueView";
import { Request } from "@/app/types/queue";

type ToastType = "success" | "error";

type ToastState = {
  message: string;
  type: ToastType;
} | null;

export default function QueueTab() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!eventId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const requestsRef = collection(db, "events", eventId, "requests");
    const requestsQuery = query(requestsRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data: Request[] = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<Request, "id">),
        }));

        setRequests(data);
        setLoading(false);
      },
      (error) => {
        console.error("Queue listener error:", error);
        setRequests([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [toast]);

  const pending = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );

  const preparing = useMemo(
    () => requests.filter((request) => request.status === "preparing"),
    [requests]
  );

  const ready = useMemo(
    () => requests.filter((request) => request.status === "ready"),
    [requests]
  );

  const handleStatusUpdate = async (
    requestId: string,
    nextStatus: "preparing" | "ready"
  ) => {
    if (!eventId) return;
    if (updatingIds.includes(requestId)) return;

    try {
      setUpdatingIds((prev) => [...prev, requestId]);

      const requestRef = doc(db, "events", eventId, "requests", requestId);
      await updateDoc(requestRef, { status: nextStatus });

      setToast({
        message:
          nextStatus === "preparing" ? "Moved to preparing" : "Marked ready",
        type: "success",
      });
    } catch (error) {
      console.error(`Failed to update request ${requestId}:`, error);

      setToast({
        message: "Failed to update request",
        type: "error",
      });
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== requestId));
    }
  };

  const handleStartPreparing = async (requestId: string) => {
    await handleStatusUpdate(requestId, "preparing");
  };

  const handleMarkReady = async (requestId: string) => {
    await handleStatusUpdate(requestId, "ready");
  };

  if (!eventId) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-4 py-10 text-sm text-white/60">
        Missing event context.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-4 py-10 text-sm text-white/60">
        Loading queue...
      </div>
    );
  }

  return (
    <>
      <QueueView
        pending={pending}
        preparing={preparing}
        ready={ready}
        onStartPreparing={handleStartPreparing}
        onMarkReady={handleMarkReady}
        updatingIds={updatingIds}
      />

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg transition ${
            toast.type === "success" ? "bg-black" : "bg-[#7A1D1D]"
          }`}
        >
          {toast.type === "success" ? "✅ " : "❌ "}
          {toast.message}
        </div>
      )}
    </>
  );
}