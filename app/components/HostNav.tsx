"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";

type Tab = "menu" | "queue";

type Props = {
  eventId: string;
  activeTab?: Tab;
  onNavigate?: (tab: Tab) => void;
};

export default function HostNav({ eventId, activeTab = "menu", onNavigate }: Props) {
  const router = useRouter();

  const [showQR, setShowQR] = useState(false);
  const [guestUrl, setGuestUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGuestUrl(`${window.location.origin}/menu?event=${eventId}`);
    }
  }, [eventId]);

  const handleTabChange = (tab: Tab) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const handleCopyLink = async () => {
    if (!guestUrl) return;

    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy guest link:", error);
    }
  };

  return (
    <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0A0C12] px-4 py-3">
      {/* TOP BAR */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-white">PartyFlow Host</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            disabled={!guestUrl}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? "Copied" : "Copy Link"}
          </button>

          <button
            onClick={() => setShowQR((prev) => !prev)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/20"
          >
            {showQR ? "Hide QR" : "Show QR"}
          </button>
        </div>
      </div>

      {/* NAV BUTTONS */}
      <div className="mt-3 flex gap-2 text-xs">
        <button
          onClick={() => handleTabChange("queue")}
          className={`rounded-full px-3 py-1 transition ${
            activeTab === "queue"
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Queue
        </button>

        <button
          onClick={() => handleTabChange("menu")}
          className={`rounded-full px-3 py-1 transition ${
            activeTab === "menu"
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Menu
        </button>

        <button
          onClick={() => router.push("/my-events")}
          className="rounded-full bg-white/10 px-3 py-1 text-white transition hover:bg-white/20"
        >
          My Events
        </button>
      </div>

      {/* QR PANEL */}
      {showQR && (
        <div className="mt-4 rounded-2xl bg-white p-4 text-center shadow">
          <p className="text-sm font-semibold text-black">Guest Entry QR</p>
          <p className="mt-1 text-xs text-gray-500">
            Guests can scan this code or use the direct link.
          </p>

          <div className="my-4 flex justify-center">
            <QRCode value={guestUrl || " "} size={148} />
          </div>

          <p className="break-all text-[10px] text-gray-500">{guestUrl}</p>
        </div>
      )}
    </div>
  );
}