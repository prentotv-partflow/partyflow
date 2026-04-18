"use client";

import { Suspense } from "react";
import HostContent from "./HostContent";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      Loading host dashboard...
    </div>
  );
}

export default function HostPage() {
  return (
    <Suspense fallback={<Loading />}>
      <HostContent />
    </Suspense>
  );
}