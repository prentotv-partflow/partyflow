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
import { Request } from "@/types/queue";

export default function QueueTab() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

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
    } catch (error) {
      console.error(`Failed to update request ${requestId}:`, error);
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
    <QueueView
      pending={pending}
      preparing={preparing}
      ready={ready}
      onStartPreparing={handleStartPreparing}
      onMarkReady={handleMarkReady}
      updatingIds={updatingIds}
    />
  );
}