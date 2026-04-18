"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
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
};

export default function MyEvents() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<EventType, "id">),
          }))
          .filter((event) => event.hostId === currentUser.uid);

        // ✅ SORT NEWEST FIRST
        eventsList.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;
          return bTime - aTime;
        });

        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // 🚀 CREATE EVENT (INLINE HUB ACTION)
  const handleCreateEvent = async () => {
    if (!user || creating) return;

    try {
      setCreating(true);

      const eventRef = await addDoc(collection(db, "events"), {
        hostId: user.uid,
        hostName:  "",
        eventName: "",
        createdAt: serverTimestamp(),
      });

      router.push(`/host?event=${eventRef.id}`);
    } catch (error) {
      console.error("Failed to create event:", error);
      setCreating(false);
    }
  };

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
      <div className="sticky top-0 z-20 bg-[#0A0C12] border-b border-white/5 px-4 py-3 flex justify-between items-center">
        <h1 className="text-sm font-semibold">PartyFlow</h1>

        <button
          onClick={handleCreateEvent}
          disabled={creating}
          className="px-3 py-1 rounded-full bg-white/10 text-xs hover:bg-white/20 transition disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Event"}
        </button>
      </div>

      <div className="p-4">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">My Events</h1>
        </div>

        {/* EMPTY STATE */}
        {events.length === 0 ? (
          <div className="text-gray-400 text-sm">
            No events yet. Create your first event.
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => router.push(`/host?event=${event.id}`)}
                className="bg-[#191C24] rounded-2xl p-4 border border-white/5 hover:border-[#508CFF]/40 transition cursor-pointer"
              >
                {/* TOP */}
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold">
                    {event.eventName || "Untitled Event"}
                  </h2>

                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                    Event
                  </span>
                </div>

                {/* HOST */}
                <p className="text-sm text-gray-400 mb-4">
                  Host: {event.hostName || "You"}
                </p>

                {/* FOOTER */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Tap to manage
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/host?event=${event.id}`);
                    }}
                    className="bg-[#508CFF] px-4 py-2 rounded-full text-sm hover:opacity-90 transition"
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