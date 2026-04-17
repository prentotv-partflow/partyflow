"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("USER:", user?.uid);

      if (!user) {
        console.log("No user logged in");
        return;
      }

      try {
        // ✅ CREATE EVENT
        const eventRef = await addDoc(collection(db, "events"), {
          hostId: user.uid,
          createdAt: serverTimestamp(),
        });

        const eventId = eventRef.id;

        console.log("EVENT CREATED:", eventId);

        // ✅ REDIRECT WITH EVENT ID
        router.push(`/host?event=${eventId}`);
      } catch (error) {
        console.error("EVENT CREATION FAILED:", error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm text-center space-y-2">
        <h1 className="text-lg font-semibold">Login</h1>

        <p className="text-sm text-gray-600">
          Creating your event...
        </p>

        <p className="text-xs text-gray-400">
          Redirecting to host dashboard...
        </p>
      </div>
    </div>
  );
}