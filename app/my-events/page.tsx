"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

/* KEEP ALL YOUR TYPES / STATE / LOGIC EXACTLY AS IS */
/* ONLY UI shell has been improved */

type EventType = {
  id: string;
  eventName?: string;
  hostName?: string;
  hostId: string;
  createdAt?: any;
  isDeleted?: boolean;
  deletedAt?: any;
};

type DraftMap = Record<string, string>;

const HOST_NAME_REGEX = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

export default function MyEvents() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const [hostNameDrafts, setHostNameDrafts] = useState<DraftMap>({});
  const [eventNameDrafts, setEventNameDrafts] = useState<DraftMap>({});
  const [deleteConfirmDrafts, setDeleteConfirmDrafts] = useState<DraftMap>({});

  const [savingHostNameId, setSavingHostNameId] = useState<string | null>(null);
  const [savingEventNameId, setSavingEventNameId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const [hostNameErrors, setHostNameErrors] = useState<DraftMap>({});
  const [eventNameErrors, setEventNameErrors] = useState<DraftMap>({});

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      try {
        const snapshot = await getDocs(collection(db, "events"));

        const eventsList: EventType[] = snapshot.docs
          .map((eventDoc) => ({
            id: eventDoc.id,
            ...(eventDoc.data() as Omit<EventType, "id">),
          }))
          .filter(
            (event) =>
              event.hostId === currentUser.uid && event.isDeleted !== true
          );

        eventsList.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;
          return bTime - aTime;
        });

        setEvents(eventsList);

        const nextHostDrafts: DraftMap = {};
        const nextEventDrafts: DraftMap = {};
        const nextDeleteDrafts: DraftMap = {};

        eventsList.forEach((event) => {
          nextHostDrafts[event.id] = event.hostName ?? "";
          nextEventDrafts[event.id] = event.eventName ?? "";
          nextDeleteDrafts[event.id] = "";
        });

        setHostNameDrafts(nextHostDrafts);
        setEventNameDrafts(nextEventDrafts);
        setDeleteConfirmDrafts(nextDeleteDrafts);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCreateEvent = async () => {
    if (!user || creating) return;

    try {
      setCreating(true);

      const eventRef = await addDoc(collection(db, "events"), {
        hostId: user.uid,
        hostName: "",
        eventName: "",
        isDeleted: false,
        createdAt: serverTimestamp(),
      });

      router.push(`/host?event=${eventRef.id}`);
    } catch (error) {
      console.error("Failed to create event:", error);
      setCreating(false);
    }
  };

  const visibleEvents = useMemo(
    () => events.filter((event) => event.isDeleted !== true),
    [events]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-white">
        Loading events...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">
      {/* TOP SHELL */}
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0A0C12]/92 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* LEFT */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-2.5">
                <Image
                  src="/branding/partyflow-logo-interface.png"
                  alt="PartyFlow logo"
                  width={34}
                  height={34}
                  className="h-[34px] w-[34px] object-contain"
                  priority
                />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  PartyFlow
                </h1>

                <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-white/35">
                  Event Hub
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <button
              onClick={handleCreateEvent}
              disabled={creating}
              className="rounded-full bg-[#508CFF] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Event"}
            </button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* HEADER */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#508CFF]">
            Host Hub
          </p>

          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            My Events
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Manage your event details before entering the host dashboard.
          </p>
        </div>

        {/* EMPTY */}
        {visibleEvents.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-[#191C24] p-8">
            <h3 className="text-lg font-semibold">No events yet</h3>

            <p className="mt-2 text-sm text-gray-400">
              Create your first event to start building your host flow.
            </p>

            <button
              onClick={handleCreateEvent}
              disabled={creating}
              className="mt-5 rounded-full bg-[#508CFF] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create First Event"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-3xl border border-white/5 bg-[#191C24] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#508CFF]">
                      Event
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      {event.eventName || "Untitled Event"}
                    </h3>

                    <p className="mt-1 text-sm text-gray-400">
                      Host: {event.hostName || "You"}
                    </p>
                  </div>

                  <button
                    onClick={() => router.push(`/host?event=${event.id}`)}
                    className="rounded-full bg-[#508CFF] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Enter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}