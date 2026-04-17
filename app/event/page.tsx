"use client";

import { Suspense } from "react";
import EventContent from "./EventContent";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-[#0A0C12]">
      Loading event...
    </div>
  );
}

export default function EventPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EventContent />
    </Suspense>
  );
}