"use client";

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

// TYPES
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

  // 🔐 AUTH + FETCH EVENTS
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
            (event) => event.hostId === currentUser.uid && event.isDeleted !== true
          );

        // ✅ SORT NEWEST FIRST
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

  // 🚀 CREATE EVENT
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

  const toggleExpanded = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  const handleHostNameDraftChange = (eventId: string, value: string) => {
    setHostNameDrafts((prev) => ({ ...prev, [eventId]: value }));

    if (hostNameErrors[eventId]) {
      setHostNameErrors((prev) => ({ ...prev, [eventId]: "" }));
    }
  };

  const handleEventNameDraftChange = (eventId: string, value: string) => {
    setEventNameDrafts((prev) => ({ ...prev, [eventId]: value }));

    if (eventNameErrors[eventId]) {
      setEventNameErrors((prev) => ({ ...prev, [eventId]: "" }));
    }
  };

  const handleDeleteConfirmDraftChange = (eventId: string, value: string) => {
    setDeleteConfirmDrafts((prev) => ({ ...prev, [eventId]: value }));
  };

  const normalizeHostName = (value: string) => value.trim().replace(/\s+/g, " ");

  const getHostNameError = (value: string) => {
    const normalized = normalizeHostName(value);

    if (!normalized) {
      return "Host name is required.";
    }

    if (!HOST_NAME_REGEX.test(normalized)) {
      return "Host name can only contain letters and spaces.";
    }

    return "";
  };

  const getEventNameError = (value: string) => {
    const normalized = value.trim();

    if (!normalized) {
      return "Event name is required.";
    }

    return "";
  };

  const handleSaveHostName = async (eventId: string) => {
    const rawValue = hostNameDrafts[eventId] ?? "";
    const normalized = normalizeHostName(rawValue);
    const error = getHostNameError(normalized);

    if (error) {
      setHostNameErrors((prev) => ({ ...prev, [eventId]: error }));
      return;
    }

    try {
      setSavingHostNameId(eventId);

      await updateDoc(doc(db, "events", eventId), {
        hostName: normalized,
      });

      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, hostName: normalized } : event
        )
      );

      setHostNameDrafts((prev) => ({ ...prev, [eventId]: normalized }));
      setHostNameErrors((prev) => ({ ...prev, [eventId]: "" }));
    } catch (error) {
      console.error("Failed to update host name:", error);
      setHostNameErrors((prev) => ({
        ...prev,
        [eventId]: "Failed to save host name.",
      }));
    } finally {
      setSavingHostNameId(null);
    }
  };

  const handleSaveEventName = async (eventId: string) => {
    const rawValue = eventNameDrafts[eventId] ?? "";
    const normalized = rawValue.trim();
    const error = getEventNameError(normalized);

    if (error) {
      setEventNameErrors((prev) => ({ ...prev, [eventId]: error }));
      return;
    }

    try {
      setSavingEventNameId(eventId);

      await updateDoc(doc(db, "events", eventId), {
        eventName: normalized,
      });

      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, eventName: normalized } : event
        )
      );

      setEventNameDrafts((prev) => ({ ...prev, [eventId]: normalized }));
      setEventNameErrors((prev) => ({ ...prev, [eventId]: "" }));
    } catch (error) {
      console.error("Failed to update event name:", error);
      setEventNameErrors((prev) => ({
        ...prev,
        [eventId]: "Failed to save event name.",
      }));
    } finally {
      setSavingEventNameId(null);
    }
  };

  const handleSoftDeleteEvent = async (event: EventType) => {
    const currentEventName = (event.eventName ?? "").trim();
    const typedValue = (deleteConfirmDrafts[event.id] ?? "").trim();

    if (!currentEventName || typedValue !== currentEventName) {
      return;
    }

    try {
      setDeletingEventId(event.id);

      await updateDoc(doc(db, "events", event.id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      });

      setEvents((prev) => prev.filter((item) => item.id !== event.id));
      setExpandedEventId((prev) => (prev === event.id ? null : prev));
    } catch (error) {
      console.error("Failed to soft delete event:", error);
    } finally {
      setDeletingEventId(null);
    }
  };

  const visibleEvents = useMemo(
    () => events.filter((event) => event.isDeleted !== true),
    [events]
  );

  // ⏳ LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0C12] text-white flex items-center justify-center">
        Loading events...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">
      {/* NAV BAR */}
      <div className="sticky top-0 z-20 bg-[#0A0C12]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex justify-between items-center">
        <h1 className="text-sm font-semibold tracking-wide">PartyFlow</h1>

        <button
          onClick={handleCreateEvent}
          disabled={creating}
          className="px-4 py-2 rounded-full bg-white/10 text-xs font-medium hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? "Creating..." : "Create Event"}
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* HEADER */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#508CFF] mb-2">
            Host Hub
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold">My Events</h1>
          <p className="text-sm text-gray-400 mt-2">
            Manage your event details before entering the host dashboard.
          </p>
        </div>

        {/* EMPTY STATE */}
        {visibleEvents.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-[#191C24] p-6 sm:p-8">
            <div className="max-w-md">
              <h2 className="text-lg font-semibold mb-2">No events yet</h2>
              <p className="text-sm text-gray-400 mb-5">
                Create your first event to start building your host flow.
              </p>

              <button
                onClick={handleCreateEvent}
                disabled={creating}
                className="bg-[#508CFF] px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create First Event"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleEvents.map((event) => {
              const currentEventName = (event.eventName ?? "").trim();
              const deleteMatch =
                (deleteConfirmDrafts[event.id] ?? "").trim() === currentEventName &&
                currentEventName.length > 0;

              const isExpanded = expandedEventId === event.id;
              const isSavingHost = savingHostNameId === event.id;
              const isSavingEvent = savingEventNameId === event.id;
              const isDeleting = deletingEventId === event.id;

              return (
                <div
                  key={event.id}
                  className="bg-[#191C24] rounded-3xl p-4 sm:p-5 border border-white/5 hover:border-[#508CFF]/30 transition"
                >
                  {/* TOP */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
                          Event
                        </span>
                      </div>

                      <h2 className="text-lg sm:text-xl font-semibold">
                        {event.eventName || "Untitled Event"}
                      </h2>

                      <p className="text-sm text-gray-400 mt-1">
                        Host: {event.hostName || "You"}
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/host?event=${event.id}`)}
                      className="shrink-0 bg-[#508CFF] px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition"
                    >
                      Enter
                    </button>
                  </div>

                  {/* FOOTER ACTIONS */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">
                      Tap enter to manage live event flow
                    </span>

                    <button
                      onClick={() => toggleExpanded(event.id)}
                      className="text-sm px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition"
                    >
                      {isExpanded ? "Hide Settings" : "Event Settings"}
                    </button>
                  </div>

                  {/* SETTINGS PANEL */}
                  {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-white/5 space-y-6">
                      {/* HOST NAME */}
                      <div className="rounded-2xl border border-white/5 bg-black/10 p-4">
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold">Edit Host Name</h3>
                          <p className="text-xs text-gray-400 mt-1">
                            Letters and spaces only.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={hostNameDrafts[event.id] ?? ""}
                            onChange={(e) =>
                              handleHostNameDraftChange(event.id, e.target.value)
                            }
                            placeholder="Enter host name"
                            className="flex-1 rounded-2xl bg-[#0F1218] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#508CFF]/60"
                          />

                          <button
                            onClick={() => handleSaveHostName(event.id)}
                            disabled={isSavingHost}
                            className="px-4 py-3 rounded-2xl bg-white/10 text-sm font-medium hover:bg-white/15 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSavingHost ? "Saving..." : "Save Host Name"}
                          </button>
                        </div>

                        {hostNameErrors[event.id] ? (
                          <p className="text-xs text-red-400 mt-2">
                            {hostNameErrors[event.id]}
                          </p>
                        ) : null}
                      </div>

                      {/* EVENT NAME */}
                      <div className="rounded-2xl border border-white/5 bg-black/10 p-4">
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold">Edit Event Name</h3>
                          <p className="text-xs text-gray-400 mt-1">
                            This updates the event metadata for this event.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={eventNameDrafts[event.id] ?? ""}
                            onChange={(e) =>
                              handleEventNameDraftChange(event.id, e.target.value)
                            }
                            placeholder="Enter event name"
                            className="flex-1 rounded-2xl bg-[#0F1218] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#508CFF]/60"
                          />

                          <button
                            onClick={() => handleSaveEventName(event.id)}
                            disabled={isSavingEvent}
                            className="px-4 py-3 rounded-2xl bg-white/10 text-sm font-medium hover:bg-white/15 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSavingEvent ? "Saving..." : "Save Event Name"}
                          </button>
                        </div>

                        {eventNameErrors[event.id] ? (
                          <p className="text-xs text-red-400 mt-2">
                            {eventNameErrors[event.id]}
                          </p>
                        ) : null}
                      </div>

                      {/* DANGER ZONE */}
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-red-300">
                            Danger Zone
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            Soft delete this event by typing the exact event name.
                          </p>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-2">
                            Confirm by typing:
                          </p>
                          <div className="text-sm font-medium text-white bg-black/20 border border-white/5 rounded-2xl px-4 py-3">
                            {currentEventName || "Event name must be set before delete"}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={deleteConfirmDrafts[event.id] ?? ""}
                            onChange={(e) =>
                              handleDeleteConfirmDraftChange(event.id, e.target.value)
                            }
                            placeholder="Type exact event name"
                            className="flex-1 rounded-2xl bg-[#0F1218] border border-white/10 px-4 py-3 text-sm outline-none focus:border-red-400/60"
                          />

                          <button
                            onClick={() => handleSoftDeleteEvent(event)}
                            disabled={!deleteMatch || isDeleting}
                            className="px-4 py-3 rounded-2xl bg-red-500/80 text-sm font-medium hover:bg-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isDeleting ? "Deleting..." : "Delete Event"}
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                          Delete stays disabled until the typed value exactly matches
                          the current event name.
                        </p>
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