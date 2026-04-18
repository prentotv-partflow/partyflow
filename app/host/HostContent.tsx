"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase";
import HostNav from "@/app/components/HostNav";
import QueueTab from "@/app/host/QueueTab";
import QRCode from "react-qr-code";

type Tab = "menu" | "queue";

type EventDoc = {
  hostId: string;
  hostName?: string;
  eventName?: string;
  createdAt?: any;
};

export default function HostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [activeTab, setActiveTab] = useState<Tab>("menu");
  const [eventData, setEventData] = useState<EventDoc | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [eventNameInput, setEventNameInput] = useState("");
  const [hostNameInput, setHostNameInput] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  const [guestUrl, setGuestUrl] = useState("");
  const [copiedGuestLink, setCopiedGuestLink] = useState(false);
  const [showGuestQR, setShowGuestQR] = useState(false);

  useEffect(() => {
    if (!eventId) {
      router.replace("/my-events");
      return;
    }

    const eventRef = doc(db, "events", eventId);

    const unsubscribe = onSnapshot(
      eventRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setEventData(null);
          setLoadingEvent(false);
          return;
        }

        const data = snapshot.data() as EventDoc;
        setEventData(data);

        setEventNameInput(data.eventName ?? "");
        setHostNameInput(data.hostName ?? "");
        setLoadingEvent(false);
      },
      (error) => {
        console.error("Failed to load event:", error);
        setLoadingEvent(false);
      }
    );

    return () => unsubscribe();
  }, [eventId, router]);

  useEffect(() => {
    if (typeof window !== "undefined" && eventId) {
      setGuestUrl(`${window.location.origin}/menu?event=${eventId}`);
    }
  }, [eventId]);

  const needsSetup = useMemo(() => {
    if (!eventData) return false;

    const missingEventName = !(eventData.eventName ?? "").trim();
    const missingHostName = !(eventData.hostName ?? "").trim();

    return missingEventName || missingHostName;
  }, [eventData]);

  const handleSaveMetadata = async () => {
    if (!eventId || savingMeta) return;

    const cleanEventName = eventNameInput.trim();
    const cleanHostName = hostNameInput.trim();

    if (!cleanEventName || !cleanHostName) {
      return;
    }

    try {
      setSavingMeta(true);

      await updateDoc(doc(db, "events", eventId), {
        eventName: cleanEventName,
        hostName: cleanHostName,
      });
    } catch (error) {
      console.error("Failed to save event metadata:", error);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleCopyGuestLink = async () => {
    if (!guestUrl) return;

    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopiedGuestLink(true);

      setTimeout(() => {
        setCopiedGuestLink(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy guest link:", error);
    }
  };

  if (!eventId || loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-gray-400">
        Loading event...
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0C12] px-4 text-center text-white">
        <p className="text-lg font-semibold">Event not found</p>
        <p className="mt-2 text-sm text-gray-400">
          This event may have been removed or is unavailable.
        </p>
        <button
          onClick={() => router.push("/my-events")}
          className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200"
        >
          Back to My Events
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C12] text-white">
      {/* Back */}
      <div className="px-4 pt-4">
        <button
          onClick={() => router.push("/my-events")}
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← My Events
        </button>
      </div>

      {/* Event Header */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40">
                Event
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                {eventData.eventName?.trim() || "Untitled Event"}
              </h1>
              <p className="mt-2 text-sm text-gray-400">
                Host: {eventData.hostName?.trim() || "Not set"}
              </p>
            </div>

            <span className="rounded-full bg-[#7A3FFF]/20 px-3 py-1 text-xs text-[#C7B3FF]">
              Host Dashboard
            </span>
          </div>
        </div>
      </div>

      {/* Guest Access Card */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-[#508CFF]/20 bg-[#191C24] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8FB3FF]">
                Guest Access
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                Invite guests into this event
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Share the direct menu link or show the QR code for quick entry.
              </p>
            </div>

            <span className="rounded-full bg-[#508CFF]/15 px-3 py-1 text-xs text-[#8FB3FF]">
              Share
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-[#0A0C12] p-3">
            <p className="mb-2 text-xs text-white/50">Guest Link</p>
            <p className="break-all text-xs text-gray-300">
              {guestUrl || "Generating link..."}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleCopyGuestLink}
              disabled={!guestUrl}
              className="rounded-full bg-[#508CFF] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copiedGuestLink ? "Copied" : "Copy Link"}
            </button>

            <button
              onClick={() => setShowGuestQR((prev) => !prev)}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              {showGuestQR ? "Hide QR" : "Show QR"}
            </button>
          </div>

          {showGuestQR && (
            <div className="mt-4 rounded-2xl bg-white p-4 text-center">
              <p className="text-sm font-semibold text-black">Guest Entry QR</p>
              <p className="mt-1 text-xs text-gray-500">
                Guests can scan this code to open the event menu.
              </p>

              <div className="my-4 flex justify-center">
                <QRCode value={guestUrl || " "} size={160} />
              </div>

              <p className="break-all text-[10px] text-gray-500">
                {guestUrl}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Setup Prompt */}
      {needsSetup && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-[#FF3D9A]/30 bg-[#191C24] p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">
                Complete Event Setup
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Add an event name and host name before continuing.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm text-white/80">
                  Event Name
                </label>
                <input
                  type="text"
                  value={eventNameInput}
                  onChange={(e) => setEventNameInput(e.target.value)}
                  placeholder="Birthday Bash"
                  className="w-full rounded-xl border border-white/10 bg-[#0A0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#7A3FFF]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/80">
                  Host Name
                </label>
                <input
                  type="text"
                  value={hostNameInput}
                  onChange={(e) => setHostNameInput(e.target.value)}
                  placeholder="Your Name Goes Here"
                  className="w-full rounded-xl border border-white/10 bg-[#0A0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#7A3FFF]"
                />
              </div>

              <button
                onClick={handleSaveMetadata}
                disabled={
                  savingMeta ||
                  !eventNameInput.trim() ||
                  !hostNameInput.trim()
                }
                className="w-full rounded-full bg-[#FF3D9A] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingMeta ? "Saving..." : "Save Event Details"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Nav + Main Dashboard */}
      <div className={needsSetup ? "pointer-events-none opacity-50" : ""}>
        <HostNav
          eventId={eventId}
          activeTab={activeTab}
          onNavigate={setActiveTab}
        />

        {/* Content */}
        <div className="space-y-4 p-4">
          {activeTab === "menu" && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <button
                onClick={() => router.push(`/add-menu?event=${eventId}`)}
                className="rounded-lg bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-200"
              >
                Open Menu Manager
              </button>

              <p className="text-sm text-gray-400">
                Manage inventory and menu items for this event.
              </p>
            </div>
          )}

          {activeTab === "queue" && <QueueTab />}
        </div>
      </div>
    </div>
  );
}