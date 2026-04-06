"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense } from "react";
import AddMenuContent from "./AddMenuContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddMenuContent />
    </Suspense>
  );
}