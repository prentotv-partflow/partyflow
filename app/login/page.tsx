"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const hasCreatedEvent = useRef(false);

  const [loading, setLoading] = useState(false);

  // 🔐 AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      if (hasCreatedEvent.current) return;
      hasCreatedEvent.current = true;

      try {
        const eventRef = await addDoc(collection(db, "events"), {
          hostId: user.uid,
          createdAt: serverTimestamp(),
          roles: {
            [user.uid]: "host",
          },
        });

        router.replace(`/host?event=${eventRef.id}`);
      } catch (error) {
        console.error("EVENT CREATION FAILED:", error);
        hasCreatedEvent.current = false;
      }
    });

    return () => unsubscribe();
  }, [router]);

  // 🔑 GOOGLE LOGIN TRIGGER
  const handleLogin = async () => {
    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("LOGIN FAILED:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm text-center space-y-4">
        <h1 className="text-lg font-semibold">Login</h1>

        <p className="text-sm text-gray-600">
          {loading ? "Signing you in..." : "Continue with Google to start your event"}
        </p>

        <button
          onClick={handleLogin}
          className="bg-black text-white px-4 py-2 rounded-lg w-full"
        >
          Continue with Google
        </button>

        <p className="text-xs text-gray-400">
          You will be redirected to your host dashboard after login
        </p>
      </div>
    </div>
  );
}