import { Suspense } from "react";
import EventClient from "./EventClient";

export default function EventPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12] text-white">
        Loading event...
      </div>
    }>
      <EventClient />
    </Suspense>
  );
}