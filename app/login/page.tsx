"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 🔐 AUTH LISTENER → ONLY ROUTE TO HUB
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      // 🚀 ALWAYS GO TO MY EVENTS (NEW ARCHITECTURE)
      router.replace("/my-events");
    });

    return () => unsubscribe();
  }, [router]);

  // 🔑 GOOGLE LOGIN
  const handleLogin = async () => {
    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      // NOTE:
      // onAuthStateChanged will handle redirect to /my-events
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
          {loading
            ? "Signing you in..."
            : "Continue with Google to access your events"}
        </p>

        <button
          onClick={handleLogin}
          className="bg-black text-white px-4 py-2 rounded-lg w-full"
        >
          Continue with Google
        </button>

        <p className="text-xs text-gray-400">
          You will be taken to your event dashboard after login
        </p>
      </div>
    </div>
  );
}