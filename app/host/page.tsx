"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "../firebase";
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

type EventType = {
  eventName: string;
  hostName: string;
  hostId: string;
  hostEmail?: string;
  createdAt: any;
};

export default function HostPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [event, setEvent] = useState<EventType | null>(null);

  const [eventUrl, setEventUrl] = useState("");

  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingHost, setUpdatingHost] = useState(false);

  // DELETE
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // EVENT NAME
  const [showEditModal, setShowEditModal] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [eventError, setEventError] = useState("");

  // HOST NAME
  const [showHostEditModal, setShowHostEditModal] = useState(false);
  const [newHostName, setNewHostName] = useState("");
  const [hostError, setHostError] = useState("");

  // TOAST
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 🔥 Build event URL for QR
  useEffect(() => {
    if (eventId) {
      setEventUrl(`${window.location.origin}/event?event=${eventId}`);
    }
  }, [eventId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !eventId) {
        setAuthorized(false);
        return;
      }

      const snap = await getDoc(doc(db, "events", eventId));
      if (!snap.exists()) return setAuthorized(false);

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

  // DELETE
  const handleDelete = async () => {
    if (!eventId || !event) return;

    if (confirmText !== event.eventName) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, "events", eventId));
      showToast("Event deleted");
      router.push("/my-events");
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // EDIT EVENT NAME
  const handleUpdateName = async () => {
    if (!eventId || !event) return;

    if (newEventName.trim() === "") {
      setEventError("Event name cannot be empty");
      return;
    }

    if (newEventName === event.eventName) {
      setEventError("Name must be different");
      return;
    }

    try {
      setUpdating(true);
      setEventError("");

      await updateDoc(doc(db, "events", eventId), {
        eventName: newEventName,
      });

      setEvent((prev) =>
        prev ? { ...prev, eventName: newEventName } : prev
      );

      showToast("Event name updated");
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      setEventError("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  // EDIT HOST NAME
  const handleUpdateHostName = async () => {
    if (!eventId || !event) return;

    if (newHostName.trim() === "") {
      setHostError("Host name cannot be empty");
      return;
    }

    if (newHostName === event.hostName) {
      setHostError("Name must be different");
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(newHostName)) {
      setHostError("Only letters and spaces allowed");
      return;
    }

    try {
      setUpdatingHost(true);
      setHostError("");

      await updateDoc(doc(db, "events", eventId), {
        hostName: newHostName,
      });

      setEvent((prev) =>
        prev ? { ...prev, hostName: newHostName } : prev
      );

      showToast("Host name updated");
      setShowHostEditModal(false);
    } catch (err) {
      console.error(err);
      setHostError("Something went wrong");
    } finally {
      setUpdatingHost(false);
    }
  };

  if (authorized === null) return <p>Checking access...</p>;
  if (!authorized) return <p>🚫 Not authorized</p>;
  if (!event) return <p>Loading...</p>;

  const pencil = { cursor: "pointer", fontSize: "14px", opacity: 0.7 };

  return (
    <div style={{ padding: 20 }}>
      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "black",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
          }}
        >
          {toast}
        </div>
      )}

      <button onClick={() => router.push("/my-events")}>
        ← Back
      </button>

      <h1>Host Dashboard</h1>

      {/* EVENT NAME */}
      <h2>
        {event.eventName}
        <span
          style={pencil}
          onClick={() => {
            setShowEditModal(true);
            setNewEventName(event.eventName);
            setEventError("");
          }}
        >
          ✏️
        </span>
      </h2>

      {/* HOST NAME */}
      <p>
        Hosted by: {event.hostName}
        <span
          style={pencil}
          onClick={() => {
            setShowHostEditModal(true);
            setNewHostName(event.hostName);
            setHostError("");
          }}
        >
          ✏️
        </span>
      </p>

      {/* 🔥 QR CODE SECTION */}
      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <h3>Scan to Join Event</h3>

        {eventUrl && (
          <>
            <QRCodeCanvas value={eventUrl} size={200} />
            <p style={{ marginTop: "10px", fontSize: "12px" }}>
              {eventUrl}
            </p>
          </>
        )}
      </div>

      {/* DELETE */}
      <button onClick={() => setShowModal(true)}>Delete Event</button>

      {/* DELETE MODAL */}
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

      {/* EVENT MODAL */}
      {showEditModal && (
        <div style={modal}>
          <div style={box}>
            <input
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
            />
            {eventError && <p style={{ color: "red" }}>{eventError}</p>}
            <button onClick={() => setShowEditModal(false)}>Cancel</button>
            <button onClick={handleUpdateName}>
              {updating ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* HOST MODAL */}
      {showHostEditModal && (
        <div style={modal}>
          <div style={box}>
            <input
              value={newHostName}
              onChange={(e) => setNewHostName(e.target.value)}
            />
            {hostError && <p style={{ color: "red" }}>{hostError}</p>}
            <button onClick={() => setShowHostEditModal(false)}>Cancel</button>
            <button onClick={handleUpdateHostName}>
              {updatingHost ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const modal = {
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

const box = {
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  width: "300px",
};