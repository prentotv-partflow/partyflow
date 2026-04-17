"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense } from "react";
import AddMenuContent from "./AddMenuContent";

function Loading() {
  return (
    <div className="text-white p-4">
      Loading menu editor...
    </div>
  );
}

export default function AddMenuPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AddMenuContent />
    </Suspense>
  );
}