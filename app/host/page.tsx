"use client";

import { Suspense } from "react";
import HostContent from "./HostContent";

export default function HostPage() {
  return (
    <Suspense fallback={<div className="text-white p-4">Loading...</div>}>
      <HostContent />
    </Suspense>
  );
}

//This is a wrapper