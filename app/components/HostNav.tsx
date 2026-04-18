"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";

type Props = {
  eventId: string;
  onNavigate?: (tab: "menu" | "queue") => void;
};

export default function HostNav({ eventId, onNavigate }: Props) {
  const router = useRouter();
  const [showQR, setShowQR] = useState(false);

  const guestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/menu?event=${eventId}`
      : "";

  const goTo = (path: string, tab?: "menu" | "queue") => {
    router.push(`${path}?event=${eventId}`);
    if (tab && onNavigate) onNavigate(tab);
  };

  return (
    <div className="sticky top-0 z-20 bg-[#0A0C12] border-b border-white/5 px-4 py-3">

      {/* TOP BAR */}
      <div className="flex justify-between items-center">

        <h1 className="text-sm font-semibold text-white">
          PartyFlow Host
        </h1>

        {/* QR TOGGLE */}
        <button
          onClick={() => setShowQR(!showQR)}
          className="text-xs px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          {showQR ? "Hide QR" : "Show QR"}
        </button>

      </div>

      {/* NAV BUTTONS */}
      <div className="flex gap-2 text-xs mt-3">

        <button
          onClick={() => goTo("/host", "queue")}
          className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          Queue
        </button>

        <button
          onClick={() => goTo("/host", "menu")}
          className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          Menu
        </button>

        <button
          onClick={() => router.push("/my-events")}
          className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          My Events
        </button>

      </div>

      {/* QR PANEL */}
      {showQR && (
        <div className="mt-4 bg-white p-3 rounded-xl text-center shadow">

          <p className="text-xs font-semibold mb-2">
            Guest Entry QR
          </p>

          <div className="flex justify-center mb-2">
            <QRCode value={guestUrl} size={140} />
          </div>

          <p className="text-[10px] text-gray-500 break-all">
            {guestUrl}
          </p>

        </div>
      )}

    </div>
  );
}