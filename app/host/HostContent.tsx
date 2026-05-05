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
  isDeleted?: boolean;
  deletedAt?: any;
};

const HOST_NAME_REGEX = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const SECTION_LINKS = ["main", "left", "right", "vip"];

function formatSectionName(section: string) {
  return section
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

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

  const [eventNameError, setEventNameError] = useState("");
  const [hostNameError, setHostNameError] = useState("");

  const [guestUrl, setGuestUrl] = useState("");
  const [copiedGuestLink, setCopiedGuestLink] = useState<string | null>(null);
  const [showGuestAccess, setShowGuestAccess] = useState(false);
  const [showGuestQR, setShowGuestQR] = useState<string | null>(null);

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

        if (data.isDeleted === true) {
          setEventData(null);
          setLoadingEvent(false);
          return;
        }

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

  useEffect(() => {
    if (activeTab === "queue") {
      setShowGuestAccess(false);
      setShowGuestQR(null);
    }
  }, [activeTab]);

  const needsSetup = useMemo(() => {
    if (!eventData) return false;

    const missingEventName = !(eventData.eventName ?? "").trim();
    const missingHostName = !(eventData.hostName ?? "").trim();

    return missingEventName || missingHostName;
  }, [eventData]);

  const normalizeHostName = (value: string) => value.trim().replace(/\s+/g, " ");

  const validateEventName = (value: string) => {
    if (!value.trim()) {
      return "Event name is required.";
    }

    return "";
  };

  const validateHostName = (value: string) => {
    const normalized = normalizeHostName(value);

    if (!normalized) {
      return "Host name is required.";
    }

    if (!HOST_NAME_REGEX.test(normalized)) {
      return "Host name can only contain letters and spaces.";
    }

    return "";
  };

  const getSectionUrl = (section: string) => {
    if (!guestUrl) return "";

    return `${guestUrl}&section=${encodeURIComponent(section)}`;
  };

  const handleSaveMetadata = async () => {
    if (!eventId || savingMeta) return;

    const cleanEventName = eventNameInput.trim();
    const cleanHostName = normalizeHostName(hostNameInput);

    const nextEventNameError = validateEventName(cleanEventName);
    const nextHostNameError = validateHostName(cleanHostName);

    setEventNameError(nextEventNameError);
    setHostNameError(nextHostNameError);

    if (nextEventNameError || nextHostNameError) {
      return;
    }

    try {
      setSavingMeta(true);

      await updateDoc(doc(db, "events", eventId), {
        eventName: cleanEventName,
        hostName: cleanHostName,
      });

      setEventNameInput(cleanEventName);
      setHostNameInput(cleanHostName);
    } catch (error) {
      console.error("Failed to save event metadata:", error);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleCopySectionLink = async (section: string) => {
    const sectionUrl = getSectionUrl(section);
    if (!sectionUrl) return;

    try {
      await navigator.clipboard.writeText(sectionUrl);
      setCopiedGuestLink(section);

      setTimeout(() => {
        setCopiedGuestLink(null);
      }, 1600);
    } catch (error) {
      console.error("Failed to copy guest link:", error);
    }
  };

  const handleToggleGuestAccess = () => {
    setShowGuestAccess((prev) => {
      const next = !prev;

      if (!next) {
        setShowGuestQR(null);
      }

      return next;
    });
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
          This event may have been removed, deleted, or is unavailable.
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
      {/* Sticky top shell */}
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0A0C12]/92 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-4 pb-4 pt-4">
          <button
            onClick={() => router.push("/my-events")}
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← My Events
          </button>

          <div className={needsSetup ? "mt-4 pointer-events-none opacity-50" : "mt-4"}>
            <HostNav
              eventId={eventId}
              activeTab={activeTab}
              onNavigate={setActiveTab}
            />
          </div>
        </div>
      </div>

      {/* Page body */}
      <div className="mx-auto w-full max-w-6xl px-4 py-4">
        {/* Compact Event Header */}
        <div className="pt-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Event
                </p>
                <h2 className="mt-1 truncate text-xl font-semibold">
                  {eventData.eventName?.trim() || "Untitled Event"}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Host: {eventData.hostName?.trim() || "Not set"}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-[#7A3FFF]/20 px-3 py-1 text-xs text-[#C7B3FF]">
                Host Dashboard
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Setup Prompt */}
        {needsSetup && (
          <div className="pt-3">
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
                    onChange={(e) => {
                      setEventNameInput(e.target.value);
                      if (eventNameError) setEventNameError("");
                    }}
                    placeholder="Birthday Bash"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#7A3FFF]"
                  />
                  {eventNameError ? (
                    <p className="mt-2 text-xs text-red-400">{eventNameError}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    Host Name
                  </label>
                  <input
                    type="text"
                    value={hostNameInput}
                    onChange={(e) => {
                      setHostNameInput(e.target.value);
                      if (hostNameError) setHostNameError("");
                    }}
                    placeholder="Your Name Goes Here"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#7A3FFF]"
                  />
                  {hostNameError ? (
                    <p className="mt-2 text-xs text-red-400">{hostNameError}</p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      Letters and spaces only.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSaveMetadata}
                  disabled={savingMeta}
                  className="w-full rounded-full bg-[#FF3D9A] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMeta ? "Saving..." : "Save Event Details"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Content */}
        <div className={needsSetup ? "pointer-events-none opacity-50" : ""}>
          <div className="space-y-4 pt-4">
            {activeTab === "menu" && (
              <>
                {/* Guest Access Toggle Card */}
                <div className="rounded-2xl border border-[#508CFF]/20 bg-[#191C24] px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3FF]">
                        Guest Access
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Share section-specific guest links or QR codes based on
                        guest location.
                      </p>
                    </div>

                    <button
                      onClick={handleToggleGuestAccess}
                      className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                    >
                      {showGuestAccess ? "Hide" : "Show"}
                    </button>
                  </div>

                  {showGuestAccess && (
                    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                      <div className="rounded-xl border border-white/8 bg-[#0A0C12]/80 px-4 py-3">
                        <p className="text-xs leading-5 text-white/45">
                          Place each QR in the matching physical section. Guests
                          should scan the QR closest to where they are seated or
                          being served.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {SECTION_LINKS.map((section) => {
                          const sectionUrl = getSectionUrl(section);
                          const sectionName = formatSectionName(section);
                          const isQrOpen = showGuestQR === section;
                          const isCopied = copiedGuestLink === section;

                          return (
                            <div
                              key={section}
                              className="rounded-2xl border border-white/10 bg-[#0A0C12] p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#8FB3FF]">
                                    Section
                                  </p>
                                  <h3 className="mt-1 text-base font-semibold text-white">
                                    {sectionName}
                                  </h3>
                                </div>

                                <div className="flex shrink-0 gap-2">
                                  <button
                                    onClick={() => handleCopySectionLink(section)}
                                    disabled={!sectionUrl}
                                    className="rounded-full bg-[#508CFF] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isCopied ? "Copied" : "Copy"}
                                  </button>

                                  <button
                                    onClick={() =>
                                      setShowGuestQR((prev) =>
                                        prev === section ? null : section
                                      )
                                    }
                                    disabled={!sectionUrl}
                                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isQrOpen ? "Hide QR" : "QR"}
                                  </button>
                                </div>
                              </div>

                              <p className="mt-3 break-all text-[11px] leading-5 text-gray-400">
                                {sectionUrl || "Generating link..."}
                              </p>

                              {isQrOpen && sectionUrl ? (
                                <div className="mt-4 rounded-2xl bg-white p-4 text-center">
                                  <p className="text-sm font-semibold text-black">
                                    {sectionName} QR
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    Guests scanning this QR will be tagged as{" "}
                                    {sectionName}.
                                  </p>

                                  <div className="my-4 flex justify-center">
                                    <QRCode value={sectionUrl} size={150} />
                                  </div>

                                  <p className="break-all text-[10px] text-gray-500">
                                    {sectionUrl}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

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
              </>
            )}

            {activeTab === "queue" && <QueueTab />}
          </div>
        </div>
      </div>
    </div>
  );
}