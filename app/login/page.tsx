"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();

  // ✅ Prevent duplicate event creation in Strict Mode / re-renders
  const hasCreatedEvent = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("No user logged in");
        return;
      }

      // ✅ Guard: prevent duplicate event creation
      if (hasCreatedEvent.current) return;
      hasCreatedEvent.current = true;

      try {
        console.log("Authenticated USER:", user.uid);

        // 🔥 Create event (auto-create flow / Option A)
        const eventRef = await addDoc(collection(db, "events"), {
          hostId: user.uid,
          createdAt: serverTimestamp(),
          roles: {
            [user.uid]: "host",
          },
        });

        const eventId = eventRef.id;

        console.log("EVENT CREATED:", eventId);

        // 🚀 Route to host dashboard with event context
        router.replace(`/host?event=${eventId}`);
      } catch (error) {
        console.error("EVENT CREATION FAILED:", error);
        hasCreatedEvent.current = false; // allow retry if needed
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm text-center space-y-2">
        <h1 className="text-lg font-semibold">Login</h1>

        <p className="text-sm text-gray-600">
          Setting up your event...
        </p>

        <p className="text-xs text-gray-400">
          Redirecting to host dashboard...
        </p>
      </div>
    </div>
  );
}