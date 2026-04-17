"use client";

import { useSearchParams } from "next/navigation";
import HostNav from "@/app/components/HostNav";

export default function HostContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  if (!eventId) {
    return <div className="text-white p-4">Missing event context</div>;
  }

  return (
    <div>
      <HostNav eventId={eventId} />
      {/* rest of host UI */}
    </div>
  );
}