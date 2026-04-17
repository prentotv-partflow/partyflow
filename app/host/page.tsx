"use client";

import { Suspense } from "react";
import HostContent from "./HostContent";

function Loading() {
  return <div className="text-white p-4">Loading...</div>;
}

export default function HostPage() {
  return (
    <Suspense fallback={<Loading />}>
      <HostContent />
    </Suspense>
  );
}