"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

type EventType = {
  eventName: string;
  hostName: string;
  hostId: string;
};

export default function EventPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);

  // Guest state
  const [guestName, setGuestName] = useState("");
  const [guestEntered, setGuestEntered] = useState(false);
  const [error, setError] = useState("");

  // Fetch event
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

  // Handle guest submit
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

  // Loading states
  if (loading) return <p>Loading event...</p>;

  if (!event) return <p>Event not found</p>;

  // Step 1: Enter name
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

  // Step 2: Event view
  return (
    <div style={container}>
      <h1>{event.eventName}</h1>
      <p>Hosted by: {event.hostName}</p>

      <hr style={{ margin: "20px 0" }} />

      <p>Welcome, <strong>{guestName}</strong> 👋</p>

      {/* Future features go here */}
      <p>🎉 More features coming soon...</p>
    </div>
  );
}

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