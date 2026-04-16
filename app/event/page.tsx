"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

type EventType = {
  eventName: string;
  hostName: string;
  hostId: string;
};

export default function EventPage() {
  return (
    <Suspense fallback={<p>Loading event...</p>}>
      <EventContent />
    </Suspense>
  );
}

function EventContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("event");

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);

  const [guestName, setGuestName] = useState("");
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

    // ✅ Redirect with params
    router.push(`/menu?event=${eventId}&name=${encodeURIComponent(guestName.trim())}`);
  };

  if (loading) return <p>Loading event...</p>;
  if (!event) return <p>Event not found</p>;

  return (
    <div style={container}>
      <h2>Welcome</h2>
      <p>Enter your name to access:</p>

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