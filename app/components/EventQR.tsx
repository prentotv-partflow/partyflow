"use client";

import QRCode from "react-qr-code";

export default function EventQR({ eventId }: { eventId: string }) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/menu?event=${eventId}`
      : "";

  return (
    <div className="bg-white p-4 rounded-xl shadow text-center">
      <h2 className="text-sm font-semibold mb-2">
        Guest Access
      </h2>

      {url && (
        <div className="flex justify-center mb-2">
          <QRCode value={url} size={140} />
        </div>
      )}

      <p className="text-xs text-gray-500 break-all">
        {url}
      </p>
    </div>
  );
}