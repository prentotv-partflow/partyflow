"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";

type EventType = {
  eventName: string;
  hostName: string;
  hostId: string;
  hostEmail?: string;
  createdAt: any;
};

// ✅ ONLY wrapper here
export default function HostPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <HostContent />
    </Suspense>
  );
}

// ✅ ALL logic here
function HostContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [event, setEvent] = useState<EventType | null>(null);
  const [eventUrl, setEventUrl] = useState("");

  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // ✅ FIXED: ALWAYS USE PRODUCTION DOMAIN
  useEffect(() => {
    if (eventId) {
      const baseUrl = "https://partyflow.vercel.app";
      const url = `${baseUrl}/event?event=${eventId}`;

      console.log("✅ QR URL:", url); // DEBUG

      setEventUrl(url);
    }
  }, [eventId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !eventId) {
        setAuthorized(false);
        return;
      }

      const snap = await getDoc(doc(db, "events", eventId));

      if (!snap.exists()) {
        console.log("❌ Event not found in Firestore:", eventId);
        return setAuthorized(false);
      }

      const data = snap.data() as EventType;

      if (data.hostId === user.uid) {
        setEvent(data);
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
    });

    return () => unsub();
  }, [eventId]);

  const handleDelete = async () => {
    if (!eventId || !event) return;
    if (confirmText !== event.eventName) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, "events", eventId));
      router.push("/my-events");
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (authorized === null) return <p>Checking access...</p>;
  if (!authorized) return <p>🚫 Not authorized</p>;
  if (!event) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => router.push("/my-events")}>
        ← Back
      </button>

      <h1>Host Dashboard</h1>

      <h2>{event.eventName}</h2>
      <p>Hosted by: {event.hostName}</p>

      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <h3>Scan to Join Event</h3>

        {/* ✅ DEBUG (TEMP) */}
        <p style={{ fontSize: "12px" }}>
          QR URL: {eventUrl}
        </p>

        {eventUrl && <QRCodeCanvas value={eventUrl} size={200} />}
      </div>

      <button onClick={() => setShowModal(true)}>Delete Event</button>

      {showModal && (
        <div style={modal}>
          <div style={box}>
            <p>Type {event.eventName}</p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <button onClick={() => setShowModal(false)}>Cancel</button>
            <button onClick={handleDelete}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const modal: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const box: React.CSSProperties = {
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  width: "300px",
};