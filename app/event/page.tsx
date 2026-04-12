"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

type EventType = {
  eventName: string;
  hostName: string;
  hostId: string;
};

// ✅ ONLY Suspense wrapper here
export default function EventPage() {
  return (
    <Suspense fallback={<p>Loading event...</p>}>
      <EventContent />
    </Suspense>
  );
}

// ✅ ALL logic goes here
function EventContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  console.log("🔍 EVENT ID FROM URL:", eventId);

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);

  const [guestName, setGuestName] = useState("");
  const [guestEntered, setGuestEntered] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        console.log("❌ No eventId found in URL");
        setLoading(false);
        return;
      }

      try {
        console.log("📡 Fetching event from Firestore:", eventId);

        const ref = doc(db, "events", eventId);
        const snap = await getDoc(ref);

        console.log("📄 Firestore response exists?:", snap.exists());

        if (!snap.exists()) {
          console.log("❌ Event document NOT FOUND in Firestore");
          setEvent(null);
        } else {
          const data = snap.data();
          console.log("✅ Event data:", data);

          setEvent(data as EventType);
        }
      } catch (err) {
        console.error("❌ Firestore fetch error:", err);
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

  if (!event) {
    console.log("🚨 FINAL STATE: Event is NULL");
    return <p>Event not found</p>;
  }

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