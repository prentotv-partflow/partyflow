"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

// ✅ Event Types
type EventType = {
  id: string;
  eventName: string;
  hostName: string;
  hostId: string;
  hostEmail?: string;
  createdAt: any;
};

export default function MyEvents() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventType[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }

      setUser(currentUser);

      const q = query(
        collection(db, "events"),
        where("hostId", "==", currentUser.uid)
      );

      const querySnapshot = await getDocs(q);

      const eventsList: EventType[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<EventType, "id">),
      }));

      setEvents(eventsList);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white p-4">
      
      {/* ✅ HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">My Events</h1>

        <button
          onClick={() => router.push("/create-event")}
          className="bg-[#508CFF] px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition"
        >
          + Create Event
        </button>
      </div>

      {/* ✅ EMPTY STATE */}
      {events.length === 0 ? (
        <div className="text-gray-400 text-sm">
          No events found.
        </div>
      ) : (
        
        /* ✅ EVENT CARDS */
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => router.push(`/host?event=${event.id}`)}
              className="bg-[#191C24] rounded-2xl p-4 border border-white/5 hover:border-[#508CFF]/40 transition cursor-pointer"
            >
              <h2 className="text-lg font-semibold">
                {event.eventName}
              </h2>

              <p className="text-sm text-gray-400 mb-3">
                Host: {event.hostName}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/host?event=${event.id}`);
                }}
                className="bg-[#508CFF] px-4 py-2 rounded-full text-sm hover:opacity-90 transition"
              >
                Enter Event
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}