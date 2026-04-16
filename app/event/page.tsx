import { Suspense } from "react";
import EventContent from "./EventContent";

export default function EventPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EventContent />
    </Suspense>
  );
}