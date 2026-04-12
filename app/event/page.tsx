"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

type EventType = {
  eventName: string;
  hostName: string;
  hostId: string;
};

// ✅ REQUIRED: Default export = Suspense wrapper ONLY
export default function EventPage() {
  return (
    <Suspense fallback={<p>Loading event...</p>}>
      <EventContent />
    </Suspense>
  );
}

// 🔥 ALL logic moved here
function EventContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);

  const [guestName, setGuestName] = useState("");
  const [guestEntered, setGuestEntered] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "events", eventId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setEvent(null);
        } else {
          setEvent(snap.data() as EventType);
        }
      } catch (err) {
        console.error(err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleEnter = () => {
    if (guestName.trim() === "") {
      setError("Please enter your name");
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(guestName)) {
      setError("Only letters and spaces allowed");
      return;
    }

    setError("");
    setGuestEntered(true);
  };

  if (loading) return <p>Loading event...</p>;
  if (!event) return <p>Event not found</p>;

  if (!guestEntered) {
    return (
      <div style={container}>
        <h2>Welcome</h2>
        <p>Enter your name to join:</p>

        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          style={input}
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button onClick={handleEnter} style={button}>
          Enter Event
        </button>
      </div>
    );
  }

  return (
    <div style={container}>
      <h1>{event.eventName}</h1>
      <p>Hosted by: {event.hostName}</p>

      <hr style={{ margin: "20px 0" }} />

      <p>
        Welcome, <strong>{guestName}</strong> 👋
      </p>

      <p>🎉 More features coming soon...</p>
    </div>
  );
}

// styles
const container = {
  padding: "20px",
  textAlign: "center" as const,
};

const input = {
  padding: "10px",
  width: "250px",
  marginTop: "10px",
};

const button = {
  marginTop: "15px",
  padding: "10px 20px",
  cursor: "pointer",
};