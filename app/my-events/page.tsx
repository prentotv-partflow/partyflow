"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

// ✅ Event Type
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
    <div style={{ padding: "20px" }}>
      {/* ✅ HEADER + BUTTON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>My Events</h1>

        <button
          onClick={() => router.push("/create-event")}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          + Create Event
        </button>
      </div>

      {/* ✅ EVENTS LIST */}
      {events.length === 0 ? (
        <p>No events found.</p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginTop: "10px",
              cursor: "pointer",
            }}
            onClick={() => router.push(`/host?event=${event.id}`)}
          >
            <h3>{event.eventName}</h3>
            <p>Host: {event.hostName}</p>
          </div>
        ))
      )}
    </div>
  );
}