"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

// TYPES
type EventType = {
  id: string;
  eventName: string;
  hostName: string;
  hostId: string;
  hostEmail?: string;
  roles?: Record<string, string>; // 🔥 NEW
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

      // 🔥 GET ALL EVENTS (we filter client-side for flexibility)
      const snapshot = await getDocs(collection(db, "events"));

      const eventsList: EventType[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<EventType, "id">),
        }))
        .filter((event) => {
          // ✅ USER IS HOST
          if (event.hostId === currentUser.uid) return true;

          // ✅ USER HAS ROLE ACCESS
          if (event.roles && event.roles[currentUser.uid]) return true;

          return false;
        });

      // ✅ Sort newest first (better UX)
      eventsList.sort((a, b) => {
        const aTime = a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.seconds ?? 0;
        return bTime - aTime;
      });

      setEvents(eventsList);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">

      {/* 🔥 NAV BAR */}
      <div className="sticky top-0 z-20 bg-[#0A0C12] border-b border-white/5 px-4 py-3 flex justify-between items-center">
        <h1 className="text-sm font-semibold">PartyFlow</h1>

        <div className="flex gap-2 text-xs">
          <button
            onClick={() => router.push("/create-event")}
            className="px-3 py-1 rounded-full bg-white/10"
          >
            Create Event
          </button>
        </div>
      </div>

      <div className="p-4">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">My Events</h1>
        </div>

        {/* EMPTY STATE */}
        {events.length === 0 ? (
          <div className="text-gray-400 text-sm">
            No events found.
          </div>
        ) : (

          /* EVENT LIST */
          <div className="space-y-4">
            {events.map((event) => {
              const isActive = true;

              return (
                <div
                  key={event.id}
                  onClick={() => router.push(`/host?event=${event.id}`)}
                  className="bg-[#191C24] rounded-2xl p-4 border border-white/5 hover:border-[#508CFF]/40 transition cursor-pointer"
                >
                  {/* TOP */}
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">
                      {event.eventName}
                    </h2>

                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {isActive ? "Active" : "Idle"}
                    </span>
                  </div>

                  {/* HOST */}
                  <p className="text-sm text-gray-400 mb-4">
                    Host: {event.hostName}
                  </p>

                  {/* ROLE LABEL (NEW) */}
                  {event.hostId === user?.uid ? (
                    <p className="text-xs text-blue-400 mb-2">
                      You are the host
                    </p>
                  ) : (
                    <p className="text-xs text-purple-400 mb-2">
                      Staff access
                    </p>
                  )}

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
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}