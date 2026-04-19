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

  const handleToggleManage = (eventId: string) => {
    setExpandedEventId((current) => (current === eventId ? null : eventId));
  };

  const handleHostNameDraftChange = (eventId: string, value: string) => {
    setHostNameDrafts((prev) => ({
      ...prev,
      [eventId]: value,
    }));

    setHostNameErrors((prev) => ({
      ...prev,
      [eventId]: "",
    }));
  };

  const handleEventNameDraftChange = (eventId: string, value: string) => {
    setEventNameDrafts((prev) => ({
      ...prev,
      [eventId]: value,
    }));

    setEventNameErrors((prev) => ({
      ...prev,
      [eventId]: "",
    }));
  };

  const handleDeleteConfirmDraftChange = (eventId: string, value: string) => {
    setDeleteConfirmDrafts((prev) => ({
      ...prev,
      [eventId]: value,
    }));
  };

  const handleSaveHostName = async (eventId: string) => {
    const rawValue = hostNameDrafts[eventId] ?? "";
    const trimmedValue = rawValue.trim();

    if (!trimmedValue) {
      setHostNameErrors((prev) => ({
        ...prev,
        [eventId]: "Host name is required.",
      }));
      return;
    }

    if (!HOST_NAME_REGEX.test(trimmedValue)) {
      setHostNameErrors((prev) => ({
        ...prev,
        [eventId]: "Host name can only contain letters and spaces.",
      }));
      return;
    }

    try {
      setSavingHostNameId(eventId);

      await updateDoc(doc(db, "events", eventId), {
        hostName: trimmedValue,
      });

      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, hostName: trimmedValue } : event
        )
      );

      setHostNameDrafts((prev) => ({
        ...prev,
        [eventId]: trimmedValue,
      }));

      setHostNameErrors((prev) => ({
        ...prev,
        [eventId]: "",
      }));
    } catch (error) {
      console.error("Failed to save host name:", error);
      setHostNameErrors((prev) => ({
        ...prev,
        [eventId]: "Failed to save host name. Please try again.",
      }));
    } finally {
      setSavingHostNameId(null);
    }
  };

  const handleSaveEventName = async (eventId: string) => {
    const rawValue = eventNameDrafts[eventId] ?? "";
    const trimmedValue = rawValue.trim();

    if (!trimmedValue) {
      setEventNameErrors((prev) => ({
        ...prev,
        [eventId]: "Event name is required.",
      }));
      return;
    }

    try {
      setSavingEventNameId(eventId);

      await updateDoc(doc(db, "events", eventId), {
        eventName: trimmedValue,
      });

      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, eventName: trimmedValue } : event
        )
      );

      setEventNameDrafts((prev) => ({
        ...prev,
        [eventId]: trimmedValue,
      }));

      setEventNameErrors((prev) => ({
        ...prev,
        [eventId]: "",
      }));

      setDeleteConfirmDrafts((prev) => ({
        ...prev,
        [eventId]: "",
      }));
    } catch (error) {
      console.error("Failed to save event name:", error);
      setEventNameErrors((prev) => ({
        ...prev,
        [eventId]: "Failed to save event name. Please try again.",
      }));
    } finally {
      setSavingEventNameId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const currentEvent = events.find((event) => event.id === eventId);
    if (!currentEvent) return;

    const expectedEventName = (currentEvent.eventName ?? "").trim();
    const typedValue = (deleteConfirmDrafts[eventId] ?? "").trim();

    if (!expectedEventName) {
      setEventNameErrors((prev) => ({
        ...prev,
        [eventId]:
          "Set an event name before deleting so confirmation can be matched.",
      }));
      return;
    }

    if (typedValue !== expectedEventName) {
      return;
    }

    try {
      setDeletingEventId(eventId);

      await updateDoc(doc(db, "events", eventId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      });

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      setDeleteConfirmDrafts((prev) => ({
        ...prev,
        [eventId]: "",
      }));

      if (expandedEventId === eventId) {
        setExpandedEventId(null);
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    } finally {
      setDeletingEventId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-white">
        Loading events...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0A0C12]/92 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
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

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
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
            {visibleEvents.map((event) => {
              const isExpanded = expandedEventId === event.id;
              const resolvedEventName = (event.eventName ?? "").trim();
              const canDelete =
                (deleteConfirmDrafts[event.id] ?? "").trim() ===
                  resolvedEventName && resolvedEventName.length > 0;

              return (
                <div
                  key={event.id}
                  className="rounded-3xl border border-white/5 bg-[#191C24] p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleToggleManage(event.id)}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                      >
                        {isExpanded ? "Close" : "Manage"}
                      </button>

                      <button
                        onClick={() => router.push(`/host?event=${event.id}`)}
                        className="rounded-full bg-[#508CFF] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Enter
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-5 space-y-5 border-t border-white/5 pt-5">
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-2xl border border-white/5 bg-[#11151D] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#508CFF]">
                            Edit Host Name
                          </p>

                          <p className="mt-2 text-sm text-gray-400">
                            Letters and spaces only.
                          </p>

                          <input
                            type="text"
                            value={hostNameDrafts[event.id] ?? ""}
                            onChange={(e) =>
                              handleHostNameDraftChange(event.id, e.target.value)
                            }
                            placeholder="Enter host name"
                            className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0A0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#508CFF]"
                          />

                          {hostNameErrors[event.id] ? (
                            <p className="mt-2 text-sm text-red-400">
                              {hostNameErrors[event.id]}
                            </p>
                          ) : null}

                          <button
                            onClick={() => handleSaveHostName(event.id)}
                            disabled={savingHostNameId === event.id}
                            className="mt-4 rounded-full bg-[#508CFF] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingHostNameId === event.id
                              ? "Saving..."
                              : "Save Host Name"}
                          </button>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-[#11151D] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#508CFF]">
                            Edit Event Name
                          </p>

                          <p className="mt-2 text-sm text-gray-400">
                            Update the event title shown across host surfaces.
                          </p>

                          <input
                            type="text"
                            value={eventNameDrafts[event.id] ?? ""}
                            onChange={(e) =>
                              handleEventNameDraftChange(
                                event.id,
                                e.target.value
                              )
                            }
                            placeholder="Enter event name"
                            className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0A0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#508CFF]"
                          />

                          {eventNameErrors[event.id] ? (
                            <p className="mt-2 text-sm text-red-400">
                              {eventNameErrors[event.id]}
                            </p>
                          ) : null}

                          <button
                            onClick={() => handleSaveEventName(event.id)}
                            disabled={savingEventNameId === event.id}
                            className="mt-4 rounded-full bg-[#508CFF] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingEventNameId === event.id
                              ? "Saving..."
                              : "Save Event Name"}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                          Delete Event
                        </p>

                        <p className="mt-2 text-sm text-gray-300">
                          To confirm deletion, type the event name exactly:
                          <span className="ml-2 font-semibold text-white">
                            {resolvedEventName || "Set an event name first"}
                          </span>
                        </p>

                        <input
                          type="text"
                          value={deleteConfirmDrafts[event.id] ?? ""}
                          onChange={(e) =>
                            handleDeleteConfirmDraftChange(
                              event.id,
                              e.target.value
                            )
                          }
                          placeholder="Type event name to confirm"
                          className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0A0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-red-400"
                        />

                        {!resolvedEventName ? (
                          <p className="mt-2 text-sm text-red-300">
                            You must save an event name before deletion can be
                            confirmed.
                          </p>
                        ) : null}

                        {resolvedEventName &&
                        (deleteConfirmDrafts[event.id] ?? "").trim().length >
                          0 &&
                        !canDelete ? (
                          <p className="mt-2 text-sm text-red-300">
                            Confirmation does not match the current event name.
                          </p>
                        ) : null}

                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={!canDelete || deletingEventId === event.id}
                          className="mt-4 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deletingEventId === event.id
                            ? "Deleting..."
                            : "Delete Event"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}